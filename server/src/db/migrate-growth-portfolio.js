/**
 * ELEVATE Phase 5B — Growth Portfolio & Reflections Migration
 *
 * Ensures:
 * 1. portfolios table has stage_reflections JSONB column for per-stage self-reflections
 * 2. Proper indexes on portfolios for fast user and journey lookups
 *
 * Safe and idempotent. Never drops or alters existing data.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export async function runGrowthPortfolioMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 5B: growth portfolio & reflections migration...');

    // 1. Add stage_reflections column to portfolios if not present
    await client.query(`
      ALTER TABLE portfolios
        ADD COLUMN IF NOT EXISTS stage_reflections JSONB DEFAULT '{}'::jsonb;
    `);

    // 2. Ensure indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_id
        ON portfolios(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolios_user_journey
        ON portfolios(user_id, journey_id);
    `);

    console.log('✅ Phase 5B migration completed successfully.');
    return true;
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
import { fileURLToPath } from 'url';
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('migrate-growth-portfolio.js')
);

if (isMain) {
  runGrowthPortfolioMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
