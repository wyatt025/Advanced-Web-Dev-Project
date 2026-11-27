const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../helpers/db');
let calls;
let users;
let pending;
const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, params) {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id, role')) return [users];
        if (sql.includes('FROM ticket_bookings')) return [pending];
        return [{ affectedRows: 1 }];
    },
};
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { admin: {
        getConnection: async () => connection,
        execute: async (sql, params) => { calls.push({ sql, params }); return [sql.startsWith('SELECT') ? [] : { insertId: 7, affectedRows: 1 }]; },
    } },
};
const model = require('../models/adminUsers_model');
beforeEach(() => { calls = []; users = [{ id: 2, role: 'user' }]; pending = []; });

test('lists only accounts in newest creation order', async () => {
    await model.list();
    assert.ok(calls[0].sql.includes("role IN ('user', 'employee', 'admin')"));
    assert.ok(calls[0].sql.includes('ORDER BY created_at DESC, id DESC'));
    assert.equal(calls[0].sql.includes('password'), false);
});

test('updates contact details without changing role or password', async () => {
    await model.update(2, { username: 'name', email: 'a@example.com', phone: null });
    assert.deepEqual(calls[0].params, ['name', 'a@example.com', null, 2]);
    assert.equal(calls[0].sql.includes('role'), false);
    assert.equal(calls[0].sql.includes('password'), false);
});

test('deletion locks the user and blocks pending bookings, including linked seats', async () => {
    pending = [{ id: 'booking' }];
    await assert.rejects(model.removeUser(2, 1), { code: 'USER_CONFLICT' });
    assert.ok(calls.some((call) => call.sql?.includes('FROM users WHERE id = ? FOR UPDATE')));
    assert.ok(calls.some((call) => call.sql?.includes('r.user_id = ?')));
    assert.equal(calls.some((call) => call.sql?.startsWith('DELETE')), false);
    assert.ok(calls.includes('rollback'));
    assert.ok(calls.includes('release'));
});

test('deletion prevents deleting self and respects legacy role restriction', async () => {
    await assert.rejects(model.removeUser(1, 1), { code: 'USER_CONFLICT' });
    assert.deepEqual(calls, []);
    assert.equal(await model.removeUser(2, 1, 'admin'), false);
    assert.equal(calls.some((call) => call.sql?.startsWith('DELETE')), false);
});

test('deletes a user when no payment is pending', async () => {
    assert.equal(await model.removeUser(2, 1), true);
    assert.ok(calls.some((call) => call.sql?.startsWith('DELETE FROM users')));
    assert.ok(calls.includes('commit'));
    assert.ok(calls.includes('release'));
});
