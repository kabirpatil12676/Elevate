/**
 * ELEVATE Phase 3C, 6B.1 & 6B.1.1 — Hardened Payment Controller
 *
 * Implements:
 *  1. POST /api/payments/create-order       — Create Razorpay order for journey or workshop (authenticated)
 *  2. POST /api/payments/create-event-order — Create Razorpay order specifically for workshop (authenticated)
 *  3. POST /api/payments/verify             — Verify payment signature & enroll/register (authenticated)
 *  4. POST /api/payments/webhook            — Razorpay webhook (raw body, HMAC verified)
 *  5. GET  /api/payments/unresolved         — List captured unresolved payments (admin/educator)
 *  6. PATCH /api/payments/unresolved/:id/resolve — Record manual resolution (admin/educator)
 *
 * Hardening features (Phase 6B.1.1):
 *  - Explicit reservation expiry window (15 minutes) tracked in payment_orders.expires_at.
 *  - Expired reservations automatically stop counting toward capacity without requiring background jobs.
 *  - Atomic capacity inspection & seat reservation in <1ms transaction before external Razorpay API call.
 *  - External Razorpay API call is made outside DB transaction to avoid locking rows across slow network requests.
 *  - Immediate release (marked 'failed') of seat reservation if Razorpay order creation fails.
 *  - Duplicate pending-order requests reuse active unexpired order, preventing seat hoarding.
 *  - Late captured payments arriving after reservation expiry on full/cancelled events are safely recorded
 *    as 'captured_unresolved' with resolution audit trails, avoiding silent overbooking or false failure marks.
 *  - Retrying verification is strictly idempotent and does not duplicate payments or registrations.
 *  - Webhooks handle out-of-order and repeated deliveries idempotently.
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pool, { query } from '../config/db.js';

dotenv.config();

// ── Razorpay SDK Instance & Dependency Injection Hook ───────────────────────
let razorpayInstance = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
});
let isMocked = false;

/**
 * Dependency injection hook for automated testing.
 * Allows test suites to inject a mocked Razorpay client instance.
 * Does NOT expose any public API route.
 */
export function setRazorpayInstance(instance) {
  razorpayInstance = instance;
  isMocked = true;
}

export function resetRazorpayInstance() {
  razorpayInstance = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
  });
  isMocked = false;
}

export function isRazorpayMocked() {
  return isMocked;
}

// ── Helper: Enroll user in a journey (idempotent) ───────────────────────────
async function enrollUser(userId, journeyId, client) {
  const q = client || { query: (...args) => query(...args) };
  const firstStage = await q.query(
    'SELECT id FROM stages WHERE journey_id = $1 ORDER BY order_index LIMIT 1',
    [journeyId],
  );
  await q.query(
    `INSERT INTO enrollments (user_id, journey_id, status, current_stage)
     VALUES ($1, $2, 'enrolled', $3)
     ON CONFLICT (user_id, journey_id) DO UPDATE SET status = 'enrolled', enrolled_at = NOW()`,
    [userId, journeyId, firstStage.rows[0]?.id || null],
  );
}

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Explicit reservation window in minutes for pending checkouts
export const RESERVATION_EXPIRY_MINUTES = 15;

