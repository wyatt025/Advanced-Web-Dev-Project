const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { auth: { execute: async (_, [id]) => [[{ id, role: id === 1 ? 'admin' : 'user' }]] } },
};
const modelPath = require.resolve('../models/admin/adminUsersModel');
require.cache[modelPath] = {
    id: modelPath, filename: modelPath, loaded: true,
    exports: { list: async () => [] },
};
const { adminRouter } = require('../routes/admin/adminRouter');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/admin', adminRouter);

test('user management requires administrator authentication', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin/users`;
    const cookie = (id) => `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { Cookie: cookie(2) } })).status, 403);
    assert.equal((await fetch(base, { headers: { Cookie: cookie(1) } })).status, 200);
});
