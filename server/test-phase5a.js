/**
 * ELEVATE Phase 5A — Comprehensive Test Suite
 * Practical Activities, Submissions, Educator Review & Feedback
 *
 * Covers 17 required scenarios:
 *  1. Unauthenticated activity access is rejected (401)
 *  2. Unenrolled learners cannot access protected activities or submit work (403)
 *  3. Learners cannot access another learner's submissions or feedback (Isolation)
 *  4. Educators cannot manage activities in journeys they do not own (403)
 *  5. Learners cannot change official review status (403 / tamper rejection)
 *  6. Invalid activity, stage and journey associations are rejected (400/404)
 *  7. Valid written submissions persist correctly
 *  8. Valid project URLs are accepted and malformed URLs rejected
 *  9. Unauthorized or invalid submission formats are rejected
 * 10. Revision requests permit a new submission attempt
 * 11. Submission history is preserved according to the implemented data model
 * 12. Educator feedback and approval persist
 * 13. Repeated requests do not duplicate submissions or reviews unintentionally
 * 14. Draft/archived activities remain hidden from unauthorized learners
 * 15. Activity changes do not corrupt lesson progress
 * 16. Razorpay enrollment and payment protections remain intact
 * 17. Existing educator authoring and publishing functionality remains intact
 */

import http from 'http';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import app from './src/index.js';

dotenv.config();

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'elevate_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
});

let server;
let baseUrl = '';
let passed = 0;
let failed = 0;
let skipped = 0;

function log(label, ok, details = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${details ? ` — ${details}` : ''}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}${details ? ` — ${details}` : ''}`);
  }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookie(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(';')[0];
}

async function loginAs(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(res.data)}`);
  }
  return extractCookie(res);
}

// Global entities for tests
let educator1Id, educator2Id, adminId, learner1Id, learner2Id, unenrolledLearnerId;
let educator1Cookie, educator2Cookie, adminCookie, learner1Cookie, learner2Cookie, unenrolledCookie;
let testJourneyId, stageExperienceId, stageApplyId;
let activityBothId, activityTextId, activityUrlId;
let submission1Id;

