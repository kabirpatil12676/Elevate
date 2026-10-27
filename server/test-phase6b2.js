/**
 * ELEVATE Phase 6B.2 — Workshop Attendance & Verifiable Certificates Test Suite
 *
 * Verifies all attendance, completion, workshop certificate eligibility, issuance,
 * security, PDF generation, public verification, revocation, and email delivery workflows.
 */

import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import app from './src/index.js';
import { setRazorpayInstance, resetRazorpayInstance } from './src/controllers/payment.controller.js';
import { setMockSendHandler, clearMockSendHandler } from './src/services/email.service.js';

dotenv.config();

const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET     || 'test_key_secret_6b2';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_6b2';

process.env.RAZORPAY_KEY_SECRET     = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

// ── Mock Razorpay Client ──────────────────────────────────────────────────────
class MockRazorpayClient {
  constructor() {
    this.mockPaymentDetails = null;
    this.orders = {
      create: async (params) => {
        const id = `order_6b2_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        return {
          id,
          entity: 'order',
          amount: params.amount,
          currency: params.currency || 'INR',
          receipt: params.receipt,
          status: 'created',
          notes: params.notes,
        };
      },
    };
    this.payments = {
      fetch: async (paymentId) => {
        if (this.mockPaymentDetails) return { ...this.mockPaymentDetails, id: paymentId };
        return {
          id: paymentId,
          entity: 'payment',
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_placeholder',
        };
      },
    };
  }
}

const mockRazorpay = new MockRazorpayClient();
setRazorpayInstance(mockRazorpay);

// ── Test Server & DB Pool ─────────────────────────────────────────────────────
let server;
let baseUrl = '';
let passed  = 0;
let failed  = 0;

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'elevate_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
});

// ── HTTP Helper ───────────────────────────────────────────────────────────────
function request(method, path, body = null, cookie = null, rawBody = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const isRaw = !!rawBody;
    const bodyBuffer = isRaw ? rawBody : (body ? Buffer.from(JSON.stringify(body)) : null);
    const headers = {
      'Content-Type': 'application/json',
      ...(bodyBuffer ? { 'Content-Length': bodyBuffer.length } : {}),
      ...(cookie     ? { Cookie: cookie }                      : {}),
      ...extraHeaders,
    };

    const opts = {
      hostname: 'localhost',
      port:     parseInt(baseUrl.split(':')[2] || '3001'),
      path,
      method,
      headers,
    };

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        const text = fullBuffer.toString('utf8');
        try {
          resolve({ status: res.statusCode, body: JSON.parse(text), rawBuffer: fullBuffer, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: text, rawBuffer: fullBuffer, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

function signPaymentVerify(orderId, paymentId) {
  return crypto.createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

// ── Test State & Fixtures ─────────────────────────────────────────────────────
let educatorCookie, educator2Cookie, adminCookie;
let learner1Cookie, learner2Cookie, learner3Cookie;
let educatorId, educator2Id, adminId;
let learner1Id, learner2Id, learner3Id;

let freeWorkshopId, paidWorkshopId, upcomingWorkshopId;
let journeyId;
const createdUserIds = [];
const createdEventIds = [];
const createdJourneyIds = [];

async function login(email, password) {
  const r = await request('POST', '/api/auth/login', { email, password });
  return r.headers['set-cookie']?.[0]?.split(';')[0] || '';
}

async function setupFixtures() {
  const suffix = Date.now();

  // Create Users
  async function makeUser(role, label) {
    const email = `${label}_${suffix}@test.elevate`;
    const password = 'TestPass6B2!';
    const res = await request('POST', '/api/auth/register', {
      name: `${label} Name`,
      email,
      password,
    });
    const userId = res.body?.user?.id;
    createdUserIds.push(userId);
    if (role === 'educator' || role === 'admin') {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    }
    const cookie = await login(email, password);
    return { cookie, userId };
  }

  const ed1 = await makeUser('educator', 'educator1');
  educatorCookie = ed1.cookie;
  educatorId = ed1.userId;

  const ed2 = await makeUser('educator', 'educator2');
  educator2Cookie = ed2.cookie;
  educator2Id = ed2.userId;

  const adm = await makeUser('learner', 'admin');
  adminId = adm.userId;
  await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);
  adminCookie = await login(`admin_${suffix}@test.elevate`, 'TestPass6B2!');

  const l1 = await makeUser('learner', 'learner1');
  learner1Cookie = l1.cookie;
  learner1Id = l1.userId;

  const l2 = await makeUser('learner', 'learner2');
  learner2Cookie = l2.cookie;
  learner2Id = l2.userId;

  const l3 = await makeUser('learner', 'learner3');
  learner3Cookie = l3.cookie;
  learner3Id = l3.userId;

  const pastStart = new Date(Date.now() - 3600000 * 4).toISOString();
  const pastEnd   = new Date(Date.now() - 3600000 * 2).toISOString();
  const futureStart = new Date(Date.now() + 3600000 * 24).toISOString();
  const futureEnd   = new Date(Date.now() + 3600000 * 26).toISOString();

  async function createAndPublish(payload) {
    const created = await request('POST', '/api/events', payload, educatorCookie);
    const eventId = created.body?.event?.id;
    if (!eventId) {
      throw new Error(`Event create failed: ${JSON.stringify(created.body)}`);
    }
    const published = await request('PATCH', `/api/events/${eventId}/publish`, {}, educatorCookie);
    if (published.status !== 200) {
      throw new Error(`Event publish failed: ${JSON.stringify(published.body)}`);
    }
    createdEventIds.push(eventId);
    return eventId;
  }

  freeWorkshopId = await createAndPublish({
    title: `Phase 6B.2 Free Workshop ${suffix}`,
    description: 'Testing free workshop attendance & certificate flow',
    category: 'Architecture',
    starts_at: futureStart,
    ends_at: futureEnd,
    registration_deadline: futureStart,
    max_capacity: 20,
    price: 0,
  });

  paidWorkshopId = await createAndPublish({
    title: `Phase 6B.2 Paid Workshop ${suffix}`,
    description: 'Testing paid workshop attendance & certificate flow',
    category: 'FullStack',
    starts_at: futureStart,
    ends_at: futureEnd,
    registration_deadline: futureStart,
    max_capacity: 10,
    price: 499,
  });

  upcomingWorkshopId = await createAndPublish({
    title: `Phase 6B.2 Upcoming Workshop ${suffix}`,
    description: 'Testing premature completion and attendance guards',
    category: 'Frontend',
    starts_at: futureStart,
    ends_at: futureEnd,
    registration_deadline: futureStart,
    max_capacity: 10,
    price: 0,
  });

  // Register learners while events are still upcoming (production registration rules)
  const freeReg1 = await request('POST', `/api/events/${freeWorkshopId}/register`, {}, learner1Cookie);
  if (freeReg1.status !== 201 && freeReg1.status !== 200) {
    throw new Error(`Free workshop L1 register failed: ${JSON.stringify(freeReg1.body)}`);
  }
  const freeReg2 = await request('POST', `/api/events/${freeWorkshopId}/register`, {}, learner2Cookie);
  if (freeReg2.status !== 201 && freeReg2.status !== 200) {
    throw new Error(`Free workshop L2 register failed: ${JSON.stringify(freeReg2.body)}`);
  }

  const ordRes = await request('POST', '/api/payments/create-event-order', { event_id: paidWorkshopId }, learner1Cookie);
  const orderId = ordRes.body?.order_id || ordRes.body?.order?.id;
  if (!orderId) {
    throw new Error(`Paid order create failed: ${JSON.stringify(ordRes.body)}`);
  }
  const paymentId = `pay_ws_test_${Date.now()}`;
  mockRazorpay.mockPaymentDetails = { order_id: orderId, amount: 49900, currency: 'INR', status: 'captured' };
  const signature = signPaymentVerify(orderId, paymentId);
  const verRes = await request('POST', '/api/payments/verify', {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  }, learner1Cookie);
  if (verRes.status !== 200) {
    throw new Error(`Paid verify failed: ${JSON.stringify(verRes.body)}`);
  }

  const badOrdRes = await request('POST', '/api/payments/create-event-order', { event_id: paidWorkshopId }, learner2Cookie);
  const badOrderId = badOrdRes.body?.order_id || badOrdRes.body?.order?.id;
  if (badOrderId) {
    await pool.query(`UPDATE payment_orders SET status = 'failed' WHERE razorpay_order_id = $1`, [badOrderId]);
  }

  // Backdate completed-flow workshops without changing the still-upcoming guard workshop
  await pool.query(
    `UPDATE events SET starts_at = $2, ends_at = $3, registration_deadline = $2, updated_at = NOW()
     WHERE id = ANY($1::uuid[])`,
    [[freeWorkshopId, paidWorkshopId], pastStart, pastEnd]
  );

  const jRes = await pool.query(
    `INSERT INTO journeys (title, description, created_by, price, status)
     VALUES ($1, $2, $3, $4, 'published') RETURNING id`,
    [`Phase 6B.2 Regression Journey ${suffix}`, 'Journey regression check', educatorId, 0]
  );
  journeyId = jRes.rows[0].id;
  createdJourneyIds.push(journeyId);
}

async function cleanup() {
  try {
    for (const eid of createdEventIds) {
      await pool.query('DELETE FROM workshop_certificates WHERE event_id = $1', [eid]);
      await pool.query('DELETE FROM event_attendance WHERE event_id = $1', [eid]);
      await pool.query('DELETE FROM payment_orders WHERE event_id = $1', [eid]);
      await pool.query('DELETE FROM event_registrations WHERE event_id = $1', [eid]);
      await pool.query('DELETE FROM events WHERE id = $1', [eid]);
    }
    for (const jid of createdJourneyIds) {
      await pool.query('DELETE FROM certificates WHERE journey_id = $1', [jid]);
      await pool.query('DELETE FROM enrollments WHERE journey_id = $1', [jid]);
      await pool.query('DELETE FROM stages WHERE journey_id = $1', [jid]);
      await pool.query('DELETE FROM journeys WHERE id = $1', [jid]);
    }
    for (const uid of createdUserIds) {
      await pool.query('DELETE FROM users WHERE id = $1', [uid]);
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// ── Tests Implementation ──────────────────────────────────────────────────────
async function runTests() {
  console.log('\n--- Group A: Workshop Lifecycle & Completion Guards ---');

  // A1: Completing future workshop before ends_at is rejected for educator
  const failComp = await request('PATCH', `/api/events/${upcomingWorkshopId}/complete`, {}, educatorCookie);
  assert(failComp.status === 400 && failComp.body?.message?.includes('scheduled end time'),
    'A1: Workshop cannot be completed before ends_at under normal educator workflow');

  // A2: Admin can force complete future workshop with force: true
  const adminForce = await request('PATCH', `/api/events/${upcomingWorkshopId}/complete`, { force: true }, adminCookie);
  assert(adminForce.status === 200 && adminForce.body?.event?.status === 'completed',
    'A2: Platform administrator can force-complete workshop with administrative override');

  // Reset upcoming workshop back to published for subsequent guards
  await pool.query(`UPDATE events SET status = 'published' WHERE id = $1`, [upcomingWorkshopId]);

  // A3: Completing past workshop after ends_at succeeds for owning educator
  const compRes = await request('PATCH', `/api/events/${freeWorkshopId}/complete`, {}, educatorCookie);
  assert(compRes.status === 200 && compRes.body?.event?.status === 'completed',
    'A3: Owning educator successfully marks workshop completed after scheduled end time');

  // A4: Non-owning educator cannot complete workshop
  const compEd2 = await request('PATCH', `/api/events/${paidWorkshopId}/complete`, {}, educator2Cookie);
  assert(compEd2.status === 403,
    'A4: Non-owning educator is rejected when attempting to complete workshop (403)');

  // Complete paid workshop using owning educator
  await request('PATCH', `/api/events/${paidWorkshopId}/complete`, {}, educatorCookie);

  console.log('\n--- Group B: Attendance Recording & Permissions ---');

  // B1: Unauthenticated attendance requests rejected
  const unauthAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  });
  assert(unauthAtt.status === 401, 'B1: Unauthenticated attendance update rejected (401)');

  // B2: Learners cannot record attendance
  const learnerAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  }, learner1Cookie);
  assert(learnerAtt.status === 403, 'B2: Learner cannot record attendance (403 Forbidden)');

  const regL1 = await pool.query(
    `SELECT status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner1Id]
  );
  assert(regL1.rows[0]?.status === 'registered', 'B3: Learner 1 successfully registered for free workshop');

  const regL2 = await pool.query(
    `SELECT status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );
  assert(regL2.rows[0]?.status === 'registered', 'B4: Learner 2 successfully registered for free workshop');

  // B5: Educator ownership enforced on attendance
  const ed2Att = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  }, educator2Cookie);
  assert(ed2Att.status === 403, 'B5: Non-owning educator cannot record attendance (403 Forbidden)');

  // B6: Registration required — cannot record attendance for unregistered learner3
  const unregAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner3Id, status: 'present' }],
  }, educatorCookie);
  assert(unregAtt.status === 400 && unregAtt.body?.message?.includes('No valid confirmed registration'),
    'B6: Attendance cannot be recorded for an unregistered user (400 Bad Request)');

  const paidReg = await pool.query(
    `SELECT status, payment_status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [paidWorkshopId, learner1Id]
  );
  assert(paidReg.rows[0]?.status === 'registered' && paidReg.rows[0]?.payment_status === 'paid',
    'B7: Learner 1 paid registration captured and confirmed');

  // B8: Uncaptured or unresolved paid registration rejected for attendance
  const uncapturedAtt = await request('PATCH', `/api/events/${paidWorkshopId}/attendance`, {
    attendees: [{ user_id: learner2Id, status: 'present' }],
  }, educatorCookie);
  assert(uncapturedAtt.status === 400,
    'B8: Uncaptured paid registration cannot have attendance recorded (400 Bad Request)');

  // B9: Attendance cannot be recorded before event completion under normal workflow
  const prematureAtt = await request('PATCH', `/api/events/${upcomingWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  }, educatorCookie);
  assert(prematureAtt.status === 400 && prematureAtt.body?.message?.includes('scheduled end time'),
    'B9: Attendance cannot be recorded before event has concluded under normal workflow');

  // B10: Owning educator records attendance on free workshop (learner1 present, learner2 absent)
  const markAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [
      { user_id: learner1Id, status: 'present', notes: 'Active participation' },
      { user_id: learner2Id, status: 'absent', notes: 'Did not attend' },
    ],
  }, educatorCookie);
  assert(markAtt.status === 200 && markAtt.body?.summary?.present_count === 1,
    'B10: Owning educator records attendance (1 present, 1 absent)');

  // B11: Attendance updates do not create duplicate rows
  await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'absent' }],
  }, educatorCookie);
  await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  }, educatorCookie);
  const attCount = await pool.query(
    `SELECT COUNT(*) FROM event_attendance WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner1Id]
  );
  assert(parseInt(attCount.rows[0].count) === 1,
    'B11: Repeated attendance updates update the single record without duplicates');

