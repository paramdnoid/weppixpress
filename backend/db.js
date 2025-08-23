import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  acquireTimeout: 60000,
  timeout: 60000,
  minimumIdle: 5,
  idleTimeout: 300000, // 5 minutes
  leakDetectionTimeout: 60000,
  reconnectOnServerTimeout: true,
  queryTimeout: 30000,
  compress: true,
  bigIntAsNumber: true,
  insertIdAsNumber: true,
  decimalAsNumber: true,
  checkDuplicate: false,
  // SSL Configuration (if needed)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

export default pool;