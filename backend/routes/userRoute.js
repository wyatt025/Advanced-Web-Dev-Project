const express = require('express');
const userRouter = express.Router();
const userModel = require('../models/user_model');
const { authenticate, requireRole } = require('../middleware/token&roleAuth');
const bcrypt = require('bcrypt'); 

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

userRouter.post('/purchase', (req, res) => {
    // Logic to handle ticket purchase
    res.send("Ticket purchased successfully");
});

userRouter.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const userData = { name, email, password: hashedPassword };
        const result = await userModel.createUser(userData);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//---- Routes for registered users --------
userRouter.use(authenticate);
userRouter.use(requireRole('user'));

userRouter.get('/', (req, res) => {
    res.send("User Router Working");
});

module.exports = userRouter;