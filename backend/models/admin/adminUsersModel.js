const pools = require('../../config/database');

const fields = "id, username, email, phone, role, CONCAT(DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s'), 'Z') AS createdAt";

async function removeUser(id, actorId, expectedRole) {
    if (Number(id) === Number(actorId)) {
        const error = new Error('You cannot delete your own account.');
        error.code = 'USER_CONFLICT';
        throw error;
    }
    const connection = await pools.admin.getConnection();
    let started = false;
    try {
        await connection.beginTransaction();
        started = true;
        const [users] = await connection.execute(
            'SELECT id, role FROM users WHERE id = ? FOR UPDATE', [id]
        );
        if (!users.length || (expectedRole && users[0].role !== expectedRole)) {
            await connection.commit();
            started = false;
            return false;
        }
        const [pending] = await connection.execute(
            `SELECT b.id FROM ticket_bookings b
             WHERE b.status = 'pending_payment' AND
                 (b.user_id = ? OR EXISTS
                     (SELECT 1 FROM reservations r WHERE r.booking_id = b.id AND r.user_id = ?))
             LIMIT 1 FOR UPDATE`, [id, id]
        );
        if (pending.length) {
            const error = new Error('This user has a pending-payment booking and cannot be deleted while checkout may be active.');
            error.code = 'USER_CONFLICT';
            throw error;
        }
        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        await connection.commit();
        started = false;
        return true;
    } catch (error) {
        if (started) {
            try { await connection.rollback(); }
            catch (rollbackError) { console.error('User deletion rollback failed:', rollbackError.code || 'UNKNOWN_ERROR'); }
        }
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    async list() {
        const [rows] = await pools.admin.execute(
            `SELECT ${fields} FROM users WHERE role IN ('user', 'employee', 'admin') ORDER BY created_at DESC, id DESC`
        );
        return rows;
    },
    async create(user) {
        const [result] = await pools.admin.execute(
            'INSERT INTO users (username, email, phone, role, password) VALUES (?, ?, ?, ?, ?)',
            [user.username, user.email, user.phone, user.role, user.password]
        );
        return result.insertId;
    },
    async update(id, user) {
        const [result] = await pools.admin.execute(
            'UPDATE users SET username = ?, email = ?, phone = ? WHERE id = ?',
            [user.username, user.email, user.phone, id]
        );
        return result.affectedRows > 0;
    },
    removeUser,
};
