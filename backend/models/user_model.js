const pools = require('../helpers/db');


const userModel = {
    createUser: async (userData) => {
        const { name, email, password } = userData;
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        const [result] = await pools.auth.execute(query, [name, email, password]);
        return { id: result.insertId, name, email };
    },
};

module.exports = userModel;