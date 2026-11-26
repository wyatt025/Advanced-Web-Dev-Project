const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authCookieOptions } = require('./authCookie');
const { createRegisteredAccount } = require('../models/auth_model');

async function register(req, res) {
    const { username, password } = req.body || {};
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!/^[A-Za-z0-9._-]{3,32}$/.test(normalizedUsername)) {
        return res.status(400).json({
            error: 'Username must be 3–32 characters and contain only letters, numbers, dots, underscores or hyphens.',
        });
    }
    if (typeof password !== 'string' || password.length < 8 ||
        Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 bytes.' });
    }
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createRegisteredAccount(normalizedUsername, passwordHash);
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('authToken', token, authCookieOptions);
        return res.status(201).json({ role: user.role });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'That username is already taken.' });
        }
        console.error('Registration failed:', error.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Registration is unavailable. Please try again.' });
    }
}

module.exports = { register };
