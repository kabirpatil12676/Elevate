/**
 * ELEVATE Phase 4B — Learner Controller
 *
 * Handles all learner-side learning experience endpoints:
 *  - GET /api/learn/:journeyId         — Journey player data (requires enrollment)
 *  - GET /api/learn/:journeyId/progress — Lesson + stage completion progress
 *  - POST /api/learn/:journeyId/lessons/:capsuleId/complete — Mark lesson complete
 *  - GET /api/learn/dashboard          — Enrolled journeys with progress for Dashboard
 *
 * Security model:
 *  - All routes require authentication (JWT via cookie or Bearer)
 *  - All routes require an active enrollment in the specified published journey
 *  - Learner ID is always taken from req.user.id (server side), never from request body
 *  - Cross-learner progress access is prevented
 *  - Draft / unpublished journeys return 404
 *  - Invalid lesson/stage/journey associations are rejected
 */

import pool, { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// ─── Helper: verify enrollment in a published journey ────────────────────────
async function requireEnrollment(userId, journeyId, res) {
  if (!UUID_REGEX.test(journeyId)) {
    res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    return null;
  }

  // Verify journey exists and is published
  const jRes = await query(
    `SELECT id, title, status, price, duration_hours, description, thumbnail_url, category, skill_domain, difficulty, badge
     FROM journeys WHERE id = $1 AND status = 'published'`,
    [journeyId]
  );

  if (jRes.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Journey not found' });
    return null;
  }

  // Check enrollment
  const eRes = await query(
    `SELECT id, status, enrolled_at, current_stage
     FROM enrollments WHERE user_id = $1 AND journey_id = $2`,
    [userId, journeyId]
  );

  if (eRes.rows.length === 0) {
    res.status(403).json({
      success: false,
      message: 'You are not enrolled in this journey. Please enroll first.',
    });
    return null;
  }

  return { journey: jRes.rows[0], enrollment: eRes.rows[0] };
}

// ─── 1. GET /api/learn/:journeyId — Full player data ────────────────────────
export const getJourneyPlayerData = async (req, res, next) => {
  try {
    const { journeyId } = req.params;
    const userId = req.user.id;

    const context = await requireEnrollment(userId, journeyId, res);
    if (!context) return;

    const { journey, enrollment } = context;

    // Fetch stages in order
    const stagesRes = await query(
      `SELECT id, stage_type, title, description, order_index, config
       FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
      [journeyId]
    );
    const stages = stagesRes.rows;
    const stageIds = stages.map(s => s.id);

    // Fetch all capsules for this journey's stages
    let capsules = [];
    let activities = [];
    if (stageIds.length > 0) {
      const cRes = await query(
        `SELECT id, stage_id, title, description, content_url, content_type, duration_min, order_index
         FROM capsules
         WHERE stage_id = ANY($1)
           AND content_type = 'video'
         ORDER BY order_index ASC`,
        [stageIds]
      );
      capsules = cRes.rows;

      const aRes = await query(
        `SELECT a.id, a.stage_id, a.title, a.instructions, a.submission_type, a.is_required,
                a.due_date, a.max_attempts, a.order_index,
                sub.id as latest_submission_id,
                sub.status as latest_status,
                sub.attempt_num as latest_attempt_num,
                sub.content_url as latest_content_url,
                sub.content_text as latest_content_text,
                sub.submitted_at as latest_submitted_at,
                (
                  SELECT json_build_object(
                    'comments', f.comments,
                    'overall_score', f.overall_score,
                    'created_at', f.created_at,
                    'reviewer_name', ru.name
                  )
                  FROM feedback f
                  LEFT JOIN users ru ON f.reviewer_id = ru.id
                  WHERE f.submission_id = sub.id
                  ORDER BY f.created_at DESC
                  LIMIT 1
                ) as latest_feedback
         FROM activities a
         LEFT JOIN LATERAL (
           SELECT * FROM submissions
           WHERE activity_id = a.id AND user_id = $2
           ORDER BY attempt_num DESC
           LIMIT 1
         ) sub ON true
         WHERE a.stage_id = ANY($1) AND a.is_archived = false
         ORDER BY a.order_index ASC, a.created_at ASC`,
        [stageIds, userId]
      );
      activities = aRes.rows;
    }

    // Attach capsules and activities to their stages
    const stagesWithContent = stages.map(stage => ({
      ...stage,
      lessons: capsules.filter(c => c.stage_id === stage.id),
      activities: activities.filter(a => a.stage_id === stage.id),
    }));

    res.json({
      success: true,
      journey,
      stages: stagesWithContent,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        enrolled_at: enrollment.enrolled_at,
        current_stage: enrollment.current_stage,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 2. GET /api/learn/:journeyId/progress — Lesson + stage progress ─────────
export const getJourneyProgress = async (req, res, next) => {
  try {
    const { journeyId } = req.params;
    const userId = req.user.id;

    const context = await requireEnrollment(userId, journeyId, res);
    if (!context) return;

    // Fetch stages
    const stagesRes = await query(
      `SELECT id, stage_type, order_index
       FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
      [journeyId]
    );
    const stages = stagesRes.rows;
    const stageIds = stages.map(s => s.id);

    // Fetch capsule counts per stage
    const capsuleCountsRes = stageIds.length > 0 ? await query(
      `SELECT stage_id, COUNT(*) as total
       FROM capsules WHERE stage_id = ANY($1) AND content_type = 'video'
       GROUP BY stage_id`,
      [stageIds]
    ) : { rows: [] };

    const capsuleCountMap = {};
    for (const row of capsuleCountsRes.rows) {
      capsuleCountMap[row.stage_id] = parseInt(row.total, 10);
    }

    // Fetch lesson progress for this user/journey
    const lessonProgressRes = await query(
      `SELECT capsule_id, completed, completed_at
       FROM lesson_progress WHERE user_id = $1 AND journey_id = $2`,
      [userId, journeyId]
    );

    const lessonProgressMap = {};
    let totalCompleted = 0;
    for (const row of lessonProgressRes.rows) {
      lessonProgressMap[row.capsule_id] = {
        completed: row.completed,
        completed_at: row.completed_at,
      };
      if (row.completed) totalCompleted++;
    }

    // Fetch all capsule IDs for this journey
    let allCapsuleIds = [];
    let totalLessons = 0;
    if (stageIds.length > 0) {
      const allCapsRes = await query(
        `SELECT id, stage_id FROM capsules WHERE stage_id = ANY($1) AND content_type = 'video'`,
        [stageIds]
      );
      allCapsuleIds = allCapsRes.rows.map(r => r.id);
      totalLessons = allCapsRes.rows.length;
    }

    // Calculate stage completion (a stage is complete when all its lessons are completed,
    // or if it has zero lessons, it's treated as complete only if it's stage_type='explore'
    // or 'transform' — but we keep it simple: zero-lesson stages are "not applicable" / 0/0)
    const stageProgress = stages.map(stage => {
      const total = capsuleCountMap[stage.id] || 0;
      if (total === 0) {
        return { stage_id: stage.id, stage_type: stage.stage_type, total_lessons: 0, completed_lessons: 0, completed: false };
      }
      // Get capsule IDs for this stage
      const stageCompletedCount = lessonProgressRes.rows.filter(
        r => r.completed && allCapsuleIds.includes(r.capsule_id)
      ).length;

      // More precise: count completed lessons specifically for this stage
      return {
        stage_id: stage.id,
        stage_type: stage.stage_type,
        total_lessons: total,
        completed_lessons: 0, // Will recalculate below
        completed: false,
      };
    });

    // Recalculate accurately per stage using capsule IDs
    const stageIdToCapsuleIds = {};
    if (stageIds.length > 0) {
      const allCapsRes2 = await query(
        `SELECT id, stage_id FROM capsules WHERE stage_id = ANY($1) AND content_type = 'video'`,
        [stageIds]
      );
      for (const row of allCapsRes2.rows) {
        if (!stageIdToCapsuleIds[row.stage_id]) stageIdToCapsuleIds[row.stage_id] = [];
        stageIdToCapsuleIds[row.stage_id].push(row.id);
      }
    }

    const stageProgressFinal = stages.map(stage => {
      const capsuleIdsForStage = stageIdToCapsuleIds[stage.id] || [];
      const total = capsuleIdsForStage.length;
      const completed = capsuleIdsForStage.filter(cid => lessonProgressMap[cid]?.completed).length;
      const isComplete = total > 0 && completed === total;
      return {
        stage_id: stage.id,
        stage_type: stage.stage_type,
        order_index: stage.order_index,
        total_lessons: total,
        completed_lessons: completed,
        completed: isComplete,
      };
    });

    // Recalculate totalCompleted from lessonProgressMap
    const actualTotalCompleted = Object.values(lessonProgressMap).filter(p => p.completed).length;

    // Journey completion: all stages with at least 1 lesson are complete
    const stagesWithLessons = stageProgressFinal.filter(sp => sp.total_lessons > 0);
    const journeyCompleted = stagesWithLessons.length > 0 && stagesWithLessons.every(sp => sp.completed);
    const journeyProgressPct = totalLessons > 0 ? Math.round((actualTotalCompleted / totalLessons) * 100) : 0;

    res.json({
      success: true,
      progress: {
        total_lessons: totalLessons,
        completed_lessons: actualTotalCompleted,
        journey_progress_pct: journeyProgressPct,
        journey_completed: journeyCompleted,
        stages: stageProgressFinal,
        lessons: lessonProgressMap,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 3. POST /api/learn/:journeyId/lessons/:capsuleId/complete ───────────────
export const markLessonComplete = async (req, res, next) => {
  try {
    const { journeyId, capsuleId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(capsuleId)) {
      return res.status(400).json({ success: false, message: 'Invalid capsule ID format' });
    }

    const context = await requireEnrollment(userId, journeyId, res);
    if (!context) return;

    // Verify capsule belongs to this journey (via stage relationship)
    const capsRes = await query(
      `SELECT c.id, c.stage_id, c.title, s.journey_id
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       WHERE c.id = $1 AND s.journey_id = $2 AND c.content_type = 'video'`,
      [capsuleId, journeyId]
    );

    if (capsRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found in this journey',
      });
    }

    // Upsert lesson_progress (idempotent)
    const now = new Date();
    const lpRes = await query(
      `INSERT INTO lesson_progress (user_id, capsule_id, journey_id, completed, completed_at, updated_at)
       VALUES ($1, $2, $3, true, $4, $4)
       ON CONFLICT (user_id, capsule_id) DO UPDATE
         SET completed = true,
             completed_at = COALESCE(lesson_progress.completed_at, $4),
             updated_at = $4
       RETURNING *`,
      [userId, capsuleId, journeyId, now]
    );

    res.json({
      success: true,
      message: 'Lesson marked as complete',
      progress: lpRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── 4. GET /api/learn/dashboard — Enrolled journeys + progress ───────────────
export const getLearnerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all active enrollments
    const enrollRes = await query(
      `SELECT e.id as enrollment_id, e.status, e.enrolled_at, e.current_stage,
              j.id, j.title, j.description, j.thumbnail_url, j.category,
              j.difficulty, j.duration_hours, j.badge, j.price, j.skill_domain
       FROM enrollments e
       JOIN journeys j ON e.journey_id = j.id
       WHERE e.user_id = $1 AND j.status = 'published'
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    const enrollments = enrollRes.rows;

    if (enrollments.length === 0) {
      return res.json({ success: true, enrollments: [] });
    }

    const journeyIds = enrollments.map(e => e.id);

    // For each journey, get total lessons and completed lessons
    const totalLessonsRes = await query(
      `SELECT s.journey_id, COUNT(c.id) as total
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       WHERE s.journey_id = ANY($1) AND c.content_type = 'video'
       GROUP BY s.journey_id`,
      [journeyIds]
    );

    const totalLessonsMap = {};
    for (const row of totalLessonsRes.rows) {
      totalLessonsMap[row.journey_id] = parseInt(row.total, 10);
    }

    const completedLessonsRes = await query(
      `SELECT journey_id, COUNT(*) as completed
       FROM lesson_progress
       WHERE user_id = $1 AND journey_id = ANY($2) AND completed = true
       GROUP BY journey_id`,
      [userId, journeyIds]
    );

    const completedLessonsMap = {};
    for (const row of completedLessonsRes.rows) {
      completedLessonsMap[row.journey_id] = parseInt(row.completed, 10);
    }

    // Get next incomplete lesson for each journey
    const nextLessonRes = await query(
      `SELECT DISTINCT ON (s.journey_id)
         s.journey_id, c.id as capsule_id, c.title as lesson_title, 
         s.id as stage_id, s.stage_type, s.order_index as stage_order, c.order_index as lesson_order
       FROM capsules c
       JOIN stages s ON c.stage_id = s.id
       WHERE s.journey_id = ANY($1)
         AND c.content_type = 'video'
         AND c.id NOT IN (
           SELECT capsule_id FROM lesson_progress
           WHERE user_id = $2 AND completed = true
         )
       ORDER BY s.journey_id, s.order_index ASC, c.order_index ASC`,
      [journeyIds, userId]
    );

    const nextLessonMap = {};
    for (const row of nextLessonRes.rows) {
      nextLessonMap[row.journey_id] = {
        capsule_id: row.capsule_id,
        lesson_title: row.lesson_title,
        stage_id: row.stage_id,
        stage_type: row.stage_type,
      };
    }

    // Query practical activities metrics for enrolled journeys
    const actMetricsRes = await query(
      `SELECT s.journey_id,
              COUNT(a.id) as total_activities,
              COUNT(CASE WHEN sub.status IN ('submitted', 'under_review') THEN 1 END) as pending_review,
              COUNT(CASE WHEN sub.status = 'revision_requested' THEN 1 END) as revision_requested,
              COUNT(CASE WHEN sub.status = 'approved' THEN 1 END) as approved
       FROM activities a
       JOIN stages s ON a.stage_id = s.id
       LEFT JOIN LATERAL (
         SELECT status FROM submissions
         WHERE activity_id = a.id AND user_id = $2
         ORDER BY attempt_num DESC LIMIT 1
       ) sub ON true
       WHERE s.journey_id = ANY($1) AND a.is_archived = false
       GROUP BY s.journey_id`,
      [journeyIds, userId]
    );

    const actMetricsMap = {};
    let totalAllActivities = 0;
    let totalPendingReview = 0;
    let totalRevisionRequested = 0;
    let totalApprovedActivities = 0;

    for (const row of actMetricsRes.rows) {
      const t = parseInt(row.total_activities, 10);
      const p = parseInt(row.pending_review, 10);
      const r = parseInt(row.revision_requested, 10);
      const a = parseInt(row.approved, 10);
      actMetricsMap[row.journey_id] = {
        total: t,
        pending: p,
        revision_requested: r,
        approved: a,
      };
      totalAllActivities += t;
      totalPendingReview += p;
      totalRevisionRequested += r;
      totalApprovedActivities += a;
    }

    // Build result
    const result = enrollments.map(e => {
      const total = totalLessonsMap[e.id] || 0;
      const completed = completedLessonsMap[e.id] || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const act = actMetricsMap[e.id] || { total: 0, pending: 0, revision_requested: 0, approved: 0 };

      return {
        enrollment_id: e.enrollment_id,
        enrollment_status: e.status,
        enrolled_at: e.enrolled_at,
        journey: {
          id: e.id,
          title: e.title,
          description: e.description,
          thumbnail_url: e.thumbnail_url,
          category: e.category,
          difficulty: e.difficulty,
          duration_hours: e.duration_hours,
          badge: e.badge,
          price: e.price,
          skill_domain: e.skill_domain,
        },
        progress: {
          total_lessons: total,
          completed_lessons: completed,
          progress_pct: pct,
          completed: total > 0 && completed === total,
          next_lesson: nextLessonMap[e.id] || null,
          activities: act,
        },
      };
    });

    res.json({
      success: true,
      enrollments: result,
      activities_summary: {
        total_activities: totalAllActivities,
        pending_review: totalPendingReview,
        revision_requested: totalRevisionRequested,
        approved_activities: totalApprovedActivities,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── 5. POST /api/learn/:journeyId/activities/:activityId/submit ─────────────
export const submitActivity = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { journeyId, activityId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(activityId)) {
      return res.status(400).json({ success: false, message: 'Invalid activity ID format' });
    }

    const context = await requireEnrollment(userId, journeyId, res);
    if (!context) return;

    // Verify activity belongs to this journey and is not archived
    const aRes = await client.query(
      `SELECT a.*, s.journey_id
       FROM activities a
       JOIN stages s ON a.stage_id = s.id
       WHERE a.id = $1 AND s.journey_id = $2 AND a.is_archived = false`,
      [activityId, journeyId]
    );

    if (aRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found in this journey',
      });
    }

    const activity = aRes.rows[0];
    const { content_text, content_url } = req.body;

    const trimmedText = typeof content_text === 'string' ? content_text.trim() : '';
    const trimmedUrl = typeof content_url === 'string' ? content_url.trim() : '';

    // Validate submission format according to activity.submission_type
    if (activity.submission_type === 'text') {
      if (!trimmedText || trimmedText.length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Written response is required (minimum 5 characters)',
        });
      }
    } else if (activity.submission_type === 'url') {
      if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
        return res.status(400).json({
          success: false,
          message: 'A valid project URL (http:// or https://) is required',
        });
      }
    } else if (activity.submission_type === 'both') {
      if (!trimmedText && !trimmedUrl) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a written response, a project URL, or both',
        });
      }
      if (trimmedUrl && !isValidUrl(trimmedUrl)) {
        return res.status(400).json({
          success: false,
          message: 'The project link provided is not a valid URL (must begin with http:// or https://)',
        });
      }
      if (trimmedText && trimmedText.length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Written response must be at least 5 characters',
        });
      }
    }

    // Limit text size to 20,000 characters
    if (trimmedText.length > 20000) {
      return res.status(400).json({
        success: false,
        message: 'Written response exceeds maximum allowed length of 20,000 characters',
      });
    }

    await client.query('BEGIN');

    // Fetch prior attempts for this learner & activity
    const priorAttemptsRes = await client.query(
      `SELECT id, attempt_num, status
       FROM submissions
       WHERE activity_id = $1 AND user_id = $2
       ORDER BY attempt_num DESC`,
      [activityId, userId]
    );

    const latestAttempt = priorAttemptsRes.rows[0];

    if (latestAttempt) {
      if (latestAttempt.status === 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'This activity has already been approved. No further submissions required.',
        });
      }

      if (latestAttempt.status === 'submitted' || latestAttempt.status === 'under_review') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Your previous submission is currently under review by the educator.',
        });
      }
    }

    const nextAttemptNum = latestAttempt ? latestAttempt.attempt_num + 1 : 1;

    if (nextAttemptNum > activity.max_attempts) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Maximum submission attempts (${activity.max_attempts}) reached for this activity.`,
      });
    }

    // Insert new submission attempt
    const subRes = await client.query(
      `INSERT INTO submissions (user_id, activity_id, content_url, content_text, attempt_num, status, submitted_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'submitted', NOW(), NOW())
       RETURNING *`,
      [
        userId,
        activityId,
        trimmedUrl || null,
        trimmedText || null,
        nextAttemptNum,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: nextAttemptNum > 1 ? 'Revision submitted successfully' : 'Activity submitted successfully',
      submission: subRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 6. GET /api/learn/:journeyId/activities/:activityId/submissions ─────────
export const getActivitySubmissions = async (req, res, next) => {
  try {
    const { journeyId, activityId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(activityId)) {
      return res.status(400).json({ success: false, message: 'Invalid activity ID format' });
    }

    const context = await requireEnrollment(userId, journeyId, res);
    if (!context) return;

    // Verify activity belongs to this journey
    const aRes = await query(
      `SELECT a.*
       FROM activities a
       JOIN stages s ON a.stage_id = s.id
       WHERE a.id = $1 AND s.journey_id = $2`,
      [activityId, journeyId]
    );

    if (aRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activity not found in this journey' });
    }

    // Query learner's submission attempts with feedback
    const subRes = await query(
      `SELECT sub.*,
              (
                SELECT json_agg(json_build_object(
                  'id', f.id,
                  'reviewer_name', ru.name,
                  'comments', f.comments,
                  'overall_score', f.overall_score,
                  'created_at', f.created_at
                ) ORDER BY f.created_at ASC)
                FROM feedback f
                LEFT JOIN users ru ON f.reviewer_id = ru.id
                WHERE f.submission_id = sub.id
              ) as feedback
       FROM submissions sub
       WHERE sub.activity_id = $1 AND sub.user_id = $2
       ORDER BY sub.attempt_num ASC`,
      [activityId, userId]
    );

    res.json({
      success: true,
      activity: aRes.rows[0],
      submissions: subRes.rows,
    });
  } catch (err) {
    next(err);
  }
};
