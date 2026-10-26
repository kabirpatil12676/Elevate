/**
 * ELEVATE — Migration: Create learner_needs table
 * Backward-compatible: does NOT modify existing tables.
 * Run with: node src/db/migrate-learner-needs.js
 */
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS learner_needs (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        academic_year     VARCHAR(20),
        branch            VARCHAR(255),
        academic_situation VARCHAR(100),
        career_interests  JSONB NOT NULL DEFAULT '[]',
        skills            JSONB NOT NULL DEFAULT '{}',
        challenges        JSONB NOT NULL DEFAULT '[]',
        learning_goals    TEXT,
        weekly_hours      VARCHAR(50),
        prior_experience  JSONB NOT NULL DEFAULT '[]',
        raw_answers       JSONB NOT NULL DEFAULT '{}',
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    console.log('✅ learner_needs table created (or already exists)');

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_learner_needs_user ON learner_needs(user_id)'
    );
    console.log('✅ Index created on learner_needs.user_id');

    const cols = await client.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'learner_needs\' ORDER BY ordinal_position'
    );
    console.log('\nlearner_needs columns:');
    cols.rows.forEach(r => console.log(' ', r.column_name, '—', r.data_type));

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
