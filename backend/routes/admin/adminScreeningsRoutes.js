const express = require('express');
const router = express.Router();
const model = require('../../models/admin/adminScreeningsModel');
const { validateScreenings } = require('../../helpers/screenings/validateScreenings');
const { MovieValidationError } = require('../../helpers/movies/validateMovie');

function id(value) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw new MovieValidationError('Invalid screening or movie ID');
    return number;
}

function batch(value) {
    if (!Array.isArray(value) || value.length === 0 || value.length > 200) {
        throw new MovieValidationError('Choose between 1 and 200 screenings');
    }
    const validated = validateScreenings(value, false);
    return validated.map((screening, index) => ({ ...screening, movieId: id(value[index].movieId) }));
}

function handleError(res, error) {
    if (error instanceof MovieValidationError) return res.status(400).json({ error: error.message });
    if (error.code === 'SCREENING_CONFLICT') return res.status(409).json({ error: error.message });
    console.error('Screening management failed:', error.code || 'UNKNOWN_ERROR');
    return res.status(500).json({ error: 'Could not manage screenings' });
}

router.get('/', async (req, res) => {
    try { return res.json(await model.list()); }
    catch (error) { return handleError(res, error); }
});
router.post('/check', async (req, res) => {
    try {
        const screenings = batch(req.body?.screenings);
        const excludeId = req.body.excludeId === undefined ? 0 : id(req.body.excludeId);
        await model.check(screenings, excludeId);
        return res.json({ available: true });
    } catch (error) { return handleError(res, error); }
});
router.post('/', async (req, res) => {
    try { return res.status(201).json(await model.create(batch(req.body?.screenings))); }
    catch (error) { return handleError(res, error); }
});
router.get('/:id', async (req, res) => {
    try {
        const result = await model.details(id(req.params.id));
        return result ? res.json(result) : res.status(404).json({ error: 'Screening not found' });
    } catch (error) { return handleError(res, error); }
});
router.put('/:id', async (req, res) => {
    try {
        const screenings = batch([req.body]);
        const result = await model.update(id(req.params.id), screenings[0]);
        return result ? res.json({ updated: true }) : res.status(404).json({ error: 'Screening not found' });
    } catch (error) { return handleError(res, error); }
});
router.delete('/:id', async (req, res) => {
    try {
        const result = await model.delete(id(req.params.id));
        return result ? res.json({ deleted: true }) : res.status(404).json({ error: 'Screening not found' });
    } catch (error) { return handleError(res, error); }
});

module.exports = router;