  await pool.query(
    `UPDATE event_registrations SET status = 'cancelled' WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );
  const cancelledAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner2Id, status: 'present' }],
  }, educatorCookie);
  assert(cancelledAtt.status === 400 && cancelledAtt.body?.message?.includes('No valid confirmed registration'),
    'B11b: Cancelled registration cannot have attendance recorded (400)');

  await pool.query(
    `UPDATE event_registrations SET status = 'waitlisted' WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );
  const waitlistedAtt = await request('PATCH', `/api/events/${freeWorkshopId}/attendance`, {
    attendees: [{ user_id: learner2Id, status: 'present' }],
  }, educatorCookie);
  assert(waitlistedAtt.status === 400 && waitlistedAtt.body?.message?.includes('No valid confirmed registration'),
    'B11c: Waitlisted registration cannot have attendance recorded (400)');

  await pool.query(
    `UPDATE event_registrations SET status = 'registered' WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );

  // B12: Restricted rosters: Learner cannot inspect attendees or attendance
  const learnerRoster = await request('GET', `/api/events/${freeWorkshopId}/attendance`, null, learner1Cookie);
  assert(learnerRoster.status === 403, 'B12a: Learner cannot inspect restricted attendance roster (403)');

  const otherEdRoster = await request('GET', `/api/events/${freeWorkshopId}/attendance`, null, educator2Cookie);
  assert(otherEdRoster.status === 403, 'B12b: Other educator cannot inspect restricted roster (403)');

  const owningEdRoster = await request('GET', `/api/events/${freeWorkshopId}/attendance`, null, educatorCookie);
  assert(owningEdRoster.status === 200 && owningEdRoster.body?.summary?.present_count === 1,
    'B12c: Owning educator successfully retrieves attendance roster with summary');

  console.log('\n--- Group C: Workshop Certificate Eligibility ---');

  // Record learner1 present for paid workshop
  await request('PATCH', `/api/events/${paidWorkshopId}/attendance`, {
    attendees: [{ user_id: learner1Id, status: 'present' }],
  }, educatorCookie);

  // C1: Present learner on completed free workshop is eligible
  const eligFree = await request('GET', `/api/events/${freeWorkshopId}/certificates/eligibility`, null, learner1Cookie);
  assert(eligFree.status === 200 && eligFree.body?.eligible === true,
    'C1: Eligible present learner on completed free workshop returns eligible: true');

  // C2: Absent learner cannot receive certificate
  const eligAbsent = await request('GET', `/api/events/${freeWorkshopId}/certificates/eligibility`, null, learner2Cookie);
  assert(eligAbsent.status === 200 && eligAbsent.body?.eligible === false && eligAbsent.body?.reason?.includes('present'),
    'C2: Absent learner returns eligible: false ("Attendance has not been marked as present")');

  // C3: Unregistered learner is ineligible
  const eligUnreg = await request('GET', `/api/events/${freeWorkshopId}/certificates/eligibility`, null, learner3Cookie);
  assert(eligUnreg.status === 200 && eligUnreg.body?.eligible === false,
    'C3: Unregistered learner is ineligible');

  // C4: Cancelled registration is ineligible
  await pool.query(
    `UPDATE event_registrations SET status = 'cancelled' WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );
  const eligCancel = await request('GET', `/api/events/${freeWorkshopId}/certificates/eligibility`, null, learner2Cookie);
  assert(eligCancel.status === 200 && eligCancel.body?.eligible === false,
    'C4: Cancelled registration is ineligible');