async function setup() {
  console.log('Setting up Phase 5A Test Environment...');

  // 1. Clean previous test entities
  await pool.query("DELETE FROM feedback WHERE submission_id IN (SELECT id FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE 'PHASE5A_%'))");
  await pool.query("DELETE FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM activities WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM capsules WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM payment_orders WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate5a.test'");

  // 2. Insert test users
  const pwdHash = await bcrypt.hash('TestPass#5A!', 10);

  const e1 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Prof. Alan Test', 'educator1@elevate5a.test', $1, 'educator') RETURNING id",
    [pwdHash]
  );
  educator1Id = e1.rows[0].id;

  const e2 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Dr. Ada Test', 'educator2@elevate5a.test', $1, 'educator') RETURNING id",
    [pwdHash]
  );
  educator2Id = e2.rows[0].id;

  const adm = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Dean Admin Test', 'admin@elevate5a.test', $1, 'admin') RETURNING id",
    [pwdHash]
  );
  adminId = adm.rows[0].id;

  const l1 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Learner One Test', 'learner1@elevate5a.test', $1, 'learner') RETURNING id",
    [pwdHash]
  );
  learner1Id = l1.rows[0].id;

  const l2 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Two Test', 'learner2@elevate5a.test', $1, 'learner') RETURNING id",
    [pwdHash]
  );
  learner2Id = l2.rows[0].id;

  const lu = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Unenrolled', 'learner_un@elevate5a.test', $1, 'learner') RETURNING id",
    [pwdHash]
  );
  unenrolledLearnerId = lu.rows[0].id;

  // 3. Obtain auth cookies
  educator1Cookie = await loginAs('educator1@elevate5a.test', 'TestPass#5A!');
  educator2Cookie = await loginAs('educator2@elevate5a.test', 'TestPass#5A!');
  adminCookie     = await loginAs('admin@elevate5a.test',     'TestPass#5A!');
  learner1Cookie  = await loginAs('learner1@elevate5a.test',  'TestPass#5A!');
  learner2Cookie  = await loginAs('learner2@elevate5a.test',  'TestPass#5A!');
  unenrolledCookie= await loginAs('learner_un@elevate5a.test', 'TestPass#5A!');

  // 4. Create a test Journey owned by educator1
  const jRes = await pool.query(
    `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, price, status, created_by)
     VALUES ('PHASE5A_FullStack_Track', 'Experiential Full Stack Journey for Phase 5A testing', 'Engineering Fundamentals', 'Full Stack', 'Intermediate', 12.0, 0.00, 'published', $1)
     RETURNING id`,
    [educator1Id]
  );
  testJourneyId = jRes.rows[0].id;

  // Create 6 stages for this journey
  const stageDefs = [
    { title: 'Explore Microservices', stage_type: 'explore', order_index: 1 },
    { title: 'Learn API Patterns', stage_type: 'learn', order_index: 2 },
    { title: 'Experience Practical Systems', stage_type: 'experience', order_index: 3 },
    { title: 'Validate Architecture', stage_type: 'validate', order_index: 4 },
    { title: 'Apply Distributed Patterns', stage_type: 'apply', order_index: 5 },
    { title: 'Transform Production System', stage_type: 'transform', order_index: 6 },
  ];

  for (const s of stageDefs) {
    const sRes = await pool.query(
      `INSERT INTO stages (journey_id, title, stage_type, order_index, description)
       VALUES ($1, $2, $3, $4, 'Phase 5A test stage description')
       RETURNING id`,
      [testJourneyId, s.title, s.stage_type, s.order_index]
    );
    if (s.stage_type === 'experience') stageExperienceId = sRes.rows[0].id;
    if (s.stage_type === 'apply') stageApplyId = sRes.rows[0].id;
  }

  // Create a lesson in stage 1 to verify lesson progress independence
  const lsnRes = await pool.query(
    `INSERT INTO capsules (stage_id, title, content_url, content_type, duration_min, order_index)
     VALUES ((SELECT id FROM stages WHERE journey_id = $1 AND stage_type = 'explore'), 'PHASE5A_Intro_Lesson', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video', 15, 1)
     RETURNING id`,
    [testJourneyId]
  );
  const testLessonId = lsnRes.rows[0].id;

  // 5. Create 3 activities on stageExperienceId
  // Activity 1: both (text & url)
  const a1 = await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, max_attempts)
     VALUES ($1, 'PHASE5A_System_Architecture_Design', 'Design a scalable architecture and submit description and diagram repository link', 'both', true, 3)
     RETURNING id`,
    [stageExperienceId]
  );
  activityBothId = a1.rows[0].id;

  // Activity 2: text only
  const a2 = await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, max_attempts)
     VALUES ($1, 'PHASE5A_Written_Reflection', 'Write a 300-word critical evaluation of eventual consistency trade-offs', 'text', false, 3)
     RETURNING id`,
    [stageExperienceId]
  );
  activityTextId = a2.rows[0].id;

  // Activity 3: url only
  const a3 = await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, max_attempts)
     VALUES ($1, 'PHASE5A_Code_Repository_Milestone', 'Provide the GitHub repository URL with containerized service and passing tests', 'url', true, 3)
     RETURNING id`,
    [stageExperienceId]
  );
  activityUrlId = a3.rows[0].id;

  // 6. Enroll learner1 and learner2 into testJourneyId
  await pool.query(
    `INSERT INTO enrollments (user_id, journey_id, status)
     VALUES ($1, $2, 'enrolled'), ($3, $2, 'enrolled')`,
    [learner1Id, testJourneyId, learner2Id]
  );

  // Initialize a completed lesson for learner1 to test lesson progress independence
  await pool.query(
    `INSERT INTO lesson_progress (user_id, journey_id, capsule_id, completed, completed_at)
     VALUES ($1, $2, $3, true, NOW())`,
    [learner1Id, testJourneyId, testLessonId]
  );

  console.log('Test environment setup complete.\n');
}

async function runTests() {
  console.log('===============================================================');
  console.log('  ELEVATE Phase 5A: Practical Activities & Feedback Test Suite');
  console.log('===============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Unauthenticated Activity Access
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Unauthenticated Activity Access Rejection ---');

  const unauth1 = await request('GET', '/api/educator/submissions');
  log(
    'Scenario 1A: Unauthenticated GET /api/educator/submissions rejected with 401',
    unauth1.status === 401,
    `Status ${unauth1.status}`
  );

  const unauth2 = await request('POST', `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`, {
    content_text: 'Unauthenticated submission',
  });
  log(
    'Scenario 1B: Unauthenticated POST /api/learn/:journeyId/activities/:activityId/submit rejected with 401',
    unauth2.status === 401,
    `Status ${unauth2.status}`
  );

  const unauth3 = await request('GET', `/api/learn/${testJourneyId}/activities/${activityBothId}/submissions`);
  log(
    'Scenario 1C: Unauthenticated GET /api/learn/:journeyId/activities/:activityId/submissions rejected with 401',
    unauth3.status === 401,
    `Status ${unauth3.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Unenrolled Learner Access
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Unenrolled Learner Protection ---');

  const unenrPlayer = await request('GET', `/api/learn/${testJourneyId}`, null, unenrolledCookie);
  log(
    'Scenario 2A: Unenrolled learner cannot access journey player data (403)',
    unenrPlayer.status === 403,
    `Status ${unenrPlayer.status}`
  );

  const unenrSubmit = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    { content_text: 'Unenrolled student attempting submission' },
    unenrolledCookie
  );
  log(
    'Scenario 2B: Unenrolled learner cannot submit practical activity work (403)',
    unenrSubmit.status === 403,
    `Status ${unenrSubmit.status}`
  );

  const unenrHistory = await request(
    'GET',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submissions`,
    null,
    unenrolledCookie
  );
  log(
    'Scenario 2C: Unenrolled learner cannot view activity submissions (403)',
    unenrHistory.status === 403,
    `Status ${unenrHistory.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Multi-Learner Isolation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Multi-Learner Isolation ---');

  // Learner 1 submits for activityBothId
  const l1SubRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    {
      content_text: 'Learner 1 private architecture proposal',
      content_url: 'https://github.com/learner1/microservices-arch',
    },
    learner1Cookie
  );
  log(
    'Scenario 3A: Learner 1 submits work successfully (201)',
    l1SubRes.status === 201 && l1SubRes.data.submission?.attempt_num === 1,
    `Submission ID: ${l1SubRes.data?.submission?.id}`
  );
  submission1Id = l1SubRes.data?.submission?.id;

  // Learner 2 queries activity submissions for activityBothId
  const l2SubHistory = await request(
    'GET',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submissions`,
    null,
    learner2Cookie
  );
  const l2HasOtherData = (l2SubHistory.data.submissions || []).some((s) => s.user_id === learner1Id);
  log(
    'Scenario 3B: Learner 2 cannot see Learner 1 submissions (zero cross-learner data leakage)',
    l2SubHistory.status === 200 && !l2HasOtherData && (l2SubHistory.data.submissions || []).length === 0,
    `Returned ${l2SubHistory.data?.submissions?.length || 0} submissions for Learner 2`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Educator Ownership & Authorization Checks
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Educator Ownership Enforcement ---');

  // Educator 2 (non-owner) attempts to create an activity in educator 1's stage
  const e2Create = await request(
    'POST',
    `/api/educator/stages/${stageExperienceId}/activities`,
    {
      title: 'PHASE5A_Unauthorized_Activity',
      submission_type: 'text',
    },
    educator2Cookie
  );
  log(
    'Scenario 4A: Educator 2 cannot create activity in Journey owned by Educator 1 (403)',
    e2Create.status === 403,
    `Status ${e2Create.status}`
  );

  // Educator 2 attempts to edit Educator 1's activity
  const e2Update = await request(
    'PUT',
    `/api/educator/activities/${activityBothId}`,
    { title: 'PHASE5A_Hijacked_Title' },
    educator2Cookie
  );
  log(
    'Scenario 4B: Educator 2 cannot update activity in Journey owned by Educator 1 (403)',
    e2Update.status === 403,
    `Status ${e2Update.status}`
  );

  // Educator 2 attempts to review Educator 1's learner submission
  const e2Review = await request(
    'POST',
    `/api/educator/submissions/${submission1Id}/review`,
    { status: 'approved', comments: 'Unauthorized educator review' },
    educator2Cookie
  );
  log(
    'Scenario 4C: Educator 2 cannot review submissions for Journey owned by Educator 1 (403)',
    e2Review.status === 403,
    `Status ${e2Review.status}`
  );

  const ownerList = await request('GET', '/api/educator/submissions', null, educator1Cookie);
  const ownerIds = (ownerList.data?.submissions || []).map((s) => s.id);
  log(
    'Scenario 4D: Owning educator lists submissions for their own journey',
    ownerList.status === 200 && ownerIds.includes(submission1Id),
    `Status ${ownerList.status}, count ${ownerIds.length}`
  );

  const otherList = await request('GET', '/api/educator/submissions', null, educator2Cookie);
  const otherIds = (otherList.data?.submissions || []).map((s) => s.id);
  log(
    'Scenario 4E: Non-owning educator does not see another educator\'s submissions',
    otherList.status === 200 && !otherIds.includes(submission1Id),
    `Status ${otherList.status}, leaked=${otherIds.includes(submission1Id)}`
  );

  const adminList = await request('GET', '/api/educator/submissions', null, adminCookie);
  const adminIds = (adminList.data?.submissions || []).map((s) => s.id);
  log(
    'Scenario 4F: Administrator can list submissions across journeys',
    adminList.status === 200 && adminIds.includes(submission1Id),
    `Status ${adminList.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Learners Cannot Tamper With Official Review Status
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Review Status Tampering Protection ---');

  // Learner 1 attempts to call the educator review endpoint
  const l1ReviewAttempt = await request(
    'POST',
    `/api/educator/submissions/${submission1Id}/review`,
    { status: 'approved', comments: 'Learner approving own submission' },
    learner1Cookie
  );
  log(
    'Scenario 5A: Learner cannot call educator review endpoint (403)',
    l1ReviewAttempt.status === 403,
    `Status ${l1ReviewAttempt.status}`
  );

  // Learner 1 attempts to pass status: 'approved' during submission payload
  const l1TamperSubmit = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityTextId}/submit`,
    {
      content_text: 'Self-proclaimed approved submission',
      status: 'approved',
    },
    learner1Cookie
  );
  log(
    'Scenario 5B: Learner cannot set official review status via submission body (enforces "submitted")',
    l1TamperSubmit.status === 201 && l1TamperSubmit.data.submission?.status === 'submitted',
    `Persisted status: ${l1TamperSubmit.data?.submission?.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Invalid Activity, Stage & Journey Associations
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Association Integrity & Validation ---');

  // Mismatched journey and activity
  const mismatchRes = await request(
    'POST',
    `/api/learn/999999/activities/${activityBothId}/submit`,
    { content_text: 'Mismatched journey submission' },
    learner1Cookie
  );
  log(
    'Scenario 6A: Submitting activity with non-existent/mismatched journeyId is rejected (400/404)',
    mismatchRes.status === 400 || mismatchRes.status === 404,
    `Status ${mismatchRes.status}`
  );

  // Invalid non-existent activityId
  const invalidActRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/a0000000-0000-0000-0000-000000000000/submit`,
    { content_text: 'Non-existent activity submission' },
    learner1Cookie
  );
  log(
    'Scenario 6B: Submitting to non-existent activity is rejected (400/404)',
    invalidActRes.status === 404 || invalidActRes.status === 400,
    `Status ${invalidActRes.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Valid Written Submissions Persist Correctly
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Valid Written Submissions ---');

  const textSubRes = await pool.query(
    'SELECT * FROM submissions WHERE user_id = $1 AND activity_id = $2',
    [learner1Id, activityTextId]
  );
  log(
    'Scenario 7: Written submission persisted in PostgreSQL with correct content_text and attempt_num',
    textSubRes.rowCount === 1 &&
      textSubRes.rows[0].content_text === 'Self-proclaimed approved submission' &&
      textSubRes.rows[0].attempt_num === 1 &&
      textSubRes.rows[0].status === 'submitted',
    `Database row verified: attempt=${textSubRes.rows[0]?.attempt_num}, status=${textSubRes.rows[0]?.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Project URL Validation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Project URL Validation ---');

  // Malformed URL
  const malformedUrlRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityUrlId}/submit`,
    { content_url: 'javascript:alert("xss")' },
    learner1Cookie
  );
  log(
    'Scenario 8A: Malformed or non-http/https URL is rejected with 400',
    malformedUrlRes.status === 400,
    `Status ${malformedUrlRes.status}`
  );

  // Valid HTTPS URL
  const validUrlRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityUrlId}/submit`,
    { content_url: 'https://github.com/learner1/clean-architecture-demo' },
    learner1Cookie
  );
  log(
    'Scenario 8B: Valid project URL is accepted and persists correctly (201)',
    validUrlRes.status === 201 && validUrlRes.data.submission?.content_url === 'https://github.com/learner1/clean-architecture-demo',
    `Status ${validUrlRes.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Submission Format Enforcement
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. Submission Format Enforcement ---');

  // Empty submission payload
  const emptyRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    { content_text: '', content_url: '' },
    learner2Cookie
  );
  log(
    'Scenario 9A: Completely empty submission is rejected with 400',
    emptyRes.status === 400,
    `Status ${emptyRes.status}`
  );

  // URL-only activity submitted with only text
  const urlOnlyTextRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityUrlId}/submit`,
    { content_text: 'Text submitted to URL-only activity' },
    learner2Cookie
  );
  log(
    'Scenario 9B: Text submitted to URL-only activity is rejected with 400',
    urlOnlyTextRes.status === 400,
    `Status ${urlOnlyTextRes.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Revision Workflow
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 10. Revision Workflow & Lifecycle ---');

  // Educator 1 reviews submission1Id and requests revision
  const revReqRes = await request(
    'POST',
    `/api/educator/submissions/${submission1Id}/review`,
    {
      status: 'revision_requested',
      comments: 'Architecture looks promising, but please detail how you handle distributed saga rollbacks.',
      overall_score: 65,
    },
    educator1Cookie
  );
  log(
    'Scenario 10A: Educator requests revision with actionable feedback (200)',
    revReqRes.status === 200 && revReqRes.data.submission?.status === 'revision_requested',
    `Status: ${revReqRes.data?.submission?.status}`
  );

  // Learner 1 resubmits for activityBothId with revision
  const resubmitRes = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    {
      content_text: 'Revised proposal: Integrated orchestrator-based Saga with compensating transactions for rollbacks.',
      content_url: 'https://github.com/learner1/microservices-arch/tree/v2-saga-rollback',
    },
    learner1Cookie
  );
  log(
    'Scenario 10B: Learner 1 successfully resubmits with incremented attempt_num = 2 (201)',
    resubmitRes.status === 201 && resubmitRes.data.submission?.attempt_num === 2,
    `New Attempt: ${resubmitRes.data?.submission?.attempt_num}`
  );
  const submission2Id = resubmitRes.data?.submission?.id;

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Submission History Preservation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 11. Submission History Preservation ---');

  const historyRes = await request(
    'GET',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submissions`,
    null,
    learner1Cookie
  );
  const historyList = historyRes.data.submissions || [];
  const attempt1 = historyList.find((h) => h.attempt_num === 1);
  const attempt2 = historyList.find((h) => h.attempt_num === 2);

  log(
    'Scenario 11: History preserves both attempts with prior feedback without data loss',
    historyList.length === 2 &&
      attempt1 && attempt1.status === 'revision_requested' &&
      attempt1.feedback?.length > 0 &&
      attempt2 && attempt2.status === 'submitted',
    `Preserved ${historyList.length} attempts in chronological sequence`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Educator Feedback & Final Approval Persistence
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 12. Educator Approval & Feedback Persistence ---');

  const approveRes = await request(
    'POST',
    `/api/educator/submissions/${submission2Id}/review`,
    {
      status: 'approved',
      comments: 'Outstanding revision. Saga compensation pattern is robustly implemented. Milestone approved!',
      overall_score: 98,
    },
    educator1Cookie
  );
  log(
    'Scenario 12A: Educator approves revised submission (200)',
    approveRes.status === 200 && approveRes.data.submission?.status === 'approved',
    `Status: ${approveRes.data?.submission?.status}`
  );

  // Verify in database
  const dbSub2 = await pool.query('SELECT * FROM submissions WHERE id = $1', [submission2Id]);
  const dbFb = await pool.query('SELECT * FROM feedback WHERE submission_id = $1', [submission2Id]);
  log(
    'Scenario 12B: Approved status and feedback score (98) persisted in database',
    dbSub2.rows[0]?.status === 'approved' &&
      parseFloat(dbFb.rows[0]?.overall_score) === 98 &&
      dbFb.rows[0]?.comments.includes('Outstanding revision'),
    `DB status=${dbSub2.rows[0]?.status}, score=${dbFb.rows[0]?.overall_score}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Idempotency & Duplicate Prevention
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 13. Duplicate & Rapid Submission Prevention ---');

  // Learner 1 tries to resubmit on already approved activity
  const duplicateApproveSubmit = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    { content_text: 'Attempting to resubmit already approved work' },
    learner1Cookie
  );
  log(
    'Scenario 13A: Cannot submit work for already approved activity (400)',
    duplicateApproveSubmit.status === 400 &&
      (duplicateApproveSubmit.data.message?.includes('approved') || duplicateApproveSubmit.data.error?.includes('approved')),
    `Status ${duplicateApproveSubmit.status}: ${duplicateApproveSubmit.data.message || duplicateApproveSubmit.data.error}`
  );

  // Learner 2 submits for activityBothId
  const l2FirstSubmit = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    {
      content_text: 'Learner 2 first submission',
      content_url: 'https://github.com/learner2/arch',
    },
    learner2Cookie
  );
  // Learner 2 tries to double-submit while first is still awaiting review
  const l2DoubleSubmit = await request(
    'POST',
    `/api/learn/${testJourneyId}/activities/${activityBothId}/submit`,
    {
      content_text: 'Learner 2 rapid duplicate submission',
      content_url: 'https://github.com/learner2/arch-v2',
    },
    learner2Cookie
  );
  log(
    'Scenario 13B: Cannot submit duplicate work while prior attempt is awaiting review (400)',
    l2FirstSubmit.status === 201 &&
      l2DoubleSubmit.status === 400 &&
      (l2DoubleSubmit.data.message?.includes('review') || l2DoubleSubmit.data.error?.includes('review')),
    `Status ${l2DoubleSubmit.status}: ${l2DoubleSubmit.data.message || l2DoubleSubmit.data.error}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Draft / Archived Activities Hidden from Learners
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 14. Soft-Archiving & Learner Isolation ---');

  // Educator 1 deletes/archives activityTextId (which has a learner submission)
  const delRes = await request(
    'DELETE',
    `/api/educator/activities/${activityTextId}`,
    null,
    educator1Cookie
  );
  log(
    'Scenario 14A: Deleting activity with submissions soft-archives it rather than destroying data',
    delRes.status === 200 && delRes.data.archived === true,
    `Response: ${delRes.data.message}`
  );

  // Check learner player view: archived activity should NOT appear
  const playerRes = await request('GET', `/api/learn/${testJourneyId}`, null, learner1Cookie);
  const expStage = (playerRes.data.stages || []).find((s) => s.id === stageExperienceId);
  const visibleActs = expStage?.activities || [];
  const archivedFound = visibleActs.some((a) => a.id === activityTextId);
  log(
    'Scenario 14B: Archived activity is completely hidden from learner syllabus view',
    playerRes.status === 200 && !archivedFound,
    `Visible activities count in stage: ${visibleActs.length}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Activity Changes Do Not Corrupt Lesson Progress
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 15. Lesson Progress Independence ---');

  const progRes = await request('GET', `/api/learn/${testJourneyId}/progress`, null, learner1Cookie);
  log(
    'Scenario 15: Lesson progress tracking remains intact and uncorrupted (1 lesson completed = 100%)',
    progRes.status === 200 &&
      progRes.data.progress?.completed_lessons === 1 &&
      progRes.data.progress?.total_lessons === 1 &&
      progRes.data.progress?.journey_progress_pct === 100,
    `Completed lessons: ${progRes.data.progress?.completed_lessons}/${progRes.data.progress?.total_lessons} (${progRes.data.progress?.journey_progress_pct}%)`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Razorpay Paid Enrollment Protection Intact
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 16. Razorpay Paid Enrollment Protection ---');

  // Create a paid journey
  const paidJ = await pool.query(
    `INSERT INTO journeys (title, description, price, status, created_by)
     VALUES ('PHASE5A_Paid_Specialization', 'Paid journey test', 999.00, 'published', $1)
     RETURNING id`,
    [educator1Id]
  );
  const paidJourneyId = paidJ.rows[0].id;

  // Unenrolled learner attempts to access player for paid journey
  const paidAccessRes = await request('GET', `/api/learn/${paidJourneyId}`, null, learner1Cookie);
  log(
    'Scenario 16: Paid journey requires enrollment before player or activities can be accessed (403)',
    paidAccessRes.status === 403,
    `Status ${paidAccessRes.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 17. Educator Authoring & Publishing Workflow Intact
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 17. Educator Authoring & Publication Intact ---');

  // Admin toggles journey back to draft
  const unpublishRes = await request(
    'PATCH',
    `/api/educator/journeys/${testJourneyId}/publish`,
    { status: 'draft' },
    adminCookie
  );
  log(
    'Scenario 17A: Administrator can unpublish journey to draft (200)',
    unpublishRes.status === 200 && unpublishRes.data.journey?.status === 'draft',
    `Status: ${unpublishRes.data.journey?.status}`
  );

  // When journey is draft, normal learner cannot access player
  const draftPlayerRes = await request('GET', `/api/learn/${testJourneyId}`, null, learner1Cookie);
  log(
    'Scenario 17B: Draft journeys are inaccessible to learners (403/404)',
    draftPlayerRes.status === 403 || draftPlayerRes.status === 404,
    `Status ${draftPlayerRes.status}`
  );

  // Admin republishes
  const republishRes = await request(
    'PATCH',
    `/api/educator/journeys/${testJourneyId}/publish`,
    { status: 'published' },
    adminCookie
  );
  log(
    'Scenario 17C: Administrator can re-publish journey to catalogue (200)',
    republishRes.status === 200 && republishRes.data.journey?.status === 'published',
    `Status: ${republishRes.data.journey?.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup Test Entities
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nCleaning up Phase 5A test entities...');
  await pool.query("DELETE FROM feedback WHERE submission_id IN (SELECT id FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE 'PHASE5A_%'))");
  await pool.query("DELETE FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM activities WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM capsules WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM payment_orders WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5A_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE5A_%'");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate5a.test'");

  console.log('\n===============================================================');
  console.log(`  PHASE 5A TEST SUMMARY:`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log('===============================================================\n');

  if (server) server.close();
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

// Start ephemeral server and execute
async function main() {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Fatal test error:', err);
    if (server) server.close();
    await pool.end();
    process.exit(1);
  }
}

main();
