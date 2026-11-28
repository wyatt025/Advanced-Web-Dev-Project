const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { auth: { execute: async (_, [id]) => [[{ id, role: id === 1 ? 'admin' : id === 2 ? 'user' : 'employee' }]] } },
};
const modelPath = require.resolve('../models/admin/adminManagementModel');
require.cache[modelPath] = {
    id: modelPath, filename: modelPath, loaded: true,
    exports: {
        getAllMovies: async () => [{ id: 8, title: 'Movie' }],
        getMovieById: async (id) => id === '8' ? { id: 8, title: 'Movie' } : undefined,
    },
};
const { adminRouter } = require('../routes/admin/adminRouter');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/admin', adminRouter);

test('movie routes retain their URLs and require admin authorization', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin/movies`;
    const cookie = (id) => `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}`;
    assert.equal((await fetch(base)).status, 401);
    for (const id of [2, 3]) assert.equal((await fetch(base, { headers: { Cookie: cookie(id) } })).status, 403);
    const headers = { Cookie: cookie(1) };
    assert.deepEqual(await (await fetch(base, { headers })).json(), [{ id: 8, title: 'Movie' }]);
    assert.deepEqual(await (await fetch(`${base}/8`, { headers })).json(), { id: 8, title: 'Movie' });
    assert.equal((await fetch(`${base}/99`, { headers })).status, 404);
    assert.equal((await fetch(`${base}/search`, { headers })).status, 400);
});
