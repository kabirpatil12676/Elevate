/**
 * ELEVATE Phase 6A — Workshops & Events Migration
 *
 * Creates:
 *   - events           : core event/workshop table with lifecycle states
 *   - event_registrations : learner-event registration with unique constraint
 *
 * Safe and idempotent. Never drops or alters existing data.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export async function runEventsMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 6A: workshops & events migration...');

    // 1. Create events table using VARCHAR status (consistent with certificates table pattern)
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title               VARCHAR(500) NOT NULL,
        description         TEXT,
        category            VARCHAR(255),
        facilitator_name    VARCHAR(255),
        facilitator_bio     TEXT,
        venue               VARCHAR(500),
        meeting_url         TEXT,
        starts_at           TIMESTAMPTZ NOT NULL,
        ends_at             TIMESTAMPTZ NOT NULL,
        max_capacity        INTEGER NOT NULL DEFAULT 50 CHECK (max_capacity > 0),
        registration_deadline TIMESTAMPTZ NOT NULL,
        status              VARCHAR(50) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
        created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_events_dates CHECK (ends_at > starts_at),
        CONSTRAINT chk_events_deadline CHECK (registration_deadline <= starts_at)
      );
    `);

    // 2. Create event_registrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status          VARCHAR(50) NOT NULL DEFAULT 'registered'
                        CHECK (status IN ('registered', 'cancelled', 'waitlisted')),
        registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cancelled_at    TIMESTAMPTZ,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_event_registrations UNIQUE(event_id, user_id)
      );
    `);

    // 3. Indexes for events
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);`);

    // 4. Indexes for registrations
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_regs_event_id ON event_registrations(event_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_regs_user_id ON event_registrations(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_regs_status ON event_registrations(status);`);

    console.log('✅ Phase 6A migration completed successfully: events & event_registrations tables ready.');
    return true;
  } catch (err) {
    console.error('❌ Events migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
import { fileURLToPath } from 'url';
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('migrate-events.js')
);

if (isMain) {
  runEventsMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
