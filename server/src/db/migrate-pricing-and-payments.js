/**
 * ELEVATE Phase 3A — Migration: Course Pricing & Payment Orders Foundation
 *
 * 1. Adds `price` (NUMERIC(10,2), DEFAULT 0.00, non-negative) to `journeys`.
 * 2. Creates `payment_orders` table for future Razorpay integration with
 *    appropriate constraints, indexes, and initial status.
 *
 * Backward-compatible & Idempotent: Can be safely rerun without data loss.
 * Run with: node src/db/migrate-pricing-and-payments.js
 */
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Phase 3A Database Migration...');

    await client.query('BEGIN');

    // ── 1. Add `price` column to `journeys` ─────────────────────────────────
    await client.query(`
      ALTER TABLE journeys
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
    `);

    // Ensure all existing journeys have default 0.00 price
    await client.query(`
      UPDATE journeys
      SET price = 0.00
      WHERE price IS NULL;
    `);

    // Add constraint to prevent negative prices (idempotent)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'check_journey_price_non_negative'
        ) THEN
          ALTER TABLE journeys
          ADD CONSTRAINT check_journey_price_non_negative CHECK (price >= 0);
        END IF;
      END $$;
    `);
    console.log('✅ journeys.price column & non-negative check constraint verified');

    // ── 2. Create `payment_orders` table ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        journey_id          UUID NOT NULL REFERENCES journeys(id) ON DELETE RESTRICT,
        razorpay_order_id   VARCHAR(255) UNIQUE NOT NULL,
        amount_paise        INTEGER NOT NULL CHECK (amount_paise >= 0),
        currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
        status              VARCHAR(50) NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded')),
        razorpay_payment_id VARCHAR(255) UNIQUE,
        razorpay_signature  TEXT,
        verified_at         TIMESTAMPTZ,
        captured_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ payment_orders table created (or already exists)');

    // ── 3. Create Indexes on `payment_orders` ────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_orders_journey_id ON payment_orders(journey_id);
      CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
    `);
    console.log('✅ payment_orders indexes verified');

    await client.query('COMMIT');

    // Inspect columns of journeys
    const journeyCols = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'journeys' AND column_name = 'price'
    `);
    console.log('\nVerified journeys.price schema:');
    journeyCols.rows.forEach(r =>
      console.log(`  column: ${r.column_name} (${r.data_type}), default: ${r.column_default}`)
    );

    // Inspect columns of payment_orders
    const paymentCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'payment_orders'
      ORDER BY ordinal_position
    `);
    console.log('\nVerified payment_orders columns:');
    paymentCols.rows.forEach(r =>
      console.log(`  ${r.column_name.padEnd(22)} — ${r.data_type.padEnd(25)} (nullable: ${r.is_nullable})`)
    );

    // Inspect journeys data
    const journeyData = await client.query(`
      SELECT id, title, price, status FROM journeys ORDER BY title
    `);
    console.log(`\nExisting published journeys count: ${journeyData.rows.length}`);
    journeyData.rows.forEach(j =>
      console.log(`  [${j.title}] | Price: ₹${j.price} | Status: ${j.status}`)
    );

    console.log('\n🎉 Phase 3A Migration Completed Successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
