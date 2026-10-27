/**
 * ELEVATE Phase 6A — Comprehensive Automated Test Suite
 * Workshops & Events Management
 *
 * Covers all required security, lifecycle, capacity, concurrency, and permission scenarios:
 *  1.  Unauthenticated users cannot register for events (401)
 *  2.  Learners cannot create workshops (403)
 *  3.  Learners cannot publish workshops (403)
 *  4.  Educators can create draft workshops (201)
 *  5.  Invalid request payloads and date constraints are rejected (400)
 *  6.  Unpublished (draft) workshops are not accessible to guest / ordinary learners (404)
 *  7.  Unpublished (draft) workshops are accessible to the creating educator (200)
 *  8.  Educator cannot edit another educator's workshop (403)
 *  9.  Educator can update their own draft workshop (200)
 * 10.  Educator can publish their draft workshop (200)
 * 11.  Published workshop is visible in public catalogue (200)
 * 12.  Public catalogue supports category and upcoming filters (200)
 * 13.  Learner can register for an open workshop (201)
 * 14.  Duplicate registration is rejected (409)
 * 15.  Learner can view their registrations in /api/events/my-registrations (200)
 * 16.  Another learner's private registrations are isolated (Learner Isolation)
 * 17.  Learner can cancel their registration before session starts (200)
 * 18.  Seat count increases upon cancellation (Available seats restored)
 * 19.  Learner can safely re-register after cancelling (200)
 * 20.  Capacity enforcement: event with capacity 1 rejects 2nd registration when full (400)
 * 21.  Concurrent registrations: multiple simultaneous registrations cannot exceed capacity (Transaction safe)
 * 22.  Registration after deadline is rejected (400)
 * 23.  Registration for cancelled workshop is rejected (400)
 * 24.  Educator can view registrant roster for their event (200)
 * 25.  Another educator cannot view registrations for an event they do not own (403)
 * 26.  Admin can view and manage events across educators (200)
 * 27.  Published workshop cannot be deleted; must be cancelled (400)
 * 28.  Educator can cancel their published workshop (200)
 * 29.  Draft workshop can be deleted (200)
 * 30.  Regression verification: auth, journey, certificate endpoints remain intact
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
    const headers = { Accept: 'application/json, */*' };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) headers['Cookie'] = cookie;

    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        const text = buffer.toString('utf-8');
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
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

// User credentials and IDs
let educator1Cookie, educator1Id;
let educator2Cookie, educator2Id;
let adminCookie, adminId;
let learner1Cookie, learner1Id;
let learner2Cookie, learner2Id;
let learner3Cookie, learner3Id;

// Test event IDs
let testEventId;
let fullEventId;
let pastDeadlineEventId;
let cancelledEventId;

async function setupUsers() {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // Helper to ensure user exists
  async function ensureUser(email, name, role) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE users SET name = $1, role = $2, password_hash = $3 WHERE email = $4',
        [name, role, passwordHash, email]
      );
      return existing.rows[0].id;
    }
    const inserted = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
      [name, email, passwordHash, role]
    );
    return inserted.rows[0].id;
  }

  educator1Id = await ensureUser('p6a_edu1@elevate.test', 'Dr. Sarah Lin', 'educator');
  educator2Id = await ensureUser('p6a_edu2@elevate.test', 'Prof. Raj Patel', 'educator');
  adminId     = await ensureUser('p6a_admin@elevate.test', 'Admin System', 'admin');
  learner1Id  = await ensureUser('p6a_learner1@elevate.test', 'Alex Learner', 'learner');
  learner2Id  = await ensureUser('p6a_learner2@elevate.test', 'Jordan Lee', 'learner');
  learner3Id  = await ensureUser('p6a_learner3@elevate.test', 'Taylor Swift', 'learner');

  educator1Cookie = await loginAs('p6a_edu1@elevate.test', 'TestPass123!');
  educator2Cookie = await loginAs('p6a_edu2@elevate.test', 'TestPass123!');
  adminCookie     = await loginAs('p6a_admin@elevate.test', 'TestPass123!');
  learner1Cookie  = await loginAs('p6a_learner1@elevate.test', 'TestPass123!');
  learner2Cookie  = await loginAs('p6a_learner2@elevate.test', 'TestPass123!');
  learner3Cookie  = await loginAs('p6a_learner3@elevate.test', 'TestPass123!');
}

