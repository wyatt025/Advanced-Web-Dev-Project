const pools = require('../helpers/db');
const { HOLD_GRACE_SECONDS, normalizeSeatIds, priceToCents } = require('../helpers/paymentSeats');

async function transaction(work) {
    const connection = await pools.auth.getConnection();
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
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Payment transaction rollback failed:', rollbackError.code || 'UNKNOWN_ERROR');
            }
        }
        throw error;
    } finally {
        connection.release();
    }
}

async function expireUnpaidReservations(connection, bookingId) {
    await connection.execute(
        `DELETE FROM reservations
         WHERE booking_id = ? AND isPaid = FALSE`,
        [bookingId]
    );
}

async function expireStaleBookings(connection, screeningId) {
    await connection.execute(
        `UPDATE ticket_bookings
         SET status = 'expired'
         WHERE screening_id = ?
           AND status = 'pending_payment'
           AND hold_expires_at <= UTC_TIMESTAMP()`,
        [screeningId]
    );
    await connection.execute(
        `DELETE r FROM reservations r
         JOIN ticket_bookings b ON b.id = r.booking_id
         WHERE b.screening_id = ?
           AND b.status IN ('expired', 'cancelled')
           AND r.isPaid = FALSE`,
        [screeningId]
    );
}

function formatUtcDateTime(epochSeconds) {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

const paymentModel = {
    createPendingBooking({ id, screeningId, seatIds, email, checkoutExpiresAt }) {
        return transaction(async (connection) => {
            const [screenings] = await connection.execute(
                `SELECT s.id, s.auditorium_id AS auditoriumId, m.title, m.price,
                        a.maxSeats AS seatCapacity, a.accessibleSeats AS accessibleSeatCount
                 FROM screenings s
                 JOIN movies m ON m.id = s.movie_id
                 JOIN auditoriums a ON a.id = s.auditorium_id
                 JOIN cinemas c ON c.id = a.cinema_id
                 WHERE s.id = ?
                   AND s.date > UTC_TIMESTAMP()
                   AND a.isOpen = TRUE
                   AND c.isOpen = TRUE
                 FOR UPDATE`,
                [screeningId]
            );
            if (!screenings.length) {
                const error = new Error('That screening is no longer available.');
                error.code = 'SCREENING_UNAVAILABLE';
                throw error;
            }

            const screening = screenings[0];
            const seats = normalizeSeatIds(seatIds, screening.seatCapacity, screening.accessibleSeatCount);
            const amountCents = priceToCents(screening.price);

            await expireStaleBookings(connection, screeningId);

            const placeholders = seats.map(() => '?').join(', ');
            const [takenSeats] = await connection.execute(
                `SELECT seatNumber FROM reservations
                 WHERE screening_id = ? AND seatNumber IN (${placeholders})
                 FOR UPDATE`,
                [screeningId, ...seats]
            );
            if (takenSeats.length) {
                const error = new Error('One or more selected seats are no longer available.');
                error.code = 'SEAT_UNAVAILABLE';
                throw error;
            }

            const holdExpiresAt = checkoutExpiresAt + HOLD_GRACE_SECONDS;
            await connection.execute(
                `INSERT INTO ticket_bookings
                    (id, screening_id, user_id, email, status, hold_expires_at)
                 VALUES (?, ?, NULL, ?, 'pending_payment', ?)`,
                [id, screeningId, email, formatUtcDateTime(holdExpiresAt)]
            );

            for (const seatNumber of seats) {
                await connection.execute(
                    `INSERT INTO reservations
                        (seatNumber, auditorium_id, user_id, screening_id, isPaid, booking_id)
                     VALUES (?, ?, NULL, ?, FALSE, ?)`,
                    [seatNumber, screening.auditoriumId, screeningId, id]
                );
            }

            return {
                id,
                title: screening.title,
                seatIds: seats,
                amountCents,
            };
        }).catch((error) => {
            if (error.code === 'ER_DUP_ENTRY') {
                error.code = 'SEAT_UNAVAILABLE';
                error.message = 'One or more selected seats are no longer available.';
            }
            throw error;
        });
    },

    async attachCheckoutSession(bookingId, sessionId) {
        const [result] = await pools.auth.execute(
            'UPDATE ticket_bookings SET stripe_checkout_session_id = ? WHERE id = ?',
            [sessionId, bookingId]
        );
        if (result.affectedRows !== 1) {
            throw new Error('Could not link the Stripe session to its booking.');
        }
    },

    cancelBooking(bookingId) {
        return transaction(async (connection) => {
            const [bookings] = await connection.execute(
                'SELECT status FROM ticket_bookings WHERE id = ? FOR UPDATE',
                [bookingId]
            );
            if (!bookings.length || bookings[0].status === 'paid') return;

            await connection.execute(
                `UPDATE ticket_bookings SET status = 'cancelled'
                 WHERE id = ? AND status = 'pending_payment'`,
                [bookingId]
            );
            await expireUnpaidReservations(connection, bookingId);
        });
    },

    getBooking(id) {
        return transaction(async (connection) => {
            await connection.execute(
                `UPDATE ticket_bookings
                 SET status = 'expired'
                 WHERE id = ?
                   AND status = 'pending_payment'
                   AND hold_expires_at <= UTC_TIMESTAMP()`,
                [id]
            );
            await connection.execute(
                `DELETE FROM reservations
                 WHERE booking_id = ?
                   AND isPaid = FALSE
                   AND EXISTS (
                       SELECT 1 FROM ticket_bookings
                       WHERE id = ? AND status IN ('expired', 'cancelled')
                   )`,
                [id, id]
            );

            const [rows] = await connection.execute(
                `SELECT b.id, b.status, r.seatNumber
                 FROM ticket_bookings b
                 LEFT JOIN reservations r ON r.booking_id = b.id
                 WHERE b.id = ?
                 ORDER BY r.seatNumber`,
                [id]
            );
            if (!rows.length) return null;
            return {
                id: rows[0].id,
                status: rows[0].status,
                seatIds: rows.filter((row) => row.seatNumber !== null).map((row) => row.seatNumber),
            };
        });
    },

    processStripeEvent(event) {
        return transaction(async (connection) => {
            const [inserted] = await connection.execute(
                `INSERT IGNORE INTO stripe_webhook_events (event_id, event_type)
                 VALUES (?, ?)`,
                [event.id, event.type]
            );
            if (inserted.affectedRows === 0) return { duplicate: true };

            const session = event.data && event.data.object;
            const bookingId = session && session.metadata && session.metadata.bookingId;
            if (!bookingId) return { duplicate: false };

            const [bookings] = await connection.execute(
                'SELECT status FROM ticket_bookings WHERE id = ? FOR UPDATE',
                [bookingId]
            );
            if (!bookings.length) return { duplicate: false };

            if ((event.type === 'checkout.session.completed' &&
                session.payment_status === 'paid') ||
                event.type === 'checkout.session.async_payment_succeeded') {
                if (bookings[0].status === 'pending_payment') {
                    const [reservations] = await connection.execute(
                        `UPDATE reservations SET isPaid = TRUE
                         WHERE booking_id = ? AND isPaid = FALSE`,
                        [bookingId]
                    );
                    if (reservations.affectedRows === 0) {
                        throw new Error('Paid booking has no pending seat reservations.');
                    }
                    await connection.execute(
                        `UPDATE ticket_bookings
                             SET status = 'paid', stripe_payment_intent_id = ?, paid_at = UTC_TIMESTAMP()
                         WHERE id = ? AND status = 'pending_payment'`,
                        [typeof session.payment_intent === 'string' ? session.payment_intent : null, bookingId]
                    );
                }
            } else if (event.type === 'checkout.session.expired' ||
                event.type === 'checkout.session.async_payment_failed') {
                await connection.execute(
                    `UPDATE ticket_bookings SET status = 'expired'
                     WHERE id = ? AND status = 'pending_payment'`,
                    [bookingId]
                );
                await expireUnpaidReservations(connection, bookingId);
            }

            return { duplicate: false };
        });
    },
};

module.exports = paymentModel;