// ───────────────────────────────────────────────────────────────────────────
// 1. POST /api/payments/create-order & /api/payments/create-event-order
// ───────────────────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  const { journey_id, event_id } = req.body;
  const userId = req.user.id;

  // Validate exactly one target is provided
  if (!journey_id && !event_id) {
    return res.status(400).json({ success: false, message: 'Either journey_id or event_id is required' });
  }

  if (journey_id && event_id) {
    return res.status(400).json({ success: false, message: 'Specify either journey_id or event_id, not both' });
  }

  // ── Handle Journey Order Creation ─────────────────────────────────────────
  if (journey_id) {
    if (!UUID_REGEX.test(journey_id)) {
      return res.status(400).json({ success: false, message: 'Invalid journey_id format' });
    }

    try {
      const { rows } = await query(
        `SELECT id, title, price, status FROM journeys WHERE id = $1`,
        [journey_id],
      );
      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Journey not found' });
      }

      const journey = rows[0];

      if (journey.status !== 'published') {
        return res.status(403).json({ success: false, message: 'Journey is not available for enrollment' });
      }

      const priceINR = Number(journey.price);

      // Free journeys must use direct /enroll route
      if (priceINR === 0) {
        return res.status(400).json({
          success: false,
          message: 'This journey is free. Use POST /api/journeys/:id/enroll instead.',
        });
      }

      // Check if learner is already enrolled
      const enrollmentCheck = await query(
        `SELECT id FROM enrollments WHERE user_id = $1 AND journey_id = $2`,
        [userId, journey_id],
      );
      if (enrollmentCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this journey.',
        });
      }

      const amountPaise = Math.round(priceINR * 100);

      const rpOrder = await razorpayInstance.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `elev_${userId.slice(0, 8)}_${Date.now()}`,
        notes: {
          journey_id: journey_id,
          user_id:    userId,
          title:      journey.title,
        },
      });

      await query(
        `INSERT INTO payment_orders
           (user_id, journey_id, razorpay_order_id, amount_paise, currency, status, expires_at)
         VALUES ($1, $2, $3, $4, 'INR', 'created', NOW() + INTERVAL '${RESERVATION_EXPIRY_MINUTES} minutes')`,
        [userId, journey_id, rpOrder.id, amountPaise],
      );

      return res.status(201).json({
        success:  true,
        order_id: rpOrder.id,
        amount:   amountPaise,
        currency: 'INR',
        key_id:   process.env.RAZORPAY_KEY_ID,
        journey: {
          id:    journey.id,
          title: journey.title,
          price: priceINR,
        },
      });
    } catch (err) {
      console.error('[createOrder:journey] Error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: 'Failed to create payment order' });
    }
  }

  // ── Handle Workshop / Event Order Creation (Hardened) ─────────────────────
  if (event_id) {
    if (!UUID_REGEX.test(event_id)) {
      return res.status(400).json({ success: false, message: 'Invalid event_id format' });
    }

    try {
      // 1. Initial validation before transaction
      const { rows: eventInitial } = await query(
        `SELECT id, title, price, currency, status, max_capacity, registration_deadline, starts_at
         FROM events WHERE id = $1`,
        [event_id],
      );

      if (!eventInitial.length) {
        return res.status(404).json({ success: false, message: 'Workshop not found' });
      }

      const event = eventInitial[0];

      if (event.status !== 'published') {
        return res.status(403).json({ success: false, message: 'Workshop is not available for registration' });
      }

      if (new Date(event.registration_deadline) < new Date()) {
        return res.status(400).json({ success: false, message: 'Registration deadline for this workshop has passed' });
      }

      if (new Date(event.starts_at) < new Date()) {
        return res.status(400).json({ success: false, message: 'This workshop has already started' });
      }

      const priceINR = Number(event.price);

      // Free workshops must use direct /register endpoint
      if (priceINR === 0) {
        return res.status(400).json({
          success: false,
          message: 'This workshop is free. Use POST /api/events/:id/register instead.',
        });
      }

      if (event.currency !== 'INR') {
        return res.status(400).json({ success: false, message: 'Unsupported event currency' });
      }

      // Check if learner is already registered
      const regCheck = await query(
        `SELECT id, status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
        [event_id, userId],
      );
      if (regCheck.rows.length > 0 && regCheck.rows[0].status === 'registered') {
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this workshop.',
        });
      }

      // 2. Control duplicate pending orders: check if this learner already has an active, unexpired order
      const existingActiveOrder = await query(
        `SELECT id, razorpay_order_id, amount_paise, currency, expires_at
         FROM payment_orders
         WHERE event_id = $1
           AND user_id = $2
           AND status = 'created'
           AND expires_at > NOW()
           AND razorpay_order_id NOT LIKE 'resv_%'
         ORDER BY created_at DESC
         LIMIT 1`,
        [event_id, userId],
      );

      if (existingActiveOrder.rows.length > 0) {
        const active = existingActiveOrder.rows[0];
        // Reuse existing valid order; avoids creating multiple reservations for same user
        return res.status(201).json({
          success:  true,
          order_id: active.razorpay_order_id,
          amount:   active.amount_paise,
          currency: active.currency,
          key_id:   process.env.RAZORPAY_KEY_ID,
          expires_at: active.expires_at,
          reused:   true,
          event: {
            id:    event.id,
            title: event.title,
            price: priceINR,
          },
        });
      }

      // Clean up any stale/expired temporary reservations for this user and event
      await query(
        `UPDATE payment_orders
         SET status = 'cancelled', updated_at = NOW()
         WHERE event_id = $1
           AND user_id = $2
           AND status = 'created'
           AND (expires_at <= NOW() OR razorpay_order_id LIKE 'resv_%')`,
        [event_id, userId],
      );

      const amountPaise = Math.round(priceINR * 100);

      // 3. Fast Atomic Seat Reservation & Capacity Check (<1ms lock)
      let reservationId;
      let reservationExpiresAt;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock event row
        const evLockRes = await client.query(
          `SELECT max_capacity, status, registration_deadline, starts_at
           FROM events WHERE id = $1 FOR UPDATE`,
          [event_id],
        );
        const lockedEvent = evLockRes.rows[0];

        if (lockedEvent.status !== 'published') {
          await client.query('ROLLBACK');
          return res.status(403).json({ success: false, message: 'Workshop is not available for registration' });
        }

        // Count confirmed registrations
        const confirmedRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
          [event_id],
        );
        const confirmedCount = confirmedRes.rows[0].count;

        // Count active, unexpired reservations by other learners (1 seat per distinct user)
        const pendingRes = await client.query(
          `SELECT COUNT(DISTINCT user_id)::int AS count
           FROM payment_orders
           WHERE event_id = $1
             AND status = 'created'
             AND expires_at > NOW()
             AND user_id != $2`,
          [event_id, userId],
        );
        const pendingCount = pendingRes.rows[0].count;

        if (confirmedCount + pendingCount >= lockedEvent.max_capacity) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'This workshop is currently fully booked or has active pending reservations. Please try again shortly.',
          });
        }

        // Insert atomic pending reservation with temporary unique token
        const tempToken = `resv_${crypto.randomUUID()}`;
        const insertRes = await client.query(
          `INSERT INTO payment_orders
             (user_id, event_id, razorpay_order_id, amount_paise, currency, status, expires_at)
           VALUES ($1, $2, $3, $4, 'INR', 'created', NOW() + INTERVAL '${RESERVATION_EXPIRY_MINUTES} minutes')
           RETURNING id, expires_at`,
          [userId, event_id, tempToken, amountPaise],
        );

        reservationId = insertRes.rows[0].id;
        reservationExpiresAt = insertRes.rows[0].expires_at;

        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }

      // 4. Create Razorpay order outside DB transaction (does not hold DB locks)
      let rpOrder;
      try {
        rpOrder = await razorpayInstance.orders.create({
          amount:   amountPaise,
          currency: 'INR',
          receipt:  `elev_ev_${userId.slice(0, 8)}_${Date.now()}`,
          notes: {
            event_id: event_id,
            user_id:  userId,
            title:    event.title,
          },
        });
      } catch (rpErr) {
        // Safe rollback: release reservation immediately so seat is not blocked
        await query(
          `UPDATE payment_orders SET status = 'failed', updated_at = NOW() WHERE id = $1`,
          [reservationId],
        ).catch(() => {});
        console.error('[createOrder:event] Razorpay API failed to create order:', rpErr.message);
        return res.status(502).json({
          success: false,
          message: 'Payment gateway failed to initialize order. Seat reservation released.',
        });
      }

      // 5. Update reservation record with real Razorpay order ID
      await query(
        `UPDATE payment_orders
         SET razorpay_order_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [rpOrder.id, reservationId],
      );

      return res.status(201).json({
        success:  true,
        order_id: rpOrder.id,
        amount:   amountPaise,
        currency: 'INR',
        key_id:   process.env.RAZORPAY_KEY_ID,
        expires_at: reservationExpiresAt,
        event: {
          id:    event.id,
          title: event.title,
          price: priceINR,
        },
      });
    } catch (err) {
      console.error('[createOrder:event] Error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({ success: false, message: 'Failed to create workshop payment order' });
    }
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 2. POST /api/payments/verify
// ───────────────────────────────────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required',
    });
  }

  try {
    // ── HMAC-SHA256 signature verification ──────────────────────────────────
    const body        = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    let sigMatch = false;
    try {
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      const receivedBuf = Buffer.from(razorpay_signature, 'hex');
      sigMatch = expectedBuf.length === receivedBuf.length &&
                 crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      sigMatch = false;
    }

    if (!sigMatch) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Fetch our payment_orders record
    const { rows } = await query(
      `SELECT * FROM payment_orders WHERE razorpay_order_id = $1`,
      [razorpay_order_id],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    const order = rows[0];

    // Ensure this order belongs to the authenticated user
    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized payment verification' });
    }

    // Idempotency: guard against re-verification if already processed
    if (order.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and registration confirmed',
        journey_id: order.journey_id,
        event_id: order.event_id,
      });
    }

    if (order.status === 'captured_unresolved') {
      return res.status(200).json({
        success: true,
        unresolved: true,
        resolution_status: order.resolution_status,
        message: 'Payment was captured but registration could not be confirmed (event full or cancelled). Recorded for administrator resolution.',
        event_id: order.event_id,
      });
    }

    // ── Authoritative gateway check ──────────────────────────────────────────
    const shouldFetch = isMocked || (!process.env.RAZORPAY_KEY_ID?.includes('REPLACE_ME'));
    if (shouldFetch) {
      let paymentDetails;
      try {
        paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);
      } catch (rpErr) {
        console.error('[verifyPayment] Razorpay fetch error:', rpErr.message);
        return res.status(502).json({ success: false, message: 'Unable to verify payment with payment gateway' });
      }

      if (!paymentDetails || paymentDetails.order_id !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: 'Payment does not match the expected order' });
      }

      if (paymentDetails.status !== 'captured') {
        return res.status(400).json({
          success: false,
          message: `Payment is not captured. Current gateway status: ${paymentDetails.status}`,
        });
      }

      // Check amount and currency match the order
      if (Number(paymentDetails.amount) !== Number(order.amount_paise) || paymentDetails.currency !== order.currency) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount or currency mismatch',
        });
      }
    }

    // ── Atomic: mark paid or captured_unresolved with database row lock ──────
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lockRes = await client.query(
        `SELECT * FROM payment_orders WHERE razorpay_order_id = $1 FOR UPDATE`,
        [razorpay_order_id],
      );
      const lockedOrder = lockRes.rows[0];

      if (lockedOrder.status === 'paid') {
        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          message: 'Payment already verified and registration confirmed',
          journey_id: lockedOrder.journey_id,
          event_id: lockedOrder.event_id,
        });
      }

      if (lockedOrder.status === 'captured_unresolved') {
        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          unresolved: true,
          resolution_status: lockedOrder.resolution_status,
          message: 'Payment was captured but registration could not be confirmed. Recorded for administrator resolution.',
          event_id: lockedOrder.event_id,
        });
      }

      // If Journey payment:
      if (lockedOrder.journey_id) {
        await client.query(
          `UPDATE payment_orders
           SET status = 'paid',
               razorpay_payment_id = $1,
               razorpay_signature  = $2,
               verified_at         = NOW(),
               captured_at         = NOW(),
               updated_at          = NOW()
           WHERE razorpay_order_id = $3`,
          [razorpay_payment_id, razorpay_signature, razorpay_order_id],
        );

        await enrollUser(userId, lockedOrder.journey_id, client);
        await client.query('COMMIT');

        return res.status(200).json({
          success: true,
          message: 'Payment verified and enrollment confirmed',
          journey_id: lockedOrder.journey_id,
        });
      }

      // If Workshop / Event payment:
      if (lockedOrder.event_id) {
        // Lock event row
        const evLockRes = await client.query(
          `SELECT id, title, max_capacity, status FROM events WHERE id = $1 FOR UPDATE`,
          [lockedOrder.event_id],
        );
        const event = evLockRes.rows[0];

        // Check if user has an existing confirmed registration
        const existingRegRes = await client.query(
          `SELECT id, status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
          [lockedOrder.event_id, userId],
        );
        const alreadyRegistered = existingRegRes.rows.length > 0 && existingRegRes.rows[0].status === 'registered';

        // Check current confirmed registered count
        const regCountRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
          [lockedOrder.event_id],
        );
        const confirmedCount = regCountRes.rows[0].count;

        const isCancelled = event.status === 'cancelled';
        const isOverCapacity = !alreadyRegistered && confirmedCount >= event.max_capacity;

        // If event was cancelled or has reached full capacity after reservation expired:
        if (isCancelled || isOverCapacity) {
          const resolutionStatus = isCancelled ? 'unresolved_event_cancelled' : 'unresolved_capacity_exceeded';
          const resolutionNotes = isCancelled
            ? 'Payment captured but workshop was cancelled prior to verification.'
            : 'Payment captured after reservation expired and workshop is at capacity.';

          await client.query(
            `UPDATE payment_orders
             SET status = 'captured_unresolved',
                 razorpay_payment_id = $1,
                 razorpay_signature  = $2,
                 verified_at         = NOW(),
                 captured_at         = NOW(),
                 resolution_status   = $3,
                 resolution_notes    = $4,
                 updated_at          = NOW()
             WHERE razorpay_order_id = $5`,
            [razorpay_payment_id, razorpay_signature, resolutionStatus, resolutionNotes, razorpay_order_id],
          );

          // Update registration as waitlisted (NOT registered), so learner is NOT confirmed attendee
          await client.query(
            `INSERT INTO event_registrations
               (event_id, user_id, status, payment_id, amount_paid_paise, payment_status, registered_at, updated_at)
             VALUES ($1, $2, 'waitlisted', $3, $4, 'paid', NOW(), NOW())
             ON CONFLICT (event_id, user_id) DO UPDATE SET
               status = 'waitlisted',
               payment_id = $3,
               amount_paid_paise = $4,
               payment_status = 'paid',
               updated_at = NOW()`,
            [lockedOrder.event_id, userId, lockedOrder.id, lockedOrder.amount_paise],
          );

          await client.query('COMMIT');
          return res.status(200).json({
            success: true,
            unresolved: true,
            resolution_status: resolutionStatus,
            message: isCancelled
              ? 'Payment was captured but this workshop has been cancelled. Recorded for administrator resolution.'
              : 'Payment received. The workshop is at capacity; your payment is safely recorded for administrator resolution.',
            event_id: lockedOrder.event_id,
          });
        }

        // Within capacity: confirm registration
        await client.query(
          `UPDATE payment_orders
           SET status = 'paid',
               razorpay_payment_id = $1,
               razorpay_signature  = $2,
               verified_at         = NOW(),
               captured_at         = NOW(),
               resolution_status   = NULL,
               updated_at          = NOW()
           WHERE razorpay_order_id = $3`,
          [razorpay_payment_id, razorpay_signature, razorpay_order_id],
        );

        await client.query(
          `INSERT INTO event_registrations
             (event_id, user_id, status, payment_id, amount_paid_paise, payment_status, registered_at, updated_at)
           VALUES ($1, $2, 'registered', $3, $4, 'paid', NOW(), NOW())
           ON CONFLICT (event_id, user_id) DO UPDATE SET
             status = 'registered',
             payment_id = $3,
             amount_paid_paise = $4,
             payment_status = 'paid',
             cancelled_at = NULL,
             registered_at = NOW(),
             updated_at = NOW()`,
          [lockedOrder.event_id, userId, lockedOrder.id, lockedOrder.amount_paise],
        );

        await client.query('COMMIT');

        return res.status(200).json({
          success: true,
          message: 'Payment verified and workshop registration confirmed',
          event_id: lockedOrder.event_id,
        });
      }

      await client.query('COMMIT');
      return res.status(200).json({ success: true });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[verifyPayment] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 3. POST /api/payments/webhook
//    Called directly by Razorpay — NOT authenticated by JWT.
//    Raw body must be preserved for HMAC verification.
// ───────────────────────────────────────────────────────────────────────────
export const handleWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing webhook signature' });
  }

  try {
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest('hex');

    let sigMatch = false;
    try {
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      const receivedBuf = Buffer.from(signature, 'hex');
      sigMatch = expectedBuf.length === receivedBuf.length &&
                 crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      sigMatch = false;
    }

    if (!sigMatch) {
      console.warn('[webhook] Invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.rawBody.toString('utf8'));
    const eventType = event.event;
    console.log(`[webhook] Received event: ${eventType}`);

    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) return res.status(200).json({ success: true });

      const {
        id:       razorpay_payment_id,
        order_id: razorpay_order_id,
        amount:   amountPaise,
        currency: currency,
      } = payment;

      // Find our order record
      const { rows } = await query(
        `SELECT * FROM payment_orders WHERE razorpay_order_id = $1`,
        [razorpay_order_id],
      );

      if (!rows.length) {
        console.warn(`[webhook] Order not found: ${razorpay_order_id}`);
        return res.status(200).json({ success: true, message: 'Order not found, acknowledged' });
      }

      const order = rows[0];

      // Amount & currency mismatch check
      if (amountPaise !== undefined && (Number(amountPaise) !== Number(order.amount_paise) || currency !== order.currency)) {
        console.warn(`[webhook] Amount/currency mismatch for order ${razorpay_order_id}`);
        return res.status(400).json({ success: false, message: 'Amount or currency mismatch' });
      }

      // ── Transaction with row lock for deduplication ──
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lockRes = await client.query(
          `SELECT * FROM payment_orders WHERE razorpay_order_id = $1 FOR UPDATE`,
          [razorpay_order_id],
        );
        const lockedOrder = lockRes.rows[0];

        // Idempotency: if already processed, acknowledge without re-running
        if (lockedOrder.status === 'paid' || lockedOrder.status === 'captured_unresolved') {
          await client.query('COMMIT');
          return res.status(200).json({ success: true, message: 'Already processed' });
        }

        if (lockedOrder.journey_id) {
          await client.query(
            `UPDATE payment_orders
             SET status = 'paid',
                 razorpay_payment_id = $1,
                 captured_at         = NOW(),
                 updated_at          = NOW()
             WHERE razorpay_order_id = $2`,
            [razorpay_payment_id, razorpay_order_id],
          );
          await enrollUser(lockedOrder.user_id, lockedOrder.journey_id, client);
          console.log(`[webhook] Enrolled user ${lockedOrder.user_id} in journey ${lockedOrder.journey_id}`);
        } else if (lockedOrder.event_id) {
          // Lock event row
          const evLock = await client.query(
            `SELECT max_capacity, status FROM events WHERE id = $1 FOR UPDATE`,
            [lockedOrder.event_id],
          );
          const ev = evLock.rows[0];
          const maxCap = ev?.max_capacity || 50;
          const isCancelled = ev?.status === 'cancelled';

          const regCountRes = await client.query(
            `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
            [lockedOrder.event_id],
          );
          const currentCount = regCountRes.rows[0].count;

          const isOverCapacity = currentCount >= maxCap;

          if (isCancelled || isOverCapacity) {
            // Cannot confirm registration; mark captured_unresolved with audit trail
            const resolutionStatus = isCancelled ? 'unresolved_event_cancelled' : 'unresolved_capacity_exceeded';
            const resolutionNotes = isCancelled
              ? 'Payment captured via webhook but workshop was cancelled.'
              : 'Payment captured via webhook after reservation expired; event is at maximum capacity.';

            await client.query(
              `UPDATE payment_orders
               SET status = 'captured_unresolved',
                   razorpay_payment_id = $1,
                   captured_at         = NOW(),
                   resolution_status   = $2,
                   resolution_notes    = $3,
                   updated_at          = NOW()
               WHERE razorpay_order_id = $4`,
              [razorpay_payment_id, resolutionStatus, resolutionNotes, razorpay_order_id],
            );

            await client.query(
              `INSERT INTO event_registrations
                 (event_id, user_id, status, payment_id, amount_paid_paise, payment_status, registered_at, updated_at)
               VALUES ($1, $2, 'waitlisted', $3, $4, 'paid', NOW(), NOW())
               ON CONFLICT (event_id, user_id) DO UPDATE SET
                 status = 'waitlisted',
                 payment_id = $3,
                 amount_paid_paise = $4,
                 payment_status = 'paid',
                 updated_at = NOW()`,
              [lockedOrder.event_id, lockedOrder.user_id, lockedOrder.id, lockedOrder.amount_paise],
            );
            console.log(`[webhook] Event ${lockedOrder.event_id} full/cancelled; recorded user ${lockedOrder.user_id} as unresolved`);
          } else {
            // Confirm registration
            await client.query(
              `UPDATE payment_orders
               SET status = 'paid',
                   razorpay_payment_id = $1,
                   captured_at         = NOW(),
                   resolution_status   = NULL,
                   updated_at          = NOW()
               WHERE razorpay_order_id = $2`,
              [razorpay_payment_id, razorpay_order_id],
            );

            await client.query(
              `INSERT INTO event_registrations
                 (event_id, user_id, status, payment_id, amount_paid_paise, payment_status, registered_at, updated_at)
               VALUES ($1, $2, 'registered', $3, $4, 'paid', NOW(), NOW())
               ON CONFLICT (event_id, user_id) DO UPDATE SET
                 status = 'registered',
                 payment_id = $3,
                 amount_paid_paise = $4,
                 payment_status = 'paid',
                 cancelled_at = NULL,
                 registered_at = NOW(),
                 updated_at = NOW()`,
              [lockedOrder.event_id, lockedOrder.user_id, lockedOrder.id, lockedOrder.amount_paise],
            );
            console.log(`[webhook] Registered user ${lockedOrder.user_id} for event ${lockedOrder.event_id} (status: registered)`);
          }
        }

        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      if (payment && payment.order_id) {
        // Safe out-of-order protection: only mark failed if status is still 'created'
        await query(
          `UPDATE payment_orders
           SET status = 'failed', updated_at = NOW()
           WHERE razorpay_order_id = $1 AND status = 'created'`,
          [payment.order_id],
        );
        console.log(`[webhook] Marked order failed: ${payment.order_id}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[webhook] Error:', err.message);
    return res.status(200).json({ success: true });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 4. GET /api/payments/unresolved — Inspect captured unresolved cases
//    Authorized for: 'admin', 'educator'
// ───────────────────────────────────────────────────────────────────────────
export const getUnresolvedPayments = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { event_id } = req.query;

    const conditions = [`(po.status = 'captured_unresolved' OR po.resolution_status IS NOT NULL)`];
    const params = [];

    if (event_id) {
      if (!UUID_REGEX.test(event_id)) {
        return res.status(400).json({ success: false, message: 'Invalid event_id format' });
      }
      params.push(event_id);
      conditions.push(`po.event_id = $${params.length}`);
    }

    // Educators can only inspect unresolved cases for their own workshops
    if (role === 'educator') {
      params.push(userId);
      conditions.push(`e.created_by = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT
         po.id,
         po.user_id,
         po.event_id,
         po.journey_id,
         po.razorpay_order_id,
         po.razorpay_payment_id,
         po.amount_paise,
         (po.amount_paise / 100.0) AS amount_inr,
         po.currency,
         po.status,
         po.resolution_status,
         po.resolution_notes,
         po.resolved_at,
         po.resolved_by,
         po.captured_at,
         po.created_at,
         po.updated_at,
         u.name AS user_name,
         u.email AS user_email,
         e.title AS event_title,
         e.status AS event_status,
         e.starts_at AS event_starts_at
       FROM payment_orders po
       JOIN users u ON u.id = po.user_id
       LEFT JOIN events e ON e.id = po.event_id
       WHERE ${whereClause}
       ORDER BY po.captured_at DESC NULLS LAST, po.created_at DESC`,
      params,
    );

    res.json({
      success: true,
      count: rows.length,
      unresolved_payments: rows,
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 5. PATCH /api/payments/unresolved/:id/resolve — Manual resolution audit
//    Authorized for: 'admin', 'educator'
// ───────────────────────────────────────────────────────────────────────────
export const resolveUnresolvedPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution_notes, action = 'resolved_manual' } = req.body;
    const { role, id: userId } = req.user;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    // Fetch order
    const { rows } = await query(
      `SELECT po.*, e.created_by AS event_owner
       FROM payment_orders po
       LEFT JOIN events e ON e.id = po.event_id
       WHERE po.id = $1`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    const order = rows[0];

    // Educators can only resolve orders for their own workshops
    if (role === 'educator' && order.event_owner !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to resolve this order' });
    }

    const updated = await query(
      `UPDATE payment_orders
       SET resolution_status = $1,
           resolution_notes  = COALESCE($2, resolution_notes),
           resolved_at       = NOW(),
           resolved_by       = $3,
           updated_at        = NOW()
       WHERE id = $4
       RETURNING *`,
      [action, resolution_notes || null, userId, id],
    );

    res.json({
      success: true,
      message: 'Payment order resolution recorded successfully',
      order: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
