/**
 * ELEVATE Phase 6B.1 — Workshop Payments Test Suite
 *
 * Covers 35 scenarios:
 *  Group A: Pricing & Migration (5)
 *  Group B: Free Workshop — No Payment Required (4)
 *  Group C: Paid Workshop — Order Creation (8)
 *  Group D: Payment Verification (7)
 *  Group E: Webhook Processing & Idempotency (5)
 *  Group F: Capacity & Concurrency Protection (4)
 *  Group G: Regression — Journey Payments Unaffected (2)
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

const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET     || 'test_key_secret_6b1_phase';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_phase6b1';

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
        const id = `order_ev_mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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
      'Content-Type': isRaw ? 'application/json' : 'application/json',
      ...(bodyBuffer ? { 'Content-Length': bodyBuffer.length } : {}),
      ...(cookie   ? { Cookie: cookie }                        : {}),
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

// ── Test Assert ───────────────────────────────────────────────────────────────
function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

// ── Test Data Setup ───────────────────────────────────────────────────────────
let learnerCookie, learner2Cookie, educatorCookie;
let learnerId, learner2Id, educatorId;
let freeEventId, paidEventId;
const EVENT_PRICE_INR = 499;
const EVENT_PRICE_PAISE = EVENT_PRICE_INR * 100;

async function setupFixtures() {
  const suffix = Date.now();

  // Create learner 1
  const r1 = await request('POST', '/api/auth/register', {
    name:     `Learner6B1A ${suffix}`,
    email:    `learner6b1a_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  learnerId = r1.body?.user?.id;
  learnerCookie = await login(`learner6b1a_${suffix}@test.elevate`, 'TestPass6B1!');

  // Create learner 2
  const r2 = await request('POST', '/api/auth/register', {
    name:     `Learner6B1B ${suffix}`,
    email:    `learner6b1b_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
    role:     'learner',
  });
  learner2Id = r2.body?.user?.id;
  learner2Cookie = await login(`learner6b1b_${suffix}@test.elevate`, 'TestPass6B1!');

  // Create educator
  const r3 = await request('POST', '/api/auth/register', {
    name:     `Educator6B1 ${suffix}`,
    email:    `educator6b1_${suffix}@test.elevate`,
    password: 'TestPass6B1!',
  });
  educatorId = r3.body?.user?.id;
  await pool.query(`UPDATE users SET role = 'educator' WHERE id = $1`, [educatorId]);
  educatorCookie = await login(`educator6b1_${suffix}@test.elevate`, 'TestPass6B1!');

  const futureStart    = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd      = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString();
  const futureDeadline = new Date(Date.now() + 6  * 24 * 60 * 60 * 1000).toISOString();

  // Create free event
  const fe = await request('POST', '/api/events', {
    title: `Free Workshop 6B1 ${suffix}`,
    description: 'Free test workshop',
    category: 'AI & Digital',
    facilitator_name: 'Test Facilitator',
    starts_at: futureStart,
    ends_at: futureEnd,
    registration_deadline: futureDeadline,
    max_capacity: 10,
    price: 0,
    currency: 'INR',
  }, educatorCookie);
  freeEventId = fe.body?.event?.id;

  // Publish free event
  await request('PATCH', `/api/events/${freeEventId}/publish`, null, educatorCookie);

  // Create paid event
  const pe = await request('POST', '/api/events', {
    title: `Paid Workshop 6B1 ${suffix}`,
    description: 'Paid test workshop',
    category: 'Engineering',
    facilitator_name: 'Test Facilitator',
    starts_at: futureStart,
    ends_at: futureEnd,
    registration_deadline: futureDeadline,
    max_capacity: 5,
    price: EVENT_PRICE_INR,
    currency: 'INR',
  }, educatorCookie);
  paidEventId = pe.body?.event?.id;

  // Publish paid event
  await request('PATCH', `/api/events/${paidEventId}/publish`, null, educatorCookie);

  console.log(`\n  Fixtures: free=${freeEventId?.slice(0,8)}, paid=${paidEventId?.slice(0,8)}`);
}

async function cleanup() {
  if (freeEventId) await pool.query('DELETE FROM events WHERE id = $1', [freeEventId]).catch(() => {});
  if (paidEventId) await pool.query('DELETE FROM events WHERE id = $1', [paidEventId]).catch(() => {});
  if (learnerId)   await pool.query('DELETE FROM users WHERE id = $1',  [learnerId]).catch(() => {});
  if (learner2Id)  await pool.query('DELETE FROM users WHERE id = $1',  [learner2Id]).catch(() => {});
  if (educatorId)  await pool.query('DELETE FROM users WHERE id = $1',  [educatorId]).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP A: Pricing Schema Verification
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupA() {
  console.log('\n━━━━ Group A: Pricing Schema ━━━━');

  // A1: events.price and events.currency columns exist
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'events' AND column_name IN ('price', 'currency')
     ORDER BY column_name`
  );
  assert(cols.rows.length === 2, 'A1: events.price and events.currency columns exist');

  // A2: payment_orders.event_id exists and journey_id is nullable
  const poRows = await pool.query(
    `SELECT column_name, is_nullable FROM information_schema.columns
     WHERE table_name = 'payment_orders' AND column_name IN ('journey_id', 'event_id')
     ORDER BY column_name`
  );
  const eventIdRow = poRows.rows.find(r => r.column_name === 'event_id');
  const journeyIdRow = poRows.rows.find(r => r.column_name === 'journey_id');
  assert(!!eventIdRow, 'A2: payment_orders.event_id column exists');
  assert(journeyIdRow?.is_nullable === 'YES', 'A3: payment_orders.journey_id is nullable');

  // A4: event_registrations.payment_status exists
  const regCols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'event_registrations' AND column_name IN ('payment_id','amount_paid_paise','payment_status')`
  );
  assert(regCols.rows.length === 3, 'A4: event_registrations has payment_id, amount_paid_paise, payment_status columns');

  // A5: Events have correct pricing from fixture setup
  if (paidEventId) {
    const evRows = await pool.query(`SELECT price, currency FROM events WHERE id = $1`, [paidEventId]);
    assert(Number(evRows.rows[0]?.price) === EVENT_PRICE_INR, `A5: Paid event has price = ${EVENT_PRICE_INR}`);
  } else {
    assert(false, 'A5: paidEventId not created');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP B: Free Workshop — Direct Registration
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupB() {
  console.log('\n━━━━ Group B: Free Workshop Registration ━━━━');

  // B1: Free workshop registers directly without payment
  const r = await request('POST', `/api/events/${freeEventId}/register`, null, learnerCookie);
  assert(r.status === 201 || r.status === 200, 'B1: Free workshop registration returns 200/201');

  // B2: Free registration has payment_status = 'free'
  const regRows = await pool.query(
    `SELECT payment_status, amount_paid_paise FROM event_registrations
     WHERE event_id = $1 AND user_id = $2`,
    [freeEventId, learnerId]
  );
  assert(regRows.rows[0]?.payment_status === 'free', 'B2: Free registration has payment_status = free');
  assert(regRows.rows[0]?.amount_paid_paise === 0, 'B3: Free registration has amount_paid_paise = 0');

  // B4: Paid workshop rejects direct free registration
  const r2 = await request('POST', `/api/events/${paidEventId}/register`, null, learnerCookie);
  assert(r2.status === 400, 'B4: Paid workshop rejects direct free registration with 400');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP C: Paid Workshop — Order Creation
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupC() {
  console.log('\n━━━━ Group C: Paid Order Creation ━━━━');

  mockRazorpay.reset();

  // C1: Unauthenticated order creation returns 401
  const r1 = await request('POST', '/api/payments/create-event-order', { event_id: paidEventId });
  assert(r1.status === 401, 'C1: Unauthenticated paid order returns 401');

  // C2: Invalid event_id format returns 400
  const r2 = await request('POST', '/api/payments/create-event-order', { event_id: 'not-a-uuid' }, learnerCookie);
  assert(r2.status === 400, 'C2: Invalid event_id format returns 400');

  // C3: Non-existent event_id returns 404
  const r3 = await request('POST', '/api/payments/create-event-order', { event_id: '00000000-0000-0000-0000-000000000000' }, learnerCookie);
  assert(r3.status === 404, 'C3: Non-existent event returns 404');

  // C4: Free event rejects payment order creation
  const r4 = await request('POST', '/api/payments/create-event-order', { event_id: freeEventId }, learnerCookie);
  assert(r4.status === 400, 'C4: Free event rejects payment order creation with 400');

  // C5: Providing both journey_id and event_id returns 400
  const r5 = await request('POST', '/api/payments/create-order', { journey_id: '00000000-0000-0000-0000-000000000001', event_id: paidEventId }, learnerCookie);
  assert(r5.status === 400, 'C5: Both journey_id and event_id together returns 400');

  // C6: Neither journey_id nor event_id returns 400
  const r6 = await request('POST', '/api/payments/create-order', {}, learnerCookie);
  assert(r6.status === 400, 'C6: Neither id provided returns 400');

  // C7: Valid paid event order creation returns 201 with Razorpay order info
  const r7 = await request('POST', '/api/payments/create-event-order', { event_id: paidEventId }, learnerCookie);
  assert(r7.status === 201 && r7.body?.order_id && r7.body?.amount === EVENT_PRICE_PAISE,
    `C7: Valid paid order returns 201 with order_id and amount=${EVENT_PRICE_PAISE}`);

  // C8: Amount is taken from DB not from client (mock sends correct DB amount)
  assert(r7.body?.amount === EVENT_PRICE_PAISE, `C8: Amount = DB price converted to paise (${EVENT_PRICE_PAISE})`);

  // Store order for next group
  return r7.body?.order_id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP D: Payment Verification
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupD(orderId) {
  console.log('\n━━━━ Group D: Payment Verification ━━━━');

  const fakePaymentId = `pay_ev_test_${Date.now()}`;

  // D1: Missing fields return 400
  const r1 = await request('POST', '/api/payments/verify', { razorpay_order_id: orderId }, learnerCookie);
  assert(r1.status === 400, 'D1: Missing payment_id/signature returns 400');

  // D2: Invalid signature returns 400
  const r2 = await request('POST', '/api/payments/verify', {
    razorpay_order_id:   orderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature:  'invalidsig',
  }, learnerCookie);
  assert(r2.status === 400, 'D2: Invalid signature returns 400');

  // D3: Configure mock to return matching order id
  mockRazorpay.mockPaymentDetails = {
    order_id: orderId,
    amount:   EVENT_PRICE_PAISE,
    currency: 'INR',
    status:   'captured',
  };

  const goodSig = signPaymentVerify(orderId, fakePaymentId);

  // D4: Wrong user trying to verify another user's order returns 403
  const r4 = await request('POST', '/api/payments/verify', {
    razorpay_order_id:   orderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature:  goodSig,
  }, learner2Cookie);
  assert(r4.status === 403, 'D4: Wrong user verifying another user order returns 403');

  // D5: Gateway status not captured → 400
  mockRazorpay.mockPaymentDetails = {
    order_id: orderId,
    amount:   EVENT_PRICE_PAISE,
    currency: 'INR',
    status:   'authorized',
  };
  const r5 = await request('POST', '/api/payments/verify', {
    razorpay_order_id:   orderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature:  goodSig,
  }, learnerCookie);
  assert(r5.status === 400 && r5.body?.message?.includes('not captured'), 'D5: Non-captured payment returns 400');

  // D6: Amount mismatch → 400
  mockRazorpay.mockPaymentDetails = {
    order_id: orderId,
    amount:   999,          // wrong amount
    currency: 'INR',
    status:   'captured',
  };
  const r6 = await request('POST', '/api/payments/verify', {
    razorpay_order_id:   orderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature:  goodSig,
  }, learnerCookie);
  assert(r6.status === 400 && r6.body?.message?.toLowerCase().includes('mismatch'), 'D6: Amount mismatch returns 400');

  // D7: Successful verification confirms workshop registration
  mockRazorpay.mockPaymentDetails = {
    order_id: orderId,
    amount:   EVENT_PRICE_PAISE,
    currency: 'INR',
    status:   'captured',
  };
  const r7 = await request('POST', '/api/payments/verify', {
    razorpay_order_id:   orderId,
    razorpay_payment_id: fakePaymentId,
    razorpay_signature:  goodSig,
  }, learnerCookie);
  assert(r7.status === 200 && r7.body?.success, 'D7: Successful verification returns 200');

  // Confirm registration was created
  const reg = await pool.query(
    `SELECT payment_status, amount_paid_paise, status
     FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [paidEventId, learnerId]
  );
  assert(reg.rows[0]?.payment_status === 'paid', 'D7b: Registration payment_status = paid after verification');
  assert(reg.rows[0]?.status === 'registered', 'D7c: Registration status = registered after verification');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP E: Webhook Processing & Idempotency
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupE() {
  console.log('\n━━━━ Group E: Webhook Processing ━━━━');

  mockRazorpay.reset();

  // E1: Missing webhook signature returns 400
  const r1 = await request('POST', '/api/payments/webhook', {}, null);
  assert(r1.status === 400, 'E1: Missing webhook signature returns 400');

  // Create a new order for learner2 on the paid event
  const orderRes = await request('POST', '/api/payments/create-event-order', { event_id: paidEventId }, learner2Cookie);
  const wbOrderId  = orderRes.body?.order_id;
  const wbPaymentId = `pay_wb_ev_${Date.now()}`;
  assert(!!wbOrderId, 'E2: Created order for webhook test');

  // E3: Invalid webhook signature returns 400
  const payload = buildWebhookPayload(wbOrderId, wbPaymentId, EVENT_PRICE_PAISE);
  const payloadStr = JSON.stringify(payload);
  const badSig = 'badhexsig000000';
  const r3 = await request('POST', '/api/payments/webhook', null, null, Buffer.from(payloadStr), { 'x-razorpay-signature': badSig });
  assert(r3.status === 400, 'E3: Bad webhook signature returns 400');

  // E4: Valid webhook processes event payment.captured and registers learner
  const goodSig = signWebhook(payloadStr);
  // Manually emit a valid webhook
  const wbRes = await new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(payloadStr);
    const req = http.request({
      hostname: 'localhost',
      port:     parseInt(baseUrl.split(':')[2] || '3001'),
      path:     '/api/payments/webhook',
      method:   'POST',
      headers:  {
        'Content-Type':         'application/json',
        'Content-Length':       bodyBuf.length,
        'x-razorpay-signature': goodSig,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
  assert(wbRes.status === 200 && wbRes.body?.success, 'E4: Valid webhook returns 200');

  // Verify learner2 is registered
  const reg2 = await pool.query(
    `SELECT status, payment_status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
    [paidEventId, learner2Id]
  );
  assert(
    ['registered', 'waitlisted'].includes(reg2.rows[0]?.status),
    'E4b: Webhook-processed registration has registered/waitlisted status'
  );

  // E5: Duplicate webhook is idempotent (same order)
  const wbRes2 = await new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(payloadStr);
    const req = http.request({
      hostname: 'localhost',
      port:     parseInt(baseUrl.split(':')[2] || '3001'),
      path:     '/api/payments/webhook',
      method:   'POST',
      headers:  {
        'Content-Type':         'application/json',
        'Content-Length':       bodyBuf.length,
        'x-razorpay-signature': goodSig,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
  assert(wbRes2.status === 200, 'E5: Duplicate webhook is idempotent and returns 200');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP F: Capacity & Concurrency
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupF() {
  console.log('\n━━━━ Group F: Capacity & Concurrency ━━━━');

  mockRazorpay.reset();

  // F1: Already-registered learner cannot create second order
  const r1 = await request('POST', '/api/payments/create-event-order', { event_id: paidEventId }, learnerCookie);
  assert(r1.status === 400 && r1.body?.message?.toLowerCase().includes('already registered'), 'F1: Already-registered learner gets 400 on second order');

  // F2: Published event that is cancelled rejects new orders
  const futStart    = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const futEnd      = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString();
  const futDeadline = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString();
  const ceRes = await request('POST', '/api/events', {
    title: 'Cancelled Paid Event F2',
    starts_at: futStart,
    ends_at: futEnd,
    registration_deadline: futDeadline,
    max_capacity: 5,
    price: 199,
    currency: 'INR',
  }, educatorCookie);
  const cancelledEventId = ceRes.body?.event?.id;
  await request('PATCH', `/api/events/${cancelledEventId}/publish`, null, educatorCookie);
  await request('PATCH', `/api/events/${cancelledEventId}/cancel`, null, educatorCookie);
  const r2 = await request('POST', '/api/payments/create-event-order', { event_id: cancelledEventId }, learnerCookie);
  assert(r2.status === 403 || r2.status === 400, 'F2: Cancelled event rejects payment order');
  if (cancelledEventId) await pool.query('DELETE FROM events WHERE id = $1', [cancelledEventId]).catch(() => {});

  // F3: Price edit on published event with confirmed registrations returns 400
  const r3 = await request('PUT', `/api/events/${paidEventId}`, {
    starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    registration_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    price: 999,
  }, educatorCookie);
  assert(r3.status === 400 && r3.body?.message?.toLowerCase().includes('pric'), 'F3: Editing price on published event with registrations returns 400');

  // F4: GET /api/events list includes price and is_free fields
  const evList = await request('GET', '/api/events');
  const foundPaid = evList.body?.events?.find(e => e.id === paidEventId);
  assert(!!foundPaid && Number(foundPaid.price) === EVENT_PRICE_INR && foundPaid.is_free === false, 'F4: Event list includes correct price and is_free=false for paid event');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP G: Regression — Journey Payments Unaffected
// ─────────────────────────────────────────────────────────────────────────────
async function testGroupG() {
  console.log('\n━━━━ Group G: Journey Payment Regression ━━━━');

  // G1: Existing journey payment endpoint still accepts journey_id only
  const r1 = await request('POST', '/api/payments/create-order', { journey_id: '00000000-0000-0000-0000-000000000002' }, learnerCookie);
  assert(r1.status === 404 || r1.status === 400, 'G1: Journey order with unknown ID returns 404 or 400 (schema still works)');

  // G2: payment_orders table constraint check — existing journey orders are still valid (NOT NULL was dropped, not the data)
  const orderCount = await pool.query(
    `SELECT COUNT(*)::int AS count FROM payment_orders WHERE journey_id IS NOT NULL`
  );
  assert(typeof orderCount.rows[0]?.count === 'number', 'G2: Existing journey payment_orders rows still accessible');
}

// ── Main Runner ───────────────────────────────────────────────────────────────
async function runAll() {
  console.log('🚀 Starting ELEVATE Phase 6B.1 Test Suite\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`Test server listening on port ${port}`);

  try {
    console.log('\n⚙️  Setting up test fixtures...');
    await setupFixtures();

    await testGroupA();
    await testGroupB();
    const createdOrderId = await testGroupC();
    if (createdOrderId) {
      await testGroupD(createdOrderId);
    } else {
      console.error('⚠️  Skipping Group D — no order created');
      failed += 7;
    }
    await testGroupE();
    await testGroupF();
    await testGroupG();

    console.log('\n⚙️  Cleaning up test fixtures...');
    await cleanup();

    const total = passed + failed;
    console.log(`\n${'═'.repeat(52)}`);
    console.log(`Phase 6B.1 Results: ${passed}/${total} passed (${failed} failed)`);
    console.log(`${'═'.repeat(52)}`);

    if (failed === 0) {
      console.log('🎉 All Phase 6B.1 tests passed!\n');
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
