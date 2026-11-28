const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../config/database');
let calls;
let pending;
let reserved;
let exists;
const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, params) {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id FROM cinemas')) return [exists ? [{ id: 1 }] : []];
        if (sql.startsWith('SELECT id, cinema_id')) return [exists ? [{ id: 2, cinemaId: 1, maxSeats: 30, accessibleSeats: 2 }] : []];
        if (sql.startsWith('SELECT id FROM auditoriums')) return [[{ id: 2 }, { id: 3 }]];
        if (sql.includes('FROM ticket_bookings b')) return [pending ? [{ id: 'booking' }] : []];
        if (sql.includes('FROM reservations r')) return [reserved ? [{ id: 9 }] : []];
        if (sql.startsWith('SELECT')) return [[]];
        return [{ insertId: 8, affectedRows: 1 }];
    },
};
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { admin: { getConnection: async () => connection, execute: connection.execute } },
};
const model = require('../models/admin/adminLocationsModel');
beforeEach(() => { calls = []; pending = false; reserved = false; exists = true; });
const theater = { name: 'Theater 1', isOpen: true, maxSeats: 40, accessibleSeats: 2 };

test('lists all cinemas and theaters including closed ones', async () => {
    await model.list();
    assert.equal(calls.length, 2);
    assert.ok(calls.every((call) => !call.sql.includes('WHERE')));
});

test('prevents capacity changes with reservations but permits other edits', async () => {
    reserved = true;
    await assert.rejects(model.updateTheater(2, theater), { code: 'LOCATION_CONFLICT' });
    assert.ok(calls.some((call) => call.sql?.includes('FROM screenings WHERE auditorium_id = ? ORDER BY id FOR UPDATE')));
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('UPDATE auditoriums')), false);
    calls = [];
    assert.equal(await model.updateTheater(2, { ...theater, maxSeats: 30 }), true);
    assert.ok(calls.includes('commit'));
    assert.equal(calls.some((call) => call.sql?.includes('FROM reservations r')), false);
});

test('blocks deletion with pending payments for either location type', async () => {
    pending = true;
    for (const action of [() => model.deleteCinema(1), () => model.deleteTheater(2)]) {
        calls = [];
        await assert.rejects(action(), { code: 'LOCATION_CONFLICT' });
        assert.ok(calls.includes('rollback'));
        assert.ok(calls.includes('release'));
        assert.equal(calls.some((call) => call.sql?.startsWith('DELETE FROM')), false);
        assert.ok(calls.findIndex((call) => call.sql?.includes('FROM screenings WHERE auditorium_id')) <
            calls.findIndex((call) => call.sql?.includes('FROM ticket_bookings b')));
    }
});

test('locks every theater and screening before deleting a cinema', async () => {
    assert.equal(await model.deleteCinema(1), true);
    assert.deepEqual(calls.filter((call) => call.sql?.startsWith('SELECT id FROM screenings')).map((call) => call.params[0]), [2, 3]);
    assert.ok(calls.some((call) => call.sql?.startsWith('DELETE FROM cinemas')));
    assert.ok(calls.includes('commit'));
});

test('rejects theater creation for a missing cinema', async () => {
    exists = false;
    await assert.rejects(model.createTheater({ ...theater, cinemaId: 1 }), { code: 'LOCATION_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT')), false);
});
