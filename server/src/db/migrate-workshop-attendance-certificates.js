/**
 * ELEVATE Phase 6B.2 — Migration: Workshop Attendance & Verifiable Certificates
 *
 * 1. Creates `event_attendance` table:
 *    - event_id: UUID REFERENCES events(id) ON DELETE CASCADE
 *    - user_id: UUID REFERENCES users(id) ON DELETE CASCADE
 *    - status: VARCHAR(20) CHECK (status IN ('present', 'absent'))
 *    - marked_by: UUID REFERENCES users(id) ON DELETE RESTRICT
 *    - created_at, updated_at: TIMESTAMPTZ
 *    - Unique constraint on (event_id, user_id)
 *
 * 2. Creates `workshop_certificates` table:
 *    - user_id: UUID REFERENCES users(id) ON DELETE CASCADE
 *    - event_id: UUID REFERENCES events(id) ON DELETE CASCADE
 *    - certificate_number: VARCHAR(100) UNIQUE NOT NULL
 *    - verification_token: VARCHAR(255) UNIQUE NOT NULL
 *    - status: VARCHAR(50) CHECK (status IN ('issued', 'revoked'))
 *    - revoked_at, revocation_reason: TIMESTAMPTZ, TEXT
 *    - revoked_by: UUID REFERENCES users(id) ON DELETE SET NULL
 *    - metadata: JSONB NOT NULL DEFAULT '{}'::jsonb
 *    - email_status: VARCHAR(50) CHECK (email_status IN ('pending', 'sent', 'failed', 'not_configured'))
 *    - email_sent_at, email_error: TIMESTAMPTZ, TEXT
 *    - issued_at, created_at, updated_at: TIMESTAMPTZ
 *    - Unique constraint on (user_id, event_id)
 *
 * Safe and idempotent. Never drops or alters existing data.
 * Run with: node src/db/migrate-workshop-attendance-certificates.js
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

export async function runWorkshopAttendanceCertificatesMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 6B.2: Workshop Attendance & Certificates Migration...');

    await client.query('BEGIN');

    // ── 1. Create `event_attendance` table ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_attendance (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status      VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
        marked_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_event_attendance UNIQUE (event_id, user_id)
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id ON event_attendance(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(status);`);

    console.log('✅ event_attendance table and indexes verified');

    // ── 2. Create `workshop_certificates` table ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS workshop_certificates (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        certificate_number  VARCHAR(100) UNIQUE NOT NULL,
        verification_token  VARCHAR(255) UNIQUE NOT NULL,
        status              VARCHAR(50) NOT NULL DEFAULT 'issued'
                            CHECK (status IN ('issued', 'revoked')),
        revoked_at          TIMESTAMPTZ,
        revocation_reason   TEXT,
        revoked_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
        email_status        VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (email_status IN ('pending', 'sent', 'failed', 'not_configured')),
        email_sent_at       TIMESTAMPTZ,
        email_error         TEXT,
        issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_workshop_certificates_user_event UNIQUE (user_id, event_id)
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_workshop_certs_user_id ON workshop_certificates(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workshop_certs_event_id ON workshop_certificates(event_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workshop_certs_token ON workshop_certificates(verification_token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workshop_certs_number ON workshop_certificates(certificate_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workshop_certs_status ON workshop_certificates(status);`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_event_attendance'
        ) THEN
          ALTER TABLE event_attendance
            ADD CONSTRAINT uq_event_attendance UNIQUE (event_id, user_id);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_workshop_certificates_user_event'
        ) THEN
          ALTER TABLE workshop_certificates
            ADD CONSTRAINT uq_workshop_certificates_user_event UNIQUE (user_id, event_id);
        END IF;
      END $$;
    `);

    console.log('✅ workshop_certificates table and indexes verified');

    await client.query('COMMIT');
    console.log('\n🎉 Phase 6B.2 Migration Completed Successfully!');
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
  process.argv[1].endsWith('migrate-workshop-attendance-certificates.js')
);

if (isMain) {
  runWorkshopAttendanceCertificatesMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