  // C5: Waitlisted registration is ineligible
  await pool.query(
    `UPDATE event_registrations SET status = 'waitlisted' WHERE event_id = $1 AND user_id = $2`,
    [freeWorkshopId, learner2Id]
  );
  const eligWait = await request('GET', `/api/events/${freeWorkshopId}/certificates/eligibility`, null, learner2Cookie);
  assert(eligWait.status === 200 && eligWait.body?.eligible === false,
    'C5: Waitlisted registration is ineligible');

  // C6: Paid workshop with confirmed payment returns eligible: true
  const eligPaid = await request('GET', `/api/events/${paidWorkshopId}/certificates/eligibility`, null, learner1Cookie);
  assert(eligPaid.status === 200 && eligPaid.body?.eligible === true,
    'C6: Paid workshop with confirmed payment and present attendance is eligible');

  console.log('\n--- Group D: Certificate Issuance & Security ---');

  // Configure email mock for clean delivery during issuance
  let lastMockEmail = null;
  setMockSendHandler(async (params) => {
    lastMockEmail = params;
    return { success: true, messageId: 'mock-ws-msg-123' };
  });

  // D1: Ineligible absent learner cannot issue certificate
  const issueAbsent = await request('POST', `/api/events/${freeWorkshopId}/certificates/issue`, {}, learner2Cookie);
  assert(issueAbsent.status === 400, 'D1: Ineligible learner issuance request rejected (400 Bad Request)');

