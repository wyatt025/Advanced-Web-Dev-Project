const express = require('express');
const { login } = require('../../controllers/auth/loginHandler');
const { register } = require('../../controllers/auth/registrationHandler');
const { authCookieOptions } = require('../../middleware/authCookie');
const { authenticate } = require('../../middleware/authentication');

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/logout', (req, res) => {
    res.clearCookie('authToken', authCookieOptions);
    return res.status(204).end();
});
authRouter.get('/me', authenticate, (req, res) => {
    return res.json({ role: req.user.role, email: req.user.email });
});

module.exports = authRouter;
