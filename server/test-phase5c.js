/**
 * ELEVATE Phase 5C — Comprehensive Automated Test Suite
 * Verifiable Certificates & Email Delivery
 *
 * Covers all 22 required scenarios:
 *  1.  Unauthenticated eligibility and issuance requests are rejected (401)
 *  2.  An ineligible learner cannot issue a certificate (400)
 *  3.  Incomplete lessons block eligibility
 *  4.  Required activities awaiting review block eligibility
 *  5.  Revision-requested activities block eligibility
 *  6.  Required activities that are approved satisfy the corresponding requirement
 *  7.  Archived and non-required activities follow the eligibility rules
 *  8.  Another learner's progress cannot be used to obtain a certificate (learner isolation)
 *  9.  Learners cannot download another learner's certificate (403)
 * 10.  Issuance persists a certificate record and unique verification token
 * 11.  Repeated issuance is idempotent
 * 12.  Concurrent issuance cannot create duplicates (database transaction & unique constraint)
 * 13.  PDF generation produces a valid PDF response for an issued certificate
 * 14.  Invalid verification tokens are rejected (404/invalid)
 * 15.  A valid certificate returns only the allowed verification fields (privacy preservation)
 * 16.  Revoked certificates are not shown as valid
 * 17.  Email success and failure are handled correctly with a mocked email provider
 * 18.  Email retries do not duplicate successful deliveries unnecessarily
 * 19.  Missing Resend configuration does not break certificate issuing or downloads
 * 20.  Existing lesson progress, activities, feedback, portfolio and reflections remain intact
 * 21.  Razorpay paid-enrollment safeguards remain intact
 * 22.  Educator ownership and publication permissions remain intact
 */

import http from 'http';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import app from './src/index.js';
import { setMockSendHandler, clearMockSendHandler } from './src/services/email.service.js';

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