  // D2: Issue certificate for eligible free workshop learner
  const issueFree = await request('POST', `/api/events/${freeWorkshopId}/certificates/issue`, {}, learner1Cookie);
  assert(issueFree.status === 201 && issueFree.body?.certificate?.certificate_number?.startsWith('ELV-WS-'),
    'D2: Certificate successfully issued with ELV-WS number format');

  const cert1 = issueFree.body?.certificate;
  assert(cert1.verification_token?.length === 64,
    'D3: Certificate contains cryptographically secure 64-char unguessable verification token');

  // D4: Repeated issuance request returns the same certificate record (idempotency)
  const repeatIssue = await request('POST', `/api/events/${freeWorkshopId}/certificates/issue`, {}, learner1Cookie);
  assert(repeatIssue.status === 200 && repeatIssue.body?.certificate?.id === cert1.id,
    'D4: Repeated issuance returns existing certificate with status 200');

  // D5: Concurrent issuance requests produce exactly one certificate record
  const issuePaidPromises = [
    request('POST', `/api/events/${paidWorkshopId}/certificates/issue`, {}, learner1Cookie),
    request('POST', `/api/events/${paidWorkshopId}/certificates/issue`, {}, learner1Cookie),
    request('POST', `/api/events/${paidWorkshopId}/certificates/issue`, {}, learner1Cookie),
  ];
  const paidResults = await Promise.all(issuePaidPromises);
  const successCodes = paidResults.map((r) => r.status);
  assert(successCodes.every((s) => s === 200 || s === 201),
    'D5a: All concurrent issuance requests resolve cleanly');

