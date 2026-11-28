const express = require('express');
const userRouter = express.Router();
const userModel = require('../../models/user/publicUserModel');

//---- Routes for all users (including guests) --------
userRouter.get('/movies', async (req, res) => {
    try {
        return res.json(await userModel.getPublicMovies());
    } catch (err) {
        console.error('Public movie lookup failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not load movies' });
    }
});

userRouter.get('/movies/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid movie ID' });
    }

    try {
        const movies = await userModel.getPublicMovie(id);
        if (!movies.length) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        return res.json(movies);
    } catch (err) {
        console.error('Public movie lookup failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not load movie' });
    }
});

module.exports = userRouter;