const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const dbPath = require.resolve('../helpers/db');
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { auth: { execute: async (_, [id]) => [[{ id, role: id === 1 ? 'admin' : 'user' }]] } },
};
let received;
const modelPath = require.resolve('../models/adminLocations_model');
require.cache[modelPath] = {
    id: modelPath, filename: modelPath, loaded: true,
    exports: {
        list: async () => ({ cinemas: [], theaters: [] }),
        createCinema: async (data) => { received = data; return 7; },
        createTheater: async (data) => { received = data; return 8; },
        updateCinema: async () => true,
        updateTheater: async (id, data) => { received = { id, data }; return true; },
        deleteCinema: async () => true,
        deleteTheater: async () => { const error = new Error('Pending payment'); error.code = 'LOCATION_CONFLICT'; throw error; },
    },
};
const { adminRouter } = require('../routes/adminRoute');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/admin', adminRouter);

test('location routes enforce authorization, validate fields and surface conflicts', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/admin/locations`;
    const cookie = (id) => `authToken=${jwt.sign({ id }, process.env.JWT_SECRET)}`;
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { Cookie: cookie(2) } })).status, 403);
    assert.deepEqual(await (await fetch(base, { headers: { Cookie: cookie(1) } })).json(), { cinemas: [], theaters: [] });
    const send = (method, path, body) => fetch(base + path, {
        method, headers: { Cookie: cookie(1), 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal((await send('POST', '/cinemas', { name: ' ', address: '', phone: '', isOpen: true })).status, 400);
    assert.equal((await send('POST', '/cinemas', { name: ' Oulu ', address: '', phone: '', isOpen: false })).status, 201);
    assert.deepEqual(received, { name: 'Oulu', address: null, phone: null, isOpen: false });
    const theater = { name: 'One', cinemaId: 1, isOpen: true, maxSeats: 20, accessibleSeats: 2 };
    assert.equal((await send('POST', '/theaters', { ...theater, accessibleSeats: 21 })).status, 400);
    assert.equal((await send('POST', '/theaters', theater)).status, 201);
    assert.equal(received.cinemaId, 1);
    assert.equal((await send('PUT', '/theaters/8', theater)).status, 400);
    const { cinemaId, ...edit } = theater;
    assert.equal((await send('PUT', '/theaters/8', edit)).status, 200);
    assert.equal(received.id, 8);
    const response = await send('DELETE', '/theaters/8');
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'Pending payment' });
});
