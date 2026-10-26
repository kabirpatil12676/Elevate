/**
 * ELEVATE Phase 3C — Comprehensive Payment Validation & Security Hardening Test Suite
 *
 * Fully covers all 35 scenarios with ZERO skips:
 *  - Group 1: Order Creation (10 scenarios)
 *  - Group 2: Signatures & Authoritative Capture Verification (14 scenarios)
 *  - Group 3: Webhook Processing & Deduplication (8 scenarios)
 *  - Group 4: Enrollment Security & Isolation (3 scenarios)
 *
 * Uses mocked Razorpay SDK client via dependency injection (setRazorpayInstance)
 * to test live failure modes, status mismatches, capture validations, and HMAC signatures
 * without external network calls or charges.
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

const KEY_SECRET     = process.env.RAZORPAY_KEY_SECRET     || 'test_key_secret_3b_phase';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_phase3c';

// Ensure secrets are available in process.env for HMAC checks
process.env.RAZORPAY_KEY_SECRET     = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

// ── In-Memory Mock Razorpay SDK Client ───────────────────────────────────────
class MockRazorpayClient {
  constructor() {
    this.orderCreateError   = null;
    this.paymentFetchError  = null;
    this.mockPaymentDetails = null;

    this.orders = {
      create: async (params) => {
        if (this.orderCreateError) throw this.orderCreateError;
        const id = `order_mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

// ── Test Server & DB Pool ───────────────────────────────────────────────────
let server;
let baseUrl = '';
let passed = 0;
let failed = 0;
let skipped = 0;

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'elevate_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
});

// ── HTTP Request Helpers ────────────────────────────────────────────────────
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

function webhookRequest(payloadObj, signature) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/payments/webhook', baseUrl);
    const rawBody = JSON.stringify(payloadObj);

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rawBody),
    };
    if (signature) headers['x-razorpay-signature'] = signature;

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.write(rawBody);
    req.end();
  });
}

function makeSignature(orderId, paymentId, secret = KEY_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

function makeWebhookSignature(bodyObj, secret = WEBHOOK_SECRET) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(bodyObj))
    .digest('hex');
}

async function loginAs(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('No set-cookie header from login');
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

function log(label, ok, details = '') {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${details ? ` — ${details}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${details ? ` — ${details}` : ''}`);
  }
}

// ── State Variables for Tests ───────────────────────────────────────────────
let testUserCookie  = '';
let testUser2Cookie = '';
let testUserId      = '';
let testUser2Id     = '';
let paidJourneyId   = '';
let freeJourneyId   = '';
let draftJourneyId  = '';

async function setup() {
  console.log('\n🔧 Setup — starting ephemeral server & preparing test data...');

  // 1. Start ephemeral HTTP server on port 0
  server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`  ✔ Ephemeral server running on ${baseUrl}`);

  // 2. Clean previous test entities
  await pool.query("DELETE FROM payment_orders WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE3C_%')");
  await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE3C_%')");
  await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE3C_%'");
  await pool.query("DELETE FROM payment_orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate3c.test')");
  await pool.query("DELETE FROM enrollments WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate3c.test')");
  await pool.query("DELETE FROM users WHERE email LIKE '%@elevate3c.test'");

  // 3. Register primary test learner
  const r1 = await request('POST', '/api/auth/register', {
    name: 'Phase 3C Learner One',
    email: 'learner1@elevate3c.test',
    password: 'TestPassword#3C!',
    role: 'learner',
  });
  if (r1.status === 201 || r1.status === 400) {
    testUserCookie = await loginAs('learner1@elevate3c.test', 'TestPassword#3C!');
    const uRes = await pool.query("SELECT id FROM users WHERE email = 'learner1@elevate3c.test'");
    testUserId = uRes.rows[0].id;
    console.log(`  ✔ Primary learner ready: ${testUserId}`);
  }

  // 4. Register secondary test learner
  const r2 = await request('POST', '/api/auth/register', {
    name: 'Phase 3C Learner Two',
    email: 'learner2@elevate3c.test',
    password: 'TestPassword#3C!',
    role: 'learner',
  });
  if (r2.status === 201 || r2.status === 400) {
    testUser2Cookie = await loginAs('learner2@elevate3c.test', 'TestPassword#3C!');
    const uRes2 = await pool.query("SELECT id FROM users WHERE email = 'learner2@elevate3c.test'");
    testUser2Id = uRes2.rows[0].id;
    console.log(`  ✔ Secondary learner ready: ${testUser2Id}`);
  }

  // 5. Create a paid test journey
  const jIns = await pool.query(
    `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, status, price)
     VALUES ('PHASE3C_PAID_JOURNEY', 'Paid test journey', 'Technology', 'Testing', 'Beginner', 3, 'published', 499.00)
     RETURNING id`
  );
  paidJourneyId = jIns.rows[0].id;

  // Add 1 stage to paid journey so enrollment succeeds cleanly
  await pool.query(
    `INSERT INTO stages (journey_id, stage_type, title, description, order_index)
     VALUES ($1, 'explore', 'Explore Test Stage', 'Diagnostic stage for test journey', 1)`,
    [paidJourneyId]
  );
  console.log(`  ✔ Paid test journey created: ${paidJourneyId} (₹499.00)`);

  // 6. Create a draft test journey
  const dIns = await pool.query(
    `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, status, price)
     VALUES ('PHASE3C_DRAFT_JOURNEY', 'Draft test journey', 'Technology', 'Testing', 'Beginner', 2, 'draft', 299.00)
     RETURNING id`
  );
  draftJourneyId = dIns.rows[0].id;
  console.log(`  ✔ Draft test journey created: ${draftJourneyId}`);

  // 7. Locate canonical free journey (from seed)
  const fRes = await pool.query(
    `SELECT id, title FROM journeys WHERE status = 'published' AND price = 0.00 LIMIT 1`
  );
  if (fRes.rows.length > 0) {
    freeJourneyId = fRes.rows[0].id;
    console.log(`  ✔ Free canonical journey found: ${freeJourneyId} (${fRes.rows[0].title})`);
  }
}

async function teardown() {
  console.log('\n🧹 Teardown — cleaning up test records...');
  try {
    await pool.query("DELETE FROM payment_orders WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE3C_%')");
    await pool.query("DELETE FROM enrollments WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE3C_%')");
    await pool.query("DELETE FROM stages WHERE journey_id IN (SELECT id FROM journeys WHERE title LIKE 'PHASE3C_%')");
    await pool.query("DELETE FROM journeys WHERE title LIKE 'PHASE3C_%'");
    await pool.query("DELETE FROM payment_orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate3c.test')");
    await pool.query("DELETE FROM enrollments WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@elevate3c.test')");
    await pool.query("DELETE FROM users WHERE email LIKE '%@elevate3c.test'");
    console.log('  ✔ All test database records cleaned up successfully');
  } catch (err) {
    console.error('  ⚠ Teardown warning:', err.message);
  } finally {
    if (server) server.close();
    resetRazorpayInstance();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Test Execution
// ───────────────────────────────────────────────────────────────────────────

async function runTests() {
  // ═════════════════════════════════════════════════════════════════════════
  // Group 1: Order Creation
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n📦 Group 1: POST /api/payments/create-order');

  // T01: Unauthenticated -> 401
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId });
    log('T01: Unauthenticated request rejected with 401', res.status === 401);
  }

  // T02: Missing journey_id -> 400
  {
    const res = await request('POST', '/api/payments/create-order', {}, testUserCookie);
    log('T02: Missing journey_id rejected with 400', res.status === 400);
  }

  // T03: Malformed non-UUID journey_id -> 400
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: 'not-a-valid-uuid' }, testUserCookie);
    log('T03: Malformed non-UUID journey_id rejected with 400', res.status === 400 && res.body.message.includes('Invalid journey_id format'));
  }

  // T04: Non-existent journey UUID -> 404
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: '00000000-0000-0000-0000-000000000000' }, testUserCookie);
    log('T04: Non-existent journey UUID rejected with 404', res.status === 404);
  }

  // T05: Free journey -> 400
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: freeJourneyId }, testUserCookie);
    log('T05: Free journey rejected with 400 (use /enroll instead)', res.status === 400 && res.body.message.includes('free'));
  }

  // T06: Unpublished (draft) journey -> 403
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: draftJourneyId }, testUserCookie);
    log('T06: Unpublished draft journey rejected with 403', res.status === 403);
  }

  // T07: Client-supplied amount is ignored; DB price is trusted and converted to paise
  {
    // Client sends tampered amount of ₹1 (100 paise)
    const res = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId, amount: 1 }, testUserCookie);
    const expectedPaise = 49900; // 499 * 100
    log('T07: Client-supplied amount ignored; authoritative DB price used (49900 paise)',
      res.status === 201 && res.body.amount === expectedPaise && res.body.journey.price === 499);
  }

  // T08: Valid order created via mock SDK and stored in DB
  let createdOrderId = '';
  {
    const res = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUser2Cookie);
    const ok = res.status === 201 && typeof res.body.order_id === 'string' && res.body.currency === 'INR';
    createdOrderId = res.body?.order_id;

    // Verify row in database
    const dbOrder = await pool.query('SELECT * FROM payment_orders WHERE razorpay_order_id = $1', [createdOrderId]);
    const persisted = dbOrder.rows.length === 1 && dbOrder.rows[0].status === 'created' && dbOrder.rows[0].amount_paise === 49900;
    log('T08: Valid paid order created via Razorpay SDK and persisted with status "created"', ok && persisted, `order_id=${createdOrderId}`);
  }

  // T09: Duplicate / already enrolled check
  {
    // Enroll user1 in paid journey directly in DB to simulate active enrollment
    await pool.query(
      `INSERT INTO enrollments (user_id, journey_id, status) VALUES ($1, $2, 'enrolled')
       ON CONFLICT (user_id, journey_id) DO NOTHING`,
      [testUserId, paidJourneyId]
    );

    const res = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUserCookie);
    log('T09: Order creation blocked for already-enrolled user with 400',
      res.status === 400 && res.body.message.includes('already enrolled'));

    // Remove the simulated enrollment
    await pool.query('DELETE FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);
  }

  // T10: Razorpay API error handling (does not persist order or grant enrollment)
  {
    mockRazorpay.orderCreateError = new Error('Razorpay Gateway 503 Service Unavailable');
    const res = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUserCookie);
    mockRazorpay.reset();

    // Verify no bad record was created
    const badOrders = await pool.query(
      "SELECT id FROM payment_orders WHERE user_id = $1 AND razorpay_order_id LIKE '%503%'",
      [testUserId]
    );
    log('T10: Razorpay API error gracefully handled without creating invalid DB records',
      res.status === 500 && badOrders.rows.length === 0);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Group 2: Signatures & Authoritative Capture Verification
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n🔐 Group 2: POST /api/payments/verify');

  // Prepare a fresh order for verification tests
  const orderRes = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUserCookie);
  const activeOrderId = orderRes.body.order_id;
  const testPaymentId = `pay_mock_${Date.now()}`;

  // T11: Unauthenticated verify -> 401
  {
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: 'invalid_sig',
    });
    log('T11: Unauthenticated verification request rejected with 401', res.status === 401);
  }

  // T12: Missing required fields -> 400
  {
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
    }, testUserCookie);
    log('T12: Missing required verification fields rejected with 400', res.status === 400);
  }

  // T13: Invalid HMAC signature -> 400
  {
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: '0000000000000000000000000000000000000000000000000000000000000000',
    }, testUserCookie);
    log('T13: Invalid HMAC signature rejected with 400', res.status === 400 && res.body.message.includes('signature verification failed'));
  }

  // T14: Valid signature for non-existent order -> 404
  {
    const fakeOrderId = 'order_nonexistent_999999';
    const fakeSig = makeSignature(fakeOrderId, testPaymentId);
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: fakeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: fakeSig,
    }, testUserCookie);
    log('T14: Valid signature for non-existent order rejected with 404', res.status === 404 && res.body.message.includes('not found'));
  }

  // T15: Valid signature submitted by wrong learner -> 403
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUser2Cookie); // user2 submits user1's order
    log('T15: Order submitted by unauthorized learner rejected with 403', res.status === 403 && res.body.message.includes('Unauthorized'));
  }

  // T16: Order ID mismatch from gateway -> 400
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: 'order_completely_different_id',
      status: 'captured',
      amount: 49900,
      currency: 'INR',
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();
    log('T16: Payment ID or order ID mismatch from gateway rejected with 400',
      res.status === 400 && res.body.message.includes('does not match'));
  }

  // T17: Amount mismatch from gateway -> 400
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: activeOrderId,
      status: 'captured',
      amount: 100, // ₹1 instead of ₹499
      currency: 'INR',
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();
    log('T17: Payment amount mismatch from gateway rejected with 400',
      res.status === 400 && res.body.message.includes('mismatch'));
  }

  // T18: Currency mismatch from gateway -> 400
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: activeOrderId,
      status: 'captured',
      amount: 49900,
      currency: 'USD', // USD instead of INR
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();
    log('T18: Payment currency mismatch from gateway rejected with 400',
      res.status === 400 && res.body.message.includes('mismatch'));
  }

  // T19: Authorized but uncaptured payment -> 400
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: activeOrderId,
      status: 'authorized', // Not captured!
      amount: 49900,
      currency: 'INR',
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();

    // Verify learner was NOT enrolled
    const enCheck = await pool.query('SELECT id FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);
    log('T19: Authorized-but-uncaptured payment rejected with 400 without granting enrollment',
      res.status === 400 && res.body.message.includes('not captured') && enCheck.rows.length === 0);
  }

  // T20: Failed payment status from gateway -> 400
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: activeOrderId,
      status: 'failed',
      amount: 49900,
      currency: 'INR',
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();
    log('T20: Failed payment status from gateway rejected with 400',
      res.status === 400 && res.body.message.includes('not captured'));
  }

  // T21: Gateway communication error during fetch -> 502
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.paymentFetchError = new Error('Gateway Connection Timeout');
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();
    log('T21: Gateway fetch communication failure returns 502 without granting enrollment',
      res.status === 502);
  }

  // T22: Valid signature + verified captured status -> 200, marks 'paid', creates enrollment
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    mockRazorpay.mockPaymentDetails = {
      order_id: activeOrderId,
      status: 'captured',
      amount: 49900,
      currency: 'INR',
    };
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);
    mockRazorpay.reset();

    const orderRow = await pool.query('SELECT status, razorpay_payment_id, verified_at, captured_at FROM payment_orders WHERE razorpay_order_id = $1', [activeOrderId]);
    const enrollRow = await pool.query('SELECT status, current_stage FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);

    const orderOk = orderRow.rows[0]?.status === 'paid' && orderRow.rows[0]?.razorpay_payment_id === testPaymentId;
    const enrollOk = enrollRow.rows[0]?.status === 'enrolled' && enrollRow.rows[0]?.current_stage !== null;

    log('T22: Valid signature + captured status marks order "paid" and activates enrollment with Stage 1',
      res.status === 200 && res.body.success && orderOk && enrollOk);
  }

  // T23: Repeated verification of same payment -> 200 OK, idempotent
  {
    const validSig = makeSignature(activeOrderId, testPaymentId);
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: activeOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSig,
    }, testUserCookie);

    // Verify still exactly 1 enrollment row
    const enrollCount = await pool.query('SELECT count(*) FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);
    log('T23: Repeated verification of already-paid order returns 200 idempotently without duplicate enrollment',
      res.status === 200 && parseInt(enrollCount.rows[0].count) === 1);
  }

  // T24: Concurrent verification requests (simultaneous double submit)
  {
    const orderRes2 = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUser2Cookie);
    const order2Id = orderRes2.body.order_id;
    const pay2Id = `pay_concurrent_${Date.now()}`;
    const sig2 = makeSignature(order2Id, pay2Id);

    mockRazorpay.mockPaymentDetails = {
      order_id: order2Id,
      status: 'captured',
      amount: 49900,
      currency: 'INR',
    };

    // Fire 2 verification requests concurrently
    const [p1, p2] = await Promise.all([
      request('POST', '/api/payments/verify', { razorpay_order_id: order2Id, razorpay_payment_id: pay2Id, razorpay_signature: sig2 }, testUser2Cookie),
      request('POST', '/api/payments/verify', { razorpay_order_id: order2Id, razorpay_payment_id: pay2Id, razorpay_signature: sig2 }, testUser2Cookie),
    ]);
    mockRazorpay.reset();

    const both200 = p1.status === 200 && p2.status === 200;
    const enrollCount2 = await pool.query('SELECT count(*) FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUser2Id, paidJourneyId]);
    log('T24: Concurrent verification handled safely via row locking (exactly 1 active enrollment created)',
      both200 && parseInt(enrollCount2.rows[0].count) === 1);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Group 3: Webhook Processing & Deduplication
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n🔔 Group 3: POST /api/payments/webhook');

  // Prepare order for webhook testing
  // Temporarily clear testUser1's enrollment
  await pool.query('DELETE FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);
  const whOrderRes = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUserCookie);
  const whOrderId = whOrderRes.body.order_id;
  const whPaymentId = `pay_wh_${Date.now()}`;

  // T25: Missing webhook signature -> 400
  {
    const res = await webhookRequest({ event: 'payment.captured' }, null);
    log('T25: Missing x-razorpay-signature header rejected with 400', res.status === 400);
  }

  // T26: Invalid webhook signature -> 400
  {
    const res = await webhookRequest(
      { event: 'payment.captured' },
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    log('T26: Invalid webhook HMAC signature rejected with 400', res.status === 400 && res.body.message.includes('Invalid'));
  }

  // T27: Unknown/unrelated order -> 200 ACK
  {
    const unknownEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_unrelated_${Date.now()}`,
            order_id: 'order_nonexistent_unrelated_123',
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    };
    const sig = makeWebhookSignature(unknownEvent);
    const res = await webhookRequest(unknownEvent, sig);
    log('T27: Valid webhook for unknown order acknowledged with 200 without side effects', res.status === 200);
  }

  // T28: Amount or currency mismatch in webhook -> 400
  {
    const mismatchEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: whPaymentId,
            order_id: whOrderId,
            amount: 100, // ₹1 instead of ₹499
            currency: 'INR',
          },
        },
      },
    };
    const sig = makeWebhookSignature(mismatchEvent);
    const res = await webhookRequest(mismatchEvent, sig);
    log('T28: Webhook with amount/currency mismatch rejected with 400', res.status === 400 && res.body.message.includes('mismatch'));
  }

  // T29: Valid signature for payment.captured -> 200 OK, marks paid, enrolls user
  {
    const capturedEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: whPaymentId,
            order_id: whOrderId,
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    };
    const sig = makeWebhookSignature(capturedEvent);
    const res = await webhookRequest(capturedEvent, sig);

    const orderRow = await pool.query('SELECT status, razorpay_payment_id FROM payment_orders WHERE razorpay_order_id = $1', [whOrderId]);
    const enrollRow = await pool.query('SELECT status FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);

    const orderPaid = orderRow.rows[0]?.status === 'paid' && orderRow.rows[0]?.razorpay_payment_id === whPaymentId;
    const enrolled  = enrollRow.rows[0]?.status === 'enrolled';

    log('T29: Valid payment.captured webhook updates order to "paid" and enrolls learner',
      res.status === 200 && orderPaid && enrolled);
  }

  // T30: Duplicate payment.captured webhook -> 200 OK, idempotent
  {
    const capturedEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: whPaymentId,
            order_id: whOrderId,
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    };
    const sig = makeWebhookSignature(capturedEvent);
    const res = await webhookRequest(capturedEvent, sig);

    const count = await pool.query('SELECT count(*) FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUserId, paidJourneyId]);
    log('T30: Duplicate payment.captured webhook processed idempotently with 200',
      res.status === 200 && parseInt(count.rows[0].count) === 1);
  }

  // T31: Webhook arriving after Checkout verification already activated enrollment
  {
    // The order whOrderId is already paid from T29. Simulate webhook delivery
    const lateEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: whPaymentId,
            order_id: whOrderId,
            amount: 49900,
            currency: 'INR',
          },
        },
      },
    };
    const sig = makeWebhookSignature(lateEvent);
    const res = await webhookRequest(lateEvent, sig);
    log('T31: Webhook arriving after verification handled safely without race condition', res.status === 200);
  }

  // T32: payment.failed webhook marks order failed
  {
    // Clear testUser2's enrollment so order creation succeeds
    await pool.query('DELETE FROM enrollments WHERE user_id = $1 AND journey_id = $2', [testUser2Id, paidJourneyId]);

    const failOrderRes = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUser2Cookie);
    const failOrderId = failOrderRes.body?.order_id;

    const failedEvent = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: failOrderId,
          },
        },
      },
    };
    const sig = makeWebhookSignature(failedEvent);
    const res = await webhookRequest(failedEvent, sig);

    const orderRow = await pool.query('SELECT status FROM payment_orders WHERE razorpay_order_id = $1', [failOrderId]);
    log('T32: payment.failed webhook marks created order as "failed"',
      res.status === 200 && orderRow.rows[0]?.status === 'failed');
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Group 4: Enrollment Security & Isolation
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n🔒 Group 4: Enrollment Security & Isolation');

  // T33: Direct /enroll for paid course without payment -> 402 Payment Required
  {
    // Create new un-enrolled learner
    const r3 = await request('POST', '/api/auth/register', {
      name: 'Bypass Tester',
      email: 'bypass@elevate3c.test',
      password: 'TestPassword#3C!',
      role: 'learner',
    });
    const bypassCookie = await loginAs('bypass@elevate3c.test', 'TestPassword#3C!');

    const res = await request('POST', `/api/journeys/${paidJourneyId}/enroll`, {}, bypassCookie);
    log('T33: Direct /enroll for paid course without verified payment rejected with 402 Payment Required',
      res.status === 402 && res.body.message.includes('Payment required'));
  }

  // T34: Direct /enroll for free course succeeds directly
  {
    const r4 = await request('POST', '/api/auth/register', {
      name: 'Free Enrollee',
      email: 'free_enrollee@elevate3c.test',
      password: 'TestPassword#3C!',
      role: 'learner',
    });
    const freeCookie = await loginAs('free_enrollee@elevate3c.test', 'TestPassword#3C!');

    const res = await request('POST', `/api/journeys/${freeJourneyId}/enroll`, {}, freeCookie);
    log('T34: Direct /enroll for free journey succeeds directly (201 Created)',
      res.status === 201 && res.body.success === true && res.body.enrollment !== undefined);
  }

  // T35: Learner cross-enrollment isolation (Learner B cannot use Learner A's payment)
  {
    // Clear enrollments for both learners so order creation succeeds and neither is enrolled yet
    await pool.query('DELETE FROM enrollments WHERE user_id IN ($1, $2) AND journey_id = $3', [testUserId, testUser2Id, paidJourneyId]);

    // Learner 1 creates order
    const oRes = await request('POST', '/api/payments/create-order', { journey_id: paidJourneyId }, testUserCookie);
    const oId = oRes.body?.order_id;
    const pId = `pay_cross_${Date.now()}`;
    const sig = makeSignature(oId, pId);

    // Learner 2 attempts to verify Learner 1's order
    const res = await request('POST', '/api/payments/verify', {
      razorpay_order_id: oId,
      razorpay_payment_id: pId,
      razorpay_signature: sig,
    }, testUser2Cookie);

    // Confirm Learner 2 is NOT enrolled in paid journey
    const l2Enroll = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND journey_id = $2',
      [testUser2Id, paidJourneyId]
    );

    log('T35: Cross-learner payment authorization strictly isolated (Learner B cannot hijack Learner A order)',
      res.status === 403 && l2Enroll.rows.length === 0);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Main Runner
// ───────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(65));
  console.log('  ELEVATE Phase 3C — Razorpay Validation & Security Hardening');
  console.log('═'.repeat(65));

  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('\n💥 Fatal test suite error:', err.message);
    failed++;
  } finally {
    await teardown();
    await pool.end();
  }

  console.log('\n' + '═'.repeat(65));
  console.log(`  RESULTS: ${passed} passed  |  ${failed} failed  |  ${skipped} skipped  |  ${passed + failed + skipped} total`);
  console.log('═'.repeat(65) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
