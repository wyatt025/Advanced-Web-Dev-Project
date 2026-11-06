const express = require('express');
const {query} = require('../db'); //this will need to be updated later once the database connection is finalized
const adminRouter = express.Router();
const adminModel = require('../models/admin_model');
const bcrypt = require('bcrypt'); // for password hashing and comparison
const jwt = require('jsonwebtoken'); // for generating and verifying JSON Web Tokens

/*
admin login needs authentication and cryptographic password handling.
Admin needs to be able to add new movies to the database using the external API.
Admin should also be able to update and delete movies from the database.
Admin should also be able to view all movies and get details of a specific movie.
Admin should also be able to manage employees in the system. This includes adding, updating, and deleting employee records.
Admin should also be able to view all employees and get details of a specific employee.
Admin should also be able to view all admins and get details of a specific admin.
 */

//-------- NOTE: ROUTES MAY NEED UPDATING ONCE DATABASE SCHEMA IS FINALIZED


//----- Admin Management Routes -----------
adminRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await query('SELECT * FROM admins WHERE email = $1', [email]);
        if (admin.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const validPassword = await bcrypt.compare(password, admin.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jwt.sign({ id: admin.rows[0].id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

adminRouter.get('/', async (req, res) => {
    try {
        const result = await adminModel.getAllAdmins();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//----- Admin Management Routes -----------

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

adminRouter.post('/', async (req, res) => {
    try {
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
        if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            req.body.password = hashedPassword;
        }
        const result = await adminModel.updateAdmin(req.params.id, req.body);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        const result = await adminModel.createEmployee(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
adminRouter.put('/employees/:id', async (req, res) => {
    try {
        const result = await adminModel.updateEmployee(req.params.id, req.body);
        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
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

adminRouter.delete('/users/username/:username', async (req, res) => {
    try {
        const result = await adminModel.deleteUserByUsername(req.params.username);
        if (result) {
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { adminRouter };