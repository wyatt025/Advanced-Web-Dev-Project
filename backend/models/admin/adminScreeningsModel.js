const pools = require('../../config/database');
const { MovieValidationError } = require('../../helpers/movies/validateMovie');
const { checkScreeningAvailability } = require('../../helpers/screenings/screeningAvailability');
const { transaction } = require('../../helpers/database/transaction');

const screeningFields = `s.id, s.movie_id AS movieId, s.auditorium_id AS auditoriumId,
    CONCAT(DATE_FORMAT(s.date, '%Y-%m-%dT%H:%i:%s'), 'Z') AS date,
    m.title, m.imdb_id AS imdbId, m.poster_url AS posterUrl, m.runtime_minutes AS runtimeMinutes,
    a.name AS auditorium, a.maxSeats AS seatCapacity, a.accessibleSeats AS accessibleSeatCount,
    c.id AS cinemaId, c.name AS cinema,
    (SELECT COUNT(*) FROM v_taken_seats taken WHERE taken.screening_id = s.id) AS reservationCount`;
const screeningJoins = `FROM screenings s JOIN movies m ON m.id = s.movie_id
    JOIN auditoriums a ON a.id = s.auditorium_id JOIN cinemas c ON c.id = a.cinema_id`;

async function lockAuditoriums(connection, ids, openIds = ids) {
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
        const [rows] = await connection.execute(
            `SELECT a.id, a.isOpen AS auditoriumOpen, c.isOpen AS cinemaOpen
             FROM auditoriums a JOIN cinemas c ON c.id = a.cinema_id
             WHERE a.id = ? FOR UPDATE`, [id]
        );
        if (!rows.length || (openIds.includes(id) && (!rows[0].auditoriumOpen || !rows[0].cinemaOpen))) {
            throw new MovieValidationError('The selected auditorium or cinema is unavailable');
        }
    }
}

async function lockMovies(connection, ids) {
    const movies = new Map();
    for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
        const [rows] = await connection.execute('SELECT id, runtime_minutes FROM movies WHERE id = ? FOR UPDATE', [id]);
        if (!rows.length) throw new MovieValidationError('The selected movie no longer exists');
        if (!Number.isSafeInteger(rows[0].runtime_minutes) || rows[0].runtime_minutes <= 0) {
            throw new MovieValidationError('The selected movie needs a valid runtime');
        }
        movies.set(id, rows[0]);
    }
    return movies;
}

async function checkFuture(connection, screening) {
    const [rows] = await connection.execute('SELECT ? > UTC_TIMESTAMP() AS isFuture', [screening.date]);
    if (!rows[0].isFuture) throw new MovieValidationError('Screening time must be in the future');
}

function checkQueue(screenings, movies) {
    for (let i = 0; i < screenings.length; i++) {
        const first = screenings[i];
        for (let j = 0; j < i; j++) {
            const second = screenings[j];
            if (first.auditoriumId !== second.auditoriumId) continue;
            const firstTime = Date.parse(first.date.replace(' ', 'T') + 'Z');
            const secondTime = Date.parse(second.date.replace(' ', 'T') + 'Z');
            if (firstTime < secondTime + (movies.get(second.movieId).runtime_minutes + 60) * 60000 &&
                secondTime < firstTime + (movies.get(first.movieId).runtime_minutes + 60) * 60000) {
                const error = new Error('Queued screenings conflict in the same auditorium');
                error.code = 'SCREENING_CONFLICT';
                throw error;
            }
        }
    }
}

async function validateBatch(connection, screenings, excludeId = 0) {
    await lockAuditoriums(connection, screenings.map((s) => s.auditoriumId));
    const movies = await lockMovies(connection, screenings.map((s) => s.movieId));
    checkQueue(screenings, movies);
    for (const screening of screenings) {
        await checkFuture(connection, screening);
        await checkScreeningAvailability(connection, screening, movies.get(screening.movieId).runtime_minutes, excludeId);
    }
}

module.exports = {
    async list() {
        const [rows] = await pools.admin.execute(
            `SELECT ${screeningFields} ${screeningJoins} ORDER BY s.date, s.id`
        );
        return rows;
    },
    async details(id) {
        const [rows] = await pools.admin.execute(`SELECT ${screeningFields} ${screeningJoins} WHERE s.id = ?`, [id]);
        if (!rows.length) return undefined;
        const [seats] = await pools.admin.execute('SELECT seatNumber FROM v_taken_seats WHERE screening_id = ?', [id]);
        return { ...rows[0], takenSeats: seats.map((seat) => seat.seatNumber).filter((seat) => seat !== null) };
    },
    async check(screenings, excludeId = 0) {
        return transaction(pools.admin, 'Screening', async (connection) => { await validateBatch(connection, screenings, excludeId); });
    },
    async create(screenings) {
        return transaction(pools.admin, 'Screening', async (connection) => {
            await validateBatch(connection, screenings);
            for (const screening of screenings) {
                await connection.execute('INSERT INTO screenings (movie_id, auditorium_id, date) VALUES (?, ?, ?)',
                    [screening.movieId, screening.auditoriumId, screening.date]);
            }
            for (const movieId of new Set(screenings.map((s) => s.movieId))) {
                await connection.execute('UPDATE movies SET coming_soon = FALSE WHERE id = ?', [movieId]);
            }
            return { created: screenings.length };
        });
    },
    async update(id, screening) {
        return transaction(pools.admin, 'Screening', async (connection) => {
            const [before] = await connection.execute('SELECT auditorium_id FROM screenings WHERE id = ?', [id]);
            if (!before.length) return false;
            await lockAuditoriums(connection, [before[0].auditorium_id, screening.auditoriumId], [screening.auditoriumId]);
            const movies = await lockMovies(connection, [screening.movieId]);
            const [rows] = await connection.execute(
                'SELECT id, movie_id, auditorium_id FROM screenings WHERE id = ? FOR UPDATE', [id]
            );
            if (!rows.length) return false;
            if (rows[0].auditorium_id !== before[0].auditorium_id) {
                const error = new Error('The screening changed; reload it and try again');
                error.code = 'SCREENING_CONFLICT';
                throw error;
            }
            const [reservations] = await connection.execute(
                'SELECT seatNumber FROM v_taken_seats WHERE screening_id = ? LIMIT 1', [id]
            );
            if (reservations.length && (rows[0].movie_id !== screening.movieId || rows[0].auditorium_id !== screening.auditoriumId)) {
                const error = new Error('A screening with reservations can only have its time changed');
                error.code = 'SCREENING_CONFLICT';
                throw error;
            }
            await checkFuture(connection, screening);
            await checkScreeningAvailability(connection, screening, movies.get(screening.movieId).runtime_minutes, id);
            await connection.execute('UPDATE screenings SET movie_id = ?, auditorium_id = ?, date = ? WHERE id = ?',
                [screening.movieId, screening.auditoriumId, screening.date, id]);
            await connection.execute('UPDATE movies SET coming_soon = FALSE WHERE id = ?', [screening.movieId]);
            return true;
        });
    },
    async delete(id) {
        const [result] = await pools.admin.execute('DELETE FROM screenings WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};
