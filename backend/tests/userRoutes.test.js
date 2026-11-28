const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { auth: { execute: async (_, [id]) => [[{ id, role: ({ 1: 'user', 2: 'admin', 3: 'employee' })[id] }]] } },
};
const publicPath = require.resolve('../models/user/publicUserModel');
require.cache[publicPath] = {
    id: publicPath, filename: publicPath, loaded: true,
    exports: {
        getPublicMovies: async () => [{ id: 8 }],
        getPublicMovie: async (id) => id === 8 ? [{ id }] : [],
    },
};
const registeredPath = require.resolve('../models/user/registeredUserModel');
require.cache[registeredPath] = {
    id: registeredPath, filename: registeredPath, loaded: true,
    exports: { getRegisteredProfile: async (id) => ({ id, username: `user${id}`, tickets: [] }) },
};
const app = express();
app.use(cookieParser());
app.use('/user', require('../routes/user/userRouter'));

test('public movie routes remain public while the account route checks roles', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/user`;
    const headers = (id) => ({ Cookie: `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}` });
    assert.deepEqual(await (await fetch(`${base}/movies`)).json(), [{ id: 8 }]);
    assert.deepEqual(await (await fetch(`${base}/movies/8`)).json(), [{ id: 8 }]);
    assert.equal((await fetch(`${base}/movies/invalid`)).status, 400);
    assert.equal((await fetch(`${base}/movies/99`)).status, 404);
    assert.equal((await fetch(`${base}/movies`, { headers: { Cookie: 'authToken=invalid' } })).status, 200);
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { Cookie: 'authToken=invalid' } })).status, 401);
    assert.equal((await fetch(base, { headers: headers(3) })).status, 403);
    for (const id of [1, 2]) {
        const response = await fetch(base, { headers: headers(id) });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { id, username: `user${id}`, tickets: [] });
    }
});
