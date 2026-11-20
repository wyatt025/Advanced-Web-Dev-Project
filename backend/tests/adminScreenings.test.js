const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');
const { validateScreenings } = require('../helpers/validateScreenings');

const dbPath = require.resolve('../helpers/db');
let calls;
let conflict;
let reservations;
let current;
let open;
const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, params) {
        calls.push({ sql, params });
        if (sql.includes('FROM auditoriums a JOIN cinemas c')) {
            return [[{ id: params[0], auditoriumOpen: open, cinemaOpen: open }]];
        }
        if (sql.startsWith('SELECT id, runtime_minutes FROM movies')) {
            return [[{ id: params[0], runtime_minutes: 90 }]];
        }
        if (sql.startsWith('SELECT ? > UTC_TIMESTAMP()')) return [[{ isFuture: 1 }]];
        if (sql.includes('SELECT s.id, m.runtime_minutes')) return [conflict ? [{ id: 99, runtime_minutes: 90 }] : []];
        if (sql.startsWith('SELECT auditorium_id FROM screenings')) return [[{ auditorium_id: current.auditorium_id }]];
        if (sql.startsWith('SELECT id, movie_id, auditorium_id')) return [[current]];
        if (sql.startsWith('SELECT seatNumber FROM v_taken_seats')) return [reservations ? [{ seatNumber: 10 }] : []];
        return [{ affectedRows: 1 }];
    },
};
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { admin: { getConnection: async () => connection } },
};
const model = require('../models/adminScreenings_model');
const screening = { movieId: 1, auditoriumId: 2, date: '2035-01-15 12:00:00' };
beforeEach(() => {
    calls = [];
    conflict = false;
    reservations = false;
    current = { id: 4, movie_id: 1, auditorium_id: 2 };
    open = true;
});

test('batch locks auditoriums in order, saves all and clears coming soon', async () => {
    const result = await model.create([screening, { ...screening, auditoriumId: 1 }]);
    assert.deepEqual(result, { created: 2 });
    const locks = calls.filter((call) => call.sql?.includes('FROM auditoriums a JOIN cinemas c'));
    assert.deepEqual(locks.map((call) => call.params[0]), [1, 2]);
    assert.equal(calls.filter((call) => call.sql?.startsWith('INSERT INTO screenings')).length, 2);
    assert.equal(calls.filter((call) => call.sql?.startsWith('UPDATE movies SET coming_soon')).length, 1);
    assert.ok(calls.includes('commit'));
    assert.ok(calls.includes('release'));
});

test('conflicts within the queue fail before insertion', async () => {
    await assert.rejects(model.create([screening, { ...screening, date: '2035-01-15 14:29:00' }]), { code: 'SCREENING_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT INTO screenings')), false);
    calls = [];
    await model.check([screening, { ...screening, date: '2035-01-15 14:30:00' }]);
    assert.ok(calls.includes('commit'));
});

test('database conflicts reject both queue check and final save without inserts', async () => {
    conflict = true;
    await assert.rejects(model.check([screening]), { code: 'SCREENING_CONFLICT' });
    calls = [];
    await assert.rejects(model.create([screening]), { code: 'SCREENING_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('INSERT INTO screenings')), false);
});

test('closed auditoriums are rejected', async () => {
    open = false;
    await assert.rejects(model.create([screening]), { name: 'MovieValidationError' });
    assert.ok(calls.includes('rollback'));
});

test('reserved screening allows time change but rejects movie or auditorium changes', async () => {
    reservations = true;
    assert.equal(await model.update(4, screening), true);
    const check = calls.find((call) => call.sql?.includes('SELECT s.id, m.runtime_minutes'));
    assert.equal(check.params[1], 4);
    calls = [];
    await assert.rejects(model.update(4, { ...screening, movieId: 3 }), { code: 'SCREENING_CONFLICT' });
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('UPDATE screenings')), false);
    calls = [];
    await assert.rejects(model.update(4, { ...screening, auditoriumId: 3 }), { code: 'SCREENING_CONFLICT' });
});

test('validates Finnish time and rejects nonexistent and ambiguous DST times', () => {
    const spring = DateTime.fromISO('2035-03-25T03:30', { zone: 'Europe/Helsinki' });
    const autumn = DateTime.fromISO('2035-10-28T03:30', { zone: 'Europe/Helsinki' });
    assert.throws(() => validateScreenings([{ auditoriumId: 2, localStart: '2035-03-25T03:30' }], false), /valid, unambiguous/);
    assert.equal(spring.hour, 4);
    assert.equal(autumn.getPossibleOffsets().length, 2);
    assert.throws(() => validateScreenings([{ auditoriumId: 2, localStart: '2035-10-28T03:30' }], false), /valid, unambiguous/);
    assert.deepEqual(validateScreenings([{ auditoriumId: 2, localStart: '2035-01-15T14:00' }], false),
        [{ auditoriumId: 2, date: '2035-01-15 12:00:00' }]);
});
