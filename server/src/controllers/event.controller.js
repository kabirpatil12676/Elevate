/**
 * ELEVATE Phase 6A & 6B.1 — Event Controller
 *
 * Implements:
 *   - Listing published events (public) with pricing metadata
 *   - Event detail retrieval with user registration & payment status
 *   - Learner registration (free workshops only) & cancellation
 *   - Learner's own registrations with payment status
 *   - Educator event CRUD (create, edit, delete draft) with pricing & price-lock guard
 *   - Educator publish / cancel events
 *   - Educator view registrations & payment status for their events
 *   - Admin management across all educators
 *
 * Security:
 *   - All mutations require authentication
 *   - Educators can only manage their own events (unless admin)
 *   - Learners cannot register for unpublished, cancelled, full, or past-deadline events
 *   - Concurrent registration is protected by FOR UPDATE row-level locking + capacity check in transaction
 *   - Paid workshops reject direct free registration (must go through payment checkout)
 *   - Published events with confirmed registrations lock pricing to prevent invalidating existing payments
 *   - Duplicate registrations are rejected (unique constraint)
 */

import pool, { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id) {
  return id && UUID_REGEX.test(id);
}

// ─── Shared: fetch registration count for an event ───────────────────────────
async function getRegistrationCount(eventId) {
  const r = await query(
    `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
    [eventId]
  );
  return r.rows[0].count;
}

// ─── 1. GET /api/events — Public list of upcoming published events ─────────────
export const listEvents = async (req, res, next) => {
  try {
    const { category, status: filterStatus = 'upcoming', search } = req.query;

    // Build WHERE clauses
    const conditions = [];
    const params = [];

    if (filterStatus === 'past') {
      conditions.push(`e.status IN ('published', 'completed')`);
      conditions.push(`e.ends_at < NOW()`);
    } else {
      conditions.push(`e.status = 'published'`);
      if (filterStatus === 'upcoming') {
        conditions.push(`e.starts_at > NOW()`);
      }
    }

    if (category) {
      params.push(category);
      conditions.push(`e.category ILIKE $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length} OR e.facilitator_name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const eventsRes = await query(
      `SELECT
         e.id, e.title, e.description, e.category, e.facilitator_name,
         e.venue, e.meeting_url, e.starts_at, e.ends_at,
         e.max_capacity, e.registration_deadline, e.status, e.created_at,
         e.price, e.currency,
         COUNT(er.id) FILTER (WHERE er.status = 'registered')::int AS registered_count
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.id
       ${whereClause}
       GROUP BY e.id
       ORDER BY e.starts_at ASC`,
      params
    );

    const events = eventsRes.rows.map(ev => ({
      ...ev,
      price: Number(ev.price || 0),
      currency: ev.currency || 'INR',
      is_free: Number(ev.price || 0) === 0,
      seats_available: ev.max_capacity - ev.registered_count,
      is_full: ev.registered_count >= ev.max_capacity,
      is_deadline_passed: new Date(ev.registration_deadline) < new Date(),
    }));

    res.json({ success: true, count: events.length, events });
  } catch (err) {
    next(err);
  }
};

