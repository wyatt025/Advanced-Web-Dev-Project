const express = require('express');
const model = require('../../models/admin/adminLocationsModel');
const router = express.Router();

function id(value) {
    const result = Number(value);
    return Number.isSafeInteger(result) && result > 0 ? result : null;
}

function validate(body, kind, isNew) {
    if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255 ||
        typeof body.isOpen !== 'boolean') return null;
    const name = body.name.trim();
    if (kind === 'cinemas') {
        if (typeof body.address !== 'string' || body.address.trim().length > 255 ||
            typeof body.phone !== 'string' || body.phone.trim().length > 50) return null;
        return { name, isOpen: body.isOpen, address: body.address.trim() || null, phone: body.phone.trim() || null };
    }
    if (!Number.isSafeInteger(body.maxSeats) || body.maxSeats < 1 || body.maxSeats > 2147483647 ||
        !Number.isSafeInteger(body.accessibleSeats) || body.accessibleSeats < 0 ||
        body.accessibleSeats > body.maxSeats || (isNew && !id(body.cinemaId)) ||
        (!isNew && Object.hasOwn(body, 'cinemaId'))) return null;
    return { name, isOpen: body.isOpen, maxSeats: body.maxSeats, accessibleSeats: body.accessibleSeats,
        ...(isNew ? { cinemaId: id(body.cinemaId) } : {}) };
}

function handleError(res, error) {
    if (error.code === 'LOCATION_CONFLICT') return res.status(409).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A cinema with that name already exists.' });
    console.error('Location management failed:', error.code || 'UNKNOWN_ERROR');
    return res.status(500).json({ error: 'Could not manage locations.' });
}

router.get('/', async (req, res) => {
    try { return res.json(await model.list()); }
    catch (error) { return handleError(res, error); }
});

for (const kind of ['cinemas', 'theaters']) {
    const methods = kind === 'cinemas'
        ? { create: model.createCinema, update: model.updateCinema, remove: model.deleteCinema }
        : { create: model.createTheater, update: model.updateTheater, remove: model.deleteTheater };
    router.post(`/${kind}`, async (req, res) => {
        const data = validate(req.body, kind, true);
        if (!data) return res.status(400).json({ error: 'Enter valid location details and seat counts.' });
        try { return res.status(201).json({ id: await methods.create(data) }); }
        catch (error) { return handleError(res, error); }
    });
    router.put(`/${kind}/:id`, async (req, res) => {
        const locationId = id(req.params.id);
        const data = validate(req.body, kind, false);
        if (!locationId || !data) return res.status(400).json({ error: 'Enter valid location details and seat counts.' });
        try { return await methods.update(locationId, data) ? res.json({ updated: true }) : res.status(404).json({ error: 'Location not found.' }); }
        catch (error) { return handleError(res, error); }
    });
    router.delete(`/${kind}/:id`, async (req, res) => {
        const locationId = id(req.params.id);
        if (!locationId) return res.status(400).json({ error: 'Invalid location ID.' });
        try { return await methods.remove(locationId) ? res.json({ deleted: true }) : res.status(404).json({ error: 'Location not found.' }); }
        catch (error) { return handleError(res, error); }
    });
}

module.exports = router;
