const pools = require('../helpers/db');

async function getAccountForLogin(email) {
    const [rows] = await pools.auth.execute(
        'SELECT id, password, role FROM users WHERE email = ?', [email.trim()]
    );
    return rows[0];
}

module.exports = { getAccountForLogin };