async function cleanupTestData() {
  // Delete test events and cascade registrations
  await pool.query(
    `DELETE FROM events WHERE created_by IN ($1, $2, $3)`,
    [educator1Id, educator2Id, adminId]
  );
}

async function runTests() {
  console.log('\n============================================================');
  console.log('   ELEVATE Phase 6A — Automated Test Suite');
  console.log('   Workshops & Events Management');
  console.log('============================================================\n');

  try {
    await setupUsers();
    await cleanupTestData();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Authentication & Role Permissions
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Security & Role Permissions ---');

    // Test 1: Unauthenticated registration rejected
    const unauthRegRes = await request('POST', '/api/events/00000000-0000-0000-0000-000000000001/register');
    log('1. Unauthenticated registration rejected (401)', unauthRegRes.status === 401);

    // Test 2: Learner cannot create events
    const learnerCreateRes = await request(
      'POST',
      '/api/events',
      {
        title: 'Hacked Workshop',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 90000000).toISOString(),
        registration_deadline: new Date(Date.now() + 80000000).toISOString(),
        max_capacity: 10,
      },
      learner1Cookie
    );
    log('2. Learner cannot create workshop (403)', learnerCreateRes.status === 403);

    // Test 3: Learner cannot publish events
    const learnerPublishRes = await request(
      'PATCH',
      '/api/events/00000000-0000-0000-0000-000000000001/publish',
      {},
      learner1Cookie
    );
    log('3. Learner cannot publish workshop (403)', learnerPublishRes.status === 403);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Educator Workshop Creation & Validation
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Educator Creation & Validation ---');

    // Test 4: Educator creates draft workshop
    const startsAt = new Date(Date.now() + 7 * 86400000); // 7 days from now
    const endsAt = new Date(startsAt.getTime() + 2 * 3600000); // +2 hrs
    const deadline = new Date(startsAt.getTime() - 24 * 3600000); // 1 day before

    const createRes = await request(
      'POST',
      '/api/events',
      {
        title: 'Microservices with Node.js & Docker',
        description: 'Hands-on architectural masterclass for backend engineering.',
        category: 'Engineering',
        facilitator_name: 'Dr. Sarah Lin',
        facilitator_bio: 'Principal Systems Architect.',
        venue: null,
        meeting_url: 'https://meet.google.com/p6a-test-room',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        registration_deadline: deadline.toISOString(),
        max_capacity: 25,
      },
      educator1Cookie
    );
    log('4. Educator creates draft workshop (201)', createRes.status === 201 && createRes.body?.event?.status === 'draft');
    testEventId = createRes.body?.event?.id;

    // Test 5: Validation: ends_at <= starts_at rejected
    const invalidDateRes = await request(
      'POST',
      '/api/events',
      {
        title: 'Invalid Workshop Dates',
        starts_at: endsAt.toISOString(),
        ends_at: startsAt.toISOString(),
        registration_deadline: deadline.toISOString(),
        max_capacity: 20,
      },
      educator1Cookie
    );
    log('5. Invalid dates (ends_at <= starts_at) rejected (400)', invalidDateRes.status === 400);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Visibility & Educator Ownership Isolation
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Visibility & Ownership Isolation ---');

    // Test 6: Ordinary learner cannot see draft event
    const learnerViewDraftRes = await request('GET', `/api/events/${testEventId}`, null, learner1Cookie);
    log('6. Draft workshop not visible to ordinary learner (404)', learnerViewDraftRes.status === 404);

    // Test 7: Creating educator can view their draft event
    const eduViewDraftRes = await request('GET', `/api/events/${testEventId}`, null, educator1Cookie);
    log('7. Creating educator can view draft workshop (200)', eduViewDraftRes.status === 200 && eduViewDraftRes.body?.event?.id === testEventId);

    // Test 8: Other educator cannot modify another educator's event
    const otherEduEditRes = await request(
      'PUT',
      `/api/events/${testEventId}`,
      { title: 'Stolen Event Title' },
      educator2Cookie
    );
    log('8. Other educator cannot modify another educator workshop (403)', otherEduEditRes.status === 403);

    // Test 9: Creating educator updates draft
    const eduUpdateRes = await request(
      'PUT',
      `/api/events/${testEventId}`,
      {
        title: 'Microservices with Node.js & Docker (Updated)',
        max_capacity: 30,
      },
      educator1Cookie
    );
    log('9. Creating educator updates draft workshop (200)', eduUpdateRes.status === 200 && eduUpdateRes.body?.event?.max_capacity === 30);

    // Test 10: Educator publishes draft
    const publishRes = await request('PATCH', `/api/events/${testEventId}/publish`, {}, educator1Cookie);
    log('10. Educator publishes draft workshop (200)', publishRes.status === 200 && publishRes.body?.event?.status === 'published');

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Public Catalogue & Browsing
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Public Catalogue & Filtering ---');

    // Test 11: Public list includes published workshop
    const listRes = await request('GET', '/api/events?status=upcoming');
    const foundInCatalogue = (listRes.body?.events || []).some(e => e.id === testEventId);
    log('11. Published workshop appears in public catalogue (200)', listRes.status === 200 && foundInCatalogue);

    // Test 12: Public filtering by category
    const filterRes = await request('GET', '/api/events?category=Engineering');
    const allEngineering = (filterRes.body?.events || []).every(e => e.category === 'Engineering');
    log('12. Category filter correctly filters workshops (200)', filterRes.status === 200 && allEngineering);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Learner Registration, Duplicates & Isolation
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Learner Registration & Isolation ---');

    // Test 13: Learner 1 registers for workshop
    const regRes = await request('POST', `/api/events/${testEventId}/register`, {}, learner1Cookie);
    log('13. Learner registers for available workshop (201)', regRes.status === 201 && regRes.body?.registration?.status === 'registered');

    // Test 14: Duplicate registration returns 409
    const dupRes = await request('POST', `/api/events/${testEventId}/register`, {}, learner1Cookie);
    log('14. Duplicate registration rejected (409)', dupRes.status === 409);

    // Test 15: Learner views their registered events
    const myRegsRes = await request('GET', '/api/events/my-registrations', null, learner1Cookie);
    const hasMyReg = (myRegsRes.body?.registrations || []).some(r => r.event_id === testEventId);
    log('15. Learner retrieves own registrations (200)', myRegsRes.status === 200 && hasMyReg);

    // Test 16: Learner 2 does not see Learner 1's registrations
    const learner2RegsRes = await request('GET', '/api/events/my-registrations', null, learner2Cookie);
    const learner2HasL1Reg = (learner2RegsRes.body?.registrations || []).some(r => r.event_id === testEventId);
    log('16. Learner isolation: registrations not leaked to other learners (200)', learner2RegsRes.status === 200 && !learner2HasL1Reg);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Cancellation & Re-Registration
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Cancellation & Re-Registration ---');

    // Check count before cancellation
    const beforeCancelDetail = await request('GET', `/api/events/${testEventId}`);
    const countBefore = beforeCancelDetail.body?.event?.registered_count;

    // Test 17: Learner cancels registration
    const cancelRes = await request('DELETE', `/api/events/${testEventId}/register`, null, learner1Cookie);
    log('17. Learner cancels registration (200)', cancelRes.status === 200 && cancelRes.body?.registration?.status === 'cancelled');

    // Test 18: Seats available restored
    const afterCancelDetail = await request('GET', `/api/events/${testEventId}`);
    const countAfter = afterCancelDetail.body?.event?.registered_count;
    log('18. Seat restored upon cancellation', countAfter === countBefore - 1);

    // Test 19: Learner re-registers after cancellation
    const reRegRes = await request('POST', `/api/events/${testEventId}/register`, {}, learner1Cookie);
    log('19. Learner can re-register after cancellation (200)', reRegRes.status === 200 && reRegRes.body?.registration?.status === 'registered');

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Capacity Enforcement & Concurrency Locking
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Capacity & Concurrency Protection ---');

    // Create a 1-seat workshop
    const cap1Res = await request(
      'POST',
      '/api/events',
      {
        title: 'Single-Seat Masterclass',
        category: 'Career Growth',
        starts_at: new Date(Date.now() + 5 * 86400000).toISOString(),
        ends_at: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
        max_capacity: 1,
      },
      educator1Cookie
    );
    fullEventId = cap1Res.body?.event?.id;
    await request('PATCH', `/api/events/${fullEventId}/publish`, {}, educator1Cookie);

    // Learner 1 takes the only seat
    await request('POST', `/api/events/${fullEventId}/register`, {}, learner1Cookie);

    // Test 20: Learner 2 tries to register for full workshop
    const fullRegRes = await request('POST', `/api/events/${fullEventId}/register`, {}, learner2Cookie);
    log('20. Full event rejects registration when capacity is reached (400)', fullRegRes.status === 400 && fullRegRes.body?.message?.includes('booked'));

    // Test 21: Concurrency protection: Create a 2-seat workshop and simulate 3 simultaneous registrations
    const concRes = await request(
      'POST',
      '/api/events',
      {
        title: 'Concurrent Concurrency Workshop',
        category: 'Engineering',
        starts_at: new Date(Date.now() + 6 * 86400000).toISOString(),
        ends_at: new Date(Date.now() + 6 * 86400000 + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
        max_capacity: 2,
      },
      educator1Cookie
    );
    const concEventId = concRes.body?.event?.id;
    await request('PATCH', `/api/events/${concEventId}/publish`, {}, educator1Cookie);

    // Dispatch 3 concurrent registration requests simultaneously
    const [c1, c2, c3] = await Promise.all([
      request('POST', `/api/events/${concEventId}/register`, {}, learner1Cookie),
      request('POST', `/api/events/${concEventId}/register`, {}, learner2Cookie),
      request('POST', `/api/events/${concEventId}/register`, {}, learner3Cookie),
    ]);

    const concStatuses = [c1.status, c2.status, c3.status];
    const successes = concStatuses.filter(s => s === 201).length;
    const rejections = concStatuses.filter(s => s === 400).length;

    // Must be exactly 2 successes and 1 rejection due to row locking
    const concCheckRes = await request('GET', `/api/events/${concEventId}`);
    const actualRegistered = concCheckRes.body?.event?.registered_count;

    log(
      '21. Row-level locking protects against concurrent overbooking (2 seats, 3 requests)',
      successes === 2 && rejections === 1 && actualRegistered === 2,
      `Successes: ${successes}, Rejections: ${rejections}, Actual booked: ${actualRegistered}/2`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Deadline & Lifecycle Constraints
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. Deadline & Lifecycle Constraints ---');

    // Create an event whose deadline has passed (in DB directly to test constraint)
    const pastRes = await pool.query(
      `INSERT INTO events (
         title, starts_at, ends_at, max_capacity, registration_deadline,
         status, created_by, created_at, updated_at
       ) VALUES (
         'Past Deadline Workshop',
         NOW() + INTERVAL '2 days',
         NOW() + INTERVAL '2 days 2 hours',
         20,
         NOW() - INTERVAL '1 hour',
         'published',
         $1, NOW(), NOW()
       ) RETURNING id`,
      [educator1Id]
    );
    pastDeadlineEventId = pastRes.rows[0].id;

    // Test 22: Register after deadline rejected
    const pastRegRes = await request('POST', `/api/events/${pastDeadlineEventId}/register`, {}, learner1Cookie);
    log('22. Registration after deadline rejected (400)', pastRegRes.status === 400 && pastRegRes.body?.message?.includes('deadline'));

    // Create a cancelled event
    const cancRes = await pool.query(
      `INSERT INTO events (
         title, starts_at, ends_at, max_capacity, registration_deadline,
         status, created_by, created_at, updated_at
       ) VALUES (
         'Cancelled Masterclass',
         NOW() + INTERVAL '5 days',
         NOW() + INTERVAL '5 days 2 hours',
         20,
         NOW() + INTERVAL '4 days',
         'cancelled',
         $1, NOW(), NOW()
       ) RETURNING id`,
      [educator1Id]
    );
    cancelledEventId = cancRes.rows[0].id;

    // Test 23: Register for cancelled event rejected
    const cancRegRes = await request('POST', `/api/events/${cancelledEventId}/register`, {}, learner1Cookie);
    log('23. Registration for cancelled event rejected (400)', cancRegRes.status === 400);

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Educator Attendee Management & Permissions
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 9. Educator Attendee Management & Permissions ---');

    // Test 24: Educator views registrations for their event
    const rosterRes = await request('GET', `/api/events/${testEventId}/registrations`, null, educator1Cookie);
    const hasRegistrant = (rosterRes.body?.registrations || []).some(r => r.user_id === learner1Id);
    log('24. Educator views registrant roster for own event (200)', rosterRes.status === 200 && hasRegistrant);

    // Test 25: Other educator cannot view registrations for event they do not own
    const otherEduRosterRes = await request('GET', `/api/events/${testEventId}/registrations`, null, educator2Cookie);
    log('25. Unauthorized educator cannot view attendee roster (403)', otherEduRosterRes.status === 403);

    // Test 26: Admin CAN view registrations across educators
    const adminRosterRes = await request('GET', `/api/events/${testEventId}/registrations`, null, adminCookie);
    log('26. Administrator can view registrations across all educators (200)', adminRosterRes.status === 200);

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Lifecycle Transitions & Deletion Safeguards
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 10. Lifecycle Transitions & Deletion Safeguards ---');

    // Test 27: Published workshop cannot be deleted directly
    const deletePubRes = await request('DELETE', `/api/events/${testEventId}`, null, educator1Cookie);
    log('27. Published workshop cannot be deleted directly (400)', deletePubRes.status === 400);

    // Test 28: Educator cancels published workshop
    const cancelPubRes = await request('PATCH', `/api/events/${testEventId}/cancel`, {}, educator1Cookie);
    log('28. Educator cancels published workshop (200)', cancelPubRes.status === 200 && cancelPubRes.body?.event?.status === 'cancelled');

    // Test 29: Draft workshop can be deleted
    const draftForDelete = await request(
      'POST',
      '/api/events',
      {
        title: 'Draft To Delete',
        starts_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        ends_at: new Date(Date.now() + 10 * 86400000 + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
        max_capacity: 10,
      },
      educator1Cookie
    );
    const draftId = draftForDelete.body?.event?.id;
    const deleteDraftRes = await request('DELETE', `/api/events/${draftId}`, null, educator1Cookie);
    log('29. Draft workshop can be permanently deleted (200)', deleteDraftRes.status === 200);

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Regression Check: Existing Features Intact
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- 11. Platform Regression Safeguards ---');

    // Test 30: Health check, journeys and certificates still operational
    const healthRes = await request('GET', '/api/health');
    const journeysRes = await request('GET', '/api/journeys');
    const certsRes = await request('GET', '/api/certificates', null, learner1Cookie);

    const regressionPass =
      healthRes.status === 200 &&
      journeysRes.status === 200 &&
      certsRes.status === 200;

    log(
      '30. Existing platform endpoints (health, journeys, certificates) remain fully functional',
      regressionPass
    );

  } catch (err) {
    console.error('\n❌ Unhandled test runner exception:', err);
    failed++;
  } finally {
    await cleanupTestData();
  }

  console.log('\n============================================================');
  console.log(`   Phase 6A Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  return { passed, failed };
}

// Start transient test server
const PORT = 5098;
server = http.createServer(app);
server.listen(PORT, async () => {
  baseUrl = `http://localhost:${PORT}`;
  const results = await runTests();
  server.close(() => {
    pool.end();
    process.exit(results.failed > 0 ? 1 : 0);
  });
});