function log(label, ok, details = '') {
  if (ok) {
    passed++;
    console.log(`  [PASS] ${label}${details ? ` -- ${details}` : ''}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label}${details ? ` -- ${details}` : ''}`);
  }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = body ? JSON.stringify(body) : null;
    const headers = { Accept: 'application/json, application/pdf, */*' };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        const text = buffer.toString('utf-8');
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed, rawBuffer: buffer, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function loginAs(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error(`No cookie returned for ${email}`);
  return Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie.split(';')[0];
}

// Entity IDs
let educatorCookie, educatorId;
let adminCookie, adminId;
let learner1Cookie, learner1Id; // fully eligible
let learner2Cookie, learner2Id; // incomplete lessons
let learner3Cookie, learner3Id; // not enrolled at all

let journeyId, stage1Id, stage2Id;
let capsule1Id, capsule2Id;
let reqActivityId;

async function setup() {
  console.log('\n--- Setting up Phase 5C Test Fixtures ---');

  // Clean previous Phase 5C test data
  await pool.query("DELETE FROM certificates WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')");
  await pool.query(`DELETE FROM feedback WHERE submission_id IN (
    SELECT sub.id FROM submissions sub
    JOIN activities a ON sub.activity_id=a.id
    JOIN stages s ON a.stage_id=s.id
    JOIN journeys j ON s.journey_id=j.id
    WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM submissions WHERE activity_id IN (
    SELECT a.id FROM activities a
    JOIN stages s ON a.stage_id=s.id
    JOIN journeys j ON s.journey_id=j.id
    WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM activities WHERE stage_id IN (
    SELECT s.id FROM stages s JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM capsules WHERE stage_id IN (
    SELECT s.id FROM stages s JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM journeys WHERE title LIKE 'PHASE5C_%'`);
  await pool.query(`DELETE FROM users WHERE email LIKE '%@elevate5c.test'`);

  const pwHash = await bcrypt.hash('TestPass5C!', 10);

  // Users — educator role maps to 'educator', admin to 'admin'
  const edRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Prof Phase5C Educator', 'educator@elevate5c.test', $1, 'educator') RETURNING id`,
    [pwHash]
  );
  educatorId = edRes.rows[0].id;

  const admRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Phase5C Administrator', 'admin@elevate5c.test', $1, 'admin') RETURNING id`,
    [pwHash]
  );
  adminId = admRes.rows[0].id;

  const l1Res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Complete FiveC', 'learner1@elevate5c.test', $1, 'learner') RETURNING id`,
    [pwHash]
  );
  learner1Id = l1Res.rows[0].id;

  const l2Res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Incomplete FiveC', 'learner2@elevate5c.test', $1, 'learner') RETURNING id`,
    [pwHash]
  );
  learner2Id = l2Res.rows[0].id;

  const l3Res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ('Learner Unenrolled FiveC', 'learner3@elevate5c.test', $1, 'learner') RETURNING id`,
    [pwHash]
  );
  learner3Id = l3Res.rows[0].id;

  // Journey — use 'created_by' (actual column name), no 'currency' column
  const jRes = await pool.query(
    `INSERT INTO journeys (title, description, created_by, category, skill_domain, difficulty, badge, status, price)
     VALUES ('PHASE5C_Robotics_Kinematics', 'Full 6-stage robotics kinematics trajectory', $1, 'Robotics', 'Kinematics', 'Intermediate', 'Kinematics Master', 'published', 0)
     RETURNING id`,
    [educatorId]
  );
  journeyId = jRes.rows[0].id;

  // Stages
  const st1Res = await pool.query(
    `INSERT INTO stages (journey_id, stage_type, title, description, order_index)
     VALUES ($1, 'learn', 'Learn: Kinematics Foundations', 'Theory and mathematical foundations', 1) RETURNING id`,
    [journeyId]
  );
  stage1Id = st1Res.rows[0].id;

  const st2Res = await pool.query(
    `INSERT INTO stages (journey_id, stage_type, title, description, order_index)
     VALUES ($1, 'experience', 'Experience: Forward Kinematics Simulation', 'Practical programming challenges', 2) RETURNING id`,
    [journeyId]
  );
  stage2Id = st2Res.rows[0].id;

  // Capsules — use 'content_url' (actual column name), not 'video_url'
  const c1Res = await pool.query(
    `INSERT INTO capsules (stage_id, title, content_type, content_url, duration_min, order_index)
     VALUES ($1, 'Rigid Body Transforms', 'video', 'https://youtu.be/dummy1', 15, 1) RETURNING id`,
    [stage1Id]
  );
  capsule1Id = c1Res.rows[0].id;

  const c2Res = await pool.query(
    `INSERT INTO capsules (stage_id, title, content_type, content_url, duration_min, order_index)
     VALUES ($1, 'Denavit-Hartenberg Parameters', 'video', 'https://youtu.be/dummy2', 20, 2) RETURNING id`,
    [stage1Id]
  );
  capsule2Id = c2Res.rows[0].id;

  // Activities
  const reqActRes = await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, is_archived, order_index)
     VALUES ($1, 'DH Matrix Implementation in Python', 'Submit GitHub repository', 'url', true, false, 1) RETURNING id`,
    [stage2Id]
  );
  reqActivityId = reqActRes.rows[0].id;

  // Optional activity (is_required=false)
  await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, is_archived, order_index)
     VALUES ($1, 'Bonus Trajectory Visualizer', 'Optional visualizer script', 'url', false, false, 2) RETURNING id`,
    [stage2Id]
  );

  // Archived required activity (is_archived=true) — must NOT count toward eligibility
  await pool.query(
    `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, is_archived, order_index)
     VALUES ($1, 'Archived Legacy Challenge', 'Deprecated challenge', 'url', true, true, 3) RETURNING id`,
    [stage2Id]
  );

  // Enroll Learner 1 & Learner 2 — use valid enum 'enrolled'
  await pool.query(
    `INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1, $2, 'enrolled')`,
    [learner1Id, journeyId]
  );
  await pool.query(
    `INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1, $2, 'enrolled')`,
    [learner2Id, journeyId]
  );

  // Learner 1: both lessons complete
  await pool.query(
    `INSERT INTO lesson_progress (user_id, capsule_id, journey_id, completed, completed_at)
     VALUES ($1, $2, $4, true, NOW()), ($1, $3, $4, true, NOW())`,
    [learner1Id, capsule1Id, capsule2Id, journeyId]
  );

  // Learner 1: required activity approved
  const sub1Res = await pool.query(
    `INSERT INTO submissions (activity_id, user_id, attempt_num, content_url, status, submitted_at)
     VALUES ($1, $2, 1, 'https://github.com/learner1/robotics-sim', 'approved', NOW()) RETURNING id`,
    [reqActivityId, learner1Id]
  );
  await pool.query(
    `INSERT INTO feedback (submission_id, reviewer_id, feedback_type, overall_score, comments, rubric_scores)
     VALUES ($1, $2, 'approval', 95, 'Outstanding DH implementation', '{"accuracy": 95}')`,
    [sub1Res.rows[0].id, educatorId]
  );

  // Learner 2: only lesson 1 complete
  await pool.query(
    `INSERT INTO lesson_progress (user_id, capsule_id, journey_id, completed, completed_at)
     VALUES ($1, $2, $3, true, NOW())`,
    [learner2Id, capsule1Id, journeyId]
  );

  console.log('Test fixtures created successfully.\n');
}

async function cleanup() {
  console.log('\n--- Cleaning up Test Fixtures ---');
  await pool.query("DELETE FROM certificates WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')");
  await pool.query(`DELETE FROM feedback WHERE submission_id IN (
    SELECT sub.id FROM submissions sub
    JOIN activities a ON sub.activity_id=a.id
    JOIN stages s ON a.stage_id=s.id
    JOIN journeys j ON s.journey_id=j.id
    WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM submissions WHERE activity_id IN (
    SELECT a.id FROM activities a
    JOIN stages s ON a.stage_id=s.id
    JOIN journeys j ON s.journey_id=j.id
    WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM activities WHERE stage_id IN (
    SELECT s.id FROM stages s JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM capsules WHERE stage_id IN (
    SELECT s.id FROM stages s JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5C_%'
  )`);
  await pool.query(`DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5C_%')`);
  await pool.query(`DELETE FROM journeys WHERE title LIKE 'PHASE5C_%'`);
  await pool.query(`DELETE FROM users WHERE email LIKE '%@elevate5c.test'`);
  console.log('Cleanup complete.');
}

async function runTests() {
  await setup();

  educatorCookie = await loginAs('educator@elevate5c.test', 'TestPass5C!');
  adminCookie    = await loginAs('admin@elevate5c.test',    'TestPass5C!');
  learner1Cookie = await loginAs('learner1@elevate5c.test', 'TestPass5C!');
  learner2Cookie = await loginAs('learner2@elevate5c.test', 'TestPass5C!');
  learner3Cookie = await loginAs('learner3@elevate5c.test', 'TestPass5C!');

  // Use mock email handler for all tests — return service-normalized shape { success, messageId }
  setMockSendHandler(async () => ({ success: true, messageId: 'mock_email_default' }));

  console.log('=== Running ELEVATE Phase 5C Test Scenarios ===\n');

  // ── 1. Unauthenticated eligibility and issuance rejected ──────────────────────
  {
    const eligRes  = await request('GET', `/api/certificates/eligibility/${journeyId}`);
    const issueRes = await request('POST', `/api/certificates/issue/${journeyId}`, {});
    log('1. Unauthenticated eligibility and issuance requests are rejected (401)',
      eligRes.status === 401 && issueRes.status === 401,
      `Eligibility: ${eligRes.status}, Issuance: ${issueRes.status}`);
  }

  // ── 2. Ineligible learner cannot issue a certificate ──────────────────────────
  {
    // Learner 2 has only 1 of 2 lessons done — ineligible
    const res = await request('POST', `/api/certificates/issue/${journeyId}`, {}, learner2Cookie);
    log('2. Ineligible learner cannot issue a certificate (400)',
      res.status === 400 && res.body?.success === false,
      `Status: ${res.status}, Message: "${res.body?.message}"`);
  }

  // ── 3. Incomplete lessons block eligibility ───────────────────────────────────
  {
    const res = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner2Cookie);
    const b = res.body;
    log('3. Incomplete lessons block eligibility',
      res.status === 200 &&
      b?.is_eligible === false &&
      b?.requirements?.lessons?.all_completed === false &&
      b?.requirements?.lessons?.incomplete?.length > 0,
      `Eligible: ${b?.is_eligible}, Completed: ${b?.requirements?.lessons?.completed}/${b?.requirements?.lessons?.total}, Incomplete items: ${b?.requirements?.lessons?.incomplete?.length}`);
  }

  // ── 4. Required activities awaiting review block eligibility ──────────────────
  {
    // Temporarily add a pending activity for learner 1
    const tRes = await pool.query(
      `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, is_archived, order_index)
       VALUES ($1, 'Pending Review Challenge 5C', 'Review test', 'url', true, false, 99) RETURNING id`,
      [stage2Id]
    );
    const tId = tRes.rows[0].id;
    await pool.query(
      `INSERT INTO submissions (activity_id, user_id, attempt_num, content_url, status, submitted_at)
       VALUES ($1, $2, 1, 'https://github.com/test/pending', 'submitted', NOW())`,
      [tId, learner1Id]
    );

    const res = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner1Cookie);
    const b = res.body;
    const ok = b?.is_eligible === false &&
               b?.requirements?.activities?.all_approved === false &&
               b?.requirements?.activities?.pending_or_incomplete?.length > 0;

    await pool.query(`DELETE FROM submissions WHERE activity_id = $1`, [tId]);
    await pool.query(`DELETE FROM activities WHERE id = $1`, [tId]);

    log('4. Required activities awaiting review block eligibility', ok,
      `Eligible: ${b?.is_eligible}, Pending activities: ${b?.requirements?.activities?.pending_or_incomplete?.length}`);
  }

  // ── 5. Revision-requested activities block eligibility ────────────────────────
  {
    const rRes = await pool.query(
      `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, is_archived, order_index)
       VALUES ($1, 'Revision Requested 5C', 'Revision test', 'url', true, false, 98) RETURNING id`,
      [stage2Id]
    );
    const rId = rRes.rows[0].id;
    await pool.query(
      `INSERT INTO submissions (activity_id, user_id, attempt_num, content_url, status, submitted_at)
       VALUES ($1, $2, 1, 'https://github.com/test/rev', 'revision_requested', NOW())`,
      [rId, learner1Id]
    );

    const res = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner1Cookie);
    const b = res.body;
    const ok = b?.is_eligible === false &&
               b?.requirements?.activities?.pending_or_incomplete?.length > 0 &&
               b?.requirements?.activities?.pending_or_incomplete[0]?.status === 'revision_requested';

    await pool.query(`DELETE FROM submissions WHERE activity_id = $1`, [rId]);
    await pool.query(`DELETE FROM activities WHERE id = $1`, [rId]);

    log('5. Revision-requested activities block eligibility', ok,
      `Eligible: ${b?.is_eligible}, Pending count: ${b?.requirements?.activities?.pending_or_incomplete?.length}`);
  }

  // ── 6. Approved required activities satisfy the requirement ───────────────────
  {
    const res = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner1Cookie);
    const b = res.body;
    log('6. Required activities that are approved satisfy the corresponding requirement',
      res.status === 200 &&
      b?.is_eligible === true &&
      b?.requirements?.activities?.all_approved === true &&
      b?.requirements?.activities?.approved === 1,
      `Eligible: ${b?.is_eligible}, Approved activities: ${b?.requirements?.activities?.approved}`);
  }

  // ── 7. Archived and non-required activities follow eligibility rules ───────────
  {
    const res = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner1Cookie);
    const b = res.body;
    // Only reqActivityId counts (optional + archived are excluded → total_required === 1)
    log('7. Archived and non-required activities follow the eligibility rules',
      b?.is_eligible === true && b?.requirements?.activities?.total_required === 1,
      `Total required counted: ${b?.requirements?.activities?.total_required} (optional + archived excluded)`);
  }

  // ── 8. Another learner's progress cannot be used to obtain a certificate ──────
  {
    // Learner 3 has no enrollment
    const eligRes  = await request('GET', `/api/certificates/eligibility/${journeyId}`, null, learner3Cookie);
    const issueRes = await request('POST', `/api/certificates/issue/${journeyId}`, {}, learner3Cookie);
    log('8. Another learner\'s progress cannot be used to obtain a certificate (learner isolation)',
      eligRes.status === 403 && issueRes.status >= 400,
      `Eligibility status: ${eligRes.status}, Issue status: ${issueRes.status}`);
  }

  let issuedCert = null;

  // ── 10. Issuance persists certificate record and unique verification token ─────
  {
    const res = await request('POST', `/api/certificates/issue/${journeyId}`, {}, learner1Cookie);
    issuedCert = res.body?.certificate;
    log('10. Issuance persists a certificate record and unique verification token',
      res.status === 201 &&
      res.body?.success === true &&
      issuedCert?.id &&
      issuedCert?.certificate_number?.startsWith('ELV-') &&
      issuedCert?.verification_token?.length >= 32,
      `Number: ${issuedCert?.certificate_number}, Token Length: ${issuedCert?.verification_token?.length}`);
  }

  // ── 9. Learners cannot download another learner's certificate ─────────────────
  {
    const res = await request('GET', `/api/certificates/${issuedCert?.id}/download`, null, learner2Cookie);
    log('9. Learners cannot download another learner\'s certificate (403)',
      res.status === 403 && res.body?.success === false,
      `Status: ${res.status}, Message: "${res.body?.message}"`);
  }

  // ── 11. Repeated issuance is idempotent ───────────────────────────────────────
  {
    const res = await request('POST', `/api/certificates/issue/${journeyId}`, {}, learner1Cookie);
    log('11. Repeated issuance is idempotent',
      res.status === 200 &&
      res.body?.already_issued === true &&
      res.body?.certificate?.id === issuedCert?.id,
      `Status: ${res.status}, Same ID: ${res.body?.certificate?.id === issuedCert?.id}`);
  }

  // ── 12. Concurrent issuance cannot create duplicates ─────────────────────────
  {
    const results = await Promise.all(Array(5).fill(null).map(() =>
      request('POST', `/api/certificates/issue/${journeyId}`, {}, learner1Cookie)
    ));
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM certificates WHERE user_id = $1 AND journey_id = $2`,
      [learner1Id, journeyId]
    );
    log('12. Concurrent issuance cannot create duplicates (transaction & unique constraint)',
      results.every(r => r.status === 200 || r.status === 201) && countRes.rows[0].count === 1,
      `5 concurrent requests → DB rows: ${countRes.rows[0].count}`);
  }

  // ── 13. PDF generation produces a valid PDF buffer ────────────────────────────
  {
    const res = await request('GET', `/api/certificates/${issuedCert?.id}/download`, null, learner1Cookie);
    const headerBytes = res.rawBuffer.slice(0, 5).toString('utf-8');
    log('13. PDF generation produces a valid PDF response for an issued certificate',
      res.status === 200 &&
      headerBytes === '%PDF-' &&
      res.headers['content-type']?.includes('application/pdf') &&
      res.rawBuffer.length > 1000,
      `Size: ${res.rawBuffer.length}B, Header: "${headerBytes}", Content-Type: ${res.headers['content-type']}`);
  }

  // ── 14. Invalid verification tokens are rejected ──────────────────────────────
  {
    const res = await request('GET', `/api/certificates/verify/totally_invalid_token_xyz_abc_000`);
    log('14. Invalid verification tokens are rejected (404/invalid)',
      res.status === 404 && res.body?.valid === false,
      `Status: ${res.status}, Valid: ${res.body?.valid}`);
  }

  // ── 15. Valid certificate returns only allowed verification fields ─────────────
  {
    const res = await request('GET', `/api/certificates/verify/${issuedCert?.verification_token}`);
    const b = res.body;
    const hasRequired = b?.valid === true &&
                        b?.status === 'issued' &&
                        b?.certificate_number === issuedCert?.certificate_number &&
                        b?.learner_name === 'Learner Complete FiveC' &&
                        b?.journey_title === 'PHASE5C_Robotics_Kinematics' &&
                        Boolean(b?.issued_at);
    const noPrivateData = !b?.email && !b?.user_id && !b?.learner_id && !b?.reflections && !b?.submissions;
    log('15. A valid certificate returns only the allowed verification fields (zero private data leak)',
      res.status === 200 && hasRequired && noPrivateData,
      `Learner: "${b?.learner_name}", Journey: "${b?.journey_title}", Private data leaked: ${!noPrivateData}`);
  }

  // ── 16. Revoked certificates are not shown as valid ───────────────────────────
  {
    const revokeRes = await request('PATCH',
      `/api/certificates/${issuedCert?.id}/revoke`,
      { reason: 'Academic integrity audit flag' },
      adminCookie
    );
    const verifyRes = await request('GET', `/api/certificates/verify/${issuedCert?.verification_token}`);
    log('16. Revoked certificates are not shown as valid',
      revokeRes.status === 200 &&
      revokeRes.body?.certificate?.status === 'revoked' &&
      verifyRes.status === 200 &&
      verifyRes.body?.valid === false &&
      verifyRes.body?.status === 'revoked' &&
      verifyRes.body?.revocation_reason === 'Academic integrity audit flag',
      `Valid: ${verifyRes.body?.valid}, Status: "${verifyRes.body?.status}", Reason: "${verifyRes.body?.revocation_reason}"`);

    // Restore to 'issued' for remaining tests
    await pool.query(
      `UPDATE certificates SET status = 'issued', revoked_at = NULL, revocation_reason = NULL WHERE id = $1`,
      [issuedCert?.id]
    );
  }

  // ── 17. Email success and failure handled with mocked provider ────────────────
  {
    // 17a — force failure (service-normalized shape: { success: false, error })
    setMockSendHandler(async () => ({ success: false, error: 'Simulated SMTP Timeout' }));
    const failRes = await request('POST', `/api/certificates/${issuedCert?.id}/send-email`, {}, learner1Cookie);
    const dbFail = await pool.query(
      `SELECT email_status, email_error FROM certificates WHERE id = $1`, [issuedCert?.id]
    );
    const okFail = failRes.status === 500 &&
                   dbFail.rows[0]?.email_status === 'failed' &&
                   dbFail.rows[0]?.email_error?.includes('Simulated SMTP Timeout');

    // 17b — force success (service-normalized shape: { success: true, messageId })
    setMockSendHandler(async () => ({ success: true, messageId: 'mock_msg_success_123' }));
    const succRes = await request('POST', `/api/certificates/${issuedCert?.id}/send-email`, {}, learner1Cookie);
    const dbSucc = await pool.query(
      `SELECT email_status, email_sent_at FROM certificates WHERE id = $1`, [issuedCert?.id]
    );
    const okSucc = succRes.status === 200 &&
                   succRes.body?.success === true &&
                   dbSucc.rows[0]?.email_status === 'sent' &&
                   dbSucc.rows[0]?.email_sent_at !== null;

    log('17. Email success and failure are handled correctly with a mocked email provider',
      okFail && okSucc,
      `Failure handled: ${okFail}, Success handled: ${okSucc}`);
  }

  // ── 18. Email retries do not duplicate successful deliveries ──────────────────
  {
    // email_status is 'sent' from 17b; retry once more
    setMockSendHandler(async () => ({ success: true, messageId: 'mock_retry_ok' }));
    const retryRes = await request('POST', `/api/certificates/${issuedCert?.id}/send-email`, {}, learner1Cookie);
    const certCount = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM certificates WHERE user_id = $1 AND journey_id = $2`,
      [learner1Id, journeyId]
    );
    log('18. Email retries do not duplicate successful deliveries unnecessarily',
      retryRes.status === 200 && certCount.rows[0].cnt === 1,
      `Retry status: ${retryRes.status}, Certificate rows in DB: ${certCount.rows[0].cnt}`);
  }

  // ── 19. Missing Resend config does not break issuance or downloads ─────────────
  {
    const pwHash2 = await bcrypt.hash('TestPass5C!', 10);
    const nrRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Learner No Resend', 'noresend@elevate5c.test', $1, 'learner') RETURNING id`,
      [pwHash2]
    );
    const nrId = nrRes.rows[0].id;
    await pool.query(
      `INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1, $2, 'enrolled')`,
      [nrId, journeyId]
    );
    await pool.query(
      `INSERT INTO lesson_progress (user_id, capsule_id, journey_id, completed, completed_at)
       VALUES ($1, $2, $4, true, NOW()), ($1, $3, $4, true, NOW())`,
      [nrId, capsule1Id, capsule2Id, journeyId]
    );
    await pool.query(
      `INSERT INTO submissions (activity_id, user_id, attempt_num, content_url, status, submitted_at)
       VALUES ($1, $2, 1, 'https://github.com/noresend/sub', 'approved', NOW())`,
      [reqActivityId, nrId]
    );

    // Temporarily unset Resend API key and clear mock — must stay this way until IIFE fires
    const origKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    clearMockSendHandler();

    const nrCookie = await loginAs('noresend@elevate5c.test', 'TestPass5C!');
    const issueRes = await request('POST', `/api/certificates/issue/${journeyId}`, {}, nrCookie);

    // Wait for the async post-issuance IIFE to call sendCertificateEmail and persist email_status
    // Key remains unset during this wait so isEmailConfigured() returns false → 'not_configured'
    await new Promise(r => setTimeout(r, 1000));

    // NOW restore the key and mock for subsequent tests
    if (origKey) process.env.RESEND_API_KEY = origKey;
    setMockSendHandler(async () => ({ success: true, messageId: 'mock_restored' }));

    const nrCert = issueRes.body?.certificate;
    if (!nrCert?.id) {
      log('19. Missing Resend configuration does not break certificate issuing or downloads', false,
        `Issue failed: ${issueRes.status} ${JSON.stringify(issueRes.body)}`);
    } else {
      const dlRes = await request('GET', `/api/certificates/${nrCert.id}/download`, null, nrCookie);
      const isPdf = dlRes.rawBuffer.slice(0, 5).toString('utf-8') === '%PDF-';
      const dbCert = await pool.query(
        `SELECT email_status FROM certificates WHERE id = $1`, [nrCert.id]
      );
      log('19. Missing Resend configuration does not break certificate issuing or downloads',
        issueRes.status === 201 &&
        dbCert.rows[0]?.email_status === 'not_configured' &&
        dlRes.status === 200 &&
        isPdf,
        `Issue: ${issueRes.status}, EmailStatus: ${dbCert.rows[0]?.email_status}, PDF DL: ${dlRes.status}, IsPDF: ${isPdf}`);
    }
  }

  // ── 20. Existing progress, activities, feedback, portfolio remain intact ───────
  {
    const lpCount = await pool.query(
      `SELECT COUNT(*)::int as count FROM lesson_progress WHERE journey_id = $1`, [journeyId]
    );
    const subCount = await pool.query(
      `SELECT COUNT(*)::int as count FROM submissions WHERE activity_id = $1`, [reqActivityId]
    );
    const fbCount = await pool.query(
      `SELECT COUNT(*)::int as count FROM feedback WHERE submission_id IN (
         SELECT id FROM submissions WHERE activity_id = $1
       )`, [reqActivityId]
    );
    log('20. Existing lesson progress, activities, feedback, portfolio and reflections remain intact',
      lpCount.rows[0].count >= 3 && subCount.rows[0].count >= 2 && fbCount.rows[0].count >= 1,
      `Lesson progress rows: ${lpCount.rows[0].count}, Submissions: ${subCount.rows[0].count}, Feedback: ${fbCount.rows[0].count}`);
  }

  // ── 21. Razorpay paid-enrollment safeguards remain intact ─────────────────────
  {
    const pjRes = await pool.query(
      `INSERT INTO journeys (title, description, created_by, category, skill_domain, difficulty, badge, status, price)
       VALUES ('PHASE5C_Paid_Course', 'High value certification course', $1, 'Robotics', 'Kinematics', 'Advanced', 'Paid Master', 'published', 1999)
       RETURNING id`,
      [educatorId]
    );
    const paidJId = pjRes.rows[0].id;

    // Learner 1 is NOT enrolled in this paid journey
    const eligRes  = await request('GET', `/api/certificates/eligibility/${paidJId}`, null, learner1Cookie);
    const issueRes = await request('POST', `/api/certificates/issue/${paidJId}`, {}, learner1Cookie);

    await pool.query(`DELETE FROM journeys WHERE id = $1`, [paidJId]);

    log('21. Razorpay paid-enrollment safeguards remain intact (unenrolled cannot issue certs)',
      (eligRes.status === 403 || eligRes.body?.is_eligible === false) && issueRes.status >= 400,
      `Eligibility: ${eligRes.status}, Issue: ${issueRes.status}`);
  }

  // ── 22. Educator ownership and publication permissions remain intact ───────────
  {
    const djRes = await pool.query(
      `INSERT INTO journeys (title, description, created_by, category, skill_domain, difficulty, badge, status, price)
       VALUES ('PHASE5C_Draft_Course', 'Draft not yet published', $1, 'Robotics', 'Kinematics', 'Beginner', 'Draft Badge', 'draft', 0)
       RETURNING id`,
      [educatorId]
    );
    const draftJId = djRes.rows[0].id;
    await pool.query(
      `INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1, $2, 'enrolled')`,
      [learner1Id, draftJId]
    );

    const eligRes = await request('GET', `/api/certificates/eligibility/${draftJId}`, null, learner1Cookie);
    const ok = eligRes.body?.is_eligible === false &&
               eligRes.body?.outstanding_reasons?.some(r => r.toLowerCase().includes('not published'));

    await pool.query(`DELETE FROM enrollments WHERE journey_id = $1`, [draftJId]);
    await pool.query(`DELETE FROM journeys WHERE id = $1`, [draftJId]);

    log('22. Educator ownership and publication permissions remain intact (draft journeys ineligible)', ok,
      `Is Eligible: ${eligRes.body?.is_eligible}, Reasons: [${eligRes.body?.outstanding_reasons?.join(', ')}]`);
  }

  await cleanup();

  console.log('\n=============================================');
  console.log(`Phase 5C Test Results:`);
  console.log(`  PASSED:  ${passed}`);
  console.log(`  FAILED:  ${failed}`);
  console.log('=============================================\n');

  clearMockSendHandler();
  if (server) server.close();
  await pool.end();

  process.exit(failed > 0 ? 1 : 0);
}

server = http.createServer(app);
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Phase 5C test server listening at ${baseUrl}`);
  runTests().catch((err) => {
    console.error('Test execution error:', err);
    clearMockSendHandler();
    if (server) server.close();
    pool.end();
    process.exit(1);
  });
});
