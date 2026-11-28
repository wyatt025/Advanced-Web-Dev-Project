const pools = require('../config/database');

async function getAccountForLogin(username) {
    const [rows] = await pools.auth.execute(
        'SELECT id, password, role FROM users WHERE username = ?', [username]
    );
    return rows[0];
}

async function createRegisteredAccount(username, email, passwordHash) {
    const [result] = await pools.auth.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, passwordHash]
    );
    return { id: result.insertId, role: 'user' };
}

module.exports = { getAccountForLogin, createRegisteredAccount };
