import pool, { query } from '../config/db.js';

/**
 * GET /api/journeys — List all published journeys
 */
export const getAllJourneys = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT j.*, u.name as creator_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.journey_id = j.id) as enrollment_count
       FROM journeys j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.status = 'published'
       ORDER BY j.created_at DESC`
    );
    res.json({ success: true, journeys: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/journeys/:id — Get journey with stages
 */
export const getJourneyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journeyResult = await query(
      `SELECT j.*, u.name as creator_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.journey_id = j.id) as enrollment_count
       FROM journeys j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1 AND j.status = 'published'`,
      [id]
    );
    if (journeyResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const stagesResult = await query(
      'SELECT * FROM stages WHERE journey_id = $1 ORDER BY order_index',
      [id]
    );

    res.json({
      success: true,
      journey: journeyResult.rows[0],
      stages: stagesResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/journeys — Create a new Growth Journey (Educator/Admin)
 */
export const createJourney = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, description = '', category = 'General', skill_domain = 'General', difficulty = 'Beginner', duration_hours = 2.0, price = 0.00 } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Title is required and must be at least 3 characters' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, price, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
       RETURNING *`,
      [title.trim(), description ? description.trim() : '', category ? category.trim() : 'General', skill_domain ? skill_domain.trim() : 'General', difficulty, duration_hours, price, req.user.id]
    );

    const newJourney = result.rows[0];

    const stageDefs = [
      { type: 'explore',    title: 'Explore: Baseline Diagnostic & Discovery' },
      { type: 'learn',      title: 'Learn: Core Concepts & Video Capsules' },
      { type: 'experience', title: 'Experience: Hands-On Challenge Simulation' },
      { type: 'validate',   title: 'Validate: Peer & Educator Review' },
      { type: 'apply',      title: 'Apply: Real-World Implementation Project' },
      { type: 'transform',  title: 'Transform: Milestone Portfolio & Reflection' },
    ];

    for (let i = 0; i < stageDefs.length; i++) {
      await client.query(
        `INSERT INTO stages (journey_id, stage_type, title, description, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [newJourney.id, stageDefs[i].type, stageDefs[i].title, 'Stage description', i + 1]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, journey: newJourney });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * POST /api/journeys/:id/enroll — Enroll learner in a journey
 */
export const enrollInJourney = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if journey exists, is published, and inspect price
    const journeyRes = await query(
      'SELECT id, title, price, status FROM journeys WHERE id = $1',
      [id]
    );

    if (journeyRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journey = journeyRes.rows[0];

    if (journey.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Journey is not available for enrollment' });
    }

    // Direct /enroll is only permitted for free journeys (price = 0).
    // Paid journeys must go through the Razorpay payment and verification flow.
    if (Number(journey.price) > 0) {
      const paidOrder = await query(
        `SELECT id FROM payment_orders WHERE user_id = $1 AND journey_id = $2 AND status = 'paid' LIMIT 1`,
        [req.user.id, id]
      );
      if (paidOrder.rows.length === 0) {
        return res.status(402).json({
          success: false,
          message: 'Payment required. Paid journeys cannot be enrolled without verified payment.',
        });
      }
    }

    // Get the first stage of the journey
    const firstStage = await query(
      'SELECT id FROM stages WHERE journey_id = $1 ORDER BY order_index LIMIT 1',
      [id]
    );

    const result = await query(
      `INSERT INTO enrollments (user_id, journey_id, status, current_stage)
       VALUES ($1, $2, 'enrolled', $3)
       ON CONFLICT (user_id, journey_id) DO NOTHING
       RETURNING *`,
      [req.user.id, id, firstStage.rows[0]?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }

    res.status(201).json({ success: true, enrollment: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
