const express = require('express');
const adminRouter = express.Router();
const adminModel = require('../../models/admin/adminManagementModel');
const { authenticate, requireRole } = require('../../middleware/authentication');

// All admin routes, including mounted feature routers, require an admin account.
adminRouter.use(authenticate);
adminRouter.use(requireRole('admin'));

// Feature routers.
adminRouter.use('/screenings', require('./adminScreeningsRoutes'));
adminRouter.use('/reservations', require('./adminReservationsRoutes'));
adminRouter.use('/locations', require('./adminLocationsRoutes'));
adminRouter.use('/users', require('./adminUsersRoutes'));
adminRouter.use('/movies', require('./adminMoviesRoutes'));

// Open auditorium lookup.
adminRouter.get('/auditoriums', async (req, res) => {
    try {
        const auditoriums = await adminModel.getOpenAuditoriums();
        return res.json(auditoriums);
    } catch (err) {
        console.error('Auditorium lookup failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not load auditoriums' });
    }
});

// Dashboard metrics.
adminRouter.get('/metrics', async (req, res) => {
    try {
        return res.json(await adminModel.getDashboardMetrics());
    } catch (err) {
        console.error('Dashboard metrics lookup failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not load dashboard metrics' });
    }
});

module.exports = { adminRouter };
