/**
 * ELEVATE Phase 4B — Lesson Progress Migration
 *
 * Adds a `lesson_progress` table for per-capsule completion tracking.
 * This is needed because `stage_progress` tracks stage-level completion
 * but has no per-lesson granularity.
 *
 * The migration is idempotent (safe to rerun).
 * It never drops or modifies existing tables, journeys, enrollments or users.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 4B: lesson_progress migration...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        capsule_id    UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
        journey_id    UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
        completed     BOOLEAN NOT NULL DEFAULT false,
        completed_at  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, capsule_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id
        ON lesson_progress(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_capsule_id
        ON lesson_progress(capsule_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_journey_id
        ON lesson_progress(journey_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_journey
        ON lesson_progress(user_id, journey_id);
    `);

    console.log('✅ lesson_progress table and indexes created (or already existed)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
