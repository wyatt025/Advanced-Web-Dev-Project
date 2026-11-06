const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1', 
  database: 'riocinemadb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pools = {
  public: mysql.createPool({ ...poolConfig, user: 'app_public', password: 'CHANGE_ME_1' }),
  registered: mysql.createPool({ ...poolConfig, user: 'app_registered', password: 'CHANGE_ME_2' }),
  employee: mysql.createPool({ ...poolConfig, user: 'app_employee', password: 'CHANGE_ME_3' }),
  admin: mysql.createPool({ ...poolConfig, user: 'app_admin', password: 'CHANGE_ME_4' }),
  auth: mysql.createPool({ ...poolConfig, user: 'app_auth', password: 'CHANGE_ME_5' }),
};

// --- QUICK CONNECTION TESTER ---
(async () => {
  console.log(`Connecting to database at host: ${poolConfig.host}`);
  try {
    // Attempting a quick ping test using the 'public' pool
    const connection = await pools.public.getConnection();
    console.log('✅ Successfully connected to the MySQL pool cluster.');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error(`Error Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
  }
})();

module.exports = pools;
