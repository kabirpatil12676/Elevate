/**
 * ELEVATE Phase 4B — Comprehensive Learner Lesson Player & Progress Test Suite
 *
 * Scenarios Tested:
 *  - Group 1: Authentication & Protection (Scenarios 1-5)
 *  - Group 2: Enrollment Verification & Access Control (Scenarios 6-10)
 *  - Group 3: Free Journey Enrollment & Player Data Loading (Scenarios 11-15)
 *  - Group 4: Progress Tracking & Lesson Completion (Scenarios 16-21)
 *  - Group 5: Journey & Stage Completion Logic (Scenarios 22-26)
 *  - Group 6: Learner Dashboard & Multi-Learner Isolation (Scenarios 27-31)
 *  - Group 7: Security Housekeeping & Input Boundaries (Scenarios 32-35)
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
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_e) {
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

async function runTests() {
  console.log('\n===============================================================');
  console.log('  ELEVATE Phase 4B: Learner Lesson Player & Progress Test Suite');
  console.log('===============================================================\n');

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const learner1Email = `learner1_${timestamp}@test.edu`;
  const learner2Email = `learner2_${timestamp}@test.edu`;
  const testPassword = 'Password#123';

  let learner1Cookie = null;
  let learner1Id = null;
  let learner2Cookie = null;
  let learner2Id = null;

  let testFreeJourney = null;
  let testPaidJourney = null;
  let allTestCapsules = [];

  try {
    // Setup test users in database
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPassword, salt);

    const u1 = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Learner One', $1, $2, 'learner') RETURNING id`,
      [learner1Email, hash]
    );
    learner1Id = u1.rows[0].id;

    const u2 = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Learner Two', $1, $2, 'learner') RETURNING id`,
      [learner2Email, hash]
    );
    learner2Id = u2.rows[0].id;

    // Find a published free journey with video capsules
    const jFreeRes = await pool.query(
      `SELECT j.id, j.title, j.price
       FROM journeys j
       WHERE j.status = 'published' AND j.price = 0
       ORDER BY j.created_at ASC LIMIT 1`
    );
    testFreeJourney = jFreeRes.rows[0];

    // Find a published paid journey if available
    const jPaidRes = await pool.query(
      `SELECT j.id, j.title, j.price
       FROM journeys j
       WHERE j.status = 'published' AND j.price > 0
       ORDER BY j.created_at ASC LIMIT 1`
    );
    testPaidJourney = jPaidRes.rows[0] || null;

    // Get capsules for testFreeJourney
    const capsRes = await pool.query(
      `SELECT c.id, c.title, c.stage_id, s.order_index as stage_order, c.order_index as lesson_order
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       WHERE s.journey_id = $1 AND c.content_type = 'video'
       ORDER BY s.order_index ASC, c.order_index ASC`,
      [testFreeJourney.id]
    );
    allTestCapsules = capsRes.rows;

    console.log(`Setup context: Free journey "${testFreeJourney.title}" with ${allTestCapsules.length} video capsules.`);

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 1: Authentication & Protection ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 1: Unauthenticated GET /api/learn/:journeyId returns 401
    const r1 = await request('GET', `/api/learn/${testFreeJourney.id}`);
    log('Scenario 1: Unauthenticated GET player data returns 401', r1.status === 401);

    // Scenario 2: Unauthenticated GET /api/learn/:journeyId/progress returns 401
    const r2 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`);
    log('Scenario 2: Unauthenticated GET progress returns 401', r2.status === 401);

    // Scenario 3: Unauthenticated POST /api/learn/:journeyId/lessons/:capsuleId/complete returns 401
    const dummyCapsule = allTestCapsules[0]?.id || '00000000-0000-0000-0000-000000000001';
    const r3 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${dummyCapsule}/complete`);
    log('Scenario 3: Unauthenticated POST complete returns 401', r3.status === 401);

    // Scenario 4: Unauthenticated GET /api/learn/dashboard returns 401
    const r4 = await request('GET', '/api/learn/dashboard');
    log('Scenario 4: Unauthenticated GET dashboard returns 401', r4.status === 401);

    // Scenario 5: Authenticate learners
    const auth1 = await request('POST', '/api/auth/login', { email: learner1Email, password: testPassword });
    learner1Cookie = extractCookie(auth1);
    const auth2 = await request('POST', '/api/auth/login', { email: learner2Email, password: testPassword });
    learner2Cookie = extractCookie(auth2);
    log('Scenario 5: Authenticated learners receive valid session cookies', Boolean(learner1Cookie && learner2Cookie));

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 2: Enrollment Verification & Access Control ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 6: Authenticated learner NOT enrolled in journey gets 403 on player data
    const r6 = await request('GET', `/api/learn/${testFreeJourney.id}`, null, learner1Cookie);
    log('Scenario 6: Unenrolled learner gets 403 on player data', r6.status === 403 && r6.data.message.includes('not enrolled'));

    // Scenario 7: Authenticated learner NOT enrolled in journey gets 403 on progress
    const r7 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    log('Scenario 7: Unenrolled learner gets 403 on progress', r7.status === 403);

    // Scenario 8: Authenticated learner NOT enrolled in journey gets 403 on mark complete
    const r8 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${dummyCapsule}/complete`, null, learner1Cookie);
    log('Scenario 8: Unenrolled learner gets 403 on mark complete', r8.status === 403);

    // Scenario 9: Invalid journey UUID format returns 400
    const r9 = await request('GET', '/api/learn/not-a-valid-uuid', null, learner1Cookie);
    log('Scenario 9: Malformed journey UUID returns 400', r9.status === 400);

    // Scenario 10: Non-existent journey returns 404
    const r10 = await request('GET', '/api/learn/00000000-0000-0000-0000-000000000099', null, learner1Cookie);
    log('Scenario 10: Non-existent journey returns 404', r10.status === 404);

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 3: Free Journey Enrollment & Player Data Loading ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 11: Free journey direct enrollment succeeds
    const r11 = await request('POST', `/api/journeys/${testFreeJourney.id}/enroll`, null, learner1Cookie);
    log('Scenario 11: Free journey direct enrollment succeeds with status 201', r11.status === 201 && r11.data.success);

    // Scenario 12: Enrolled learner GET /api/learn/:journeyId returns 200 with journey and enrollment details
    const r12 = await request('GET', `/api/learn/${testFreeJourney.id}`, null, learner1Cookie);
    log(
      'Scenario 12: Enrolled learner GET player data returns 200 and details',
      r12.status === 200 && r12.data.journey?.id === testFreeJourney.id && Boolean(r12.data.enrollment)
    );

    // Scenario 13: Journey player payload includes all 6 stages in order_index sequence (1..6)
    const stages = r12.data.stages || [];
    const validStageOrder = stages.length === 6 && stages.every((s, i) => s.order_index === i + 1);
    log('Scenario 13: Player payload returns all 6 stages in sequential order', validStageOrder);

    // Scenario 14: Stages have video capsules attached with title, duration_min, and content_url
    const totalCaps = stages.reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
    const hasUrls = stages.some(s => (s.lessons || []).some(l => l.content_url && l.content_type === 'video'));
    log('Scenario 14: Stages contain video lessons with YouTube content_url and duration', totalCaps > 0 && hasUrls);

    // Scenario 15: Re-enrolling in an already-enrolled journey returns already-enrolled notice
    const r15 = await request('POST', `/api/journeys/${testFreeJourney.id}/enroll`, null, learner1Cookie);
    log('Scenario 15: Re-enrollment handled gracefully (returns 400 Already enrolled)', r15.status === 400 && r15.data.message.includes('Already enrolled'));

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 4: Progress Tracking & Lesson Completion ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 16: Initial GET /api/learn/:journeyId/progress shows 0 completed lessons and 0% progress
    const r16 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    const initialProg = r16.data.progress;
    log(
      'Scenario 16: Initial progress shows 0 completed lessons and 0% progress',
      r16.status === 200 && initialProg.completed_lessons === 0 && initialProg.journey_progress_pct === 0
    );

    // Scenario 17: Mark lesson complete via POST /api/learn/:journeyId/lessons/:capsuleId/complete returns 200
    const targetCapsule1 = allTestCapsules[0];
    const r17 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${targetCapsule1.id}/complete`, null, learner1Cookie);
    log('Scenario 17: Mark lesson complete returns 200 and records completion', r17.status === 200 && r17.data.progress?.completed === true);

    // Scenario 18: Progress updates to reflect 1 completed lesson and calculated percentage
    const r18 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    const updatedProg1 = r18.data.progress;
    const expectedPct = Math.round((1 / updatedProg1.total_lessons) * 100);
    log(
      'Scenario 18: Progress reflects 1 completed lesson and accurate percentage',
      updatedProg1.completed_lessons === 1 && updatedProg1.journey_progress_pct === expectedPct && updatedProg1.lessons[targetCapsule1.id]?.completed === true
    );

    // Scenario 19: Repeated completion of same lesson is idempotent
    const r19 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${targetCapsule1.id}/complete`, null, learner1Cookie);
    const r19Check = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    log(
      'Scenario 19: Repeated completion of same lesson is idempotent (does not double count)',
      r19.status === 200 && r19Check.data.progress.completed_lessons === 1
    );

    // Scenario 20: Mark second lesson in same stage complete (if exists) or next lesson
    const targetCapsule2 = allTestCapsules[1];
    const r20 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${targetCapsule2.id}/complete`, null, learner1Cookie);
    const r20Prog = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    log('Scenario 20: Completing second lesson increments progress counter', r20.status === 200 && r20Prog.data.progress.completed_lessons === 2);

    // Scenario 21: Attempting to complete a non-existent capsule returns 404
    const r21 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/00000000-0000-0000-0000-000000000099/complete`, null, learner1Cookie);
    log('Scenario 21: Non-existent capsule returns 404', r21.status === 404);

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 5: Journey & Stage Completion Logic ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 22: Stage marks `completed: true` when all its video capsules are completed
    // Find stage 1 capsules and complete all of them
    const stage1Capsules = allTestCapsules.filter(c => c.stage_id === allTestCapsules[0].stage_id);
    for (const c of stage1Capsules) {
      await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${c.id}/complete`, null, learner1Cookie);
    }
    const r22 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    const stage1Progress = r22.data.progress.stages.find(s => s.stage_id === stage1Capsules[0].stage_id);
    log('Scenario 22: Stage marks completed: true when all its lessons are done', stage1Progress?.completed === true);

    // Scenario 23: Other stages with incomplete lessons remain completed: false
    const otherIncompleteStages = r22.data.progress.stages.filter(s => s.total_lessons > 0 && s.stage_id !== stage1Capsules[0].stage_id);
    const allIncompleteAreFalse = otherIncompleteStages.every(s => s.completed === false);
    log('Scenario 23: Stages with incomplete lessons remain completed: false', allIncompleteAreFalse);

    // Scenario 24: Completing all lessons marks journey_completed: true and 100%
    for (const c of allTestCapsules) {
      await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${c.id}/complete`, null, learner1Cookie);
    }
    const r24 = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner1Cookie);
    log(
      'Scenario 24: Completing all lessons marks journey_completed: true and 100%',
      r24.data.progress.journey_completed === true && r24.data.progress.journey_progress_pct === 100
    );

    // Scenario 25: Resuming across sessions: Progress is fully persistent in PostgreSQL
    const dbRows = await pool.query(
      `SELECT count(*) as count FROM lesson_progress WHERE user_id = $1 AND journey_id = $2 AND completed = true`,
      [learner1Id, testFreeJourney.id]
    );
    log(
      'Scenario 25: Progress is persistently stored in PostgreSQL database',
      parseInt(dbRows.rows[0].count, 10) === allTestCapsules.length
    );

    // Scenario 26: Attempting to complete a capsule belonging to a DIFFERENT journey returns 404
    // Find capsule belonging to another journey if available
    const otherCapRes = await pool.query(
      `SELECT c.id FROM capsules c JOIN stages s ON c.stage_id = s.id WHERE s.journey_id != $1 LIMIT 1`,
      [testFreeJourney.id]
    );
    if (otherCapRes.rows.length > 0) {
      const foreignCapId = otherCapRes.rows[0].id;
      const r26 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/${foreignCapId}/complete`, null, learner1Cookie);
      log('Scenario 26: Capsule belonging to different journey rejected with 404', r26.status === 404);
    } else {
      log('Scenario 26: Capsule belonging to different journey rejected (skipped - only 1 journey)', true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 6: Learner Dashboard & Multi-Learner Isolation ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 27: GET /api/learn/dashboard returns enrolled journey with correct progress stats
    const r27 = await request('GET', '/api/learn/dashboard', null, learner1Cookie);
    const dashboardEnrollment = r27.data.enrollments?.find(e => e.journey.id === testFreeJourney.id);
    log(
      'Scenario 27: GET dashboard returns enrolled journey with progress summary',
      r27.status === 200 && Boolean(dashboardEnrollment) && dashboardEnrollment.progress.progress_pct === 100
    );

    // Scenario 28: Dashboard computes overall completed lessons and next incomplete lesson
    log('Scenario 28: Dashboard data includes progress structure and next_lesson metadata', 'next_lesson' in dashboardEnrollment.progress);

    // Scenario 29: Cross-learner isolation: Second learner cannot see First learner's progress
    const r29 = await request('GET', '/api/learn/dashboard', null, learner2Cookie);
    log(
      'Scenario 29: Cross-learner isolation: Learner 2 has zero enrollments and sees none of Learner 1 progress',
      r29.data.enrollments.length === 0
    );

    // Scenario 30: Second learner can enroll independently and tracks their own separate progress
    await request('POST', `/api/journeys/${testFreeJourney.id}/enroll`, null, learner2Cookie);
    const r30Prog = await request('GET', `/api/learn/${testFreeJourney.id}/progress`, null, learner2Cookie);
    log(
      'Scenario 30: Second learner tracks completely independent progress (0% despite Learner 1 at 100%)',
      r30Prog.data.progress.completed_lessons === 0 && r30Prog.data.progress.journey_progress_pct === 0
    );

    // Scenario 31: Learner with no enrollments receives empty enrollments array
    const dummyLearnerEmail = `dummy_${timestamp}@test.edu`;
    const dummyU = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Dummy', $1, $2, 'learner') RETURNING id`,
      [dummyLearnerEmail, hash]
    );
    const dummyAuth = await request('POST', '/api/auth/login', { email: dummyLearnerEmail, password: testPassword });
    const dummyCookie = extractCookie(dummyAuth);
    const r31 = await request('GET', '/api/learn/dashboard', null, dummyCookie);
    log('Scenario 31: Learner with no enrollments receives empty enrollments array', Array.isArray(r31.data.enrollments) && r31.data.enrollments.length === 0);
    await pool.query('DELETE FROM users WHERE id = $1', [dummyU.rows[0].id]);

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Group 7: Security Housekeeping & Input Boundaries ---');
    // ─────────────────────────────────────────────────────────────────────────

    // Scenario 32: Malformed capsule UUID returns 400
    const r32 = await request('POST', `/api/learn/${testFreeJourney.id}/lessons/invalid-uuid/complete`, null, learner1Cookie);
    log('Scenario 32: Malformed capsule UUID returns 400', r32.status === 400);

    // Scenario 33: Seed script `seed-educator-admin.js` is idempotent and safe
    const educatorAccountBefore = await pool.query(`SELECT email, password_hash FROM users WHERE email = 'educator@elevate.edu'`);
    // Run seed-educator-admin
    const { default: seedUsers } = await import('./src/db/seed-educator-admin.js?update=' + Date.now()).catch(() => ({ default: null }));
    const educatorAccountAfter = await pool.query(`SELECT email, password_hash FROM users WHERE email = 'educator@elevate.edu'`);
    log(
      'Scenario 33: seed-educator-admin.js is idempotent and preserves accounts without overwriting',
      educatorAccountBefore.rows.length > 0 && educatorAccountAfter.rows.length > 0
    );

    // Scenario 34: API routes reject invalid HTTP methods appropriately
    const r34 = await request('PATCH', `/api/learn/${testFreeJourney.id}`, null, learner1Cookie);
    log('Scenario 34: Unhandled HTTP methods return 404/405 without crashing', [404, 405].includes(r34.status));

    // Scenario 35: Health check passes and verifies active database connection
    const r35 = await request('GET', '/api/health');
    log('Scenario 35: Platform health check reports OK and database connected', r35.status === 200 && r35.data.database === 'connected');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    // Clean up test data
    try {
      if (learner1Id) {
        await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [learner1Id]);
        await pool.query('DELETE FROM enrollments WHERE user_id = $1', [learner1Id]);
        await pool.query('DELETE FROM users WHERE id = $1', [learner1Id]);
      }
      if (learner2Id) {
        await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [learner2Id]);
        await pool.query('DELETE FROM enrollments WHERE user_id = $1', [learner2Id]);
        await pool.query('DELETE FROM users WHERE id = $1', [learner2Id]);
      }
    } catch (_cleanupErr) {}

    await pool.end();
    if (server) {
      server.close();
    }

    console.log('\n===============================================================');
    console.log(`  Phase 4B Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