  const paidCertCount = await pool.query(
    `SELECT COUNT(*) FROM workshop_certificates WHERE event_id = $1 AND user_id = $2`,
    [paidWorkshopId, learner1Id]
  );
  assert(parseInt(paidCertCount.rows[0].count) === 1,
    'D5b: Concurrent issuance requests produce exactly one certificate record in database');

  console.log('\n--- Group E: Certificate PDF Download & Privacy ---');

  // E1: Owning learner downloads certificate PDF
  const dlRes = await request('GET', `/api/events/certificates/${cert1.id}/download`, null, learner1Cookie);
  assert(dlRes.status === 200 && dlRes.headers['content-type'] === 'application/pdf',
    'E1: Owning learner successfully downloads PDF (application/pdf)');
  assert(dlRes.rawBuffer.slice(0, 4).toString() === '%PDF',
    'E2: Downloaded file is a valid binary PDF document');

  // E3: Cross-user download access is rejected
  const crossDl = await request('GET', `/api/events/certificates/${cert1.id}/download`, null, learner2Cookie);
  assert(crossDl.status === 403, 'E3: Cross-user download access is rejected (403 Forbidden)');

  // E4: Unauthenticated download access is rejected
  const unauthDl = await request('GET', `/api/events/certificates/${cert1.id}/download`);
  assert(unauthDl.status === 401, 'E4: Unauthenticated download rejected (401)');

