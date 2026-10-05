import { query } from '../config/db.js';

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

    const journeyResult = await query('SELECT * FROM journeys WHERE id = $1', [id]);
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
  try {
    const { title, description, category, skill_domain, difficulty, duration_hours } = req.body;

    const result = await query(
      `INSERT INTO journeys (title, description, category, skill_domain, difficulty, duration_hours, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, category, skill_domain, difficulty, duration_hours, req.user.id]
    );

    res.status(201).json({ success: true, journey: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/journeys/:id/enroll — Enroll learner in a journey
 */
export const enrollInJourney = async (req, res, next) => {
  try {
    const { id } = req.params;

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
