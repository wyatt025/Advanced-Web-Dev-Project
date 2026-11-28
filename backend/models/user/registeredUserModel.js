const pools = require('../../config/database');

async function getRegisteredProfile(userId) {
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
}

module.exports = { getRegisteredProfile };
