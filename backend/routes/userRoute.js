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
userRouter.get('/movies', (req, res) => {
    // Logic to fetch and return available movies
    res.send("List of available movies");
});

userRouter.get('/movies/:id', (req, res) => {
    // Logic to fetch and return movie details by ID
    res.send(`Details of movie with ID: ${req.params.id}`);
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