  console.log('\n--- Group F: Public Verification & Revocation ---');

  // F1: Public verification returns minimal information (privacy preserved)
  const verifyRes = await request('GET', `/api/certificates/verify/${cert1.verification_token}`);
  assert(verifyRes.status === 200 && verifyRes.body?.valid === true && verifyRes.body?.type === 'workshop',
    'F1: Public verification confirms valid workshop certificate');
  assert(!verifyRes.body?.email && !verifyRes.body?.user_id && !verifyRes.body?.payment_id,
    'F2: Public verification protects privacy (no email, user ID, or payment details exposed)');

  // F2: Invalid token returns not found (404)
  const fakeToken = crypto.randomBytes(32).toString('hex');
  const invalidVerify = await request('GET', `/api/certificates/verify/${fakeToken}`);
  assert(invalidVerify.status === 404, 'F3: Non-existent verification token returns 404 Not Found');

  // F3: Unauthorized user cannot revoke certificate
  const unauthRevoke = await request('POST', `/api/events/certificates/${cert1.id}/revoke`, {
    reason: 'Malicious attempt',
  }, learner2Cookie);
  assert(unauthRevoke.status === 403, 'F4: Non-owner / non-admin cannot revoke certificate (403)');

  // F4: Authorized educator / admin revokes certificate
  const revokeRes = await request('POST', `/api/events/certificates/${cert1.id}/revoke`, {
    reason: 'Attendance criteria revised by educator',
  }, educatorCookie);
  assert(revokeRes.status === 200 && revokeRes.body?.certificate?.status === 'revoked',
    'F5: Owning educator successfully revokes workshop certificate');

