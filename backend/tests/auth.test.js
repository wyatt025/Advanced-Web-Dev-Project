const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PENDING_PASSWORD } = require('../helpers/auth/accountSetup');

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_ORIGIN = 'http://example.test';

let accounts;
const authModelPath = require.resolve('../models/authModel');
require.cache[authModelPath] = {
    id: authModelPath,
    filename: authModelPath,
    loaded: true,
    exports: {
        async createRegisteredAccount(username, email, passwordHash) {
            if (accounts.some((account) => account.username === username)) {
                const error = new Error('Duplicate username');
                error.code = 'ER_DUP_ENTRY';
                throw error;
            }
            const account = { id: accounts.length + 1, username, email, password: passwordHash, role: 'user' };
            accounts.push(account);
            return { id: account.id, role: account.role };
        },
        async getAccountForLogin(username) {
            return accounts.find((account) => account.username === username);
        },
    },
};

const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        auth: {
            async execute(_, [id]) {
                const account = accounts.find((item) => item.id === id);
                return [account ? [{ id: account.id, role: account.role, email: account.email }] : []];
            },
        },
    },
};
const { checkOrigin } = require('../middleware/checkOrigin');
const authRouter = require('../routes/auth/authRoutes');
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(checkOrigin);
app.use('/auth', authRouter);

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
        headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_ORIGIN },
        body: JSON.stringify({
            username: '  customer_1  ',
            email: ' customer@example.com ',
            password: 'secure-password-1',
        }),
    });
    assert.equal(registration.status, 201);
    assert.deepEqual(await registration.json(), { role: 'user' });
    assert.match(registration.headers.get('set-cookie'), /authToken=.*HttpOnly/);
    assert.equal(accounts[0].username, 'customer_1');
    assert.equal(accounts[0].email, 'customer@example.com');
    assert.notEqual(accounts[0].password, 'secure-password-1');
    assert.equal(await bcrypt.compare('secure-password-1', accounts[0].password), true);

    const loginResponse = await fetch(`${base}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_ORIGIN },
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
        headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_ORIGIN },
        body: JSON.stringify(body),
    });

    const invalidUsername = await post({
        username: 'x',
        email: 'customer@example.com',
        password: 'secure-password-1',
    });
    assert.equal(invalidUsername.status, 400);
    assert.deepEqual(await invalidUsername.json(), {
        error: 'Username must be 3–32 characters and contain only letters, numbers, dots, underscores or hyphens.',
    });
    assert.equal((await post({
        username: 'customer_2',
        password: 'secure-password-1',
    })).status, 400);
    const duplicate = await post({
        username: 'customer_1',
        email: 'customer@example.com',
        password: 'secure-password-1',
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: 'That username is already taken.' });
});

test('accounts awaiting password setup cannot log in', async (t) => {
    accounts = [{ id: 1, username: 'pending', password: PENDING_PASSWORD, role: 'user' }];
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    for (const password of [PENDING_PASSWORD, 'some-password']) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Origin: process.env.FRONTEND_ORIGIN },
            body: JSON.stringify({ username: 'pending', password }),
        });

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('set-cookie'), null);
    }
});

test('auth router protects account details and preserves logout and origin checks', async (t) => {
    accounts = [{ id: 1, role: 'user', email: 'user@example.com' }];
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}/auth`;
    assert.equal((await fetch(`${base}/me`)).status, 401);
    assert.equal((await fetch(`${base}/me`, { headers: { Cookie: 'authToken=invalid' } })).status, 401);
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
    const response = await fetch(`${base}/me`, { headers: { Cookie: `authToken=${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { role: 'user', email: 'user@example.com' });
    assert.equal((await fetch(`${base}/logout`, { method: 'POST' })).status, 403);
    const logout = await fetch(`${base}/logout`, {
        method: 'POST',
        headers: { Origin: process.env.FRONTEND_ORIGIN, Cookie: `authToken=${token}` },
    });
    assert.equal(logout.status, 204);
    assert.ok(logout.headers.get('set-cookie').includes('authToken=;'));
    assert.ok(logout.headers.get('set-cookie').includes('HttpOnly'));
    assert.ok(logout.headers.get('set-cookie').includes('Path=/'));
});
