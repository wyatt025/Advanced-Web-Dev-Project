const express = require('express');
const userRouter = express.Router();
const userModel = require('../../models/user/registeredUserModel');

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
