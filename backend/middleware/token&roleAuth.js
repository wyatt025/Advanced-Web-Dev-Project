const jwt = require('jsonwebtoken');
const pools = require('../helpers/db');

async function authenticate(req, res, next) {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (!decoded || !Number.isInteger(decoded.id) || decoded.id <= 0) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const [rows] = await pools.auth.execute(
            'SELECT id, role FROM users WHERE id = ?', [decoded.id]
        );
        if (!rows[0]) {
            return res.status(401).json({ error: 'Account no longer exists' });
        }
        req.user = rows[0];
        return next();
    } catch (err) {
        console.error('User lookup failed:', err);
        return res.status(500).json({ error: 'Could not verify access' });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return next();
    };
}

module.exports = { authenticate, requireRole };
