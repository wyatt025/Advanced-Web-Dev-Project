const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../helpers/db');
let calls;
let bookingStatus;
let taken;
let listRows;
const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, params) {
        calls.push({ sql, params });
        if (sql.includes('s.auditorium_id AS auditoriumId')) return [[{ id: 5, auditoriumId: 7, seatCapacity: 20, accessibleSeatCount: 2 }]];
        if (sql.startsWith('SELECT seatNumber FROM reservations')) return [taken ? [{ seatNumber: 1 }] : []];
        if (sql.startsWith('SELECT status FROM ticket_bookings')) return [[{ status: bookingStatus }]];
        if (sql.startsWith('SELECT id FROM users')) return [[{ id: 2 }]];
        return [{ affectedRows: 1 }];
    },
};
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { admin: { getConnection: async () => connection, execute: async (sql, params) => { calls.push({ sql, params }); return [listRows]; } } },
};
const model = require('../models/adminReservations_model');
beforeEach(() => { calls = []; bookingStatus = 'unpaid'; taken = false; listRows = []; });
const input = { name: 'Customer', email: 'customer@example.com', phone: null, userId: 2, screeningId: 5, seats: [1, 2] };

test('creates an unpaid booking and its seats under a screening lock', async () => {
    const result = await model.create(input);
    assert.ok(result.id);
    assert.ok(calls.find((call) => call.sql?.includes('FOR UPDATE') && call.sql.includes('FROM screenings')));
    assert.equal(calls.filter((call) => call.sql?.startsWith('INSERT INTO reservations')).length, 2);
    assert.ok(calls.some((call) => call.sql?.includes("'unpaid'")));
    assert.ok(calls.includes('commit'));
    assert.ok(calls.includes('release'));
});

test('rolls back when a seat is taken or invalid', async () => {
    taken = true;
    await assert.rejects(model.create(input), { code: 'RESERVATION_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT INTO ticket_bookings')), false);
    calls = [];
    await assert.rejects(model.create({ ...input, seats: [13] }), { code: 'INVALID_SEATS' });
    assert.ok(calls.includes('rollback'));
});

test('blocks pending payment and changed statuses before deletion', async () => {
    bookingStatus = 'pending_payment';
    await assert.rejects(model.delete('booking', 'id', 'pending_payment'), { code: 'RESERVATION_CONFLICT' });
    assert.equal(calls.some((call) => call.sql?.startsWith('DELETE FROM ticket_bookings')), false);
    calls = [];
    bookingStatus = 'paid';
    await assert.rejects(model.delete('booking', 'id', 'unpaid'), { code: 'RESERVATION_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    calls = [];
    assert.equal(await model.delete('booking', 'id', 'paid'), true);
    assert.ok(calls.some((call) => call.sql?.startsWith('DELETE FROM ticket_bookings')));
});

test('groups seats by booking while preserving standalone reservations', async () => {
    listRows = [
        { id: 'abc', kind: 'booking', status: 'paid', seatNumber: 1 },
        { id: 'abc', kind: 'booking', status: 'paid', seatNumber: 2 },
        { id: '4', kind: 'seat', status: 'unpaid', seatNumber: 5 },
        { id: 'expired', kind: 'booking', status: 'expired', seatNumber: null },
    ];
    assert.deepEqual(await model.list(), [
        { id: 'abc', kind: 'booking', status: 'paid', seats: [1, 2] },
        { id: '4', kind: 'seat', status: 'unpaid', seats: [5] },
        { id: 'expired', kind: 'booking', status: 'expired', seats: [] },
    ]);
    assert.ok(calls[0].sql.includes('COALESCE(b.customer_name, u.username) AS customerName'));
    assert.ok(calls[0].sql.includes('u.username, u.phone'));
});

test('searches registered customers by username and returns it as name', async () => {
    listRows = [{ id: 2, name: 'customer', email: 'customer@example.com', phone: null }];
    assert.deepEqual(await model.searchUsers('customer'), listRows);
    assert.ok(calls[0].sql.includes('username AS name'));
    assert.ok(calls[0].sql.includes('LOCATE(?, username)'));
    assert.ok(calls[0].sql.includes('ORDER BY username, id'));
    assert.deepEqual(calls[0].params, ['customer', 'customer']);
});

test('orders bookings and standalone reservations by creation time, newest first', async () => {
    listRows = [
        { id: 'new', kind: 'booking', createdAt: '2026-11-26 12:00:00', seatNumber: 1 },
        { id: 'old', kind: 'seat', createdAt: '2026-11-25 12:00:00', seatNumber: 2 },
    ];
    const result = await model.list();
    assert.deepEqual(result.map((item) => item.id), ['new', 'old']);
    assert.match(calls[0].sql, /b\.created_at AS createdAt/);
    assert.match(calls[0].sql, /u\.email, s\.id, r\.created_at/);
    assert.match(calls[0].sql, /ORDER BY createdAt DESC, kind, id, seatNumber/);
});
