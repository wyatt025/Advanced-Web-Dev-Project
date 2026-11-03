const query = require('../db');  //this will need to be updated later once the database connection is finalized

/*
Admin needs to be able to add new movies to the database using the external API.
Admin should also be able to update and delete movies from the database.
Admin should also be able to view all movies and get details of a specific movie.
Admin should also be able to manage employees in the system. This includes adding, updating, and deleting employee records.
Admin should also be able to view all employees and get details of a specific employee.
Admin should also be able to view all admins and get details of a specific admin.
 */

//--------- NOTE: FUNCTIONS WILL NEED UPDATING ONCE DATABASE SCHEMA IS FINALIZED

const adminModel = {
    getAllAdmins: async () => {
        const result = await query('SELECT * FROM users where role = $1', ['admin']);
        return result.rows;
    },
    getAdminById: async (id) => {
        const result = await query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'admin']);
        return result.rows[0];
    },
    createAdmin: async (admin) => {
        const result = await query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
            [admin.username, admin.password, 'admin']
        );
        return result.rows[0];
    },
    updateAdmin: async (id, admin) => {
        const result = await query(
            'UPDATE users SET username = $1, password = $2 WHERE id = $3 AND role = $4 RETURNING *',
            [admin.username, admin.password, id, 'admin']
        );
        return result.rows[0];
    },
    deleteAdmin: async (id) => {
        const result = await query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING *', [id, 'admin']);
        return result.rows[0];
    },
    getAllMovies: async () => {
        const result = await query('SELECT * FROM movies');
        return result.rows;
    },
    getMovieById: async (id) => {
        const result = await query('SELECT * FROM movies WHERE id = $1', [id]);
        return result.rows[0];
    },
    createMovie: async (movie) => {
        const result = await query(
            'INSERT INTO movies (title, description, release_date) VALUES ($1, $2, $3) RETURNING *',
            [movie.title, movie.description, movie.release_date]
        );
        return result.rows[0];
    },
    updateMovie: async (id, movie) => {
        const result = await query(
            'UPDATE movies SET title = $1, description = $2, release_date = $3 WHERE id = $4 RETURNING *',
            [movie.title, movie.description, movie.release_date, id]
        );
        return result.rows[0];
    },
    deleteMovie: async (id) => {
        const result = await query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    },
    getAllEmployees: async () => {
        const result = await query('SELECT * FROM employees');
        return result.rows;
    },
    getEmployeeById: async (id) => {
        const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
        return result.rows[0];
    },
    createEmployee: async (employee) => {
        const result = await query(
            'INSERT INTO employees (name, email, position) VALUES ($1, $2, $3) RETURNING *',
            [employee.name, employee.email, employee.position]
        );
        return result.rows[0];
    },
    updateEmployee: async (id, employee) => {
        const result = await query(
            'UPDATE employees SET name = $1, email = $2, position = $3 WHERE id = $4 RETURNING *',
            [employee.name, employee.email, employee.position, id]
        );
        return result.rows[0];
    },
    deleteEmployee: async (id) => {
        const result = await query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = adminModel;