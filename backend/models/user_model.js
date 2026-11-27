const pools = require('../helpers/db');

const publicMoviesQuery = `
    SELECT
        m.id,
        m.title,
        m.genre,
        m.rated AS rating,
        m.poster_url AS posterUrl,
        m.plot,
        m.actors,
        m.director,
        m.runtime_minutes AS runtimeMinutes,
        m.coming_soon AS comingSoon,
        m.price,
        s.id AS screeningId,
        DATE_FORMAT(s.date, '%Y-%m-%dT%H:%i:%s.000Z') AS screeningDate,
        a.id AS auditoriumId,
        a.name AS auditorium,
        a.maxSeats AS seatCapacity,
        a.accessibleSeats AS accessibleSeatCount,
        c.id AS cinemaId,
        c.name AS cinema,
        c.address AS cinemaAddress,
        taken.seatNumber AS takenSeat
    FROM movies m
    LEFT JOIN screenings s
        ON s.movie_id = m.id
        AND s.date >= UTC_TIMESTAMP()
        AND EXISTS (
            SELECT 1
            FROM auditoriums available_a
            JOIN cinemas available_c ON available_c.id = available_a.cinema_id
            WHERE available_a.id = s.auditorium_id
                AND available_a.isOpen = TRUE
                AND available_c.isOpen = TRUE
        )
    LEFT JOIN auditoriums a ON a.id = s.auditorium_id
    LEFT JOIN cinemas c ON c.id = a.cinema_id
    LEFT JOIN v_taken_seats taken ON taken.screening_id = s.id
`;

function groupPublicMovieRows(rows) {
    const moviesById = new Map();
    const screeningsById = new Map();

    for (const row of rows) {
        let movie = moviesById.get(row.id);
        if (!movie) {
            movie = {
                id: row.id,
                title: row.title,
                genre: row.genre,
                rating: row.rating,
                posterUrl: row.posterUrl,
                plot: row.plot,
                actors: row.actors,
                director: row.director,
                runtimeMinutes: row.runtimeMinutes,
                comingSoon: Boolean(row.comingSoon),
                price: row.price,
                screenings: [],
            };
            moviesById.set(row.id, movie);
        }

        if (row.screeningId !== null) {
            let screening = screeningsById.get(row.screeningId);
            if (!screening) {
                screening = {
                    id: row.screeningId,
                    date: row.screeningDate,
                    auditoriumId: row.auditoriumId,
                    auditorium: row.auditorium,
                    seatCapacity: row.seatCapacity,
                    accessibleSeatCount: row.accessibleSeatCount,
                    cinemaId: row.cinemaId,
                    cinema: row.cinema,
                    cinemaAddress: row.cinemaAddress,
                    takenSeats: [],
                };
                screeningsById.set(row.screeningId, screening);
                movie.screenings.push(screening);
            }
            if (row.takenSeat !== null && !screening.takenSeats.includes(row.takenSeat)) {
                screening.takenSeats.push(row.takenSeat);
            }
        }
    }

    return [...moviesById.values()];
}


const userModel = {
    getPublicMovies: async () => {
        const [rows] = await pools.public.execute(
            `${publicMoviesQuery} ORDER BY m.title, c.name, a.id, s.date`
        );
        return groupPublicMovieRows(rows);
    },
    getPublicMovie: async (id) => {
        const [rows] = await pools.public.execute(
            `${publicMoviesQuery} WHERE m.id = ? ORDER BY c.name, a.id, s.date`,
            [id]
        );
        return groupPublicMovieRows(rows);
    },
    getRegisteredProfile: async (userId) => {
        const [rows] = await pools.registered.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [userId]
        );
        if (!rows[0]) return null;

        const [ticketRows] = await pools.registered.execute(
            `SELECT b.id, b.total_amount_cents AS totalAmountCents,
                    m.title AS movieTitle,
                    DATE_FORMAT(s.date, '%Y-%m-%dT%H:%i:%s.000Z') AS screeningDate,
                    c.name AS cinemaName, a.name AS auditoriumName,
                    r.seatNumber
             FROM ticket_bookings b
             JOIN screenings s ON s.id = b.screening_id
             JOIN movies m ON m.id = s.movie_id
             JOIN auditoriums a ON a.id = s.auditorium_id
             JOIN cinemas c ON c.id = a.cinema_id
             LEFT JOIN reservations r ON r.booking_id = b.id AND r.isPaid = TRUE
             WHERE b.user_id = ? AND b.status = 'paid'
             ORDER BY s.date DESC, b.paid_at DESC, b.id, r.seatNumber`,
            [userId]
        );
        const ticketsById = new Map();
        for (const ticketRow of ticketRows) {
            let ticket = ticketsById.get(ticketRow.id);
            if (!ticket) {
                ticket = {
                    id: ticketRow.id,
                    totalAmountCents: ticketRow.totalAmountCents,
                    movieTitle: ticketRow.movieTitle,
                    screeningDate: ticketRow.screeningDate,
                    cinemaName: ticketRow.cinemaName,
                    auditoriumName: ticketRow.auditoriumName,
                    seatIds: [],
                };
                ticketsById.set(ticket.id, ticket);
            }
            if (ticketRow.seatNumber !== null) ticket.seatIds.push(ticketRow.seatNumber);
        }
        return { ...rows[0], tickets: [...ticketsById.values()] };
    },
};

module.exports = userModel;