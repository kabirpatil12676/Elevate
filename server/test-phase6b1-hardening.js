/**
 * ELEVATE Phase 6B.1.1 — Payment and Capacity Hardening Test Suite
 *
 * Verifies the 13 required hardening scenarios:
 *  1. Abandoned checkout reservation expires
 *  2. Expired reservations no longer block available capacity
 *  3. Active reservations prevent overbooking
 *  4. Concurrent checkout attempts cannot oversell final seat
 *  5. Duplicate pending-order requests are controlled
 *  6. Razorpay order creation failure releases its reservation
 *  7. Captured payment after reservation expiry is handled safely
 *  8. Captured payment against a full or cancelled event is recorded for resolution
 *  9. Repeated verification is idempotent
 * 10. Duplicate and out-of-order webhooks are handled safely
 * 11. Failed transactions do not leave inconsistent capacity or payment states
 * 12. Existing free workshop registrations remain functional
 * 13. Existing journey payments remain functional
 */

import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import app from './src/index.js';
import {
  setRazorpayInstance,
  resetRazorpayInstance,
} from './src/controllers/payment.controller.js';

dotenv.config();

const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET     || 'test_key_secret_hardening';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_hardening';

process.env.RAZORPAY_KEY_SECRET     = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

// ── In-Memory Mock Razorpay Client ────────────────────────────────────────────
class MockRazorpayClient {
  constructor() {
    this.orderCreateError   = null;
    this.paymentFetchError  = null;
    this.mockPaymentDetails = null;

    this.orders = {
      create: async (params) => {
        if (this.orderCreateError) throw this.orderCreateError;
        const id = `order_hard_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
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
        if (this.paymentFetchError) throw this.paymentFetchError;
        if (this.mockPaymentDetails) return { ...this.mockPaymentDetails, id: paymentId };
        return {
          id: paymentId,
          entity: 'payment',
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_test_placeholder',
        };
      },
    };
  }

  reset() {
    this.orderCreateError   = null;
    this.paymentFetchError  = null;
    this.mockPaymentDetails = null;
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

// ── HTTP Helpers ──────────────────────────────────────────────────────────────
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
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

async function login(email, password) {
  const r = await request('POST', '/api/auth/login', { email, password });
  return r.headers['set-cookie']?.[0]?.split(';')[0] || '';
}

function signPaymentVerify(orderId, paymentId) {
  return crypto.createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function signWebhook(body) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET)
    .update(typeof body === 'string' ? body : JSON.stringify(body))
    .digest('hex');
}

function buildWebhookPayload(orderId, paymentId, amountPaise, currency = 'INR', eventType = 'payment.captured') {
  return {
    event: eventType,
    payload: {
      payment: {
        entity: {
          id:       paymentId,
          order_id: orderId,
          amount:   amountPaise,
          currency,
          status:   'captured',
        },
      },
    },
  };
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

// ── Test Fixtures ─────────────────────────────────────────────────────────────
let learner1Cookie, learner2Cookie, learner3Cookie, educatorCookie, adminCookie;
let learner1Id, learner2Id, learner3Id, educatorId, adminId;
const createdEventIds = [];
const createdJourneyIds = [];

let createdUserIds = [];

async function setupFixtures() {
  const suffix = Date.now();

  // 1. Learner 1
  const r1 = await request('POST', '/api/auth/register', {
    name:     `Hardening L1 ${suffix}`,
    email:    `hard_l1_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  learner1Id = r1.body?.user?.id;
  createdUserIds.push(learner1Id);
  learner1Cookie = await login(`hard_l1_${suffix}@test.elevate`, 'TestPass6B1!');

  // 2. Learner 2
  const r2 = await request('POST', '/api/auth/register', {
    name:     `Hardening L2 ${suffix}`,
    email:    `hard_l2_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  learner2Id = r2.body?.user?.id;
  createdUserIds.push(learner2Id);
  learner2Cookie = await login(`hard_l2_${suffix}@test.elevate`, 'TestPass6B1!');

  // 3. Learner 3
  const r3 = await request('POST', '/api/auth/register', {
    name:     `Hardening L3 ${suffix}`,
    email:    `hard_l3_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  learner3Id = r3.body?.user?.id;
  createdUserIds.push(learner3Id);
  learner3Cookie = await login(`hard_l3_${suffix}@test.elevate`, 'TestPass6B1!');

  // 4. Educator
  const r4 = await request('POST', '/api/auth/register', {
    name:     `Hardening Edu ${suffix}`,
    email:    `hard_edu_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
  });
  educatorId = r4.body?.user?.id;
  await pool.query(`UPDATE users SET role = 'educator' WHERE id = $1`, [educatorId]);
  createdUserIds.push(educatorId);
  educatorCookie = await login(`hard_edu_${suffix}@test.elevate`, 'TestPass6B1!');

  // 5. Admin
  const r5 = await request('POST', '/api/auth/register', {
    name:     `Hardening Admin ${suffix}`,
    email:    `hard_adm_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  adminId = r5.body?.user?.id;
  await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);
  createdUserIds.push(adminId);
  adminCookie = await login(`hard_adm_${suffix}@test.elevate`, 'TestPass6B1!');
}

async function createTestEvent({ title, max_capacity = 1, price = 299, status = 'published' }) {
  const futStart    = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const futEnd      = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
  const futDeadline = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();

  const res = await pool.query(
    `INSERT INTO events
       (title, description, category, facilitator_name, venue, starts_at, ends_at,
        registration_deadline, max_capacity, price, currency, status, created_by)
     VALUES ($1, 'Hardening test event', 'Tech', 'Facilitator', 'Online', $2, $3, $4, $5, $6, 'INR', 'draft', $7)
     RETURNING id`,
    [title, futStart, futEnd, futDeadline, max_capacity, price, educatorId]
  );
  const evId = res.rows[0].id;
  createdEventIds.push(evId);

  if (status === 'published') {
    await pool.query(`UPDATE events SET status = 'published' WHERE id = $1`, [evId]);
  }
  return evId;
}

async function cleanup() {
  for (const evId of createdEventIds) {
    await pool.query(`DELETE FROM payment_orders WHERE event_id = $1`, [evId]).catch(() => {});
    await pool.query(`DELETE FROM event_registrations WHERE event_id = $1`, [evId]).catch(() => {});
    await pool.query(`DELETE FROM events WHERE id = $1`, [evId]).catch(() => {});
  }
  for (const jId of createdJourneyIds) {
    await pool.query(`DELETE FROM payment_orders WHERE journey_id = $1`, [jId]).catch(() => {});
    await pool.query(`DELETE FROM enrollments WHERE journey_id = $1`, [jId]).catch(() => {});
    await pool.query(`DELETE FROM stages WHERE journey_id = $1`, [jId]).catch(() => {});
    await pool.query(`DELETE FROM journeys WHERE id = $1`, [jId]).catch(() => {});
  }
  for (const uId of createdUserIds) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [uId]).catch(() => {});
  }
}

// ── Test Cases ────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('🚀 Running ELEVATE Phase 6B.1.1 Hardening Test Suite\n');

  // ── Scenario 1 & 2: Abandoned Checkout Reservation Expiry & Released Capacity
  console.log('━━━━ Scenario 1 & 2: Abandoned Checkout Expiry & Released Capacity ━━━━');
  const ev1Id = await createTestEvent({ title: 'Hardening Event 1 - Abandoned', max_capacity: 1, price: 300 });

  // Learner 1 initiates checkout
  const r1 = await request('POST', '/api/payments/create-event-order', { event_id: ev1Id }, learner1Cookie);
  assert(r1.status === 201 && !!r1.body?.order_id, '1a: Learner 1 creates order with reservation');
  assert(!!r1.body?.expires_at, '1b: Order response includes explicit expires_at timestamp');

  // Verify reservation is active in DB
  const checkActive = await pool.query(
    `SELECT expires_at, status FROM payment_orders WHERE razorpay_order_id = $1`,
    [r1.body.order_id]
  );
  assert(
    new Date(checkActive.rows[0].expires_at) > new Date(),
    '1c: Reservation expires_at is in the future'
  );

  // Simulate checkout abandonment: advance expires_at into the past
  await pool.query(
    `UPDATE payment_orders SET expires_at = NOW() - INTERVAL '5 minutes' WHERE razorpay_order_id = $1`,
    [r1.body.order_id]
  );

  const checkExpired = await pool.query(
    `SELECT expires_at < NOW() AS is_expired FROM payment_orders WHERE razorpay_order_id = $1`,
    [r1.body.order_id]
  );
  assert(checkExpired.rows[0].is_expired === true, '1d: Abandoned reservation simulated into expired state');

  // Scenario 2: Learner 2 now attempts checkout — must succeed because Learner 1's reservation expired!
  const r2 = await request('POST', '/api/payments/create-event-order', { event_id: ev1Id }, learner2Cookie);
  assert(r2.status === 201 && !!r2.body?.order_id, '2a: Expired reservation does NOT block capacity; Learner 2 gets order');

  // ── Scenario 3: Active Reservation Prevents Overbooking
  console.log('\n━━━━ Scenario 3: Active Reservation Prevents Overbooking ━━━━');
  // Learner 2's reservation is active on the 1-capacity event; Learner 3 attempts checkout
  const r3 = await request('POST', '/api/payments/create-event-order', { event_id: ev1Id }, learner3Cookie);
  assert(r3.status === 400 && r3.body?.message?.includes('booked or has active pending reservations'),
    '3a: Active reservation prevents another learner from overbooking the final seat');

  // ── Scenario 4: Concurrent Checkout Attempts Cannot Oversell Final Seat
  console.log('\n━━━━ Scenario 4: Concurrent Checkout Serialization ━━━━');
  const ev4Id = await createTestEvent({ title: 'Hardening Event 4 - Concurrent', max_capacity: 1, price: 400 });

  // Learner 1, Learner 2, and Learner 3 race for the single seat
  const concurrentResults = await Promise.all([
    request('POST', '/api/payments/create-event-order', { event_id: ev4Id }, learner1Cookie),
    request('POST', '/api/payments/create-event-order', { event_id: ev4Id }, learner2Cookie),
    request('POST', '/api/payments/create-event-order', { event_id: ev4Id }, learner3Cookie),
  ]);

  const successes = concurrentResults.filter(r => r.status === 201);
  const rejections = concurrentResults.filter(r => r.status === 400);

  assert(successes.length === 1, `4a: Exactly 1 concurrent checkout request succeeded (${successes.length}/3)`);
  assert(rejections.length === 2, `4b: Other concurrent requests safely rejected with 400 (${rejections.length}/3)`);

  const activeResCount = await pool.query(
    `SELECT COUNT(*)::int AS count FROM payment_orders WHERE event_id = $1 AND status = 'created' AND expires_at > NOW()`,
    [ev4Id]
  );
  assert(activeResCount.rows[0].count === 1, '4c: Exactly 1 active reservation persisted in DB');

  // ── Scenario 5: Duplicate Pending-Order Requests Are Controlled
  console.log('\n━━━━ Scenario 5: Duplicate Pending-Order Control ━━━━');
  // The winner of the concurrent race calls create-event-order again
  const winnerCookie = successes[0] === concurrentResults[0] ? learner1Cookie : (successes[0] === concurrentResults[1] ? learner2Cookie : learner3Cookie);
  const rDup = await request('POST', '/api/payments/create-event-order', { event_id: ev4Id }, winnerCookie);
  assert(rDup.status === 201 && rDup.body?.reused === true, '5a: Duplicate order request reuses existing active order');
  assert(rDup.body?.order_id === successes[0].body?.order_id, '5b: Reused order returns identical order_id');

  const winnerOrders = await pool.query(
    `SELECT COUNT(*)::int AS count FROM payment_orders WHERE event_id = $1 AND status = 'created' AND expires_at > NOW()`,
    [ev4Id]
  );
  assert(winnerOrders.rows[0].count === 1, '5c: No duplicate reservation rows inflated by repeated requests');

  // ── Scenario 6: Razorpay Order Creation Failure Releases Reservation
  console.log('\n━━━━ Scenario 6: Razorpay Failure Releases Reservation ━━━━');
  const ev6Id = await createTestEvent({ title: 'Hardening Event 6 - Provider Failure', max_capacity: 1, price: 500 });

  mockRazorpay.orderCreateError = new Error('Simulated Razorpay 500 Gateway Timeout');
  const rFail = await request('POST', '/api/payments/create-event-order', { event_id: ev6Id }, learner1Cookie);
  assert(rFail.status === 502, '6a: Razorpay order creation failure returns 502');

  mockRazorpay.reset();

  const failedOrder = await pool.query(
    `SELECT status FROM payment_orders WHERE event_id = $1`,
    [ev6Id]
  );
  assert(failedOrder.rows[0]?.status === 'failed', '6b: Order record safely marked failed; reservation released');

  // Next learner must be able to create order immediately
  const rRecover = await request('POST', '/api/payments/create-event-order', { event_id: ev6Id }, learner2Cookie);
  assert(rRecover.status === 201, '6c: Subsequent learner successfully books released seat');

  // ── Scenario 7: Captured Payment After Expiry on Full Event (Handled Safely)
  console.log('\n━━━━ Scenario 7: Late Captured Payment On Full Event ━━━━');
  const ev7Id = await createTestEvent({ title: 'Hardening Event 7 - Late Capture', max_capacity: 1, price: 600 });

  // Learner 1 creates order
  const ord7_1 = await request('POST', '/api/payments/create-event-order', { event_id: ev7Id }, learner1Cookie);
  const ord1Id = ord7_1.body?.order_id;

  // Simulate Learner 1's reservation expiring
  await pool.query(
    `UPDATE payment_orders SET expires_at = NOW() - INTERVAL '10 minutes' WHERE razorpay_order_id = $1`,
    [ord1Id]
  );

  // In the meantime, Learner 2 creates order and verifies payment, taking the only seat
  const ord7_2 = await request('POST', '/api/payments/create-event-order', { event_id: ev7Id }, learner2Cookie);
  const ord2Id = ord7_2.body?.order_id;
  const pay2Id = `pay_hard_7_2_${Date.now()}`;
  mockRazorpay.mockPaymentDetails = { order_id: ord2Id, amount: 60000, currency: 'INR', status: 'captured' };
  const sig2 = signPaymentVerify(ord2Id, pay2Id);
  const ver2 = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord2Id,
    razorpay_payment_id: pay2Id,
    razorpay_signature: sig2,
  }, learner2Cookie);
  assert(ver2.status === 200 && ver2.body?.message?.includes('confirmed'), '7a: Learner 2 confirms registration for last seat');

  // Now Learner 1 pays late! Gateway confirms money was captured!
  const pay1Id = `pay_hard_7_1_${Date.now()}`;
  mockRazorpay.mockPaymentDetails = { order_id: ord1Id, amount: 60000, currency: 'INR', status: 'captured' };
  const sig1 = signPaymentVerify(ord1Id, pay1Id);
  const ver1 = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord1Id,
    razorpay_payment_id: pay1Id,
    razorpay_signature: sig1,
  }, learner1Cookie);

  assert(ver1.status === 200 && ver1.body?.unresolved === true, '7b: Late captured payment returns 200 with unresolved: true');
  assert(ver1.body?.resolution_status === 'unresolved_capacity_exceeded', '7c: Resolution status = unresolved_capacity_exceeded');

  // Verify DB state: Learner 1 is waitlisted, NOT confirmed registered
  const reg1 = await pool.query(`SELECT status, payment_status FROM event_registrations WHERE event_id = $1 AND user_id = $2`, [ev7Id, learner1Id]);
  assert(reg1.rows[0]?.status === 'waitlisted', '7d: Learner 1 marked waitlisted (NOT confirmed attendee)');
  assert(reg1.rows[0]?.payment_status === 'paid', '7e: Learner 1 payment_status reflects paid');

  // Confirmed attendees strictly remains 1
  const confirmedAttendees = await pool.query(
    `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
    [ev7Id]
  );
  assert(confirmedAttendees.rows[0].count === 1, '7f: Event capacity was NOT oversold (1/1)');

  // ── Scenario 8: Captured Payment Against Cancelled Event & Unresolved API
  console.log('\n━━━━ Scenario 8: Captured Payment Against Cancelled Event & Audit API ━━━━');
  const ev8Id = await createTestEvent({ title: 'Hardening Event 8 - Cancelled', max_capacity: 5, price: 700 });

  const ord8 = await request('POST', '/api/payments/create-event-order', { event_id: ev8Id }, learner1Cookie);
  const ord8Id = ord8.body?.order_id;

  // Educator cancels event
  await pool.query(`UPDATE events SET status = 'cancelled' WHERE id = $1`, [ev8Id]);

  // Payment captured for cancelled event
  const pay8Id = `pay_hard_8_${Date.now()}`;
  mockRazorpay.mockPaymentDetails = { order_id: ord8Id, amount: 70000, currency: 'INR', status: 'captured' };
  const sig8 = signPaymentVerify(ord8Id, pay8Id);
  const ver8 = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord8Id,
    razorpay_payment_id: pay8Id,
    razorpay_signature: sig8,
  }, learner1Cookie);

  assert(ver8.status === 200 && ver8.body?.unresolved === true, '8a: Cancelled event payment returns unresolved: true');
  assert(ver8.body?.resolution_status === 'unresolved_event_cancelled', '8b: Resolution status = unresolved_event_cancelled');

  // Authorized Inspection API: GET /api/payments/unresolved
  const unresList = await request('GET', '/api/payments/unresolved', null, adminCookie);
  assert(unresList.status === 200 && Array.isArray(unresList.body?.unresolved_payments), '8c: Admin retrieves unresolved payments list');
  const foundOrder = unresList.body?.unresolved_payments?.find(o => o.razorpay_order_id === ord8Id);
  assert(!!foundOrder && foundOrder.resolution_status === 'unresolved_event_cancelled', '8d: Cancelled event order correctly listed');

  // Manual resolution: PATCH /api/payments/unresolved/:id/resolve
  const resPat = await request(
    'PATCH',
    `/api/payments/unresolved/${foundOrder.id}/resolve`,
    { resolution_notes: 'Manual refund scheduled on Razorpay dashboard', action: 'resolved_manual' },
    adminCookie
  );
  assert(resPat.status === 200 && resPat.body?.order?.resolution_status === 'resolved_manual', '8e: Administrator marks order as resolved with notes');

  // ── Scenario 9: Repeated Verification Is Idempotent
  console.log('\n━━━━ Scenario 9: Idempotent Payment Verification ━━━━');
  // Re-verify resolved/unresolved order
  const reVer8 = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord8Id,
    razorpay_payment_id: pay8Id,
    razorpay_signature: sig8,
  }, learner1Cookie);
  assert(reVer8.status === 200 && reVer8.body?.unresolved === true, '9a: Repeated verification on unresolved order is idempotent');

  // Re-verify confirmed order (ord2Id from scenario 7)
  const reVer2 = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord2Id,
    razorpay_payment_id: pay2Id,
    razorpay_signature: sig2,
  }, learner2Cookie);
  assert(reVer2.status === 200 && reVer2.body?.message?.includes('already verified'), '9b: Repeated verification on paid order is idempotent');

  // ── Scenario 10: Duplicate & Out-Of-Order Webhooks
  console.log('\n━━━━ Scenario 10: Duplicate & Out-Of-Order Webhooks ━━━━');
  const ev10Id = await createTestEvent({ title: 'Hardening Event 10 - Webhook', max_capacity: 5, price: 350 });
  const ord10 = await request('POST', '/api/payments/create-event-order', { event_id: ev10Id }, learner2Cookie);
  const ord10Id = ord10.body?.order_id;
  const pay10Id = `pay_wb_hard_${Date.now()}`;

  const payload = buildWebhookPayload(ord10Id, pay10Id, 35000);
  const payloadStr = JSON.stringify(payload);
  const sigWb = signWebhook(payloadStr);

  // 10a: First webhook delivery
  const wb1 = await request('POST', '/api/payments/webhook', null, null, Buffer.from(payloadStr), {
    'x-razorpay-signature': sigWb,
  });
  assert(wb1.status === 200, '10a: First webhook payment.captured succeeds with 200');

  // 10b: Duplicate webhook delivery
  const wb2 = await request('POST', '/api/payments/webhook', null, null, Buffer.from(payloadStr), {
    'x-razorpay-signature': sigWb,
  });
  assert(wb2.status === 200 && wb2.body?.message === 'Already processed', '10b: Duplicate webhook delivery handled idempotently');

  // 10c: Out-of-order payment.failed webhook arriving after payment.captured
  const failPayload = {
    event: 'payment.failed',
    payload: { payment: { entity: { id: pay10Id, order_id: ord10Id } } },
  };
  const failStr = JSON.stringify(failPayload);
  const sigFail = signWebhook(failStr);
  const wbFail = await request('POST', '/api/payments/webhook', null, null, Buffer.from(failStr), {
    'x-razorpay-signature': sigFail,
  });
  assert(wbFail.status === 200, '10c: Out-of-order payment.failed acknowledged');

  const checkStillPaid = await pool.query(
    `SELECT status FROM payment_orders WHERE razorpay_order_id = $1`,
    [ord10Id]
  );
  assert(checkStillPaid.rows[0]?.status === 'paid', '10d: Status remains paid (not corrupted by late failed webhook)');

  // ── Scenario 11: Transaction Rollback Safety
  console.log('\n━━━━ Scenario 11: Transaction Rollback Safety ━━━━');
  const countBefore = await pool.query(`SELECT COUNT(*)::int AS count FROM payment_orders`);
  // Attempt invalid verification (wrong user)
  const badAuth = await request('POST', '/api/payments/verify', {
    razorpay_order_id: ord10Id,
    razorpay_payment_id: pay10Id,
    razorpay_signature: sig2,
  }, learner3Cookie);
  assert(badAuth.status === 400 || badAuth.status === 403, '11a: Invalid verification rejected');
  const countAfter = await pool.query(`SELECT COUNT(*)::int AS count FROM payment_orders`);
  assert(countBefore.rows[0].count === countAfter.rows[0].count, '11b: No orphaned state left after rejected request');

  // ── Scenario 12: Existing Free Workshop Registration Unaffected
  console.log('\n━━━━ Scenario 12: Free Workshop Registration Regression ━━━━');
  const ev12Id = await createTestEvent({ title: 'Hardening Event 12 - Free', max_capacity: 5, price: 0 });
  const rFree = await request('POST', `/api/events/${ev12Id}/register`, {}, learner1Cookie);
  assert(rFree.status === 200 || rFree.status === 201, '12a: Free workshop registration succeeds directly');

  const regFree = await pool.query(
    `SELECT payment_status, amount_paid_paise FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [ev12Id, learner1Id]
  );
  assert(regFree.rows[0]?.payment_status === 'free' && regFree.rows[0]?.amount_paid_paise === 0,
    '12b: Free registration has payment_status=free and amount=0');

  // ── Scenario 13: Existing Journey Payments Unaffected
  console.log('\n━━━━ Scenario 13: Journey Payment Regression ━━━━');
  const jRes = await pool.query(
    `INSERT INTO journeys (title, description, category, price, status, created_by)
     VALUES ('Hardening Journey', 'Journey test', 'Dev', 499, 'published', $1)
     RETURNING id`,
    [educatorId]
  );
  const journeyId = jRes.rows[0].id;
  createdJourneyIds.push(journeyId);

  // Add stage for enrollment
  await pool.query(
    `INSERT INTO stages (journey_id, title, order_index, stage_type) VALUES ($1, 'Stage 1', 1, 'explore')`,
    [journeyId]
  );

  const jOrderRes = await request('POST', '/api/payments/create-order', { journey_id: journeyId }, learner1Cookie);
  assert(jOrderRes.status === 201 && !!jOrderRes.body?.order_id, '13a: Journey order created successfully');

  const jOrdId = jOrderRes.body.order_id;
  const jPayId = `pay_j_hard_${Date.now()}`;
  mockRazorpay.mockPaymentDetails = { order_id: jOrdId, amount: 49900, currency: 'INR', status: 'captured' };
  const jSig = signPaymentVerify(jOrdId, jPayId);

  const jVer = await request('POST', '/api/payments/verify', {
    razorpay_order_id: jOrdId,
    razorpay_payment_id: jPayId,
    razorpay_signature: jSig,
  }, learner1Cookie);

  assert(jVer.status === 200 && jVer.body?.message?.includes('enrollment confirmed'), '13b: Journey payment verified and enrollment confirmed');

  const enrolCheck = await pool.query(
    `SELECT status FROM enrollments WHERE journey_id = $1 AND user_id = $2`,
    [journeyId, learner1Id]
  );
  assert(enrolCheck.rows[0]?.status === 'enrolled', '13c: Learner successfully enrolled in journey');
}

// ── Main Runner ───────────────────────────────────────────────────────────────
async function runAll() {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server listening on port ${port}`);

  try {
    console.log('\n⚙️  Setting up fixtures...');
    await setupFixtures();

    await runTests();

    console.log('\n⚙️  Cleaning up fixtures...');
    await cleanup();

    const total = passed + failed;
    console.log(`\n${'═'.repeat(56)}`);
    console.log(`Phase 6B.1.1 Hardening Results: ${passed}/${total} passed (${failed} failed)`);
    console.log(`${'═'.repeat(56)}`);

    if (failed === 0) {
      console.log('🎉 All Phase 6B.1.1 hardening tests passed!\n');
    } else {
      console.error(`⚠️  ${failed} test(s) failed\n`);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    resetRazorpayInstance();
    await pool.end();
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  }
}

runAll();