// ─── 2. GET /api/events/:eventId — Public event detail ────────────────────────
export const getEventDetail = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(
      `SELECT
         e.id, e.title, e.description, e.category, e.facilitator_name, e.facilitator_bio,
         e.venue, e.meeting_url, e.starts_at, e.ends_at,
         e.max_capacity, e.registration_deadline, e.status, e.created_by, e.created_at, e.updated_at,
         e.price, e.currency,
         COUNT(er.id) FILTER (WHERE er.status = 'registered')::int AS registered_count
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [eventId]
    );

    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const ev = evRes.rows[0];

    // Draft events stay private. Published, completed, and cancelled workshops remain
    // visible so learners can review attendance outcomes and claim certificates.
    const userRole = req.user?.role;
    const publiclyVisible = ['published', 'completed', 'cancelled'].includes(ev.status);
    if (!publiclyVisible) {
      if (userRole !== 'admin' && !(userRole === 'educator' && ev.created_by === req.user?.id)) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
    }

    // If user is authenticated, query their own registration details
    let userRegistration = null;
    if (req.user?.id) {
      const myReg = await query(
        `SELECT id, status, payment_status, amount_paid_paise, payment_id, registered_at, cancelled_at
         FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
        [eventId, req.user.id]
      );
      if (myReg.rows.length > 0) {
        userRegistration = myReg.rows[0];
      }
    }

    const seats_available = ev.max_capacity - ev.registered_count;
    res.json({
      success: true,
      event: {
        ...ev,
        price: Number(ev.price || 0),
        currency: ev.currency || 'INR',
        is_free: Number(ev.price || 0) === 0,
        seats_available,
        is_full: seats_available <= 0,
        is_deadline_passed: new Date(ev.registration_deadline) < new Date(),
        user_registration: userRegistration,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 3. POST /api/events/:eventId/register — Learner registers (FREE ONLY) ────
export const registerForEvent = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    // Begin transaction to prevent overbooking
    await client.query('BEGIN');

    // Lock the event row for this transaction
    const evRes = await client.query(
      `SELECT id, status, max_capacity, registration_deadline, starts_at, price, currency
       FROM events WHERE id = $1 FOR UPDATE`,
      [eventId]
    );

    if (evRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const ev = evRes.rows[0];

    // Reject direct free registration for paid workshops
    if (Number(ev.price) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `This workshop requires payment of ₹${ev.price}. Please use the payment checkout workflow.`,
        price: Number(ev.price),
        currency: ev.currency,
      });
    }

    if (ev.status !== 'published') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This event is not available for registration' });
    }

    if (new Date(ev.registration_deadline) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Registration deadline for this event has passed' });
    }

    if (new Date(ev.starts_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This event has already started' });
    }

    // Check current registered count (within the locked transaction)
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
      [eventId]
    );
    const registered = countRes.rows[0].count;

    if (registered >= ev.max_capacity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This event is fully booked. No seats available.' });
    }

    // Check if already registered
    const existingRes = await client.query(
      `SELECT id, status FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (existing.status === 'registered') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'You are already registered for this event' });
      }
      // If previously cancelled, re-register within active transaction
      const updated = await client.query(
        `UPDATE event_registrations
         SET status = 'registered',
             payment_status = 'free',
             amount_paid_paise = 0,
             cancelled_at = NULL,
             registered_at = NOW(),
             updated_at = NOW()
         WHERE event_id = $1 AND user_id = $2 RETURNING *`,
        [eventId, userId]
      );
      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        message: 'You have been successfully re-registered for this event',
        registration: updated.rows[0],
      });
    }

    // Insert new registration
    const insertRes = await client.query(
      `INSERT INTO event_registrations (event_id, user_id, status, payment_status, amount_paid_paise, registered_at, updated_at)
       VALUES ($1, $2, 'registered', 'free', 0, NOW(), NOW())
       RETURNING *`,
      [eventId, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for this event',
      registration: insertRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    // Handle unique constraint violation (race condition duplicate)
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'You are already registered for this event' });
    }
    next(err);
  } finally {
    client.release();
  }
};

// ─── 4. DELETE /api/events/:eventId/register — Learner cancels registration ───
export const cancelRegistration = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const regRes = await query(
      `SELECT er.id, er.status, er.payment_status, e.starts_at FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       WHERE er.event_id = $1 AND er.user_id = $2`,
      [eventId, userId]
    );

    if (regRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No active registration found for this event' });
    }

    const reg = regRes.rows[0];

    if (reg.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This registration is already cancelled' });
    }

    // Check if event has already started
    if (new Date(reg.starts_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel registration after the event has started',
      });
    }

    const updRes = await query(
      `UPDATE event_registrations
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [reg.id]
    );

    res.json({
      success: true,
      message: 'Your registration has been cancelled',
      registration: updRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── 5. GET /api/events/my-registrations — Learner's registrations ─────────────
export const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const regsRes = await query(
      `SELECT
         er.id as registration_id, er.status as registration_status,
         er.payment_status, er.amount_paid_paise, er.payment_id,
         er.registered_at, er.cancelled_at,
         e.id as event_id, e.title, e.description, e.category, e.facilitator_name,
         e.venue, e.meeting_url, e.starts_at, e.ends_at, e.status as event_status,
         e.max_capacity, e.price, e.currency,
         COUNT(er2.id) FILTER (WHERE er2.status = 'registered')::int AS registered_count
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       LEFT JOIN event_registrations er2 ON er2.event_id = e.id
       WHERE er.user_id = $1
       GROUP BY er.id, e.id
       ORDER BY e.starts_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      count: regsRes.rows.length,
      registrations: regsRes.rows.map(r => ({
        ...r,
        price: Number(r.price || 0),
        currency: r.currency || 'INR',
        is_free: Number(r.price || 0) === 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6. POST /api/events — Educator creates event ─────────────────────────────
export const createEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title, description, category, facilitator_name, facilitator_bio,
      venue, meeting_url, starts_at, ends_at, max_capacity, registration_deadline,
      price, currency,
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Event title is required' });
    }
    if (!starts_at || !ends_at || !registration_deadline) {
      return res.status(400).json({ success: false, message: 'starts_at, ends_at, and registration_deadline are required' });
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      return res.status(400).json({ success: false, message: 'ends_at must be after starts_at' });
    }
    if (new Date(registration_deadline) > new Date(starts_at)) {
      return res.status(400).json({ success: false, message: 'registration_deadline must be on or before starts_at' });
    }
    const capacity = parseInt(max_capacity, 10);
    if (!capacity || capacity < 1) {
      return res.status(400).json({ success: false, message: 'max_capacity must be a positive integer' });
    }

    // Validate price & currency
    let parsedPrice = 0.00;
    if (price !== undefined && price !== null && price !== '') {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
      }
    }

    const eventCurrency = currency ? currency.toUpperCase().trim() : 'INR';
    if (eventCurrency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Only INR currency is supported' });
    }

    const insertRes = await query(
      `INSERT INTO events (
         title, description, category, facilitator_name, facilitator_bio,
         venue, meeting_url, starts_at, ends_at, max_capacity, registration_deadline,
         price, currency, status, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', $14, NOW(), NOW())
       RETURNING *`,
      [
        title.trim(), description || null, category || null,
        facilitator_name || null, facilitator_bio || null,
        venue || null, meeting_url || null,
        starts_at, ends_at, capacity, registration_deadline,
        parsedPrice, eventCurrency, userId,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created as draft',
      event: {
        ...insertRes.rows[0],
        price: Number(insertRes.rows[0].price),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 7. PUT /api/events/:eventId — Educator edits event ───────────────────────
export const updateEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const ev = evRes.rows[0];

    // Ownership check
    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this event' });
    }

    // Can only edit draft events (or published to adjust metadata, but with guards)
    if (!['draft', 'published'].includes(ev.status)) {
      return res.status(400).json({ success: false, message: `Cannot edit an event with status '${ev.status}'` });
    }

    const {
      title, description, category, facilitator_name, facilitator_bio,
      venue, meeting_url, starts_at, ends_at, max_capacity, registration_deadline,
      price, currency,
    } = req.body;

    const newStartsAt = starts_at || ev.starts_at;
    const newEndsAt   = ends_at   || ev.ends_at;
    const newDeadline = registration_deadline || ev.registration_deadline;

    if (new Date(newEndsAt) <= new Date(newStartsAt)) {
      return res.status(400).json({ success: false, message: 'ends_at must be after starts_at' });
    }
    if (new Date(newDeadline) > new Date(newStartsAt)) {
      return res.status(400).json({ success: false, message: 'registration_deadline must be on or before starts_at' });
    }

    const capacity = max_capacity ? parseInt(max_capacity, 10) : ev.max_capacity;
    if (capacity < 1) {
      return res.status(400).json({ success: false, message: 'max_capacity must be a positive integer' });
    }

    // If reducing capacity below current registrations, reject
    if (max_capacity) {
      const currentCount = await getRegistrationCount(eventId);
      if (capacity < currentCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce capacity below current registration count (${currentCount} registered)`,
        });
      }
    }

    // Validate pricing & guard against changing price on published workshop with confirmed registrations
    let newPrice = ev.price;
    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
      }

      // Check price change guard
      if (ev.status === 'published' && parsedPrice !== Number(ev.price)) {
        const confirmedRes = await query(
          `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
          [eventId]
        );
        if (confirmedRes.rows[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot modify pricing on a published workshop that already has confirmed registrations.',
          });
        }
      }
      newPrice = parsedPrice;
    }

    let newCurrency = ev.currency;
    if (currency !== undefined && currency !== null && currency !== '') {
      const eventCurrency = currency.toUpperCase().trim();
      if (eventCurrency !== 'INR') {
        return res.status(400).json({ success: false, message: 'Only INR currency is supported' });
      }
      newCurrency = eventCurrency;
    }

    const updateRes = await query(
      `UPDATE events SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         category = COALESCE($3, category),
         facilitator_name = COALESCE($4, facilitator_name),
         facilitator_bio = COALESCE($5, facilitator_bio),
         venue = COALESCE($6, venue),
         meeting_url = COALESCE($7, meeting_url),
         starts_at = $8,
         ends_at = $9,
         max_capacity = $10,
         registration_deadline = $11,
         price = $12,
         currency = $13,
         updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [
        title?.trim() || null, description || null, category || null,
        facilitator_name || null, facilitator_bio || null,
        venue || null, meeting_url || null,
        newStartsAt, newEndsAt, capacity, newDeadline,
        newPrice, newCurrency,
        eventId,
      ]
    );

    res.json({
      success: true,
      message: 'Event updated',
      event: {
        ...updateRes.rows[0],
        price: Number(updateRes.rows[0].price),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 8. PATCH /api/events/:eventId/publish — Educator/Admin publishes event ───
export const publishEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to publish this event' });
    }

    if (ev.status === 'published') {
      return res.status(400).json({ success: false, message: 'Event is already published' });
    }

    if (!['draft'].includes(ev.status)) {
      return res.status(400).json({ success: false, message: `Cannot publish an event with status '${ev.status}'` });
    }

    const updRes = await query(
      `UPDATE events SET status = 'published', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [eventId]
    );

    res.json({
      success: true,
      message: 'Event published successfully',
      event: {
        ...updRes.rows[0],
        price: Number(updRes.rows[0].price),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 9. PATCH /api/events/:eventId/cancel — Educator/Admin cancels event ──────
export const cancelEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this event' });
    }

    if (ev.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Event is already cancelled' });
    }

    const updRes = await query(
      `UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [eventId]
    );

    res.json({ success: true, message: 'Event cancelled', event: updRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── 10. DELETE /api/events/:eventId — Delete draft event ─────────────────────
export const deleteEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this event' });
    }

    if (ev.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft events can be deleted. Cancel published events instead.',
      });
    }

    await query(`DELETE FROM events WHERE id = $1`, [eventId]);

    res.json({ success: true, message: 'Draft event deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── 11. GET /api/events/my-events — Educator's own events ────────────────────
export const getMyEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin sees all events; educator sees their own
    const whereClause = userRole === 'admin' ? '' : 'WHERE e.created_by = $1';
    const params = userRole === 'admin' ? [] : [userId];

    const evRes = await query(
      `SELECT
         e.id, e.title, e.category, e.status, e.starts_at, e.ends_at,
         e.max_capacity, e.registration_deadline, e.facilitator_name,
         e.venue, e.price, e.currency, e.created_at, e.updated_at,
         COUNT(er.id) FILTER (WHERE er.status = 'registered')::int AS registered_count,
         u.name AS creator_name
       FROM events e
       LEFT JOIN event_registrations er ON er.event_id = e.id
       LEFT JOIN users u ON u.id = e.created_by
       ${whereClause}
       GROUP BY e.id, u.name
       ORDER BY e.created_at DESC`,
      params
    );

    res.json({
      success: true,
      count: evRes.rows.length,
      events: evRes.rows.map(ev => ({
        ...ev,
        price: Number(ev.price || 0),
        currency: ev.currency || 'INR',
        is_free: Number(ev.price || 0) === 0,
        seats_available: ev.max_capacity - ev.registered_count,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ─── 12. GET /api/events/:eventId/registrations — Educator views registrations ─
export const getEventRegistrations = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT id, title, created_by, max_capacity, price, currency, status, ends_at FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view registrations for this event' });
    }

    const regsRes = await query(
      `SELECT er.id, er.status, er.payment_status, er.amount_paid_paise, er.payment_id,
              er.registered_at, er.cancelled_at,
              u.id as user_id, u.name as learner_name, u.email as learner_email,
              ea.status as attendance_status, ea.updated_at as attendance_updated_at
       FROM event_registrations er
       JOIN users u ON u.id = er.user_id
       LEFT JOIN event_attendance ea ON ea.event_id = er.event_id AND ea.user_id = er.user_id
       WHERE er.event_id = $1
       ORDER BY er.registered_at ASC`,
      [eventId]
    );

    const registered = regsRes.rows.filter(r => r.status === 'registered').length;
    const presentCount = regsRes.rows.filter(r => r.status === 'registered' && r.attendance_status === 'present').length;
    const absentCount = regsRes.rows.filter(r => r.status === 'registered' && r.attendance_status === 'absent').length;
    const unmarkedCount = regsRes.rows.filter(r => r.status === 'registered' && !r.attendance_status).length;

    res.json({
      success: true,
      event: {
        id: ev.id,
        title: ev.title,
        max_capacity: ev.max_capacity,
        status: ev.status,
        ends_at: ev.ends_at,
        is_ended: new Date(ev.ends_at) <= new Date(),
        price: Number(ev.price || 0),
        currency: ev.currency || 'INR',
        is_free: Number(ev.price || 0) === 0,
      },
      registered_count: registered,
      seats_available: ev.max_capacity - registered,
      attendance_summary: {
        total_registered: registered,
        present_count: presentCount,
        absent_count: absentCount,
        unmarked_count: unmarkedCount,
      },
      registrations: regsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 13. PATCH /api/events/:eventId/complete — Educator/Admin completes event ──
export const completeEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { force = false } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    // Authorization: owner educator or admin
    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to complete this event' });
    }

    if (ev.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Event is already marked as completed', event: ev });
    }

    if (ev.status !== 'published') {
      return res.status(400).json({ success: false, message: `Cannot complete an event with status '${ev.status}'` });
    }

    // Must not be marked completed before scheduled end time, unless deliberate admin force
    const hasEnded = new Date(ev.ends_at) <= new Date();
    if (!hasEnded && !(userRole === 'admin' && force)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark workshop completed before its scheduled end time. Scheduled to end at: ' + ev.ends_at,
      });
    }

    const updRes = await query(
      `UPDATE events SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [eventId]
    );

    res.json({
      success: true,
      message: 'Workshop completed successfully',
      event: {
        ...updRes.rows[0],
        price: Number(updRes.rows[0].price),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 14. POST /api/events/:eventId/attendance — Record Learner Attendance ──────
export const recordAttendance = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const { force = false } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    // Check event
    const evRes = await client.query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to record attendance for this event' });
    }

    // Attendance can only be recorded after the scheduled end time, except admin force
    const hasEnded = new Date(ev.ends_at) <= new Date();
    if (!hasEnded && !(userRole === 'admin' && force === true)) {
      return res.status(400).json({
        success: false,
        message: 'Attendance cannot be recorded before the workshop\'s scheduled end time.',
      });
    }

    // Accept { attendees }, { records }, or a single { user_id, status }
    let rawRecords = [];
    if (Array.isArray(req.body.attendees)) {
      rawRecords = req.body.attendees;
    } else if (Array.isArray(req.body.records)) {
      rawRecords = req.body.records;
    } else if (req.body.user_id && req.body.status) {
      rawRecords = [{ user_id: req.body.user_id, status: req.body.status }];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either { user_id, status }, { records: [...] }, or { attendees: [...] } is required',
      });
    }

    if (rawRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'No attendance records provided' });
    }

    await client.query('BEGIN');

    const updatedAttendance = [];

    for (const rec of rawRecords) {
      const { user_id: learnerId, status: attStatus } = rec;

      if (!validateUUID(learnerId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Invalid user ID format: ${learnerId}` });
      }

      if (!['present', 'absent'].includes(attStatus)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Invalid attendance status '${attStatus}'. Must be 'present' or 'absent'.` });
      }

      // 1. Verify learner has a valid active registration for this event
      const regRes = await client.query(
        `SELECT id, status, payment_status
         FROM event_registrations
         WHERE event_id = $1 AND user_id = $2`,
        [eventId, learnerId]
      );

      if (regRes.rows.length === 0 || !['registered'].includes(regRes.rows[0].status)) {
        await client.query('ROLLBACK');
        const statusLabel = regRes.rows[0]?.status || 'missing';
        return res.status(400).json({
          success: false,
          message: `No valid confirmed registration found for this learner (${statusLabel}). Cancelled, waitlisted, and unregistered learners cannot be marked.`,
        });
      }

      // 2. If paid event, verify payment is captured and not unresolved
      if (Number(ev.price) > 0) {
        if (regRes.rows[0].payment_status !== 'paid') {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Cannot record attendance for learner ${learnerId}: payment is not confirmed (${regRes.rows[0].payment_status}).`,
          });
        }

        const unresolved = await client.query(
          `SELECT id FROM payment_orders
           WHERE event_id = $1 AND user_id = $2
             AND status = 'captured_unresolved'
             AND (resolution_status IS NULL OR resolution_status NOT LIKE 'resolved%')
           LIMIT 1`,
          [eventId, learnerId]
        );
        if (unresolved.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Cannot record attendance for learner ${learnerId}: registration has an unresolved captured payment.`,
          });
        }
      }

      // 3. Upsert attendance record
      const attRes = await client.query(
        `INSERT INTO event_attendance
           (event_id, user_id, status, marked_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (event_id, user_id) DO UPDATE SET
           status = EXCLUDED.status,
           marked_by = EXCLUDED.marked_by,
           updated_at = NOW()
         RETURNING *`,
        [eventId, learnerId, attStatus, userId]
      );

      updatedAttendance.push(attRes.rows[0]);
    }

    await client.query('COMMIT');

    const counts = await query(
      `SELECT
         COUNT(*) FILTER (WHERE er.status = 'registered')::int AS total_registered,
         COUNT(*) FILTER (WHERE er.status = 'registered' AND ea.status = 'present')::int AS present_count,
         COUNT(*) FILTER (WHERE er.status = 'registered' AND ea.status = 'absent')::int AS absent_count
       FROM event_registrations er
       LEFT JOIN event_attendance ea ON ea.event_id = er.event_id AND ea.user_id = er.user_id
       WHERE er.event_id = $1`,
      [eventId]
    );
    const totalRegistered = counts.rows[0].total_registered;
    const presentCount = counts.rows[0].present_count;
    const absentCount = counts.rows[0].absent_count;

    res.json({
      success: true,
      message: `Recorded attendance for ${updatedAttendance.length} attendee(s)`,
      attendance: updatedAttendance,
      summary: {
        total_registered: totalRegistered,
        present_count: presentCount,
        absent_count: absentCount,
        unmarked_count: Math.max(0, totalRegistered - (presentCount + absentCount)),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 15. GET /api/events/:eventId/attendance — Retrieve Attendance Summary ─────
export const getEventAttendance = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const evRes = await query(`SELECT id, title, created_by, max_capacity, status, ends_at FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const ev = evRes.rows[0];

    if (userRole !== 'admin' && ev.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view attendance for this event' });
    }

    const attList = await query(
      `SELECT ea.*, u.name AS learner_name, u.email AS learner_email,
              marker.name AS marked_by_name
       FROM event_attendance ea
       JOIN users u ON u.id = ea.user_id
       JOIN users marker ON marker.id = ea.marked_by
       WHERE ea.event_id = $1
       ORDER BY u.name ASC`,
      [eventId]
    );

    const regCountRes = await query(
      `SELECT COUNT(*)::int AS count FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
      [eventId]
    );
    const totalRegistered = regCountRes.rows[0].count;
    const presentCount = attList.rows.filter(r => r.status === 'present').length;
    const absentCount = attList.rows.filter(r => r.status === 'absent').length;

    res.json({
      success: true,
      event: {
        id: ev.id,
        title: ev.title,
        status: ev.status,
        ends_at: ev.ends_at,
        is_ended: new Date(ev.ends_at) <= new Date(),
      },
      summary: {
        total_registered: totalRegistered,
        present_count: presentCount,
        absent_count: absentCount,
        unmarked_count: Math.max(0, totalRegistered - (presentCount + absentCount)),
      },
      attendance: attList.rows,
    });
  } catch (err) {
    next(err);
  }
};

