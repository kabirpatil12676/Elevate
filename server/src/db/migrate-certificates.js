/**
 * ELEVATE Phase 5C — Certificates Migration
 *
 * Creates the `certificates` table for verifiable credentials issued
 * upon completion of Growth Journey requirements.
 *
 * Safe and idempotent. Never drops or alters existing data.
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export async function runCertificatesMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running Phase 5C: certificates migration...');

    // 1. Create certificates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        journey_id          UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
        certificate_number  VARCHAR(100) UNIQUE NOT NULL,
        verification_token  VARCHAR(255) UNIQUE NOT NULL,
        status              VARCHAR(50) NOT NULL DEFAULT 'issued'
                            CHECK (status IN ('issued', 'revoked')),
        revoked_at          TIMESTAMPTZ,
        revocation_reason   TEXT,
        metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
        email_status        VARCHAR(50) NOT NULL DEFAULT 'pending'
                            CHECK (email_status IN ('pending', 'sent', 'failed', 'not_configured')),
        email_sent_at       TIMESTAMPTZ,
        email_error         TEXT,
        issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_certificates_user_journey UNIQUE(user_id, journey_id)
      );
    `);

    // 2. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_user_id
        ON certificates(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_journey_id
        ON certificates(journey_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_verification_token
        ON certificates(verification_token);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number
        ON certificates(certificate_number);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_certificates_status
        ON certificates(status);
    `);

    console.log('✅ Phase 5C migration completed successfully: certificates table ready.');
    return true;
  } catch (err) {
    console.error('❌ Certificates migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
import { fileURLToPath } from 'url';
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('migrate-certificates.js')
);

if (isMain) {
  runCertificatesMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