  // F5: Revoked certificate public verification returns valid: false and status: 'revoked'
  const revokedVerify = await request('GET', `/api/certificates/verify/${cert1.verification_token}`);
  assert(revokedVerify.status === 200 && revokedVerify.body?.valid === false && revokedVerify.body?.status === 'revoked',
    'F6: Revoked certificate verifies as invalid with revoked status');

  // F6: Downloading revoked certificate PDF is rejected
  const revokedDl = await request('GET', `/api/events/certificates/${cert1.id}/download`, null, learner1Cookie);
  assert(revokedDl.status === 403, 'F7: Download of revoked certificate is blocked (403 Forbidden)');

  console.log('\n--- Group G: Email Delivery & Safe Retries ---');

  // G1: Successful delivery via mock handler
  assert(lastMockEmail !== null && lastMockEmail.workshopTitle?.includes('Phase 6B.2'),
    'G1: Workshop certificate issuance triggered transactional email delivery');

  // G2: Provider failure does not fail certificate issuance
  // Create another workshop for failure simulation
  const failFutureStart = new Date(Date.now() + 3600000 * 48).toISOString();
  const failFutureEnd = new Date(Date.now() + 3600000 * 50).toISOString();
  const wsFailRes = await request('POST', '/api/events', {
    title: `Phase 6B.2 Fail Workshop ${Date.now()}`,
    description: 'Testing email failure resiliency',
    category: 'Testing',
    starts_at: failFutureStart,
    ends_at: failFutureEnd,
    registration_deadline: failFutureStart,
    max_capacity: 10,
    price: 0,
  }, educatorCookie);
  const failWsId = wsFailRes.body?.event?.id;
  createdEventIds.push(failWsId);
  await request('PATCH', `/api/events/${failWsId}/publish`, {}, educatorCookie);
  await request('POST', `/api/events/${failWsId}/register`, {}, learner3Cookie);
  await pool.query(
    `UPDATE events SET starts_at = NOW() - INTERVAL '3 hours', ends_at = NOW() - INTERVAL '1 hour',
            registration_deadline = NOW() - INTERVAL '3 hours', updated_at = NOW()
     WHERE id = $1`,
    [failWsId]
  );
  await request('PATCH', `/api/events/${failWsId}/complete`, {}, educatorCookie);
  await request('PATCH', `/api/events/${failWsId}/attendance`, {
    attendees: [{ user_id: learner3Id, status: 'present' }],
  }, educatorCookie);

  // Set mock handler to throw simulated error
  setMockSendHandler(async () => {
    throw new Error('Simulated Resend API timeout');
  });

