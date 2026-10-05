import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'elevate_db',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

/**
 * Execute a SQL query against the database.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
