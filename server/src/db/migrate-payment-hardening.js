/**
 * ELEVATE Phase 6B.1.1 — Migration: Payment and Capacity Hardening
 *
 * Additive changes:
 *  1. Adds `expires_at` (TIMESTAMP WITH TIME ZONE) to `payment_orders` for explicit reservation expiry.
 *  2. Updates `payment_orders_status_check` to include 'captured_unresolved' and 'cancelled'.
 *  3. Adds payment resolution audit columns to `payment_orders`:
 *     - `resolution_status` VARCHAR(50)
 *     - `resolution_notes` TEXT
 *     - `resolved_at` TIMESTAMP WITH TIME ZONE
 *     - `resolved_by` UUID REFERENCES users(id) ON DELETE SET NULL
 *  4. Adds performance indexes for active reservation counting and unresolved order inspection.
 *
 * Backward-compatible & Idempotent: Can be safely rerun without data loss.
 * Run with: node src/db/migrate-payment-hardening.js
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function runPaymentHardeningMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Phase 6B.1.1 Payment Hardening Migration...');

    await client.query('BEGIN');

    // ── 1. Add `expires_at` to `payment_orders` ──────────────────────────────
    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
    `);

    // Backfill expires_at for existing orders where null
    await client.query(`
      UPDATE payment_orders
      SET expires_at = created_at + INTERVAL '15 minutes'
      WHERE expires_at IS NULL;
    `);

    console.log('✅ payment_orders.expires_at column verified & backfilled');

    // ── 2. Expand `payment_orders_status_check` constraint ───────────────────
    await client.query(`
      ALTER TABLE payment_orders
      DROP CONSTRAINT IF EXISTS payment_orders_status_check;
    `);

    await client.query(`
      ALTER TABLE payment_orders
      ADD CONSTRAINT payment_orders_status_check
      CHECK (status IN ('created', 'attempted', 'paid', 'captured_unresolved', 'failed', 'refunded', 'cancelled'));
    `);

    console.log('✅ payment_orders_status_check updated with captured_unresolved & cancelled');

    // ── 3. Add resolution audit columns ──────────────────────────────────────
    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS resolution_status VARCHAR(50) DEFAULT NULL;
    `);

    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS resolution_notes TEXT DEFAULT NULL;
    `);

    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);

    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL;
    `);

    console.log('✅ payment_orders resolution audit columns verified');

    // ── 4. Add indexes ───────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_orders_event_active_resv
      ON payment_orders(event_id, status, expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_orders_resolution_status
      ON payment_orders(resolution_status)
      WHERE resolution_status IS NOT NULL;
    `);

    console.log('✅ indexes for reservation checks & unresolved inspection verified');

    await client.query('COMMIT');
    console.log('\n🎉 Phase 6B.1.1 Payment Hardening Migration Completed Successfully!');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('migrate-payment-hardening.js')
);

if (isMain) {
  runPaymentHardeningMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
