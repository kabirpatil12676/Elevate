/**
 * ELEVATE Phase 4A — Educator Controller
 *
 * Implements educator authoring workflows for Growth Journeys:
 *  - List own journeys (or all for admin)
 *  - Get single journey with all 6 stages and lessons
 *  - Create journey draft (auto-generates the 6 ELEVATE stages in order)
 *  - Update journey metadata (educators cannot set status to published)
 *  - Delete draft journey
 *  - Update stage metadata
 *  - Add, update, delete video lessons (capsules) with YouTube URL validation
 *  - Admin publish / unpublish workflow
 */

import pool, { query } from '../config/db.js';

// ── Validation Helpers ───────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?(.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
  return pattern.test(trimmed);
}

export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const CANONICAL_STAGES = [
  {
    stage_type: 'explore',
    title: 'Explore: Baseline Diagnostic & Discovery',
    description: 'Assess current capabilities, identify skill gaps, and establish personal learning goals.',
    order_index: 1,
  },
  {
    stage_type: 'learn',
    title: 'Learn: Core Concepts & Video Capsules',
    description: 'Master foundational knowledge and framework concepts through bite-sized video lessons.',
    order_index: 2,
  },
  {
    stage_type: 'experience',
    title: 'Experience: Hands-On Challenge Simulation',
    description: 'Apply newly acquired concepts to practical simulation exercises and problem scenarios.',
    order_index: 3,
  },
  {
    stage_type: 'validate',
    title: 'Validate: Peer & Educator Review',
    description: 'Receive constructive feedback from educators and participate in collaborative peer evaluation.',
    order_index: 4,
  },
  {
    stage_type: 'apply',
    title: 'Apply: Real-World Implementation Project',
    description: 'Execute an end-to-end practical project demonstrating tangible mastery of the domain.',
    order_index: 5,
  },
  {
    stage_type: 'transform',
    title: 'Transform: Milestone Portfolio & Reflection',
    description: 'Reflect on learning growth, document evidence in your portfolio, and earn your verified Stage Badge.',
    order_index: 6,
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 1. GET /api/educator/journeys — List journeys manageable by current user
// ───────────────────────────────────────────────────────────────────────────
export const getMyJourneys = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId  = req.user.id;

    let sql = `
      SELECT j.*, u.name as creator_name,
        (SELECT COUNT(*) FROM stages s WHERE s.journey_id = j.id) as stage_count,
        (SELECT COUNT(*) FROM capsules c JOIN stages s ON c.stage_id = s.id WHERE s.journey_id = j.id) as lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.journey_id = j.id) as enrollment_count
      FROM journeys j
      LEFT JOIN users u ON j.created_by = u.id
    `;
    const params = [];

    if (!isAdmin) {
      sql += ` WHERE j.created_by = $1`;
      params.push(userId);
    }

    sql += ` ORDER BY j.updated_at DESC, j.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, journeys: result.rows });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 2. GET /api/educator/journeys/:id — Get journey with 6 stages & lessons
// ───────────────────────────────────────────────────────────────────────────
export const getManageJourney = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    const jRes = await query(
      `SELECT j.*, u.name as creator_name
       FROM journeys j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1`,
      [id]
    );

    if (jRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journey = jRes.rows[0];

    // Ownership check: educators may only view their own drafts
    if (!isAdmin && journey.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view or manage this journey',
      });
    }

    // Fetch the 6 stages in order
    const sRes = await query(
      `SELECT * FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
      [id]
    );
    const stages = sRes.rows;

    // Fetch all capsules (lessons) for this journey's stages
    const stageIds = stages.map(s => s.id);
    let capsules = [];
    if (stageIds.length > 0) {
      const cRes = await query(
        `SELECT * FROM capsules WHERE stage_id = ANY($1) ORDER BY order_index ASC`,
        [stageIds]
      );
      capsules = cRes.rows;
    }

    // Attach lessons to their respective stages
    const stagesWithLessons = stages.map(stage => ({
      ...stage,
      lessons: capsules.filter(c => c.stage_id === stage.id),
    }));

    res.json({
      success: true,
      journey,
      stages: stagesWithLessons,
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 3. POST /api/educator/journeys — Create a new Growth Journey Draft
// ───────────────────────────────────────────────────────────────────────────
export const createDraftJourney = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      title,
      description = '',
      category = 'Engineering Fundamentals',
      skill_domain = 'General',
      difficulty = 'Beginner',
      duration_hours = 2.0,
      badge = null,
      thumbnail_url = null,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be at least 3 characters',
      });
    }

    await client.query('BEGIN');

    // Insert Journey with status 'draft' and price 0.00
    const jResult = await client.query(
      `INSERT INTO journeys
         (title, description, category, skill_domain, difficulty, duration_hours, price, badge, thumbnail_url, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 0.00, $7, $8, 'draft', $9)
       RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : '',
        category ? category.trim() : 'Engineering Fundamentals',
        skill_domain ? skill_domain.trim() : 'General',
        difficulty || 'Beginner',
        parseFloat(duration_hours) || 2.0,
        badge ? badge.trim() : null,
        thumbnail_url ? thumbnail_url.trim() : null,
        req.user.id,
      ]
    );

    const newJourney = jResult.rows[0];

    // Automatically create the 6 canonical stages in order
    const createdStages = [];
    for (const stageDef of CANONICAL_STAGES) {
      const sResult = await client.query(
        `INSERT INTO stages (journey_id, stage_type, title, description, order_index)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newJourney.id, stageDef.stage_type, stageDef.title, stageDef.description, stageDef.order_index]
      );
      createdStages.push({ ...sResult.rows[0], lessons: [] });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Growth Journey draft created successfully with all 6 stages',
      journey: newJourney,
      stages: createdStages,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 4. PUT /api/educator/journeys/:id — Update journey metadata
