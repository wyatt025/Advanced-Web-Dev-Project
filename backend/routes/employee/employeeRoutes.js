const express = require('express');
const employeeRouter = express.Router();
const employeeModel = require('../../models/employee/employeeModel');
const { authenticate, requireRole } = require('../../middleware/authentication');

employeeRouter.use(authenticate);
employeeRouter.use(requireRole('employee'));

employeeRouter.get('/reservations', async (req, res) => {
    try {
        const reservations = await employeeModel.getReservations(req.user.id);
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
employeeRouter.get('/reservations/:id', async (req, res) => {
    try {
        const reservation = await employeeModel.getReservationDetails(req.params.id);
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
employeeRouter.delete('/reservations/:id', async (req, res) => {
    try {
        const result = await employeeModel.cancelReservation(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
employeeRouter.get('/userinfo', async (req, res) => {
    try {
        const userInfo = await employeeModel.getUserInfo(req.user.id);
        res.json(userInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = employeeRouter;