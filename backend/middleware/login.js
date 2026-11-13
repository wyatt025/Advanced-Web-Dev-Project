const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authCookieOptions } = require('./authCookie');
const { getAccountForLogin } = require('../models/auth_model');

async function login(req, res) {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await getAccountForLogin(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('authToken', token, authCookieOptions);
        return res.json({ role: user.role });
    } catch (err) {
        console.error('Login failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Login is unavailable' });
    }
}

module.exports = { login };