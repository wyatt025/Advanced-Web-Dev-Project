const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const model = require('../../models/admin/adminUsersModel');
const { emailAddress } = require('../../helpers/validation/emailAddress');
const { normalizeUsername } = require('../../helpers/validation/username');
const { PENDING_PASSWORD } = require('../../helpers/auth/accountSetup');
const router = express.Router();

function validId(id) {
    return Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

function validate(body) {
    const username = normalizeUsername(body?.username);
    const email = emailAddress(body?.email);
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    if (!username || !email ||
        (body?.phone != null && typeof body.phone !== 'string') || phone.length > 50) return null;
    return { username, email, phone: phone || null };
}

function handleError(res, error) {
    if (error.code === 'USER_CONFLICT') return res.status(409).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That username or email is already in use.' });
    console.error('User management failed:', error.code || 'UNKNOWN_ERROR');
    return res.status(500).json({ error: 'Could not manage users.' });
}

router.get('/', async (req, res) => {
    try { return res.json(await model.list()); }
    catch (error) { return handleError(res, error); }
});

router.post('/', async (req, res) => {
    const user = validate(req.body);
    const role = req.body?.role;
    if (!user || !['user', 'employee', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Enter a valid username, email, phone and role.' });
    }
    if (role === 'admin' && req.body.adminConfirmation !== 'ADMIN') {
        return res.status(400).json({ error: 'Type ADMIN to confirm creating an administrator.' });
    }
    try {
        const generatedPassword = role === 'user' ? null : crypto.randomBytes(24).toString('base64url');
        const password = generatedPassword ? await bcrypt.hash(generatedPassword, 10) : PENDING_PASSWORD;
        const id = await model.create({ ...user, role, password });
        res.set('Cache-Control', 'no-store');
        return res.status(201).json({ id, ...(generatedPassword ? { generatedPassword } : {}) });
    } catch (error) { return handleError(res, error); }
});

router.put('/:id', async (req, res) => {
    const user = validate(req.body);
    if (!validId(req.params.id) || !user || Object.hasOwn(req.body, 'role')) {
        return res.status(400).json({ error: 'Enter valid user details. Account roles cannot be changed here.' });
    }
    try {
        return await model.update(Number(req.params.id), user)
            ? res.json({ updated: true }) : res.status(404).json({ error: 'User not found.' });
    } catch (error) { return handleError(res, error); }
});

router.delete('/:id', async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid user ID.' });
    try {
        return await model.removeUser(Number(req.params.id), req.user.id)
            ? res.json({ deleted: true }) : res.status(404).json({ error: 'User not found.' });
    } catch (error) { return handleError(res, error); }
});

module.exports = router;
