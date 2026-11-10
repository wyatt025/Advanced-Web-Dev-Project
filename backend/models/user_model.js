const pools = require('../helpers/db');


const userModel = {
    createUser: async (userData) => {
        const { name, email, password } = userData;
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        const [result] = await pools.auth.execute(query, [name, email, password]);
        return { id: result.insertId, name, email };
    },
    getUserForLogin: async (email) => {
        const [rows] = await pools.auth.execute(
            'SELECT id, password FROM users WHERE email = ? AND role = ?',
            [email, 'user']
        );
        return rows[0];
    },
    

};

module.exports = userModel;