const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcrypt');
const { PENDING_PASSWORD } = require('../helpers/auth/accountSetup');

let created;
let updated;
const modelPath = require.resolve('../models/admin/adminUsersModel');
require.cache[modelPath] = {
    id: modelPath, filename: modelPath, loaded: true,
    exports: {
        list: async () => [],
        create: async (user) => { created = user; return 7; },
        update: async (id, user) => { updated = { id, user }; return true; },
        removeUser: async () => true,
    },
};
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); });
app.use('/users', require('../routes/admin/adminUsersRoutes'));

test('validates creation, defers user passwords and generates staff passwords', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/users`;
    const send = (method, path, body) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const input = { username: 'customer', email: 'test@example.com', phone: '', role: 'user' };
    assert.equal((await send('POST', '', { ...input, email: 'invalid' })).status, 400);
    assert.equal((await send('POST', '', { ...input, username: 'a b' })).status, 400);
    let response = await send('POST', '', { ...input, username: ' customer ', email: ' test@example.com ' });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: 7 });
    assert.equal(created.password, PENDING_PASSWORD);
    assert.equal(created.username, 'customer');
    assert.equal(created.email, 'test@example.com');
    assert.equal(created.phone, null);
    assert.equal((await send('POST', '', { ...input, role: 'admin' })).status, 400);
    response = await send('POST', '', { ...input, role: 'admin', adminConfirmation: 'ADMIN' });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.equal(typeof result.generatedPassword, 'string');
    assert.equal(await bcrypt.compare(result.generatedPassword, created.password), true);
    assert.notEqual(created.password, result.generatedPassword);
    response = await send('POST', '', { ...input, role: 'employee' });
    assert.equal(response.status, 201);
    assert.ok((await response.json()).generatedPassword);
    assert.equal((await send('PUT', '/7', input)).status, 400);
    assert.equal((await send('PUT', '/7', { username: 'customer', email: 'test@example.com', phone: '' })).status, 200);
    assert.equal(updated.id, 7);
    assert.equal(Object.hasOwn(updated.user, 'role'), false);
});
