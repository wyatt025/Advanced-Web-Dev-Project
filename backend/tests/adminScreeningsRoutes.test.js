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
let checked;
const modelPath = require.resolve('../models/admin/adminScreeningsModel');
require.cache[modelPath] = {
    id: modelPath, filename: modelPath, loaded: true,
    exports: {
        list: async () => [{ id: 3 }],
        check: async (items, excludeId) => { checked = { items, excludeId }; },
    },
};
const { adminRouter } = require('../routes/admin/adminRouter');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/admin', adminRouter);

test('screening routes require admin and validate input before scheduling', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin/screenings`;
    const cookie = (id) => `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { Cookie: cookie(2) } })).status, 403);
    assert.deepEqual(await (await fetch(base, { headers: { Cookie: cookie(1) } })).json(), [{ id: 3 }]);
    const post = (body) => fetch(`${base}/check`, {
        method: 'POST', headers: { Cookie: cookie(1), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    assert.equal((await post({ screenings: [] })).status, 400);
    assert.equal((await post({ screenings: [{ movieId: 1, auditoriumId: 2, localStart: '2035-10-28T03:30' }] })).status, 400);
    const response = await post({ screenings: [{ movieId: 1, auditoriumId: 2, localStart: '2035-01-15T14:00' }], excludeId: 3 });
    assert.equal(response.status, 200);
    assert.deepEqual(checked, { items: [{ movieId: 1, auditoriumId: 2, date: '2035-01-15 12:00:00' }], excludeId: 3 });
});
