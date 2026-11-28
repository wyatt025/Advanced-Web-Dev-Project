async function checkScreeningAvailability(connection, screening, runtimeMinutes, excludeId = 0) {
    const [conflicts] = await connection.execute(
        `SELECT s.id, m.runtime_minutes
         FROM screenings s
         JOIN movies m ON m.id = s.movie_id
         WHERE s.auditorium_id = ? AND s.id <> ?
           AND s.date < DATE_ADD(?, INTERVAL ? MINUTE)
           AND (m.runtime_minutes IS NULL OR m.runtime_minutes <= 0
                OR DATE_ADD(s.date, INTERVAL (m.runtime_minutes + 60) MINUTE) > ?)
         LIMIT 1 FOR UPDATE`,
        [screening.auditoriumId, excludeId, screening.date, runtimeMinutes + 60, screening.date]
    );
    if (conflicts.length) {
        const error = new Error(conflicts[0].runtime_minutes == null || conflicts[0].runtime_minutes <= 0
            ? 'An existing screening has no valid movie runtime; its availability cannot be checked'
            : 'The auditorium is already booked during this time');
        error.code = 'SCREENING_CONFLICT';
        throw error;
    }
}

module.exports = { checkScreeningAvailability };
