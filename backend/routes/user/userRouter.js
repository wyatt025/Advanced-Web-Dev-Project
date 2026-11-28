const express = require('express');
const { authenticate, requireRole } = require('../../middleware/authentication');
const userRouter = express.Router();

userRouter.use(require('./publicUserRoutes'));
userRouter.use(authenticate);
userRouter.use(requireRole('user', 'admin'));
userRouter.use(require('./registeredUserRoutes'));

module.exports = userRouter;
