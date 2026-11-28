const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { auth: { execute: async (_, [id]) => [[{ id, role: id === 1 ? 'user' : id === 2 ? 'employee' : 'admin' }]] } },
};
const managementPath = require.resolve('../models/admin/adminManagementModel');
require.cache[managementPath] = {
    id: managementPath, filename: managementPath, loaded: true,
    exports: {
        getDashboardMetrics: async () => ({ movies: 2 }),
        getOpenAuditoriums: async () => [{ id: 8 }],
    },
};
const usersPath = require.resolve('../models/admin/adminUsersModel');
require.cache[usersPath] = {
    id: usersPath, filename: usersPath, loaded: true,
    exports: {
        list: async () => [{ id: 5 }],
        removeUser: async (id, actorId) => id === 5 && actorId === 3,
    },
};
const { adminRouter } = require('../routes/admin/adminRouter');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/admin', adminRouter);

test('all admin feature routes reject unauthenticated users, customers, and employees', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin`;
    const cookie = (id) => `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}`;
    for (const [method, path] of [
        ['GET', '/movies'], ['POST', '/movies'], ['GET', '/screenings'], ['POST', '/screenings'],
        ['GET', '/reservations'], ['POST', '/reservations'], ['GET', '/users'], ['POST', '/users'],
        ['GET', '/locations'], ['POST', '/locations/cinemas'],
        ['GET', '/metrics'], ['GET', '/auditoriums'],
    ]) {
        assert.equal((await fetch(base + path, { method })).status, 401, `${method} ${path}`);
        for (const id of [1, 2]) {
            assert.equal((await fetch(base + path, { method, headers: { Cookie: cookie(id) } })).status, 403, `${method} ${path}`);
        }
    }
});

test('active admin endpoints remain available and removed legacy endpoints return 404', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin`;
    const headers = { Cookie: `authToken=${jwt.sign({ id: 3 }, process.env.JWT_SECRET)}` };
    for (const [path, expected] of [
        ['/metrics', { movies: 2 }], ['/auditoriums', [{ id: 8 }]], ['/users', [{ id: 5 }]],
    ]) {
        const response = await fetch(base + path, { headers });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), expected);
    }
    const deletion = await fetch(`${base}/users/5`, { method: 'DELETE', headers });
    assert.equal(deletion.status, 200);
    assert.deepEqual(await deletion.json(), { deleted: true });
    for (const [method, path] of [
        ['GET', ''], ['POST', ''], ['GET', '/5'], ['PUT', '/5'], ['DELETE', '/5'],
        ['GET', '/employees'], ['POST', '/employees'], ['GET', '/employees/5'],
        ['PUT', '/employees/5'], ['DELETE', '/employees/5'],
        ['DELETE', '/users/name/example'], ['DELETE', '/users/username/example'],
    ]) {
        assert.equal((await fetch(base + path, { method, headers })).status, 404, `${method} ${path}`);
    }
});
