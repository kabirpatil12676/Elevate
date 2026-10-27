/**
 * ELEVATE Phase 5A — Practical Activities & Feedback Migration
 *
 * Ensures:
 * 1. submission_status enum supports 'revision_requested'
 * 2. activities table has is_required, due_date, is_archived, order_index
 * 3. indexes for performance and rapid querying
 *
 * Safe and idempotent. Never drops or alters existing data.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 5A: activities & feedback migration...');

    // 1. Add 'revision_requested' to submission_status enum if not present
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'revision_requested';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // 2. Add columns to activities table
    await client.query(`
      ALTER TABLE activities
        ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 1;
    `);

    // 3. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_stage_id
        ON activities(stage_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_archived
        ON activities(is_archived);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_activity_user
        ON submissions(activity_id, user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_status
        ON submissions(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_submission_id
        ON feedback(submission_id);
    `);

    console.log('✅ Phase 5A migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
