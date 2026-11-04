import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvLocalPath = path.resolve(__dirname, '../../../.env.local');

// 1. Always load server/.env first (local elevate_db credentials and platform config)
dotenv.config({ path: serverEnvPath });
dotenv.config(); // fallback to cwd .env

const isProduction = process.env.NODE_ENV === 'production';
const useRemoteDb = isProduction || process.env.USE_REMOTE_DB === 'true';

// 2. Load .env.local only when explicitly targeting remote/production database
if (useRemoteDb) {
  dotenv.config({ path: rootEnvLocalPath, override: true });
}

// In local development, use original elevate_db by default unless remote DB is explicitly enabled
const connectionString = useRemoteDb ? process.env.DATABASE_URL : null;

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Supports two modes:
 * 1. Production / Neon: Uses DATABASE_URL with SSL and pooled connection endpoint.
 *    Neon certificates are signed by trusted public CAs (Let's Encrypt / ISRG Root X1),
 *    so rejectUnauthorized remains true for strict verification.
 * 2. Local development: Uses individual DB_* environment variables or defaults to localhost.
 *
 * Resource Optimization for Free-Tier Deployment:
 * - max: 5 connections (prevents exceeding Neon free connection limits / Render 512MB RAM)
 * - idleTimeoutMillis: 30000 (releases idle connections back to Neon's pooler)
 * - connectionTimeoutMillis: 10000 (tolerates serverless cold starts during auto-resume)
 */
const poolConfig = connectionString
  ? {
      connectionString,
      // Enable strict SSL certificate verification for Neon / production databases
      ssl: (isProduction || connectionString.includes('sslmode=require') || connectionString.includes('neon.tech'))
        ? { rejectUnauthorized: true }
        : false,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 10000,
    }
  : {
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'elevate_db',
      user:     process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl:      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
      max:      parseInt(process.env.DB_POOL_MAX, 10) || 5,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 10000,
    };

const pool = new pg.Pool(poolConfig);

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

