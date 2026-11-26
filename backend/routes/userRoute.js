const express = require('express');
const userRouter = express.Router();
const userModel = require('../models/user_model');
const { authenticate, requireRole } = require('../middleware/token&roleAuth');

/*
There needs to be routes for guest such as:
viewing available movies and movie details without authentication.
purchasing tickets for movies.
creating a user account.

There also needs to be routes for registered users such as:
creating seat reservations for future movie showings.
viewing and managing their own reservations.

 */

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

//---- Routes for registered users --------
userRouter.use(authenticate);
userRouter.use(requireRole('user', 'admin'));

userRouter.get('/', async (req, res) => {
    try {
        const profile = await userModel.getRegisteredProfile(req.user.id);
        if (!profile) return res.status(404).json({ error: 'Account no longer exists' });
        return res.json(profile);
    } catch (error) {
        console.error('Registered profile lookup failed:', error.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not load your account' });
    }
});

module.exports = userRouter;