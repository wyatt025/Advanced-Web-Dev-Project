const pools = require('../../config/database');
const { transaction } = require('../../helpers/database/transaction');

function conflict(message) {
    const error = new Error(message);
    error.code = 'LOCATION_CONFLICT';
    return error;
}

async function lockScreenings(connection, auditoriumIds) {
    for (const id of auditoriumIds) {
        await connection.execute('SELECT id FROM screenings WHERE auditorium_id = ? ORDER BY id FOR UPDATE', [id]);
    }
}

async function lockCinema(connection, id) {
    const [rows] = await connection.execute('SELECT id FROM cinemas WHERE id = ? FOR UPDATE', [id]);
    return rows.length > 0;
}

async function lockAuditorium(connection, id) {
    const [rows] = await connection.execute(
        'SELECT id, cinema_id AS cinemaId, maxSeats, accessibleSeats FROM auditoriums WHERE id = ? FOR UPDATE', [id]
    );
    return rows[0];
}

async function ensureNoPendingPayments(connection, auditoriumIds) {
    for (const id of auditoriumIds) {
        const [rows] = await connection.execute(
            `SELECT b.id FROM ticket_bookings b JOIN screenings s ON s.id = b.screening_id
             WHERE s.auditorium_id = ? AND b.status = 'pending_payment' LIMIT 1 FOR UPDATE`, [id]
        );
        if (rows.length) throw conflict('This location has a pending-payment booking and cannot be deleted while checkout may be active.');
    }
}

module.exports = {
    async list() {
        const [cinemas] = await pools.admin.execute(
            'SELECT id, name, address, phone, isOpen FROM cinemas ORDER BY name, id'
        );
        const [theaters] = await pools.admin.execute(
            `SELECT a.id, a.name, a.cinema_id AS cinemaId, c.name AS cinemaName,
                    a.isOpen, a.maxSeats, a.accessibleSeats
             FROM auditoriums a JOIN cinemas c ON c.id = a.cinema_id ORDER BY c.name, a.name, a.id`
        );
        return { cinemas, theaters };
    },
    async createCinema(data) {
        const [result] = await pools.admin.execute(
            'INSERT INTO cinemas (name, address, phone, isOpen) VALUES (?, ?, ?, ?)',
            [data.name, data.address, data.phone, data.isOpen]
        );
        return result.insertId;
    },
    async createTheater(data) {
        return transaction(pools.admin, 'Location', async (connection) => {
            if (!await lockCinema(connection, data.cinemaId)) throw conflict('The selected cinema no longer exists.');
            const [result] = await connection.execute(
                'INSERT INTO auditoriums (name, cinema_id, isOpen, maxSeats, accessibleSeats) VALUES (?, ?, ?, ?, ?)',
                [data.name, data.cinemaId, data.isOpen, data.maxSeats, data.accessibleSeats]
            );
            return result.insertId;
        });
    },
    async updateCinema(id, data) {
        return transaction(pools.admin, 'Location', async (connection) => {
            if (!await lockCinema(connection, id)) return false;
            await connection.execute('UPDATE cinemas SET name = ?, address = ?, phone = ?, isOpen = ? WHERE id = ?',
                [data.name, data.address, data.phone, data.isOpen, id]);
            return true;
        });
    },
    async updateTheater(id, data) {
        return transaction(pools.admin, 'Location', async (connection) => {
            const auditorium = await lockAuditorium(connection, id);
            if (!auditorium) return false;
            if (auditorium.maxSeats !== data.maxSeats || auditorium.accessibleSeats !== data.accessibleSeats) {
                await lockScreenings(connection, [id]);
                const [reservations] = await connection.execute(
                    `SELECT r.id FROM reservations r JOIN screenings s ON s.id = r.screening_id
                     WHERE s.auditorium_id = ? LIMIT 1 FOR UPDATE`, [id]
                );
                if (reservations.length) throw conflict('Seat counts cannot be changed while this theater has reservations.');
            }
            await connection.execute('UPDATE auditoriums SET name = ?, isOpen = ?, maxSeats = ?, accessibleSeats = ? WHERE id = ?',
                [data.name, data.isOpen, data.maxSeats, data.accessibleSeats, id]);
            return true;
        });
    },
    async deleteCinema(id) {
        return transaction(pools.admin, 'Location', async (connection) => {
            if (!await lockCinema(connection, id)) return false;
            const [rows] = await connection.execute('SELECT id FROM auditoriums WHERE cinema_id = ? ORDER BY id FOR UPDATE', [id]);
            const ids = rows.map((row) => row.id);
            await lockScreenings(connection, ids);
            await ensureNoPendingPayments(connection, ids);
            await connection.execute('DELETE FROM cinemas WHERE id = ?', [id]);
            return true;
        });
    },
    async deleteTheater(id) {
        return transaction(pools.admin, 'Location', async (connection) => {
            if (!await lockAuditorium(connection, id)) return false;
            await lockScreenings(connection, [id]);
            await ensureNoPendingPayments(connection, [id]);
            await connection.execute('DELETE FROM auditoriums WHERE id = ?', [id]);
            return true;
        });
    },
};
