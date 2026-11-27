const pools = require('../helpers/db');
const { MovieValidationError } = require('../helpers/validateMovie');
const { checkScreeningAvailability } = require('../helpers/screeningAvailability');

const userFields = 'id, username, name, email, phone, role, created_at';
const movieFields = [
    'price', 'imdb_id', 'title', 'release_year', 'rated', 'released_date',
    'runtime_minutes', 'coming_soon', 'genre', 'director', 'writer', 'actors', 'plot',
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
    const username = user.username || user.email;
    const [result] = await pools.auth.execute(
        'INSERT INTO users (username, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
        [username, user.name, user.email, user.phone ?? null, user.password, role]
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

async function deleteUser(id, role, actorId) {
    return require('./adminUsers_model').removeUser(id, actorId, role);
}

async function getMovieById(id) {
    const [rows] = await pools.admin.execute('SELECT * FROM movies WHERE id = ?', [id]);
    return rows[0];
}

const adminModel = {
//----- Admin Management -----------
    getAllAdmins: () => getUsersByRole('admin'),
    getAdminById: (id) => getUserById(id, 'admin'),
    createAdmin: (admin) => createUser(admin, 'admin'),
    updateAdmin: (id, admin) => updateUser(id, admin, 'admin'),
    deleteAdmin: (id, actorId) => deleteUser(id, 'admin', actorId),

//----- Cinema/Auditorium Management -----------
    getOpenAuditoriums: async () => {
        const [rows] = await pools.admin.execute(
                `SELECT a.id, a.name, a.maxSeats, a.accessibleSeats,
                c.id AS cinemaId, c.name AS cinemaName
                FROM auditoriums a
                JOIN cinemas c ON c.id = a.cinema_id
                WHERE a.isOpen = TRUE AND c.isOpen = TRUE
                ORDER BY c.name, a.name, a.id`
            );
        return rows;
    },

//----- Movie Management -----------
    getAllMovies: async () => {
        const [rows] = await pools.admin.execute('SELECT * FROM movies ORDER BY id DESC');
        return rows;
    },
    getDashboardMetrics: async () => {
        const [rows] = await pools.admin.execute(
            `SELECT
                (SELECT COUNT(*) FROM movies) AS movies,
                (SELECT COUNT(*) FROM screenings) AS screenings,
                (SELECT COUNT(*) FROM screenings WHERE date >= UTC_TIMESTAMP()) AS upcomingScreenings,
                (SELECT COUNT(*) FROM reservations) AS reservations,
                (SELECT COUNT(*) FROM cinemas) AS cinemas,
                (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
                (SELECT COUNT(*) FROM users WHERE role = 'employee') AS employees`
        );
        return rows[0];
    },
    getMovieById,
    createMovieWithScreenings: async (movie, screenings) => {
        const connection = await pools.admin.getConnection();
        let transactionStarted = false;

        try {
            await connection.beginTransaction();
            transactionStarted = true;

            const auditoriumIds = [...new Set(screenings.map((s) => s.auditoriumId))]
            .sort((a, b) => a - b);

            for (const id of auditoriumIds) {
            const [rows] = await connection.execute(
                `SELECT a.id
                FROM auditoriums a
                JOIN cinemas c ON c.id = a.cinema_id
                WHERE a.id = ? AND a.isOpen = TRUE AND c.isOpen = TRUE
                FOR UPDATE`,
                [id]
            );
            if (rows.length === 0) {
                throw new MovieValidationError('The selected auditorium is unavailable');
            }
        }

        const fields = movieFields.filter((field) => movie[field] !== undefined);
        const [result] = await connection.execute(
            `INSERT INTO movies (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
            fields.map((field) => movie[field])
        );

        for (const screening of screenings) {
            const [clock] = await connection.execute(
                'SELECT ? > UTC_TIMESTAMP() AS isFuture', [screening.date]
            );
            if (!clock[0].isFuture) {
                throw new MovieValidationError('Screening time must be in the future');
            }

            await checkScreeningAvailability(connection, screening, movie.runtime_minutes);
            await connection.execute(
                'INSERT INTO screenings (movie_id, auditorium_id, date) VALUES (?, ?, ?)',
                [result.insertId, screening.auditoriumId, screening.date]
            );
        }

        const [movies] = await connection.execute(
            'SELECT * FROM movies WHERE id = ?', [result.insertId]
        );
        await connection.commit();
        transactionStarted = false;
        return movies[0];
        } catch (err) {
            if (transactionStarted) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Movie transaction rollback failed:', rollbackError.code || 'UNKNOWN_ERROR');
                }
            }
            throw err;
        } finally {
        connection.release();
        }
    },
    createMovie: async (movie) => {
        const fields = movieFields.filter(field => movie[field] !== undefined);
        const [result] = await pools.admin.execute(
            `INSERT INTO movies (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
            fields.map(field => movie[field])
        );
        return getMovieById(result.insertId);
    },
    updateMovie: async (id, movie) => {
        const connection = await pools.admin.getConnection();
        let transactionStarted = false;
        try {
            await connection.beginTransaction();
            transactionStarted = true;
            const [screenings] = await connection.execute(
                'SELECT id, auditorium_id, date FROM screenings WHERE movie_id = ? ORDER BY auditorium_id, id',
                [id]
            );
            for (const auditoriumId of [...new Set(screenings.map((item) => item.auditorium_id))]) {
                await connection.execute('SELECT id FROM auditoriums WHERE id = ? FOR UPDATE', [auditoriumId]);
            }
            const [current] = await connection.execute('SELECT * FROM movies WHERE id = ? FOR UPDATE', [id]);
            if (!current.length) {
                await connection.commit();
                transactionStarted = false;
                return undefined;
            }
            if (movie.coming_soon !== Boolean(current[0].coming_soon)) {
                throw new MovieValidationError('Coming soon status cannot be changed here; manage screenings first');
            }
            if (movie.runtime_minutes !== current[0].runtime_minutes) {
                for (const screening of screenings) {
                    const [conflicts] = await connection.execute(
                        `SELECT s.id FROM screenings s
                         JOIN movies m ON m.id = s.movie_id
                         WHERE s.auditorium_id = ? AND s.id <> ?
                           AND s.date < DATE_ADD(?, INTERVAL ? MINUTE)
                           AND (m.runtime_minutes IS NULL OR m.runtime_minutes <= 0
                             OR DATE_ADD(s.date, INTERVAL
                               ((CASE WHEN s.movie_id = ? THEN ? ELSE m.runtime_minutes END) + 60) MINUTE) > ?)
                         LIMIT 1 FOR UPDATE`,
                        [screening.auditorium_id, screening.id, screening.date, movie.runtime_minutes + 60, id, movie.runtime_minutes, screening.date]
                    );
                    if (conflicts.length) {
                        const error = new Error('The new runtime conflicts with another screening in the same auditorium');
                        error.code = 'SCREENING_CONFLICT';
                        throw error;
                    }
                }
            }
            const fields = movieFields.filter((field) => field !== 'coming_soon' && movie[field] !== undefined);
            await connection.execute(
                `UPDATE movies SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
                [...fields.map((field) => movie[field]), id]
            );
            const [updated] = await connection.execute('SELECT * FROM movies WHERE id = ?', [id]);
            await connection.commit();
            transactionStarted = false;
            return updated[0];
        } catch (err) {
            if (transactionStarted) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Movie update rollback failed:', rollbackError.code || 'UNKNOWN_ERROR');
                }
            }
            throw err;
        } finally {
            connection.release();
        }
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
    deleteEmployee: (id, actorId) => deleteUser(id, 'employee', actorId),

//----- Registered Users Management -----------
    deleteUserById: (id, actorId) => deleteUser(id, 'user', actorId),
    deleteUserByName: async (name, actorId) => {
        // DB schema: users.name is not unique; reject ambiguous matches.
        const [rows] = await pools.admin.execute(
            'SELECT id FROM users WHERE name = ? AND role = ?', [name, 'user']
        );
        if (rows.length > 1) {
            const error = new Error('Multiple users have this name; delete by ID instead');
            error.code = 'AMBIGUOUS_USER_NAME';
            throw error;
        }
        return rows.length === 1 ? deleteUser(rows[0].id, 'user', actorId) : false;
    },
};

module.exports = adminModel;
