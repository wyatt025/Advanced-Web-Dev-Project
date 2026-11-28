const { test } = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        auth: {
            async execute(sql, params) {
                calls.push({ sql, params });
                if (sql.startsWith('INSERT')) return [{ insertId: 23 }];
                return [[{ id: 23, password: 'hash', role: 'user' }]];
            },
        },
    },
};

const { createRegisteredAccount, getAccountForLogin } = require('../models/authModel');

test('creates accounts using username, email and password with the default user role', async () => {
    const account = await createRegisteredAccount('customer', 'customer@example.com', 'bcrypt-hash');

    assert.deepEqual(account, { id: 23, role: 'user' });
    assert.equal(calls[0].sql, 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    assert.deepEqual(calls[0].params, ['customer', 'customer@example.com', 'bcrypt-hash']);
    assert.doesNotMatch(calls[0].sql, /role\s*[,)]/i);
});

test('looks up login credentials by the deployed username column', async () => {
    const account = await getAccountForLogin('customer');

    assert.deepEqual(account, { id: 23, password: 'hash', role: 'user' });
    assert.equal(calls[1].sql, 'SELECT id, password, role FROM users WHERE username = ?');
    assert.deepEqual(calls[1].params, ['customer']);
});
