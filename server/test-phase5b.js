/**
 * ELEVATE Phase 5B — Comprehensive Test Suite
 * Growth Reports & Learner Portfolios
 *
 * Covers 18 required scenarios:
 *  1.  Unauthenticated access to growth-report is rejected (401)
 *  2.  Unauthenticated access to portfolio endpoints is rejected (401)
 *  3.  Learner with no enrollments gets a valid zero-state starter report
 *  4.  Enrolled learner growth report has accurate lesson metrics
 *  5.  6-stage evidence timeline is populated correctly
 *  6.  Growth report includes diagnostic learning needs in Explore stage
 *  7.  Cannot feature a non-approved (pending) submission
 *  8.  Cannot feature another learners submission
 *  9.  Feature an approved submission (idempotent)
 * 10.  Unfeature preserves underlying submission and feedback
 * 11.  Update featured project description
 * 12.  Cannot feature with invalid UUID
 * 13.  Description exceeding 1000 chars is rejected
 * 14.  Save journey-level reflection
 * 15.  Save stage-level reflection with structured prompts
 * 16.  Cannot save reflection for unenrolled journey
 * 17.  Reflections API returns journey and stage context
 * 18.  Learner isolation — portfolio and reflections scoped strictly
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

function log(label, ok, details = '') {
  if (ok) { passed++; console.log(`  pass ${label}${details ? ` -- ${details}` : ''}`); }
  else     { failed++; console.error(`  FAIL ${label}${details ? ` -- ${details}` : ''}`); }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);
    if (cookie) headers['Cookie'] = cookie;
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json, headers: res.headers });
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

let educatorCookie, learner1Cookie, learner2Cookie, learner3Cookie;
let educatorId, learner1Id, learner2Id, learner3Id;
let journeyId, stageId, capsuleId, activityId, approvedSubmissionId, pendingSubmissionId;

async function setup() {
  console.log('Setting up Phase 5B Test Environment...');

  // Clean previous runs
  await pool.query("DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM feedback WHERE submission_id IN (SELECT sub.id FROM submissions sub JOIN activities a ON sub.activity_id=a.id JOIN stages s ON a.stage_id=s.id JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM submissions WHERE activity_id IN (SELECT a.id FROM activities a JOIN stages s ON a.stage_id=s.id JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM portfolios WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE5B_%'");
  await pool.query("DELETE FROM learner_needs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate5b.test')");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate5b.test'");

  const pw = await bcrypt.hash('TestPass5B!', 10);

  const edRes = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('5B Educator','educator@elevate5b.test',$1,'educator') RETURNING id",
    [pw]);
  educatorId = edRes.rows[0].id;

  const l1 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('5B Learner1','learner1@elevate5b.test',$1,'learner') RETURNING id",
    [pw]);
  learner1Id = l1.rows[0].id;

  const l2 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('5B Learner2','learner2@elevate5b.test',$1,'learner') RETURNING id",
    [pw]);
  learner2Id = l2.rows[0].id;

  const l3 = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('5B Learner3','learner3@elevate5b.test',$1,'learner') RETURNING id",
    [pw]);
  learner3Id = l3.rows[0].id;

  // Journey (created_by is the correct column)
  const jRes = await pool.query(
    `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, price, status, created_by)
     VALUES ('PHASE5B_Portfolio_Journey','Test journey for portfolio','Technology','Testing','beginner',10.0,0.00,'published',$1)
     RETURNING id`,
    [educatorId]);
  journeyId = jRes.rows[0].id;

  // Stage
  const sRes = await pool.query(
    "INSERT INTO stages (journey_id, stage_type, title, order_index) VALUES ($1,'experience','PHASE5B Experience Stage',1) RETURNING id",
    [journeyId]);
  stageId = sRes.rows[0].id;

  // Capsule (content_url for the video link)
  const cRes = await pool.query(
    "INSERT INTO capsules (stage_id, title, content_url, content_type, duration_min, order_index) VALUES ($1,'PHASE5B Test Lesson','https://www.youtube.com/watch?v=test5b','video',10,1) RETURNING id",
    [stageId]);
  capsuleId = cRes.rows[0].id;

  // Activity (is_required, max_attempts — these columns exist via migrations)
  const aRes = await pool.query(
    "INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, max_attempts) VALUES ($1,'PHASE5B Portfolio Activity','Submit portfolio test work','url',true,3) RETURNING id",
    [stageId]);
  activityId = aRes.rows[0].id;

  // Enrollments (status: 'enrolled')
  await pool.query("INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1,$2,'enrolled'), ($3,$2,'enrolled')",
    [learner1Id, journeyId, learner2Id]);

  // Lesson progress for learner1 (journey_id is required)
  await pool.query(
    "INSERT INTO lesson_progress (user_id, journey_id, capsule_id, completed, completed_at) VALUES ($1,$2,$3,true,NOW())",
    [learner1Id, journeyId, capsuleId]);

  // Approved submission for learner1
  const sub1 = await pool.query(
    "INSERT INTO submissions (user_id, activity_id, content_url, status, attempt_num) VALUES ($1,$2,'https://github.com/learner1/proj5b','approved',1) RETURNING id",
    [learner1Id, activityId]);
  approvedSubmissionId = sub1.rows[0].id;

  // Feedback for approved submission (feedback_type is NOT NULL)
  await pool.query(
    "INSERT INTO feedback (submission_id, reviewer_id, feedback_type, comments, overall_score) VALUES ($1,$2,'rubric','Excellent portfolio work!',95)",
    [approvedSubmissionId, educatorId]);

  // Pending submission for learner2 (should NOT be featurable)
  const sub2 = await pool.query(
    "INSERT INTO submissions (user_id, activity_id, content_url, status, attempt_num) VALUES ($1,$2,'https://github.com/learner2/proj5b','submitted',1) RETURNING id",
    [learner2Id, activityId]);
  pendingSubmissionId = sub2.rows[0].id;

  // Learner needs for learner1 (for explore evidence)
  await pool.query(
    `INSERT INTO learner_needs (user_id, academic_year, branch, academic_situation, career_interests, learning_goals, skills, challenges, weekly_hours, prior_experience, raw_answers)
     VALUES ($1,'3rd Year','CS','Going well','["Dev"]'::jsonb,'Build real apps','["React","Node"]'::jsonb,'["Time mgmt"]'::jsonb,'10','["beginner"]'::jsonb,'{}')
     ON CONFLICT (user_id) DO UPDATE SET academic_year=EXCLUDED.academic_year`,
    [learner1Id]);

  console.log('Connected to PostgreSQL');
  console.log('Test environment setup complete.');

  educatorCookie = await loginAs('educator@elevate5b.test', 'TestPass5B!');
  learner1Cookie = await loginAs('learner1@elevate5b.test', 'TestPass5B!');
  learner2Cookie = await loginAs('learner2@elevate5b.test', 'TestPass5B!');
  learner3Cookie = await loginAs('learner3@elevate5b.test', 'TestPass5B!');
}

async function cleanup() {
  console.log('\nCleaning up Phase 5B test entities...');
  await pool.query("DELETE FROM lesson_progress WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM portfolios WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM learner_needs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate5b.test')");
  await pool.query("DELETE FROM feedback WHERE submission_id IN (SELECT sub.id FROM submissions sub JOIN activities a ON sub.activity_id=a.id JOIN stages s ON a.stage_id=s.id JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM submissions WHERE activity_id IN (SELECT a.id FROM activities a JOIN stages s ON a.stage_id=s.id JOIN journeys j ON s.journey_id=j.id WHERE j.title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE5B_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE5B_%'");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate5b.test'");
  await pool.end();
}

async function runTests() {
  // 1. Unauthenticated growth-report rejected
  console.log('\n--- 1. Unauthenticated Growth Report Access ---');
  { const r = await request('GET', '/api/portfolio/growth-report');
    log('Scenario 1: Unauthenticated GET /api/portfolio/growth-report rejected (401)', r.status === 401, `Status ${r.status}`); }

  // 2. Unauthenticated portfolio endpoints rejected
  console.log('\n--- 2. Unauthenticated Portfolio Access ---');
  { const r1 = await request('GET', '/api/portfolio');
    log('Scenario 2A: Unauthenticated GET /api/portfolio rejected (401)', r1.status === 401, `Status ${r1.status}`);
    const r2 = await request('GET', '/api/portfolio/approved-projects');
    log('Scenario 2B: Unauthenticated GET /api/portfolio/approved-projects rejected (401)', r2.status === 401, `Status ${r2.status}`);
    const r3 = await request('GET', '/api/portfolio/reflections');
    log('Scenario 2C: Unauthenticated GET /api/portfolio/reflections rejected (401)', r3.status === 401, `Status ${r3.status}`);
    const r4 = await request('POST', '/api/portfolio/feature', { submission_id: 'fake' });
    log('Scenario 2D: Unauthenticated POST /api/portfolio/feature rejected (401)', r4.status === 401, `Status ${r4.status}`); }

  // 3. Zero-state starter report for unenrolled learner
  console.log('\n--- 3. Zero-State Starter Report ---');
  { const r = await request('GET', '/api/portfolio/growth-report', null, learner3Cookie);
    const ok = r.status === 200 && r.body?.success === true && r.body?.is_starter_report === true;
    log('Scenario 3: Learner with no enrollments gets zero-state starter report', ok,
      ok ? `is_starter_report=true, enrolled=${r.body?.overview?.enrolled_journeys_count}` : `Status ${r.status} ${JSON.stringify(r.body)}`); }

  // 4. Enrolled learner growth report accuracy
  console.log('\n--- 4. Growth Report Accuracy ---');
  let reportData = null;
  { const r = await request('GET', '/api/portfolio/growth-report', null, learner1Cookie);
    reportData = r.body;
    const ok = r.status === 200 && r.body?.success === true
      && r.body?.overview?.enrolled_journeys_count >= 1
      && r.body?.overview?.total_lessons >= 1
      && r.body?.overview?.completed_lessons >= 1;
    log('Scenario 4: Enrolled learner growth report has correct lesson metrics', ok,
      ok ? `Journeys=${r.body?.overview?.enrolled_journeys_count}, Lessons=${r.body?.overview?.completed_lessons}/${r.body?.overview?.total_lessons}, Approved=${r.body?.overview?.approved_activities}`
         : `Status ${r.status} body=${JSON.stringify(r.body?.overview)}`); }

  // 5. 6-stage evidence timeline
  console.log('\n--- 5. Six-Stage Evidence Timeline Population ---');
  { const t = reportData?.stages_timeline;
    log('Scenario 5A: Explore stage has diagnostic evidence', t?.explore?.has_activity === true, `has_activity=${t?.explore?.has_activity}`);
    log('Scenario 5B: Learn stage has completed capsule evidence', t?.learn?.has_activity === true && t?.learn?.evidence?.length >= 1, `evidence count=${t?.learn?.evidence?.length}`);
    log('Scenario 5C: Experience stage has submission evidence', t?.experience?.has_activity === true, `has_activity=${t?.experience?.has_activity}`);
    log('Scenario 5D: Validate stage has educator feedback evidence', t?.validate?.has_activity === true, `has_activity=${t?.validate?.has_activity}`);
    log('Scenario 5E: Apply stage has approved project evidence', t?.apply?.has_activity === true, `has_activity=${t?.apply?.has_activity}`); }

  // 6. Diagnostic learning needs in Explore stage
  console.log('\n--- 6. Diagnostic Needs in Explore Stage ---');
  { const evidence = reportData?.stages_timeline?.explore?.evidence || [];
    const hasDiag = evidence.some(e => e.type === 'diagnostic_needs');
    log('Scenario 6: Explore stage contains diagnostic learning needs', hasDiag, `Explore evidence items: ${evidence.length}`); }

  // 7. Cannot feature non-approved (pending) submission
  console.log('\n--- 7. Non-Approved Submission Cannot Be Featured ---');
  { const r = await request('POST', '/api/portfolio/feature', { submission_id: pendingSubmissionId }, learner2Cookie);
    log('Scenario 7: Cannot feature pending submission (400)', r.status === 400, `Status ${r.status} -- ${r.body?.message}`); }

  // 8. Cross-learner portfolio isolation
  console.log('\n--- 8. Cross-Learner Feature Isolation ---');
  { const r = await request('POST', '/api/portfolio/feature', { submission_id: approvedSubmissionId }, learner2Cookie);
    log('Scenario 8: Learner 2 cannot feature Learner 1 submission (403)', r.status === 403, `Status ${r.status}`); }

  // 9. Feature approved submission (idempotent)
  console.log('\n--- 9. Feature Approved Submission ---');
  { const r = await request('POST', '/api/portfolio/feature',
      { submission_id: approvedSubmissionId, description: 'My best Phase 5B portfolio work' }, learner1Cookie);
    log('Scenario 9A: Feature approved submission (201)', r.status === 201 && r.body?.success === true, `Status ${r.status}`);
    // Idempotent re-feature
    await request('POST', '/api/portfolio/feature',
      { submission_id: approvedSubmissionId, description: 'Updated re-feature description' }, learner1Cookie);
    const dbCheck = await pool.query(`SELECT artifacts FROM portfolios WHERE user_id=$1 AND journey_id=$2`, [learner1Id, journeyId]);
    const arts = dbCheck.rows[0]?.artifacts || [];
    const matchCount = arts.filter(a => a.submission_id === approvedSubmissionId).length;
    log('Scenario 9B: Re-featuring same submission is idempotent (no duplicates)', matchCount === 1, `artifact entries with same id: ${matchCount}`); }

  // 10. Unfeature preserves submission and feedback
  console.log('\n--- 10. Unfeature Project Preserves Assessment History ---');
  { const r = await request('DELETE', `/api/portfolio/feature/${approvedSubmissionId}`, null, learner1Cookie);
    log('Scenario 10A: Unfeature project returns 200', r.status === 200 && r.body?.success === true, `Status ${r.status}`);
    const subCheck = await pool.query(`SELECT status FROM submissions WHERE id=$1`, [approvedSubmissionId]);
    const fbCheck = await pool.query(`SELECT overall_score FROM feedback WHERE submission_id=$1`, [approvedSubmissionId]);
    log('Scenario 10B: Submission and feedback preserved after unfeature',
      subCheck.rows[0]?.status === 'approved' && Number(fbCheck.rows[0]?.overall_score) === 95,
      `Sub status=${subCheck.rows[0]?.status}, Score=${fbCheck.rows[0]?.overall_score}`);
    const r2 = await request('DELETE', `/api/portfolio/feature/${approvedSubmissionId}`, null, learner1Cookie);
    log('Scenario 10C: Unfeature non-featured project returns 404', r2.status === 404, `Status ${r2.status}`);
    // Re-feature for update tests
    await request('POST', '/api/portfolio/feature', { submission_id: approvedSubmissionId, description: 'Re-featured for update' }, learner1Cookie); }

  // 11. Update featured project description
  console.log('\n--- 11. Update Featured Project Description ---');
  { const newDesc = 'Refined description after Phase 5B review cycle';
    const r = await request('PUT', `/api/portfolio/feature/${approvedSubmissionId}`, { description: newDesc }, learner1Cookie);
    log('Scenario 11A: Update featured project description (200)', r.status === 200 && r.body?.success === true, `Status ${r.status}`);
    const dbCheck = await pool.query(`SELECT artifacts FROM portfolios WHERE user_id=$1 AND journey_id=$2`, [learner1Id, journeyId]);
    const match = (dbCheck.rows[0]?.artifacts || []).find(a => a.submission_id === approvedSubmissionId);
    log('Scenario 11B: Updated description persisted in DB', match?.description === newDesc, `Stored: "${match?.description}"`); }

  // 12. Invalid UUID rejected
  console.log('\n--- 12. Invalid UUID Rejected ---');
  { const r1 = await request('POST', '/api/portfolio/feature', { submission_id: 'not-a-uuid' }, learner1Cookie);
    log('Scenario 12A: Feature with invalid UUID returns 400', r1.status === 400, `Status ${r1.status}`);
    const r2 = await request('DELETE', '/api/portfolio/feature/not-a-uuid', null, learner1Cookie);
    log('Scenario 12B: Unfeature with invalid UUID returns 400', r2.status === 400, `Status ${r2.status}`);
    const r3 = await request('PUT', '/api/portfolio/feature/not-a-uuid', { description: 'x' }, learner1Cookie);
    log('Scenario 12C: Update with invalid UUID returns 400', r3.status === 400, `Status ${r3.status}`); }

  // 13. Description length validation
  console.log('\n--- 13. Description Length Validation ---');
  { const r = await request('POST', '/api/portfolio/feature', {
      submission_id: approvedSubmissionId, description: 'x'.repeat(1001) }, learner1Cookie);
    log('Scenario 13: Description exceeding 1000 chars rejected (400)', r.status === 400, `Status ${r.status} -- ${r.body?.message}`); }

  // 14. Journey-level reflection
  console.log('\n--- 14. Journey-Level Self-Reflection ---');
  { const r = await request('PUT', '/api/portfolio/reflections', {
      journey_id: journeyId, reflection_text: 'This journey taught me so much about practical application.' }, learner1Cookie);
    log('Scenario 14A: Journey reflection saved (200/201)', r.status === 200 || r.status === 201, `Status ${r.status}`);
    const dbCheck = await pool.query(`SELECT self_reflection FROM portfolios WHERE user_id=$1 AND journey_id=$2`, [learner1Id, journeyId]);
    const saved = dbCheck.rows[0]?.self_reflection;
    log('Scenario 14B: Reflection text persisted in DB', saved?.length > 0, `Stored length: ${saved?.length}`); }

  // 15. Stage-level reflection with structured prompts
  console.log('\n--- 15. Stage-Level Reflection with Structured Prompts ---');
  { const r = await request('PUT', '/api/portfolio/reflections', {
      journey_id: journeyId, stage_id: stageId,
      reflection_text: 'The experience stage was very challenging and rewarding.',
      learned: 'How to structure a real-world project.',
      challenge: 'Time management while balancing coursework.',
      evidence: 'GitHub project with CI/CD pipeline submitted.',
      improvement: 'Plan architecture before coding next time.' }, learner1Cookie);
    log('Scenario 15A: Stage reflection with prompts saved (200/201)', r.status === 200 || r.status === 201, `Status ${r.status}`);
    const dbCheck = await pool.query(`SELECT stage_reflections FROM portfolios WHERE user_id=$1 AND journey_id=$2`, [learner1Id, journeyId]);
    const stageRef = dbCheck.rows[0]?.stage_reflections?.[stageId];
    log('Scenario 15B: Structured stage fields persisted in JSONB',
      stageRef?.learned?.length > 0 && stageRef?.challenge?.length > 0,
      `learned="${stageRef?.learned?.substring(0,40)}..."`); }

  // 16. Cannot save reflection for unenrolled journey
  console.log('\n--- 16. Reflection Enrollment Guard ---');
  { const r = await request('PUT', '/api/portfolio/reflections', {
      journey_id: journeyId, reflection_text: 'Unauthorized reflection attempt' }, learner3Cookie);
    log('Scenario 16: Unenrolled learner cannot save reflection (403)', r.status === 403, `Status ${r.status} -- ${r.body?.message}`); }

  // 17. Reflections API returns correct data
  console.log('\n--- 17. Reflections API Returns Correct Data ---');
  { const r = await request('GET', '/api/portfolio/reflections', null, learner1Cookie);
    const ok = r.status === 200 && r.body?.success === true && Array.isArray(r.body?.reflections);
    log('Scenario 17A: GET /portfolio/reflections returns 200 with array', ok, `Status ${r.status}, count=${r.body?.reflections?.length}`);
    if (ok) {
      const jRef = r.body.reflections.find(x => x.scope === 'journey' && x.journey_id === journeyId);
      log('Scenario 17B: Journey-level reflection appears in list', !!jRef, `found=${!!jRef}`);
      const sRef = r.body.reflections.find(x => x.scope === 'stage' && x.stage_id === stageId);
      log('Scenario 17C: Stage-level reflection appears in list', !!sRef, `found=${!!sRef}`); } }

  // 18. Learner isolation
  console.log('\n--- 18. Portfolio & Reflections Learner Isolation ---');
  { const r1 = await request('GET', '/api/portfolio', null, learner2Cookie);
    const l2Ports = r1.body?.portfolios || [];
    const seesL1Art = l2Ports.some(p => (p.artifacts || []).some(a => a.submission_id === approvedSubmissionId));
    log('Scenario 18A: Learner2 GET /portfolio does not see Learner1 artifacts', !seesL1Art, `Visible: ${seesL1Art}`);
    const r2 = await request('GET', '/api/portfolio/reflections', null, learner2Cookie);
    const l2Refs = r2.body?.reflections || [];
    const seesL1Ref = l2Refs.some(x => x.reflection_text?.includes('This journey taught me'));
    log('Scenario 18B: Learner2 GET /portfolio/reflections does not see Learner1 reflections', !seesL1Ref, `Visible: ${seesL1Ref}`);
    const r3 = await request('GET', '/api/portfolio/growth-report', null, learner2Cookie);
    const l2Lessons = r3.body?.overview?.completed_lessons ?? null;
    log('Scenario 18C: Growth report scoped to authenticated learner', r3.status === 200 && l2Lessons === 0, `Learner2 completed_lessons=${l2Lessons} (should be 0)`); }
}

async function main() {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  console.log('\n================================================================');
  console.log('  ELEVATE Phase 5B: Growth Reports & Learner Portfolios Test Suite');
  console.log('================================================================\n');

  try {
    await setup();
    await runTests();
  } finally {
    await cleanup();
    server.close();
  }

  console.log('\n================================================================');
  console.log(`  PHASE 5B TEST SUMMARY:`);
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log('================================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal test error:', err); process.exit(1); });

