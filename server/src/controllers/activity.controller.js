/**
 * ELEVATE Phase 5A — Activity & Feedback Controller (Educator Workflows)
 *
 * Implements educator and admin workflows for:
 *  - Creating, updating, archiving, and deleting practical activities
 *  - Listing learner submissions for educator's journeys
 *  - Inspecting submission attempts and history
 *  - Reviewing submissions (approving or requesting revisions) with feedback
 */

import pool, { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ─── 1. POST /api/educator/stages/:stageId/activities ────────────────────────
export const createActivity = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(stageId)) {
      return res.status(400).json({ success: false, message: 'Invalid stage ID format' });
    }

    // Verify stage and journey ownership
    const sRes = await query(
      `SELECT s.*, j.created_by, j.title as journey_title
       FROM stages s
       JOIN journeys j ON s.journey_id = j.id
       WHERE s.id = $1`,
      [stageId]
    );

    if (sRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    const stage = sRes.rows[0];

    if (!isAdmin && stage.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add activities to this journey',
      });
    }

    const {
      title,
      instructions = '',
      submission_type = 'both',
      is_required = true,
      due_date = null,
      max_attempts = 3,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Activity title is required and must be at least 3 characters',
      });
    }

    const validSubmissionTypes = ['text', 'url', 'both'];
    if (!validSubmissionTypes.includes(submission_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid submission_type. Allowed: ${validSubmissionTypes.join(', ')}`,
      });
    }

    const parsedAttempts = parseInt(max_attempts, 10);
    if (isNaN(parsedAttempts) || parsedAttempts < 1 || parsedAttempts > 10) {
      return res.status(400).json({
        success: false,
        message: 'max_attempts must be an integer between 1 and 10',
      });
    }

    let parsedDueDate = null;
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid due_date format' });
      }
      parsedDueDate = d.toISOString();
    }

    // Determine next order_index
    const maxOrderRes = await query(
      `SELECT COALESCE(MAX(order_index), 0) as max_idx FROM activities WHERE stage_id = $1`,
      [stageId]
    );
    const nextOrder = parseInt(maxOrderRes.rows[0].max_idx, 10) + 1;

    const insRes = await query(
      `INSERT INTO activities (stage_id, title, instructions, submission_type, is_required, due_date, max_attempts, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        stageId,
        title.trim(),
        instructions ? instructions.trim() : '',
        submission_type,
        Boolean(is_required),
        parsedDueDate,
        parsedAttempts,
        nextOrder,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Practical activity created successfully',
      activity: insRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── 2. PUT /api/educator/activities/:activityId ─────────────────────────────
export const updateActivity = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(activityId)) {
      return res.status(400).json({ success: false, message: 'Invalid activity ID format' });
    }

    // Verify activity and ownership
    const aRes = await query(
      `SELECT a.*, j.created_by
       FROM activities a
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE a.id = $1`,
      [activityId]
    );

    if (aRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const activity = aRes.rows[0];

    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this activity',
      });
    }

    const {
      title,
      instructions,
      submission_type,
      is_required,
      due_date,
      max_attempts,
    } = req.body;

    const updatedTitle = title !== undefined ? title.trim() : activity.title;
    if (title !== undefined && updatedTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters',
      });
    }

    let updatedType = activity.submission_type;
    if (submission_type !== undefined) {
      const validTypes = ['text', 'url', 'both'];
      if (!validTypes.includes(submission_type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid submission_type. Allowed: ${validTypes.join(', ')}`,
        });
      }
      updatedType = submission_type;
    }

    let updatedDueDate = activity.due_date;
    if (due_date !== undefined) {
      if (due_date === null || due_date === '') {
        updatedDueDate = null;
      } else {
        const d = new Date(due_date);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid due_date format' });
        }
        updatedDueDate = d.toISOString();
      }
    }

    const updatedAttempts = max_attempts !== undefined ? parseInt(max_attempts, 10) : activity.max_attempts;
    const updatedRequired = is_required !== undefined ? Boolean(is_required) : activity.is_required;
    const updatedInstructions = instructions !== undefined ? instructions.trim() : activity.instructions;

    const uRes = await query(
      `UPDATE activities
       SET title = $1,
           instructions = $2,
           submission_type = $3,
           is_required = $4,
           due_date = $5,
           max_attempts = $6
       WHERE id = $7
       RETURNING *`,
      [
        updatedTitle,
        updatedInstructions,
        updatedType,
        updatedRequired,
        updatedDueDate,
        updatedAttempts,
        activityId,
      ]
    );

    res.json({
      success: true,
      message: 'Activity updated successfully',
      activity: uRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── 3. DELETE /api/educator/activities/:activityId ──────────────────────────
export const deleteActivity = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(activityId)) {
      return res.status(400).json({ success: false, message: 'Invalid activity ID format' });
    }

    const aRes = await query(
      `SELECT a.*, j.created_by
       FROM activities a
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE a.id = $1`,
      [activityId]
    );

    if (aRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const activity = aRes.rows[0];

    if (!isAdmin && activity.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this activity',
      });
    }

    // Check if any learner submissions exist
    const subCountRes = await query(
      `SELECT COUNT(*) as count FROM submissions WHERE activity_id = $1`,
      [activityId]
    );
    const subCount = parseInt(subCountRes.rows[0].count, 10);

    if (subCount > 0) {
      // Archive instead of silently destroying learner work
      await query(
        `UPDATE activities SET is_archived = true WHERE id = $1`,
        [activityId]
      );
      return res.json({
        success: true,
        archived: true,
        message: 'Activity has existing learner submissions and was archived to preserve progress history.',
      });
    }

    // No submissions: safe hard delete
    await query(`DELETE FROM activities WHERE id = $1`, [activityId]);

    res.json({
      success: true,
      archived: false,
      message: 'Activity deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── 4. GET /api/educator/submissions ────────────────────────────────────────
export const getEducatorSubmissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { status, journey_id, activity_id } = req.query;

    let sql = `
      SELECT sub.id, sub.attempt_num, sub.status, sub.content_url, sub.content_text,
             sub.submitted_at, sub.updated_at,
             u.id as user_id, u.name as user_name, u.email as user_email,
             a.id as activity_id, a.title as activity_title, a.submission_type, a.is_required,
             s.id as stage_id, s.stage_type, s.title as stage_title,
             j.id as journey_id, j.title as journey_title,
             (
               SELECT json_build_object(
                 'id', f.id,
                 'reviewer_id', f.reviewer_id,
                 'reviewer_name', ru.name,
                 'comments', f.comments,
                 'overall_score', f.overall_score,
                 'created_at', f.created_at
               )
               FROM feedback f
               LEFT JOIN users ru ON f.reviewer_id = ru.id
               WHERE f.submission_id = sub.id
               ORDER BY f.created_at DESC
               LIMIT 1
             ) as latest_feedback
      FROM submissions sub
      JOIN users u ON sub.user_id = u.id
      JOIN activities a ON sub.activity_id = a.id
      JOIN stages s ON a.stage_id = s.id
      JOIN journeys j ON s.journey_id = j.id
    `;

    const whereClauses = [];
    const params = [];

    if (!isAdmin) {
      params.push(userId);
      whereClauses.push(`j.created_by = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereClauses.push(`sub.status = $${params.length}`);
    }

    if (journey_id && UUID_REGEX.test(journey_id)) {
      params.push(journey_id);
      whereClauses.push(`j.id = $${params.length}`);
    }

    if (activity_id && UUID_REGEX.test(activity_id)) {
      params.push(activity_id);
      whereClauses.push(`a.id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ` ORDER BY sub.submitted_at DESC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      submissions: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 5. GET /api/educator/submissions/:submissionId ──────────────────────────
export const getSubmissionDetails = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID format' });
    }

    const subRes = await query(
      `SELECT sub.*,
              u.id as user_id, u.name as user_name, u.email as user_email,
              a.id as activity_id, a.title as activity_title, a.instructions as activity_instructions,
              a.submission_type, a.is_required, a.max_attempts,
              s.id as stage_id, s.stage_type, s.title as stage_title,
              j.id as journey_id, j.title as journey_title, j.created_by as journey_created_by
       FROM submissions sub
       JOIN users u ON sub.user_id = u.id
       JOIN activities a ON sub.activity_id = a.id
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE sub.id = $1`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = subRes.rows[0];

    // Authorization check
    if (!isAdmin && sub.journey_created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view submissions for this journey',
      });
    }

    // Fetch all feedback on this specific submission
    const feedbackRes = await query(
      `SELECT f.*, ru.name as reviewer_name, ru.role as reviewer_role
       FROM feedback f
       LEFT JOIN users ru ON f.reviewer_id = ru.id
       WHERE f.submission_id = $1
       ORDER BY f.created_at ASC`,
      [submissionId]
    );

    // Fetch full submission history for this learner & activity (earlier attempts)
    const historyRes = await query(
      `SELECT sub.id, sub.attempt_num, sub.status, sub.content_url, sub.content_text,
              sub.submitted_at, sub.updated_at,
              (
                SELECT json_agg(json_build_object(
                  'id', f.id,
                  'reviewer_name', ru.name,
                  'comments', f.comments,
                  'overall_score', f.overall_score,
                  'created_at', f.created_at
                ))
                FROM feedback f
                LEFT JOIN users ru ON f.reviewer_id = ru.id
                WHERE f.submission_id = sub.id
              ) as feedback
       FROM submissions sub
       WHERE sub.activity_id = $1 AND sub.user_id = $2
       ORDER BY sub.attempt_num ASC`,
      [sub.activity_id, sub.user_id]
    );

    res.json({
      success: true,
      submission: {
        ...sub,
        feedback: feedbackRes.rows,
        history: historyRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6. POST /api/educator/submissions/:submissionId/review ──────────────────
export const reviewSubmission = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { submissionId } = req.params;
    const reviewerId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!UUID_REGEX.test(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID format' });
    }

    const { status, comments = '', overall_score = null } = req.body;

    const allowedStatuses = ['approved', 'revision_requested', 'under_review'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review status. Allowed: ${allowedStatuses.join(', ')}`,
      });
    }

    if (comments && typeof comments !== 'string') {
      return res.status(400).json({ success: false, message: 'Comments must be text' });
    }

    let parsedScore = null;
    if (overall_score !== null && overall_score !== undefined && overall_score !== '') {
      parsedScore = parseFloat(overall_score);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({
          success: false,
          message: 'overall_score must be a number between 0 and 100',
        });
      }
    }

    await client.query('BEGIN');

    // Fetch submission with row lock
    const subRes = await client.query(
      `SELECT sub.*, j.created_by as journey_created_by
       FROM submissions sub
       JOIN activities a ON sub.activity_id = a.id
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       WHERE sub.id = $1
       FOR UPDATE`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = subRes.rows[0];

    // Authorization check
    if (!isAdmin && sub.journey_created_by !== reviewerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to review submissions for this journey',
      });
    }

    // Update submission status
    const updateRes = await client.query(
      `UPDATE submissions
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, submissionId]
    );

    // Insert feedback record if comments or score provided
    let feedbackRecord = null;
    if ((comments && comments.trim().length > 0) || parsedScore !== null) {
      const fRes = await client.query(
        `INSERT INTO feedback (submission_id, reviewer_id, feedback_type, comments, overall_score)
         VALUES ($1, $2, 'educator', $3, $4)
         RETURNING *`,
        [
          submissionId,
          reviewerId,
          comments ? comments.trim() : null,
          parsedScore,
        ]
      );
      feedbackRecord = fRes.rows[0];
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Submission status updated to ${status}`,
      submission: updateRes.rows[0],
      feedback: feedbackRecord,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
