const express = require('express');
const adminRouter = express.Router();
const adminModel = require('../models/admin_model');
const { authenticate, requireRole } = require('../middleware/token&roleAuth');
const { movieSearcher } = require('../services/omdbService');
const { omdbContentFilter } = require('../helpers/movieMapper');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 



//-------- NOTE: ROUTES MAY NEED UPDATING ONCE DATABASE SCHEMA IS FINALIZED

//----- Admin Management Routes -----------
adminRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const admin = await adminModel.getAdminForLogin(email);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
        const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.use(authenticate);
adminRouter.use(requireRole('admin'));

adminRouter.get('/', async (req, res) => {
    try {
        const result = await adminModel.getAllAdmins();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/', async (req, res) => {
    try {
        if (!req.body || !req.body.name || !req.body.email || typeof req.body.password !== 'string' || !req.body.password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const adminData = { ...req.body, password: hashedPassword };
        const result = await adminModel.createAdmin(adminData);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.put('/:id', async (req, res) => {
    try {
        if (!req.body || (req.body.password !== undefined &&
            (typeof req.body.password !== 'string' || !req.body.password))) {
            return res.status(400).json({ error: 'Password must be a non-empty string' });
        }
        const adminData = { ...req.body };
        if (adminData.password !== undefined) {
            adminData.password = await bcrypt.hash(adminData.password, 10);
        }
        const result = await adminModel.updateAdmin(req.params.id, adminData);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// May fail: init.sql does not grant role_admin DELETE on users.
adminRouter.delete('/:id', async (req, res) => {
    try {
        const result = await adminModel.deleteAdmin(req.params.id);
        if (result) {
            res.json({ message: 'Admin deleted successfully' });
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//----- OMDb Search Routes -----
adminRouter.get('/movies/search', async (req, res) => {
    try {
        const { title } = req.query;

        // Query parameters arrive as strings; the service expects a number.
        const page = req.query.page === undefined ? 1 : Number(req.query.page);
        const results = await movieSearcher.searchMovie(title, page);

        return res.json(results);
    } catch (err) {
        if (err.code === 'INVALID_INPUT') {
            return res.status(400).json({ error: err.message });
        }
        if (err.code === 'NOT_FOUND') {
            return res.status(404).json({ error: 'No movies found' });
        }
        if (err.code === 'TIMEOUT') {
            return res.status(504).json({ error: 'Movie search timed out' });
        }

        // Log only a safe code, not a URL that could contain the API key.
        console.error('Movie search failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(502).json({ error: 'Movie search is unavailable' });
    }
});

adminRouter.post('/movies/import', async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ error: 'Request body is required' });
    }
    const { imdbID, price } = req.body;
    if (!imdbID) {
        return res.status(400).json({ error: 'IMDb ID is required' });
    }
    // Up to six digits before the decimal point and one or two after it.
    const priceFormat = /^\d{1,6}(\.\d{1,2})?$/;
    if (typeof price !== 'string' || !priceFormat.test(price) || Number(price) <= 0) {
        return res.status(400).json({
            error: 'Price must be positive and have at most two decimal places',
        });
    }

    let filteredData;
    try {
        const omdbData = await movieSearcher.getMovieById(imdbID);
        filteredData = omdbContentFilter(omdbData);
    } catch (err) {
        if (err.code === 'INVALID_INPUT') {
            return res.status(400).json({ error: 'Invalid IMDb ID' });
        }
        if (err.code === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Movie not found in OMDb' });
        }
        if (err.code === 'TIMEOUT') {
            return res.status(504).json({ error: 'Movie lookup timed out' });
        }
        if (err.code === 'PROVIDER_ERROR' || err.code === 'NETWORK_ERROR') {
            console.error('Movie lookup failed:', err.code);
            return res.status(502).json({ error: 'Movie lookup is unavailable' });
        }
        console.error('Movie import lookup failed:', err.code === 'CONFIG_ERROR' ? err.code : 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not import movie' });
    }

    filteredData.price = price;
    try {
        const result = await adminModel.createMovie(filteredData);
        return res.status(201).json(result);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Movie has already been imported' });
        }
        console.error('Movie import database operation failed:', err.code || 'UNKNOWN_ERROR');
        return res.status(500).json({ error: 'Could not save movie' });
    }
});


//----- Movie Management Routes -----------
adminRouter.get('/movies', async (req, res) => {
    try {
        const result = await adminModel.getAllMovies();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.get('/movies/:id', async (req, res) => {
    try {
        const result = await adminModel.getMovieById(req.params.id);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Movie not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.post('/movies', async (req, res) => {
    try {
        if (!req.body || typeof req.body.title !== 'string' || !req.body.title.trim()) {
            return res.status(400).json({ error: 'Movie title is required' });
        }
        const result = await adminModel.createMovie(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.put('/movies/:id', async (req, res) => {
    try {
        const result = await adminModel.updateMovie(req.params.id, req.body);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Movie not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.delete('/movies/:id', async (req, res) => {
    try {
        const result = await adminModel.deleteMovie(req.params.id);
        if (result) {
            res.json({ message: 'Movie deleted successfully' });
        } else {
            res.status(404).json({ error: 'Movie not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//----- Employee Management Routes -----------
adminRouter.get('/employees', async (req, res) => {
    try {
        const result = await adminModel.getAllEmployees();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
adminRouter.get('/employees/:id', async (req, res) => {
    try {
        const result = await adminModel.getEmployeeById(req.params.id);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
adminRouter.post('/employees', async (req, res) => {
    try {
        if (!req.body || !req.body.name || !req.body.email || typeof req.body.password !== 'string' || !req.body.password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const result = await adminModel.createEmployee({ ...req.body, password: hashedPassword });
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
adminRouter.put('/employees/:id', async (req, res) => {
    try {
        if (!req.body || (req.body.password !== undefined &&
            (typeof req.body.password !== 'string' || !req.body.password))) {
            return res.status(400).json({ error: 'Password must be a non-empty string' });
        }
        const employeeData = { ...req.body };
        if (employeeData.password !== undefined) {
            employeeData.password = await bcrypt.hash(employeeData.password, 10);
        }
        const result = await adminModel.updateEmployee(req.params.id, employeeData);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// May fail: init.sql does not grant role_admin DELETE on users.
adminRouter.delete('/employees/:id', async (req, res) => {
    try {
        const result = await adminModel.deleteEmployee(req.params.id);
        if (result) {
            res.json({ message: 'Employee deleted successfully' });
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//----- Registered Users Management Routes -----------
// May fail: init.sql does not grant role_admin DELETE on users.
adminRouter.delete('/users/:id', async (req, res) => {
    try {
        const result = await adminModel.deleteUserById(req.params.id);
        if (result) {
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// May fail: init.sql does not grant role_admin DELETE on users; names can also be ambiguous.
adminRouter.delete(['/users/name/:name', '/users/username/:name'], async (req, res) => {
    try {
        // DB schema: users.name is not unique; the username path is retained for compatibility.
        const result = await adminModel.deleteUserByName(req.params.name);
        if (result) {
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        if (err.code === 'AMBIGUOUS_USER_NAME') {
            return res.status(409).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

adminRouter.get('/:id', async (req, res) => {
    try {
        const result = await adminModel.getAdminById(req.params.id);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { adminRouter };