  const issueWithFail = await request('POST', `/api/events/${failWsId}/certificates/issue`, {}, learner3Cookie);
  assert(issueWithFail.status === 201 && issueWithFail.body?.certificate?.email_status === 'failed',
    'G2: Certificate issuance succeeds with email_status: failed when provider encounters error');

  const failCertId = issueWithFail.body?.certificate?.id;

  // G3: Email retry endpoint retries delivery safely
  setMockSendHandler(async () => {
    return { success: true, messageId: 'retry-msg-id-456' };
  });

  const retryRes = await request('POST', `/api/events/certificates/${failCertId}/retry-email`, {}, learner3Cookie);
  assert(retryRes.status === 200 && retryRes.body?.certificate?.email_status === 'sent',
    'G3: Protected email retry succeeds and updates email_status to sent');

  const checkRetryDups = await pool.query(
    `SELECT COUNT(*) FROM workshop_certificates WHERE id = $1`,
    [failCertId]
  );
  assert(parseInt(checkRetryDups.rows[0].count) === 1,
    'G4: Retrying email does not create duplicate certificate records');

  setMockSendHandler(async () => ({ success: false, notConfigured: true }));
  const retryUnconfigured = await request('POST', `/api/events/certificates/${failCertId}/retry-email`, {}, learner3Cookie);
  assert(retryUnconfigured.status === 200 && retryUnconfigured.body?.certificate?.email_status === 'not_configured',
    'G5: Missing Resend configuration is recorded as not_configured without issuing a duplicate certificate');

  console.log('\n--- Group H: Existing Journey Certificate Safeguards ---');

  // Enroll learner1 in journey and test journey certificate path
  await pool.query(
    `INSERT INTO stages (journey_id, title, order_index, stage_type) VALUES ($1, 'Stage 1', 1, 'explore')`,
    [journeyId]
  );
  await pool.query(
    `INSERT INTO enrollments (journey_id, user_id, status) VALUES ($1, $2, 'completed')`,
    [journeyId, learner1Id]
  );

  const jCertNum = `ELV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const jToken = crypto.randomBytes(32).toString('hex');
  const jInsert = await pool.query(
    `INSERT INTO certificates (journey_id, user_id, certificate_number, verification_token, status)
     VALUES ($1, $2, $3, $4, 'issued') RETURNING id, verification_token`,
    [journeyId, learner1Id, jCertNum, jToken]
  );
  const jCertId = jInsert.rows[0].id;

  // H1: Journey certificate public verification still functions
  const jVerify = await request('GET', `/api/certificates/verify/${jToken}`);
  assert(jVerify.status === 200 && jVerify.body?.valid === true && jVerify.body?.type === 'journey',
    'H1: Existing journey certificate public verification continues to return type: journey');

  // H2: Journey certificate PDF download still functions
  const jDl = await request('GET', `/api/certificates/${jCertId}/download`, null, learner1Cookie);
  assert(jDl.status === 200 && jDl.headers['content-type'] === 'application/pdf',
    'H2: Existing journey certificate PDF download remains fully functional');

  clearMockSendHandler();
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runAll() {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Phase 6B.2 test server listening on port ${port}`);

  let fatal = false;
  try {
    console.log('\n⚙️  Setting up test fixtures...');
    await setupFixtures();

    await runTests();

    const total = passed + failed;
    console.log(`\n${'═'.repeat(58)}`);
    console.log(`Phase 6B.2 Results: ${passed}/${total} passed (${failed} failed)`);
    console.log(`${'═'.repeat(58)}`);

    if (failed === 0) {
      console.log('🎉 All Phase 6B.2 automated tests passed!\n');
    } else {
      console.error(`⚠️  ${failed} test(s) failed\n`);
    }
  } catch (err) {
    fatal = true;
    console.error('Fatal test error:', err);
  } finally {
    try {
      console.log('\n⚙️  Cleaning up test fixtures...');
      await cleanup();
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    resetRazorpayInstance();
    await pool.end();
    server.close(() => process.exit(fatal || failed > 0 ? 1 : 0));
  }
}

runAll();
