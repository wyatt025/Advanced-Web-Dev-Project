const { test } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../helpers/db');
let conflict = false;
let calls = [];
const existing = { id: 3, title: 'Movie', runtime_minutes: 90, coming_soon: 0 };
const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, params) {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, auditorium_id, date')) {
            return [[{ id: 5, auditorium_id: 7, date: '2027-01-15 12:00:00' }]];
        }
        if (sql.startsWith('SELECT * FROM movies')) return [[existing]];
        if (sql.includes('SELECT s.id FROM screenings')) return [conflict ? [{ id: 6 }] : []];
        return [{ affectedRows: 1 }];
    },
};
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { admin: { getConnection: async () => connection } },
};
const adminModel = require('../models/admin_model');

test('updating runtime locks auditoriums and checks conflicts using the new runtime', async () => {
    calls = [];
    conflict = false;
    await adminModel.updateMovie(3, { title: 'Movie', runtime_minutes: 120, coming_soon: false });
    const lock = calls.findIndex((call) => call.sql?.includes('FROM auditoriums WHERE id = ? FOR UPDATE'));
    const check = calls.find((call) => call.sql?.includes('SELECT s.id FROM screenings'));
    assert.ok(lock >= 0);
    assert.ok(check.sql.includes('CASE WHEN s.movie_id'));
    assert.deepEqual(check.params, [7, 5, '2027-01-15 12:00:00', 180, 3, 120, '2027-01-15 12:00:00']);
    assert.ok(calls.includes('commit'));
    assert.ok(calls.includes('release'));
});

test('conflicting runtime rolls back without updating the movie', async () => {
    calls = [];
    conflict = true;
    await assert.rejects(
        adminModel.updateMovie(3, { title: 'Movie', runtime_minutes: 120, coming_soon: false }),
        { code: 'SCREENING_CONFLICT' }
    );
    assert.ok(calls.includes('rollback'));
    assert.ok(calls.includes('release'));
    assert.equal(calls.some((call) => call.sql?.startsWith('UPDATE movies')), false);
});

test('rejects coming soon changes when editing details', async () => {
    calls = [];
    conflict = false;
    await assert.rejects(
        adminModel.updateMovie(3, { title: 'Movie', runtime_minutes: 90, coming_soon: true }),
        { name: 'MovieValidationError' }
    );
    assert.ok(calls.includes('rollback'));
    assert.equal(calls.some((call) => call.sql?.startsWith('UPDATE movies')), false);
});
