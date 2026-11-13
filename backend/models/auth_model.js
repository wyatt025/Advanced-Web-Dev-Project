const pools = require('../helpers/db');

async function getAccountForLogin(username) {
    const [rows] = await pools.auth.execute(
        'SELECT id, password, role FROM users WHERE username = ?', [username]
    );
    return rows[0];
}

module.exports = { getAccountForLogin };
