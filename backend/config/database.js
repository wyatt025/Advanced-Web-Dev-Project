const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1', 
  database: 'riocinemadb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pools = {
  public: mysql.createPool({ ...poolConfig, user: 'app_public', password: process.env.APP_PUBLIC_PASS}),
  registered: mysql.createPool({ ...poolConfig, user: 'app_registered', password: process.env.APP_REGISTERED_PASS}),
  employee: mysql.createPool({ ...poolConfig, user: 'app_employee', password: process.env.APP_EMPLOYEE_PASS}),
  admin: mysql.createPool({ ...poolConfig, user: 'app_admin', password: process.env.APP_ADMIN_PASS}),
  auth: mysql.createPool({ ...poolConfig, user: 'app_auth', password: process.env.APP_AUTH_PASS}),
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
