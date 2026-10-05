/**
 * ELEVATE Platform — Database Schema Initialization
 * 
 * Entities modeled from the ELEVATE pedagogical model:
 *   Users → Journeys → Stages → Capsules → Submissions → Feedback → Portfolios
 * 
 * Run with: npm run db:init
 */

import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const schema = `
  -- ════════════════════════════════════════════════════════
  -- EXTENSIONS
  -- ════════════════════════════════════════════════════════
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- ════════════════════════════════════════════════════════
  -- ENUMS
  -- ════════════════════════════════════════════════════════
  DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('learner', 'educator', 'admin');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE journey_status AS ENUM ('draft', 'published', 'archived');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE stage_type AS ENUM ('explore', 'learn', 'experience', 'validate', 'apply', 'transform');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'under_review', 'feedback_given', 'revised', 'approved');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('enrolled', 'in_progress', 'completed', 'dropped');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  -- ════════════════════════════════════════════════════════
  -- 1. USERS
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role DEFAULT 'learner',
    avatar_url    TEXT,
    bio           TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 2. GROWTH JOURNEYS
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS journeys (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    thumbnail_url TEXT,
    category      VARCHAR(255),
    skill_domain  VARCHAR(255),
    difficulty    VARCHAR(50),
    duration_hours DECIMAL(5,1),
    status        journey_status DEFAULT 'draft',
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 3. JOURNEY STAGES (the 6 ELEVATE stages per journey)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS stages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id    UUID REFERENCES journeys(id) ON DELETE CASCADE,
    stage_type    stage_type NOT NULL,
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    order_index   INTEGER NOT NULL,
    config        JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 4. LEARNING CAPSULES (within Learn stages)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS capsules (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id      UUID REFERENCES stages(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    content_url   TEXT,
    content_type  VARCHAR(50),
    duration_min  INTEGER,
    order_index   INTEGER NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 5. DIAGNOSTIC ASSESSMENTS (Explore stage)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS diagnostics (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id      UUID REFERENCES stages(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    questions     JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 6. ACTIVITY CHALLENGES (Experience stage)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS activities (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id      UUID REFERENCES stages(id) ON DELETE CASCADE,
    title         VARCHAR(500) NOT NULL,
    instructions  TEXT,
    submission_type VARCHAR(50),
    rubric        JSONB DEFAULT '{}',
    max_attempts  INTEGER DEFAULT 3,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 7. ENROLLMENTS (learner <-> journey)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS enrollments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    journey_id    UUID REFERENCES journeys(id) ON DELETE CASCADE,
    status        enrollment_status DEFAULT 'enrolled',
    current_stage UUID REFERENCES stages(id),
    enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    UNIQUE(user_id, journey_id)
  );

  -- ════════════════════════════════════════════════════════
  -- 8. LEARNER GROWTH PROFILES (diagnostic results)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS growth_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    journey_id      UUID REFERENCES journeys(id) ON DELETE CASCADE,
    diagnostic_id   UUID REFERENCES diagnostics(id),
    responses       JSONB DEFAULT '{}',
    competency_level VARCHAR(50),
    prior_experience TEXT,
    hesitation_areas JSONB DEFAULT '[]',
    personal_goals  JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, journey_id)
  );

  -- ════════════════════════════════════════════════════════
  -- 9. SUBMISSIONS (activity challenge submissions)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS submissions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_id   UUID REFERENCES activities(id) ON DELETE CASCADE,
    content_url   TEXT,
    content_text  TEXT,
    attempt_num   INTEGER DEFAULT 1,
    status        submission_status DEFAULT 'submitted',
    submitted_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 10. FEEDBACK (multi-source: educator rubric + peer)
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback_type   VARCHAR(50) NOT NULL,
    rubric_scores   JSONB DEFAULT '{}',
    comments        TEXT,
    overall_score   DECIMAL(5,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

  -- ════════════════════════════════════════════════════════
  -- 11. GROWTH PORTFOLIOS
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS portfolios (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    journey_id        UUID REFERENCES journeys(id) ON DELETE CASCADE,
    before_state      JSONB DEFAULT '{}',
    after_state       JSONB DEFAULT '{}',
    artifacts         JSONB DEFAULT '[]',
    self_reflection   TEXT,
    know_score        DECIMAL(5,2),
    do_score          DECIMAL(5,2),
    become_score      DECIMAL(5,2),
    badge_issued      BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, journey_id)
  );

  -- ════════════════════════════════════════════════════════
  -- 12. STAGE PROGRESS TRACKING
  -- ════════════════════════════════════════════════════════
  CREATE TABLE IF NOT EXISTS stage_progress (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    stage_id      UUID REFERENCES stages(id) ON DELETE CASCADE,
    completed     BOOLEAN DEFAULT false,
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    data          JSONB DEFAULT '{}',
    UNIQUE(user_id, stage_id)
  );

  -- ════════════════════════════════════════════════════════
  -- INDEXES
  -- ════════════════════════════════════════════════════════
  CREATE INDEX IF NOT EXISTS idx_stages_journey ON stages(journey_id);
  CREATE INDEX IF NOT EXISTS idx_capsules_stage ON capsules(stage_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_journey ON enrollments(journey_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_activity ON submissions(activity_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_submission ON feedback(submission_id);
  CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
  CREATE INDEX IF NOT EXISTS idx_stage_progress_user ON stage_progress(user_id);
`;

async function initDatabase() {
  try {
    console.log('🔧 Initializing ELEVATE database schema...\n');
    await pool.query(schema);
    console.log('✅ Database schema created successfully!');
    console.log('   Tables: users, journeys, stages, capsules, diagnostics,');
    console.log('   activities, enrollments, growth_profiles, submissions,');
    console.log('   feedback, portfolios, stage_progress\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
