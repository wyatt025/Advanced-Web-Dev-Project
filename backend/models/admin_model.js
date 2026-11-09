const pools = require('../helpers/db');

const userFields = 'id, name, email, phone, role, created_at';
const movieFields = [
    'price', 'imdb_id', 'title', 'release_year', 'rated', 'released_date',
    'runtime_minutes', 'genre', 'director', 'writer', 'actors', 'plot',
    'languages', 'poster_url', 'rating_imdb', 'rating_rotten_tomatoes',
    'rating_metacritic',
];

async function getUsersByRole(role) {
    const [rows] = await pools.admin.execute(
        `SELECT ${userFields} FROM users WHERE role = ?`, [role]
    );
    return rows;
}

async function getUserById(id, role) {
    const [rows] = await pools.admin.execute(
        `SELECT ${userFields} FROM users WHERE id = ? AND role = ?`, [id, role]
    );
    return rows[0];
}

async function createUser(user, role) {
    // DB schema: role_admin lacks user INSERT privileges; this uses role_auth.
    const [result] = await pools.auth.execute(
        'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, user.phone ?? null, user.password, role]
    );
    return getUserById(result.insertId, role);
}

async function updateUser(id, user, role) {
    const fields = ['name', 'email', 'phone', 'password'].filter(
        field => user[field] !== undefined
    );
    if (fields.length === 0) {
        return getUserById(id, role);
    }

    // DB schema: role_admin lacks user UPDATE privileges; this uses role_auth.
    const [result] = await pools.auth.execute(
        `UPDATE users SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ? AND role = ?`,
        [...fields.map(field => user[field]), id, role]
    );
    return result.affectedRows ? getUserById(id, role) : undefined;
}

async function deleteUser(id, role) {
    // DB schema: grant DELETE on users under role_admin for these routes.
    const [result] = await pools.admin.execute(
        'DELETE FROM users WHERE id = ? AND role = ?', [id, role]
    );
    return result.affectedRows > 0;
}

async function getMovieById(id) {
    const [rows] = await pools.admin.execute('SELECT * FROM movies WHERE id = ?', [id]);
    return rows[0];
}

const adminModel = {
//----- Admin Management -----------
    getAdminForLogin: async (email) => {
        const [rows] = await pools.auth.execute(
            'SELECT id, password FROM users WHERE email = ? AND role = ?',
            [email, 'admin']
        );
        return rows[0];
    },

    getAllAdmins: () => getUsersByRole('admin'),
    getAdminById: (id) => getUserById(id, 'admin'),
    createAdmin: (admin) => createUser(admin, 'admin'),
    updateAdmin: (id, admin) => updateUser(id, admin, 'admin'),
    deleteAdmin: (id) => deleteUser(id, 'admin'),

//----- Movie Management -----------
    getAllMovies: async () => {
        const [rows] = await pools.admin.execute('SELECT * FROM movies');
        return rows;
    },
    getMovieById,
    createMovie: async (movie) => {
        const fields = movieFields.filter(field => movie[field] !== undefined);
        const [result] = await pools.admin.execute(
            `INSERT INTO movies (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
            fields.map(field => movie[field])
        );
        return getMovieById(result.insertId);
    },
    updateMovie: async (id, movie) => {
        const fields = movieFields.filter(field => movie[field] !== undefined);
        if (fields.length === 0) {
            return getMovieById(id);
        }
        const [result] = await pools.admin.execute(
            `UPDATE movies SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
            [...fields.map(field => movie[field]), id]
        );
        return result.affectedRows ? getMovieById(id) : undefined;
    },
    deleteMovie: async (id) => {
        const [result] = await pools.admin.execute('DELETE FROM movies WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

//----- Employee Management -----------
    getAllEmployees: () => getUsersByRole('employee'),
    getEmployeeById: (id) => getUserById(id, 'employee'),
    createEmployee: (employee) => createUser(employee, 'employee'),
    updateEmployee: (id, employee) => updateUser(id, employee, 'employee'),
    deleteEmployee: (id) => deleteUser(id, 'employee'),

//----- Registered Users Management -----------
    deleteUserById: (id) => deleteUser(id, 'user'),
    deleteUserByName: async (name) => {
        // DB schema: users.name is not unique; reject ambiguous matches.
        const [rows] = await pools.admin.execute(
            'SELECT id FROM users WHERE name = ? AND role = ?', [name, 'user']
        );
        if (rows.length > 1) {
            const error = new Error('Multiple users have this name; delete by ID instead');
            error.code = 'AMBIGUOUS_USER_NAME';
            throw error;
        }
        return rows.length === 1 ? deleteUser(rows[0].id, 'user') : false;
    },
};

module.exports = adminModel;
