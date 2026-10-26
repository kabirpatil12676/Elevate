/**
 * ELEVATE Phase 4A — Comprehensive Educator Growth Journey Builder Test Suite
 *
 * Scenarios Tested:
 *  - Group 1: Authentication & Role-Based Access Control (Scenarios 1-5)
 *  - Group 2: Journey Draft Creation & 6 Canonical Stages (Scenarios 6-10)
 *  - Group 3: Metadata Editing & Security Constraints (Scenarios 11-14)
 *  - Group 4: Stage & Video Lesson (Capsule) Management (Scenarios 15-20)
 *  - Group 5: Multi-Educator Ownership & Cross-Draft Isolation (Scenarios 21-25)
 *  - Group 6: Administrator Publishing Workflow & Public Isolation (Scenarios 26-31)
 *  - Group 7: Journey Cleanup, Malformed Input & Regression Verification (Scenarios 32-36)
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
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
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
  if (!setCookie) throw new Error('No set-cookie header from login');
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

// ── Shared Test Entities ─────────────────────────────────────────────────────
let learnerCookie    = '';
let educator1Cookie  = '';
let educator2Cookie  = '';
let adminCookie      = '';

let educator1Id      = '';
let educator2Id      = '';
let learnerId        = '';
let adminId          = '';

let testJourneyAId   = '';
let testJourneyAStages = [];
let testLesson1Id    = '';

async function setup() {
  console.log('\n========================================================');
  console.log('       ELEVATE PHASE 4A TEST SUITE SETUP                ');
  console.log('========================================================\n');

  // 1. Start ephemeral HTTP server on dynamic port
  server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`  ✔ Ephemeral server running on ${baseUrl}`);

  // 2. Clean previous test entities
  await pool.query("DELETE FROM capsules WHERE title LIKE 'PHASE4A_%'");
  await pool.query("DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE4A_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE4A_%')");
  await pool.query("DELETE FROM payment_orders WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE4A_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE4A_%'");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate4a.test'");

  // 3. Ensure test users exist
  const hashedPassword = await bcrypt.hash('TestPass#4A!', 10);

  // Learner
  const lRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Test Learner 4A', 'learner@elevate4a.test', $1, 'learner')
     RETURNING id`,
    [hashedPassword]
  );
  learnerId = lRes.rows[0].id;

  // Educator 1
  const e1Res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Prof. Alan Turing', 'educator1@elevate4a.test', $1, 'educator')
     RETURNING id`,
    [hashedPassword]
  );
  educator1Id = e1Res.rows[0].id;

  // Educator 2
  const e2Res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Dr. Ada Lovelace', 'educator2@elevate4a.test', $1, 'educator')
     RETURNING id`,
    [hashedPassword]
  );
  educator2Id = e2Res.rows[0].id;

  // Admin
  const aRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Dean Marcus Admin', 'admin@elevate4a.test', $1, 'admin')
     RETURNING id`,
    [hashedPassword]
  );
  adminId = aRes.rows[0].id;

  // Log in each user to obtain sessions
  learnerCookie   = await loginAs('learner@elevate4a.test',   'TestPass#4A!');
  educator1Cookie = await loginAs('educator1@elevate4a.test', 'TestPass#4A!');
  educator2Cookie = await loginAs('educator2@elevate4a.test', 'TestPass#4A!');
  adminCookie     = await loginAs('admin@elevate4a.test',     'TestPass#4A!');

  console.log('  ✔ All test users registered and authenticated successfully\n');
}

async function runTests() {
  console.log('--------------------------------------------------------');
  console.log(' Group 1: Authentication & Role-Based Access Control    ');
  console.log('--------------------------------------------------------');

  // Scenario 1: Unauthenticated GET /api/educator/journeys
  const res1 = await request('GET', '/api/educator/journeys');
  log(
    'Scenario 1: Unauthenticated GET /api/educator/journeys returns 401',
    res1.status === 401 && res1.body.success === false,
    `Status ${res1.status}`
  );

  // Scenario 2: Unauthenticated POST /api/educator/journeys
  const res2 = await request('POST', '/api/educator/journeys', { title: 'Unauthorized Journey' });
  log(
    'Scenario 2: Unauthenticated POST /api/educator/journeys returns 401',
    res2.status === 401 && res2.body.success === false,
    `Status ${res2.status}`
  );

  // Scenario 3: Learner GET /api/educator/journeys returns 403
  const res3 = await request('GET', '/api/educator/journeys', null, learnerCookie);
  log(
    'Scenario 3: Learner accessing /api/educator/journeys returns 403 Forbidden',
    res3.status === 403 && res3.body.success === false,
    `Status ${res3.status}`
  );

  // Scenario 4: Learner POST /api/educator/journeys returns 403
  const res4 = await request('POST', '/api/educator/journeys', { title: 'Learner Journey' }, learnerCookie);
  log(
    'Scenario 4: Learner creating journey draft returns 403 Forbidden',
    res4.status === 403 && res4.body.success === false,
    `Status ${res4.status}`
  );

  // Scenario 5: Learner PATCH publish returns 403
  const res5 = await request('PATCH', '/api/educator/journeys/00000000-0000-0000-0000-000000000000/publish', { status: 'published' }, learnerCookie);
  log(
    'Scenario 5: Learner attempting publish endpoint returns 403 Forbidden',
    res5.status === 403 && res5.body.success === false,
    `Status ${res5.status}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 2: Journey Draft Creation & Canonical 6 Stages   ');
  console.log('--------------------------------------------------------');

  // Scenario 6: Educator 1 creates draft journey
  const newJourneyPayload = {
    title: 'PHASE4A_Robotics & Embedded Systems',
    description: 'A comprehensive experiential journey into robotics and IoT.',
    category: 'Robotics & Hardware',
    skill_domain: 'Hardware Engineering',
    difficulty: 'Intermediate',
    duration_hours: 14.5,
    badge: 'Robotics Innovator',
    thumbnail_url: 'https://images.unsplash.com/photo-robotics.jpg',
  };
  const res6 = await request('POST', '/api/educator/journeys', newJourneyPayload, educator1Cookie);
  const journeyCreated = res6.status === 201 && res6.body.success && res6.body.journey && res6.body.stages?.length === 6;
  log(
    'Scenario 6: Educator 1 creates draft journey returns 201 with 6 stages',
    journeyCreated,
    `Status ${res6.status}, Stages: ${res6.body.stages?.length}`
  );

  if (journeyCreated) {
    testJourneyAId = res6.body.journey.id;
    testJourneyAStages = res6.body.stages;
  }

  // Scenario 7: Verify draft default status, created_by, and price
  const res7 = res6.body.journey;
  const defaultsCorrect =
    res7?.status === 'draft' &&
    res7?.created_by === educator1Id &&
    Number(res7?.price) === 0;
  log(
    'Scenario 7: Draft defaults verified: status="draft", created_by matches educator, price=0.00',
    defaultsCorrect,
    `Status: ${res7?.status}, Price: ${res7?.price}`
  );

  // Scenario 8: Verify database holds 6 canonical stages in exact sequence
  const dbStagesRes = await pool.query(
    'SELECT stage_type, order_index, title FROM stages WHERE journey_id = $1 ORDER BY order_index ASC',
    [testJourneyAId]
  );
  const expectedSequence = ['explore', 'learn', 'experience', 'validate', 'apply', 'transform'];
  const actualSequence = dbStagesRes.rows.map(r => r.stage_type);
  const stagesInOrder =
    dbStagesRes.rows.length === 6 &&
    JSON.stringify(actualSequence) === JSON.stringify(expectedSequence) &&
    dbStagesRes.rows.every((r, idx) => r.order_index === idx + 1);

  log(
    'Scenario 8: All 6 stages persist in DB in exact canonical order (Explore -> Transform)',
    stagesInOrder,
    `Found sequence: ${actualSequence.join(' -> ')}`
  );

  // Scenario 9: Draft journey does NOT appear in public catalogue
  const res9 = await request('GET', '/api/journeys');
  const catalogList = res9.body.journeys || [];
  const leakedInCatalog = catalogList.some(j => j.id === testJourneyAId || j.title === newJourneyPayload.title);
  log(
    'Scenario 9: Draft journey does NOT leak into public catalogue (status != published)',
    res9.status === 200 && !leakedInCatalog,
    `Catalog count: ${catalogList.length}, Draft present: ${leakedInCatalog}`
  );

  // Scenario 10: Draft journey returns 404 from public detail endpoint
  const res10 = await request('GET', `/api/journeys/${testJourneyAId}`);
  log(
    'Scenario 10: Draft journey returns 404 from public detail endpoint',
    res10.status === 404,
    `Status ${res10.status}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 3: Metadata Editing & Security Constraints       ');
  console.log('--------------------------------------------------------');

  // Scenario 11: Educator 1 updates journey metadata
  const res11 = await request(
    'PUT',
    `/api/educator/journeys/${testJourneyAId}`,
    {
      title: 'PHASE4A_Autonomous Robotics & Edge AI',
      description: 'Updated comprehensive experiential journey.',
      difficulty: 'Advanced',
      duration_hours: 18.0,
      badge: 'Edge AI Master',
    },
    educator1Cookie
  );
  log(
    'Scenario 11: Educator 1 updates journey metadata returns 200 with updated fields',
    res11.status === 200 && res11.body.journey.title === 'PHASE4A_Autonomous Robotics & Edge AI' && res11.body.journey.difficulty === 'Advanced',
    `Updated title: "${res11.body.journey?.title}"`
  );

  // Scenario 12: Educator 1 attempting to publish via PUT /journeys/:id is rejected (403)
  const res12 = await request(
    'PUT',
    `/api/educator/journeys/${testJourneyAId}`,
    { status: 'published' },
    educator1Cookie
  );
  log(
    'Scenario 12: Educator 1 cannot publish via PUT metadata update (returns 403 Forbidden)',
    res12.status === 403,
    `Status ${res12.status}, Message: "${res12.body.message}"`
  );

  // Scenario 13: Educator 1 attempting to publish via PATCH /publish is rejected (403 Admin only)
  const res13 = await request(
    'PATCH',
    `/api/educator/journeys/${testJourneyAId}/publish`,
    { status: 'published' },
    educator1Cookie
  );
  log(
    'Scenario 13: Educator 1 attempting PATCH publish endpoint returns 403 Forbidden',
    res13.status === 403,
    `Status ${res13.status}`
  );

  // Scenario 14: Title validation rejects title shorter than 3 characters
  const res14 = await request(
    'PUT',
    `/api/educator/journeys/${testJourneyAId}`,
    { title: 'AB' },
    educator1Cookie
  );
  log(
    'Scenario 14: Title shorter than 3 characters rejected with 400 Bad Request',
    res14.status === 400,
    `Status ${res14.status}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 4: Stage & Video Lesson (Capsule) Management     ');
  console.log('--------------------------------------------------------');

  const stage1Id = testJourneyAStages[0].id; // Explore
  const stage2Id = testJourneyAStages[1].id; // Learn

  // Scenario 15: Educator 1 updates Stage 1 (Explore) description
  const res15 = await request(
    'PUT',
    `/api/educator/stages/${stage1Id}`,
    {
      title: 'Explore: Embedded Sensors Diagnostic',
      description: 'Comprehensive diagnostic of microcontrollers, RTOS, and sensor interfacing.',
    },
    educator1Cookie
  );
  log(
    'Scenario 15: Educator 1 updates Stage 1 title and description returns 200',
    res15.status === 200 && res15.body.stage.title === 'Explore: Embedded Sensors Diagnostic',
    `Updated title: "${res15.body.stage?.title}"`
  );

  // Scenario 16: Educator 1 adds video lesson with standard YouTube watch URL
  const res16 = await request(
    'POST',
    `/api/educator/stages/${stage2Id}/lessons`,
    {
      title: 'PHASE4A_Introduction to Microcontrollers & GPIO',
      description: 'Foundational video covering pinouts, clock speeds, and memory architecture.',
      content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration_min: 15,
    },
    educator1Cookie
  );
  const lessonAdded =
    res16.status === 201 &&
    res16.body.success &&
    res16.body.lesson?.content_url === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' &&
    res16.body.lesson?.content_type === 'video';
  log(
    'Scenario 16: Add video lesson with standard YouTube URL returns 201 with capsule record',
    lessonAdded,
    `Status ${res16.status}, Lesson ID: ${res16.body.lesson?.id}`
  );
  if (lessonAdded) testLesson1Id = res16.body.lesson.id;

  // Scenario 17: Add second lesson with short youtu.be URL
  const res17 = await request(
    'POST',
    `/api/educator/stages/${stage2Id}/lessons`,
    {
      title: 'PHASE4A_Interfacing I2C and SPI Sensors',
      description: 'Connecting OLED displays and accelerometers.',
      content_url: 'https://youtu.be/jNQXAC9IVRw',
      duration_min: 20,
    },
    educator1Cookie
  );
  log(
    'Scenario 17: Add lesson with short youtu.be URL format accepted (201)',
    res17.status === 201 && res17.body.lesson?.order_index === 2,
    `Order index: ${res17.body.lesson?.order_index}`
  );

  // Scenario 18: Adding lesson with invalid non-YouTube URL rejected
  const res18 = await request(
    'POST',
    `/api/educator/stages/${stage2Id}/lessons`,
    {
      title: 'PHASE4A_Invalid Video Lesson',
      content_url: 'https://vimeo.com/channels/staffpicks/12345678',
    },
    educator1Cookie
  );
  log(
    'Scenario 18: Invalid non-YouTube URL rejected with 400 Bad Request',
    res18.status === 400,
    `Status ${res18.status}, Message: "${res18.body.message}"`
  );

  // Scenario 19: Educator 1 updates lesson title and duration
  const res19 = await request(
    'PUT',
    `/api/educator/lessons/${testLesson1Id}`,
    {
      title: 'PHASE4A_Introduction to Microcontrollers & GPIO (Revised)',
      duration_min: 18,
    },
    educator1Cookie
  );
  log(
    'Scenario 19: Educator 1 updates lesson title and duration returns 200',
    res19.status === 200 && res19.body.lesson?.duration_min === 18,
    `Duration: ${res19.body.lesson?.duration_min}`
  );

  // Scenario 20: Educator 1 deletes lesson
  const res20 = await request('DELETE', `/api/educator/lessons/${testLesson1Id}`, null, educator1Cookie);
  const dbCheckLesson = await pool.query('SELECT * FROM capsules WHERE id = $1', [testLesson1Id]);
  log(
    'Scenario 20: Educator 1 deletes lesson returns 200 and removes record from DB',
    res20.status === 200 && dbCheckLesson.rows.length === 0,
    `Status ${res20.status}, DB rows remaining: ${dbCheckLesson.rows.length}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 5: Multi-Educator Ownership & Cross-Draft Isolation');
  console.log('--------------------------------------------------------');

  // Scenario 21: Educator 2 cannot view Educator 1's draft
  const res21 = await request('GET', `/api/educator/journeys/${testJourneyAId}`, null, educator2Cookie);
  log(
    'Scenario 21: Educator 2 viewing Educator 1 draft returns 403 Forbidden',
    res21.status === 403,
    `Status ${res21.status}`
  );

  // Scenario 22: Educator 2 cannot edit Educator 1's draft metadata
  const res22 = await request('PUT', `/api/educator/journeys/${testJourneyAId}`, { title: 'Hacked Title' }, educator2Cookie);
  log(
    'Scenario 22: Educator 2 updating Educator 1 draft returns 403 Forbidden',
    res22.status === 403,
    `Status ${res22.status}`
  );

  // Scenario 23: Educator 2 cannot modify Educator 1's stages
  const res23 = await request('PUT', `/api/educator/stages/${stage1Id}`, { title: 'Hacked Stage' }, educator2Cookie);
  log(
    'Scenario 23: Educator 2 modifying Educator 1 stage returns 403 Forbidden',
    res23.status === 403,
    `Status ${res23.status}`
  );

  // Scenario 24: Educator 2 cannot add lessons to Educator 1's stage
  const res24 = await request(
    'POST',
    `/api/educator/stages/${stage1Id}/lessons`,
    {
      title: 'Unauthorized Lesson',
      content_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    educator2Cookie
  );
  log(
    'Scenario 24: Educator 2 adding lesson to Educator 1 stage returns 403 Forbidden',
    res24.status === 403,
    `Status ${res24.status}`
  );

  // Scenario 25: Educator 2 cannot delete Educator 1's draft
  const res25 = await request('DELETE', `/api/educator/journeys/${testJourneyAId}`, null, educator2Cookie);
  log(
    'Scenario 25: Educator 2 deleting Educator 1 draft returns 403 Forbidden',
    res25.status === 403,
    `Status ${res25.status}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 6: Administrator Publishing Workflow & Isolation ');
  console.log('--------------------------------------------------------');

  // Scenario 26: Administrator CAN view Educator 1's draft
  const res26 = await request('GET', `/api/educator/journeys/${testJourneyAId}`, null, adminCookie);
  log(
    'Scenario 26: Administrator can view any educator draft journey (200 OK)',
    res26.status === 200 && res26.body.journey.id === testJourneyAId,
    `Status ${res26.status}, Journey: "${res26.body.journey?.title}"`
  );

  // Scenario 27: Administrator publishes draft journey
  const res27 = await request(
    'PATCH',
    `/api/educator/journeys/${testJourneyAId}/publish`,
    { status: 'published' },
    adminCookie
  );
  log(
    'Scenario 27: Administrator publishes draft journey returns 200 with status="published"',
    res27.status === 200 && res27.body.journey.status === 'published',
    `Status: ${res27.body.journey?.status}`
  );

  // Scenario 28: Newly published journey is now visible in public catalogue
  const res28 = await request('GET', '/api/journeys');
  const publishedCatalog = res28.body.journeys || [];
  const foundInCatalog = publishedCatalog.some(j => j.id === testJourneyAId);
  log(
    'Scenario 28: Newly published journey appears in public catalogue GET /api/journeys',
    res28.status === 200 && foundInCatalog,
    `Total published courses: ${publishedCatalog.length}`
  );

  // Scenario 29: Newly published journey is accessible on public detail page with all 6 stages
  const res29 = await request('GET', `/api/journeys/${testJourneyAId}`);
  log(
    'Scenario 29: Newly published journey accessible on public detail page with all 6 stages',
    res29.status === 200 && res29.body.journey?.id === testJourneyAId && res29.body.stages?.length === 6,
    `Status: ${res29.status}, Stage count: ${res29.body.stages?.length}`
  );

  // Scenario 30: Administrator unpublishes journey back to draft
  const res30 = await request(
    'PATCH',
    `/api/educator/journeys/${testJourneyAId}/publish`,
    { status: 'draft' },
    adminCookie
  );
  log(
    'Scenario 30: Administrator unpublishes journey back to "draft" returns 200',
    res30.status === 200 && res30.body.journey.status === 'draft',
    `Status: ${res30.body.journey?.status}`
  );

  // Scenario 31: Unpublished journey immediately returns 404 on public detail endpoint
  const res31 = await request('GET', `/api/journeys/${testJourneyAId}`);
  log(
    'Scenario 31: Unpublished journey immediately hidden from public endpoint (returns 404)',
    res31.status === 404,
    `Status ${res31.status}`
  );

  console.log('\n--------------------------------------------------------');
  console.log(' Group 7: Cleanup, UUID Validation & Regression Check   ');
  console.log('--------------------------------------------------------');

  // Scenario 32: Malformed UUID on journey endpoint returns 400
  const res32 = await request('GET', '/api/educator/journeys/not-a-valid-uuid', null, educator1Cookie);
  log(
    'Scenario 32: Malformed UUID on journey endpoint returns 400 Bad Request',
    res32.status === 400,
    `Status ${res32.status}`
  );

  // Scenario 33: Malformed UUID on stage endpoint returns 400
  const res33 = await request('PUT', '/api/educator/stages/123-bad-id', { title: 'Test' }, educator1Cookie);
  log(
    'Scenario 33: Malformed UUID on stage endpoint returns 400 Bad Request',
    res33.status === 400,
    `Status ${res33.status}`
  );

  // Scenario 34: Malformed UUID on lesson endpoint returns 400
  const res34 = await request('DELETE', '/api/educator/lessons/abc', null, educator1Cookie);
  log(
    'Scenario 34: Malformed UUID on lesson endpoint returns 400 Bad Request',
    res34.status === 400,
    `Status ${res34.status}`
  );

  // Scenario 35: Educator 1 deletes their draft journey cleanly
  const res35 = await request('DELETE', `/api/educator/journeys/${testJourneyAId}`, null, educator1Cookie);
  const dbCheckJourney = await pool.query('SELECT * FROM journeys WHERE id = $1', [testJourneyAId]);
  const dbCheckStages  = await pool.query('SELECT * FROM stages WHERE journey_id = $1', [testJourneyAId]);
  log(
    'Scenario 35: Educator 1 deletes draft journey returns 200, stages cascaded cleanly',
    res35.status === 200 && dbCheckJourney.rows.length === 0 && dbCheckStages.rows.length === 0,
    `DB journeys: ${dbCheckJourney.rows.length}, DB stages: ${dbCheckStages.rows.length}`
  );

  // Scenario 36: Verify existing 8 canonical published journeys remain completely intact
  const res36 = await pool.query(
    `SELECT j.id, j.title, COUNT(s.id) as stage_count
     FROM journeys j
     LEFT JOIN stages s ON j.id = s.journey_id
     WHERE j.status = 'published'
     GROUP BY j.id, j.title
     ORDER BY j.title ASC`
  );
  const eightJourneysIntact =
    res36.rows.length === 8 &&
    res36.rows.every(r => parseInt(r.stage_count, 10) === 6);
  log(
    'Scenario 36: Regression check: All 8 canonical published journeys preserved with 6 stages each',
    eightJourneysIntact,
    `Count: ${res36.rows.length}/8 published journeys`
  );
}

async function teardown() {
  console.log('\n🧹 Teardown — cleaning up test data & stopping server...');
  try {
    await pool.query("DELETE FROM capsules WHERE title LIKE 'PHASE4A_%'");
    await pool.query("DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE4A_%')");
    await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE4A_%'");
    await pool.query("DELETE FROM users WHERE email LIKE '%@elevate4a.test'");
  } catch (err) {
    console.error('Teardown error:', err.message);
  }

  if (server) {
    await new Promise(r => server.close(r));
    console.log('  ✔ Ephemeral server stopped');
  }
  await pool.end();
  console.log('  ✔ DB pool closed');

  console.log('\n========================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED | ${skipped} SKIPPED`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

// ── Execute Suite ────────────────────────────────────────────────────────────
(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await teardown();
  }
})();
