const express = require('express');
const adminRouter = express.Router();
const adminModel = require('../models/admin_model');
const { authenticate, requireRole } = require('../middleware/token&roleAuth');
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