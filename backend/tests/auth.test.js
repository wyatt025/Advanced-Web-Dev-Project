const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'test-secret';

let accounts;
const authModelPath = require.resolve('../models/auth_model');
require.cache[authModelPath] = {
    id: authModelPath,
    filename: authModelPath,
    loaded: true,
    exports: {
        async createRegisteredAccount(username, passwordHash) {
            if (accounts.some((account) => account.username === username)) {
                const error = new Error('Duplicate username');
                error.code = 'ER_DUP_ENTRY';
                throw error;
            }
            const account = { id: accounts.length + 1, username, password: passwordHash, role: 'user' };
            accounts.push(account);
            return { id: account.id, role: account.role };
        },
        async getAccountForLogin(username) {
            return accounts.find((account) => account.username === username);
        },
    },
};

const { login } = require('../middleware/login');
const { register } = require('../middleware/register');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.post('/auth/register', register);
app.post('/auth/login', login);

test('registers a username and allows it to log in with the created password', async (t) => {
    accounts = [];
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));
    const base = `http://127.0.0.1:${server.address().port}/auth`;

    const registration = await fetch(`${base}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '  customer_1  ', password: 'secure-password-1' }),
    });
    assert.equal(registration.status, 201);
    assert.deepEqual(await registration.json(), { role: 'user' });
    assert.match(registration.headers.get('set-cookie'), /authToken=.*HttpOnly/);
    assert.equal(accounts[0].username, 'customer_1');
    assert.notEqual(accounts[0].password, 'secure-password-1');
    assert.equal(await bcrypt.compare('secure-password-1', accounts[0].password), true);

    const loginResponse = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'customer_1', password: 'secure-password-1' }),
    });
    assert.equal(loginResponse.status, 200);
    assert.deepEqual(await loginResponse.json(), { role: 'user' });
    assert.match(loginResponse.headers.get('set-cookie'), /authToken=/);
});

test('registration rejects invalid or duplicate usernames', async (t) => {
    accounts = [{ id: 1, username: 'customer_1', password: 'hash', role: 'user' }];
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));
    const url = `http://127.0.0.1:${server.address().port}/auth/register`;
    const post = (body) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    assert.equal((await post({ username: 'x', password: 'secure-password-1' })).status, 400);
    const duplicate = await post({ username: 'customer_1', password: 'secure-password-1' });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: 'That username is already taken.' });
});
