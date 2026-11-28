const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authCookieOptions } = require('../../middleware/authCookie');
const { createRegisteredAccount } = require('../../models/authModel');
const { emailAddress } = require('../../helpers/validation/emailAddress');
const { normalizeUsername } = require('../../helpers/validation/username');

async function register(req, res) {
    const { username, password } = req.body || {};
    const normalizedUsername = normalizeUsername(username);
    const email = emailAddress(req.body && req.body.email);

    if (!normalizedUsername) {
        return res.status(400).json({
            error: 'Username must be 3–32 characters and contain only letters, numbers, dots, underscores or hyphens.',
        });
    }
    if (!email) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
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
        const user = await createRegisteredAccount(normalizedUsername, email, passwordHash);
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('authToken', token, authCookieOptions);
        return res.status(201).json({ role: user.role });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (/email/i.test(error.sqlMessage || '')) {
                return res.status(409).json({ error: 'That email address is already associated with an account.' });
            }
            return res.status(409).json({ error: 'That username is already taken.' });
        }
        console.error('Registration failed:', error.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Registration is unavailable. Please try again.' });
    }
}

module.exports = { register };
