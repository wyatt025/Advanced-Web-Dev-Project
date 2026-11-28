const express = require('express');
const model = require('../../models/admin/adminReservationsModel');
const { emailAddress } = require('../../helpers/validation/emailAddress');
const router = express.Router();

function handleError(res, error) {
    if (error.code === 'RESERVATION_CONFLICT') return res.status(409).json({ error: error.message });
    if (error.code === 'INVALID_SEATS') return res.status(400).json({ error: error.message });
    console.error('Reservation management failed:', error.code || 'UNKNOWN_ERROR');
    return res.status(500).json({ error: 'Could not manage reservations.' });
}

router.get('/', async (req, res) => {
    try { return res.json(await model.list()); }
    catch (error) { return handleError(res, error); }
});
router.get('/users', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2 || query.length > 255) return res.status(400).json({ error: 'Enter at least two characters to search.' });
    try { return res.json(await model.searchUsers(query)); }
    catch (error) { return handleError(res, error); }
});
router.post('/', async (req, res) => {
    const { name, email, phone, userId, screeningId, seats } = req.body || {};
    const normalizedEmail = emailAddress(email);
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 255 || !normalizedEmail ||
        (phone != null && (typeof phone !== 'string' || phone.trim().length > 50)) ||
        (userId != null && (!Number.isSafeInteger(userId) || userId < 1)) ||
        !Number.isSafeInteger(screeningId) || screeningId < 1 ||
        !Array.isArray(seats) || !seats.length || seats.length > 500) {
        return res.status(400).json({ error: 'Enter valid customer details, a screening, and at least one seat.' });
    }
    try {
        return res.status(201).json(await model.create({
            name: name.trim(), email: normalizedEmail, phone: phone?.trim() || null,
            userId: userId || null, screeningId, seats,
        }));
    } catch (error) { return handleError(res, error); }
});
router.delete('/:kind/:id', async (req, res) => {
    const { kind, id } = req.params;
    // Booking IDs are UUIDs; older standalone reservations use numeric IDs.
    const validId = kind === 'booking'
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        : kind === 'seat' && Number.isSafeInteger(Number(id)) && Number(id) > 0;
    const status = req.body?.status;
    if (!validId || !['pending_payment', 'paid', 'expired', 'cancelled', 'unpaid'].includes(status)) {
        return res.status(400).json({ error: 'Invalid reservation or status.' });
    }
    try {
        const deleted = await model.delete(kind, id, status);
        return deleted ? res.json({ deleted: true }) : res.status(404).json({ error: 'Reservation not found.' });
    } catch (error) { return handleError(res, error); }
});

module.exports = router;
