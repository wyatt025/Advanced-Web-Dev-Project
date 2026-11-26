const crypto = require('crypto');
const pools = require('../helpers/db');
const { normalizeSeatIds } = require('../helpers/paymentSeats');

async function transaction(work) {
    const connection = await pools.admin.getConnection();
    let started = false;
    try {
        await connection.beginTransaction();
        started = true;
        const result = await work(connection);
        await connection.commit();
        started = false;
        return result;
    } catch (error) {
        if (started) {
            try { await connection.rollback(); }
            catch (rollbackError) { console.error('Reservation rollback failed:', rollbackError.code || 'UNKNOWN_ERROR'); }
        }
        throw error;
    } finally {
        connection.release();
    }
}

function conflict(message) {
    const error = new Error(message);
    error.code = 'RESERVATION_CONFLICT';
    return error;
}

module.exports = {
    async list() {
        const [rows] = await pools.admin.execute(
            `SELECT b.id, 'booking' AS kind, b.status, b.email, s.id AS screeningId, b.created_at AS createdAt,
                COALESCE(b.customer_name, u.name) AS customerName,
                COALESCE(b.customer_phone, u.phone) AS customerPhone,
                m.title, c.name AS cinema, a.name AS auditorium,
                CONCAT(DATE_FORMAT(s.date, '%Y-%m-%dT%H:%i:%s'), 'Z') AS screeningDate,
                r.seatNumber
             FROM ticket_bookings b
             JOIN screenings s ON s.id = b.screening_id
             JOIN movies m ON m.id = s.movie_id
             JOIN auditoriums a ON a.id = s.auditorium_id
             JOIN cinemas c ON c.id = a.cinema_id
             LEFT JOIN users u ON u.id = b.user_id
             LEFT JOIN reservations r ON r.booking_id = b.id
             UNION ALL
             SELECT r.id, 'seat', IF(r.isPaid, 'paid', 'unpaid'), u.email, s.id, r.created_at,
                u.name, u.phone, m.title, c.name, a.name,
                CONCAT(DATE_FORMAT(s.date, '%Y-%m-%dT%H:%i:%s'), 'Z'), r.seatNumber
             FROM reservations r
             JOIN screenings s ON s.id = r.screening_id
             JOIN movies m ON m.id = s.movie_id
             JOIN auditoriums a ON a.id = s.auditorium_id
             JOIN cinemas c ON c.id = a.cinema_id
             LEFT JOIN users u ON u.id = r.user_id
             WHERE r.booking_id IS NULL
             ORDER BY createdAt DESC, kind, id, seatNumber`
        );
        const bookings = new Map();
        for (const row of rows) {
            const key = `${row.kind}:${row.id}`;
            if (!bookings.has(key)) {
                const { seatNumber, ...booking } = row;
                bookings.set(key, { ...booking, seats: [] });
            }
            if (row.seatNumber !== null) bookings.get(key).seats.push(row.seatNumber);
        }
        return [...bookings.values()];
    },
    async searchUsers(query) {
        const [rows] = await pools.admin.execute(
            `SELECT id, name, email, phone FROM users
             WHERE role = 'user' AND (LOCATE(?, name) > 0 OR LOCATE(?, email) > 0)
             ORDER BY name, id LIMIT 20`, [query, query]
        );
        return rows;
    },
    async create(input) {
        return transaction(async (connection) => {
            const [screenings] = await connection.execute(
                `SELECT s.id, s.auditorium_id AS auditoriumId, a.maxSeats AS seatCapacity,
                        a.accessibleSeats AS accessibleSeatCount
                 FROM screenings s
                 JOIN auditoriums a ON a.id = s.auditorium_id
                 JOIN cinemas c ON c.id = a.cinema_id
                 WHERE s.id = ? AND s.date > UTC_TIMESTAMP() AND a.isOpen = TRUE AND c.isOpen = TRUE
                 FOR UPDATE`, [input.screeningId]
            );
            if (!screenings.length) throw conflict('That screening is no longer available.');
            const screening = screenings[0];
            const seats = normalizeSeatIds(input.seats, screening.seatCapacity, screening.accessibleSeatCount);
            if (input.userId) {
                const [users] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = ?', [input.userId, 'user']);
                if (!users.length) throw conflict('The selected customer no longer exists.');
            }
            await connection.execute(
                `UPDATE ticket_bookings SET status = 'expired'
                 WHERE screening_id = ? AND status = 'pending_payment' AND hold_expires_at <= UTC_TIMESTAMP()`,
                [input.screeningId]
            );
            await connection.execute(
                `DELETE r FROM reservations r JOIN ticket_bookings b ON b.id = r.booking_id
                 WHERE b.screening_id = ? AND b.status IN ('expired', 'cancelled') AND r.isPaid = FALSE`,
                [input.screeningId]
            );
            const placeholders = seats.map(() => '?').join(', ');
            const [taken] = await connection.execute(
                `SELECT seatNumber FROM reservations WHERE screening_id = ? AND seatNumber IN (${placeholders})`,
                [input.screeningId, ...seats]
            );
            if (taken.length) throw conflict('One or more selected seats are no longer available.');
            const id = crypto.randomUUID();
            await connection.execute(
                `INSERT INTO ticket_bookings
                 (id, screening_id, user_id, email, customer_name, customer_phone, status, hold_expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'unpaid', UTC_TIMESTAMP())`,
                [id, input.screeningId, input.userId || null, input.email, input.name, input.phone || null]
            );
            for (const seat of seats) {
                await connection.execute(
                    `INSERT INTO reservations (seatNumber, auditorium_id, user_id, screening_id, isPaid, booking_id)
                     VALUES (?, ?, ?, ?, FALSE, ?)`,
                    [seat, screening.auditoriumId, input.userId || null, input.screeningId, id]
                );
            }
            return { id };
        }).catch((error) => {
            if (error.code === 'ER_DUP_ENTRY') throw conflict('One or more selected seats are no longer available.');
            throw error;
        });
    },
    async delete(kind, id, expectedStatus) {
        return transaction(async (connection) => {
            if (kind === 'booking') {
                const [rows] = await connection.execute('SELECT status FROM ticket_bookings WHERE id = ? FOR UPDATE', [id]);
                if (!rows.length) return false;
                if (rows[0].status === 'pending_payment') throw conflict('Pending-payment bookings cannot be deleted while checkout may be active.');
                if (rows[0].status !== expectedStatus) throw conflict('The booking status changed. Reload and review it before deleting.');
                await connection.execute('DELETE FROM ticket_bookings WHERE id = ?', [id]);
            } else {
                const [rows] = await connection.execute('SELECT isPaid FROM reservations WHERE id = ? AND booking_id IS NULL FOR UPDATE', [id]);
                if (!rows.length) return false;
                if ((rows[0].isPaid ? 'paid' : 'unpaid') !== expectedStatus) throw conflict('The reservation status changed. Reload and review it before deleting.');
                await connection.execute('DELETE FROM reservations WHERE id = ? AND booking_id IS NULL', [id]);
            }
            return true;
        });
    },
};
