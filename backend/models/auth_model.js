const pools = require('../helpers/db');

async function getAccountForLogin(username) {
    const [rows] = await pools.auth.execute(
        'SELECT id, password, role FROM users WHERE username = ?', [username]
    );
    return rows[0];
}

async function createRegisteredAccount(username, passwordHash) {
    const [result] = await pools.auth.execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, passwordHash]
    );
    return { id: result.insertId, role: 'user' };
}

module.exports = { getAccountForLogin, createRegisteredAccount };
