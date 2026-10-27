/**
 * ELEVATE Phase 6B.1 — Migration: Workshop Pricing & Paid Event Payments
 *
 * 1. Extends `events` with:
 *    - `price`: NUMERIC(10, 2) NOT NULL DEFAULT 0.00
 *    - `currency`: VARCHAR(10) NOT NULL DEFAULT 'INR'
 *    - Non-negative price constraint
 *
 * 2. Modifies `payment_orders` to support events:
 *    - Makes `journey_id` NULLABLE (so it can be either a journey or event payment)
 *    - Adds `event_id`: UUID REFERENCES events(id) ON DELETE RESTRICT
 *    - Adds target constraint: exactly one of `journey_id` or `event_id` must be non-null
 *    - Adds index on `event_id`
 *
 * 3. Extends `event_registrations` with:
 *    - `payment_id`: UUID REFERENCES payment_orders(id) ON DELETE SET NULL
 *    - `amount_paid_paise`: INTEGER NOT NULL DEFAULT 0
 *    - `payment_status`: VARCHAR(50) NOT NULL DEFAULT 'free'
 *      CHECK (payment_status IN ('free', 'pending', 'paid', 'failed', 'refunded'))
 *    - Adds index on `payment_id`
 *
 * Backward-compatible & Idempotent: Can be safely rerun without data loss.
 * Run with: node src/db/migrate-workshop-pricing.js
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function runWorkshopPricingMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Phase 6B.1 Workshop Pricing Migration...');

    await client.query('BEGIN');

    // ── 1. Add `price` and `currency` to `events` ───────────────────────────
    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
    `);

    // Ensure all existing events have default 0.00 price and INR currency
    await client.query(`
      UPDATE events
      SET price = 0.00
      WHERE price IS NULL;
    `);

    await client.query(`
      UPDATE events
      SET currency = 'INR'
      WHERE currency IS NULL;
    `);

    // Add check constraint to prevent negative event prices (idempotent)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_event_price_non_negative'
        ) THEN
          ALTER TABLE events
          ADD CONSTRAINT check_event_price_non_negative CHECK (price >= 0);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_price ON events(price);
    `);
    console.log('✅ events.price and events.currency columns & constraints verified');

    // ── 2. Modify `payment_orders` to support events ─────────────────────────
    // Allow journey_id to be nullable for event payments
    await client.query(`
      ALTER TABLE payment_orders
      ALTER COLUMN journey_id DROP NOT NULL;
    `);

    // Add event_id column
    await client.query(`
      ALTER TABLE payment_orders
      ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE RESTRICT;
    `);

    // Add index on payment_orders(event_id)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_orders_event_id ON payment_orders(event_id);
    `);

    // Target constraint: exactly one of journey_id or event_id must be populated
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_orders_target'
        ) THEN
          ALTER TABLE payment_orders
          ADD CONSTRAINT check_payment_orders_target
          CHECK (
            (journey_id IS NOT NULL AND event_id IS NULL) OR
            (journey_id IS NULL AND event_id IS NOT NULL)
          );
        END IF;
      END $$;
    `);
    console.log('✅ payment_orders.event_id column, index & target check constraint verified');

    // ── 3. Extend `event_registrations` with payment details ────────────────
    await client.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS amount_paid_paise INTEGER NOT NULL DEFAULT 0;
    `);

    await client.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'free';
    `);

    // Check constraint for payment_status
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_event_reg_payment_status'
        ) THEN
          ALTER TABLE event_registrations
          ADD CONSTRAINT check_event_reg_payment_status
          CHECK (payment_status IN ('free', 'pending', 'paid', 'failed', 'refunded'));
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_regs_payment_id ON event_registrations(payment_id);
      CREATE INDEX IF NOT EXISTS idx_event_regs_payment_status ON event_registrations(payment_status);
    `);
    console.log('✅ event_registrations payment columns, constraints & indexes verified');

    await client.query('COMMIT');

    // Inspect columns of events
    const eventCols = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events' AND column_name IN ('price', 'currency')
      ORDER BY ordinal_position
    `);
    console.log('\nVerified events pricing columns:');
    eventCols.rows.forEach(r =>
      console.log(`  column: ${r.column_name} (${r.data_type}), default: ${r.column_default}`)
    );

    // Inspect columns of payment_orders
    const paymentCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payment_orders' AND column_name IN ('journey_id', 'event_id')
      ORDER BY ordinal_position
    `);
    console.log('\nVerified payment_orders target columns:');
    paymentCols.rows.forEach(r =>
      console.log(`  column: ${r.column_name} (${r.data_type}), is_nullable: ${r.is_nullable}`)
    );

    // Inspect columns of event_registrations
    const regCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'event_registrations' AND column_name IN ('payment_id', 'amount_paid_paise', 'payment_status')
      ORDER BY ordinal_position
    `);
    console.log('\nVerified event_registrations payment columns:');
    regCols.rows.forEach(r =>
      console.log(`  column: ${r.column_name} (${r.data_type}), default: ${r.column_default}`)
    );

    console.log('\n🎉 Phase 6B.1 Migration Completed Successfully!');
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
  process.argv[1].endsWith('migrate-workshop-pricing.js')
);

if (isMain) {
  runWorkshopPricingMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