// ───────────────────────────────────────────────────────────────────────────
export const updateJourneyMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    const jRes = await query('SELECT * FROM journeys WHERE id = $1', [id]);
    if (jRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journey = jRes.rows[0];

    // Ownership check
    if (!isAdmin && journey.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this journey',
      });
    }

    // Security rule: Educators CANNOT change status to published!
    if (req.body.status && req.body.status === 'published' && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators are authorized to publish Growth Journeys',
      });
    }

    const {
      title,
      description,
      category,
      skill_domain,
      difficulty,
      duration_hours,
      badge,
      thumbnail_url,
    } = req.body;

    if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length < 3)) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters',
      });
    }

    const updatedTitle       = title !== undefined ? title.trim() : journey.title;
    const updatedDescription = description !== undefined ? description.trim() : journey.description;
    const updatedCategory    = category !== undefined ? category.trim() : journey.category;
    const updatedDomain      = skill_domain !== undefined ? skill_domain.trim() : journey.skill_domain;
    const updatedDifficulty  = difficulty !== undefined ? difficulty : journey.difficulty;
    const updatedDuration    = duration_hours !== undefined ? parseFloat(duration_hours) || journey.duration_hours : journey.duration_hours;
    const updatedBadge       = badge !== undefined ? (badge ? badge.trim() : null) : journey.badge;
    const updatedThumbnail   = thumbnail_url !== undefined ? (thumbnail_url ? thumbnail_url.trim() : null) : journey.thumbnail_url;

    const uRes = await query(
      `UPDATE journeys
       SET title = $1,
           description = $2,
           category = $3,
           skill_domain = $4,
           difficulty = $5,
           duration_hours = $6,
           badge = $7,
           thumbnail_url = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        updatedTitle,
        updatedDescription,
        updatedCategory,
        updatedDomain,
        updatedDifficulty,
        updatedDuration,
        updatedBadge,
        updatedThumbnail,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Journey metadata updated successfully',
      journey: uRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/educator/journeys/:id — Delete a draft journey
// ───────────────────────────────────────────────────────────────────────────
export const deleteDraftJourney = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    const jRes = await query('SELECT * FROM journeys WHERE id = $1', [id]);
    if (jRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journey = jRes.rows[0];

    // Ownership check
    if (!isAdmin && journey.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this journey',
      });
    }

    // Protection: published journeys with enrollments cannot be deleted by educators
    if (journey.status === 'published' && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Published journeys cannot be deleted by educators',
      });
    }

    await query('DELETE FROM journeys WHERE id = $1', [id]);

    res.json({ success: true, message: 'Journey deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 6. PUT /api/educator/stages/:stageId — Update stage title and description
// ───────────────────────────────────────────────────────────────────────────
export const updateStage = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(stageId)) {
      return res.status(400).json({ success: false, message: 'Invalid stage ID format' });
    }

    const sRes = await query(
      `SELECT s.*, j.created_by
       FROM stages s
       JOIN journeys j ON s.journey_id = j.id
       WHERE s.id = $1`,
      [stageId]
    );

    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    const stage = sRes.rows[0];

    // Ownership check
    if (!isAdmin && stage.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this stage',
      });
    }

    const { title, description } = req.body;

    const updatedTitle       = title !== undefined ? title.trim() : stage.title;
    const updatedDescription = description !== undefined ? description.trim() : stage.description;

    const uRes = await query(
      `UPDATE stages
       SET title = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [updatedTitle, updatedDescription, stageId]
    );

    res.json({
      success: true,
      message: 'Stage updated successfully',
      stage: uRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 7. POST /api/educator/stages/:stageId/lessons — Add a video lesson
// ───────────────────────────────────────────────────────────────────────────
export const addLessonToStage = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(stageId)) {
      return res.status(400).json({ success: false, message: 'Invalid stage ID format' });
    }

    const sRes = await query(
      `SELECT s.*, j.created_by
       FROM stages s
       JOIN journeys j ON s.journey_id = j.id
       WHERE s.id = $1`,
      [stageId]
    );

    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    const stage = sRes.rows[0];

    // Ownership check
    if (!isAdmin && stage.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add lessons to this stage',
      });
    }

    const { title, description = '', content_url, duration_min = 10 } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Lesson title is required' });
    }

    if (!content_url || !isValidYouTubeUrl(content_url)) {
      return res.status(400).json({
        success: false,
        message: 'A valid YouTube video URL is required (e.g. https://www.youtube.com/watch?v=...)',
      });
    }

    // Determine order_index
    const maxOrderRes = await query(
      `SELECT COALESCE(MAX(order_index), 0) as max_idx FROM capsules WHERE stage_id = $1`,
      [stageId]
    );
    const nextOrder = parseInt(maxOrderRes.rows[0].max_idx, 10) + 1;

    const insRes = await query(
      `INSERT INTO capsules (stage_id, title, description, content_url, content_type, duration_min, order_index)
       VALUES ($1, $2, $3, $4, 'video', $5, $6)
       RETURNING *`,
      [
        stageId,
        title.trim(),
        description ? description.trim() : '',
        content_url.trim(),
        parseInt(duration_min, 10) || 10,
        nextOrder,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Lesson added successfully',
      lesson: insRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 8. PUT /api/educator/lessons/:lessonId — Update a video lesson
// ───────────────────────────────────────────────────────────────────────────
export const updateLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson ID format' });
    }

    const cRes = await query(
      `SELECT c.*, j.created_by
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE c.id = $1`,
      [lessonId]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const lesson = cRes.rows[0];

    // Ownership check
    if (!isAdmin && lesson.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this lesson',
      });
    }

    const { title, description, content_url, duration_min, order_index } = req.body;

    if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Lesson title cannot be empty' });
    }

    if (content_url !== undefined && !isValidYouTubeUrl(content_url)) {
      return res.status(400).json({
        success: false,
        message: 'A valid YouTube video URL is required',
      });
    }

    const updatedTitle       = title !== undefined ? title.trim() : lesson.title;
    const updatedDescription = description !== undefined ? description.trim() : lesson.description;
    const updatedUrl         = content_url !== undefined ? content_url.trim() : lesson.content_url;
    const updatedDuration    = duration_min !== undefined ? (parseInt(duration_min, 10) || lesson.duration_min) : lesson.duration_min;
    const updatedOrder       = order_index !== undefined ? (parseInt(order_index, 10) || lesson.order_index) : lesson.order_index;

    const uRes = await query(
      `UPDATE capsules
       SET title = $1, description = $2, content_url = $3, duration_min = $4, order_index = $5
       WHERE id = $6
       RETURNING *`,
      [updatedTitle, updatedDescription, updatedUrl, updatedDuration, updatedOrder, lessonId]
    );

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      lesson: uRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 9. DELETE /api/educator/lessons/:lessonId — Delete a lesson
// ───────────────────────────────────────────────────────────────────────────
export const deleteLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson ID format' });
    }

    const cRes = await query(
      `SELECT c.*, j.created_by
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE c.id = $1`,
      [lessonId]
    );

    if (cRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const lesson = cRes.rows[0];

    // Ownership check
    if (!isAdmin && lesson.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this lesson',
      });
    }

    await query('DELETE FROM capsules WHERE id = $1', [lessonId]);

    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// 10. PATCH /api/educator/journeys/:id/publish — Admin publish / unpublish
// ───────────────────────────────────────────────────────────────────────────
export const togglePublishJourney = async (req, res, next) => {
  try {
    // Only Administrators are permitted to invoke this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Only administrators may publish journeys.',
      });
    }

    const { id } = req.params;
    const { status = 'published' } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be draft, published, or archived.',
      });
    }

    // Verify journey exists and check readiness for publication
    const jRes = await query('SELECT * FROM journeys WHERE id = $1', [id]);
    if (jRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Journey not found' });
    }

    const journey = jRes.rows[0];

    if (status === 'published') {
      // Confirm all 6 stages exist before publishing
      const stageCountRes = await query(
        'SELECT COUNT(*) FROM stages WHERE journey_id = $1',
        [id]
      );
      const stageCount = parseInt(stageCountRes.rows[0].count, 10);
      if (stageCount < 6) {
        return res.status(400).json({
          success: false,
          message: `Cannot publish: Journey has only ${stageCount}/6 required stages.`,
        });
      }
    }

    const uRes = await query(
      `UPDATE journeys SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    res.json({
      success: true,
      message: `Journey status updated to "${status}"`,
      journey: uRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
