/**
 * ELEVATE Phase 5B — Growth Portfolio & Reflections Controller
 *
 * Implements:
 * 1. GET /api/portfolio/growth-report (also available as /api/learn/growth-report)
 * 2. GET /api/portfolio (curated personal portfolio)
 * 3. GET /api/portfolio/approved-projects (submissions eligible for portfolio)
 * 4. POST /api/portfolio/feature (feature an approved submission)
 * 5. DELETE /api/portfolio/feature/:submissionId (unfeature a project without deleting submission/feedback)
 * 6. PUT /api/portfolio/feature/:submissionId (update custom project description)
 * 7. GET /api/portfolio/reflections (learner's private reflections)
 * 8. PUT /api/portfolio/reflections (save / edit reflection for journey or stage)
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

// ─── 1. Consolidated Growth Report ───────────────────────────────────────────
export const getGrowthReport = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user details
    const userRes = await query(
      `SELECT id, name, email, role, avatar_url, bio, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Learner not found' });
    }

    const learner = userRes.rows[0];

    // Fetch enrolled published journeys
    const enrollmentsRes = await query(
      `SELECT e.id as enrollment_id, e.status as enrollment_status, e.enrolled_at, e.completed_at,
              j.id as journey_id, j.title, j.description, j.thumbnail_url, j.category, j.skill_domain, j.difficulty, j.badge, j.duration_hours
       FROM enrollments e
       JOIN journeys j ON e.journey_id = j.id
       WHERE e.user_id = $1 AND j.status = 'published'
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );

    const enrolledJourneys = enrollmentsRes.rows;

    // If learner has no enrolled journeys, return an honest zero-state starter report
    if (enrolledJourneys.length === 0) {
      // Check diagnostic needs if any
      const needsRes = await query(
        `SELECT id, academic_year, branch, academic_situation, career_interests, skills, challenges, learning_goals, weekly_hours, prior_experience, created_at
         FROM learner_needs WHERE user_id = $1`,
        [userId]
      );
      const diagnosticNeeds = needsRes.rows[0] || null;

      return res.json({
        success: true,
        learner,
        generated_at: new Date().toISOString(),
        is_starter_report: true,
        overview: {
          enrolled_journeys_count: 0,
          total_lessons: 0,
          completed_lessons: 0,
          lesson_completion_pct: 0,
          total_activities: 0,
          submitted_activities: 0,
          approved_activities: 0,
          pending_review_activities: 0,
          revision_requested_activities: 0,
          featured_projects_count: 0,
          certificates_issued_count: 0,
        },
        journeys: [],
        certificates: [],
        stages_timeline: {
          explore: { title: 'Explore', stage_type: 'explore', completed_evidence: [], has_activity: !!diagnosticNeeds, diagnostic: diagnosticNeeds },
          learn: { title: 'Learn', stage_type: 'learn', completed_evidence: [], has_activity: false },
          experience: { title: 'Experience', stage_type: 'experience', completed_evidence: [], has_activity: false },
          validate: { title: 'Validate', stage_type: 'validate', completed_evidence: [], has_activity: false },
          apply: { title: 'Apply', stage_type: 'apply', completed_evidence: [], has_activity: false },
          transform: { title: 'Transform', stage_type: 'transform', completed_evidence: [], has_activity: false },
        },
        reflections: [],
        featured_portfolio: [],
      });
    }

    const journeyIds = enrolledJourneys.map(j => j.journey_id);

    // Fetch all stages for enrolled journeys
    const stagesRes = await query(
      `SELECT id as stage_id, journey_id, stage_type, title, description, order_index, config
       FROM stages
       WHERE journey_id = ANY($1)
       ORDER BY order_index ASC`,
      [journeyIds]
    );
    const stages = stagesRes.rows;
    const stageIds = stages.map(s => s.stage_id);

    // Fetch all video capsules (lessons) with user completion status
    let capsules = [];
    if (stageIds.length > 0) {
      const capsRes = await query(
        `SELECT c.id as capsule_id, c.stage_id, s.journey_id, c.title, c.description, c.duration_min, c.order_index,
                COALESCE(lp.completed, false) as completed, lp.completed_at
         FROM capsules c
         JOIN stages s ON c.stage_id = s.id
         LEFT JOIN lesson_progress lp ON c.id = lp.capsule_id AND lp.user_id = $1
         WHERE c.stage_id = ANY($2) AND c.content_type = 'video'
         ORDER BY c.order_index ASC`,
        [userId, stageIds]
      );
      capsules = capsRes.rows;
    }

    // Fetch all practical activities with learner's latest submission and educator feedback
    let activities = [];
    if (stageIds.length > 0) {
      const actRes = await query(
        `SELECT a.id as activity_id, a.stage_id, s.journey_id, s.stage_type, s.title as stage_title,
                j.title as journey_title, a.title, a.instructions, a.submission_type, a.is_required, a.order_index,
                sub.id as submission_id, sub.content_url, sub.content_text, sub.attempt_num,
                sub.status as submission_status, sub.submitted_at, sub.updated_at as submission_updated_at,
                fb.id as feedback_id, fb.comments as feedback_comments, fb.overall_score as feedback_score,
                fb.rubric_scores as feedback_rubric, fb.created_at as feedback_created_at,
                fb.reviewer_name
         FROM activities a
         JOIN stages s ON a.stage_id = s.id
         JOIN journeys j ON s.journey_id = j.id
         LEFT JOIN LATERAL (
           SELECT * FROM submissions
           WHERE activity_id = a.id AND user_id = $1
           ORDER BY attempt_num DESC LIMIT 1
         ) sub ON true
         LEFT JOIN LATERAL (
           SELECT f.*, u.name as reviewer_name FROM feedback f
           LEFT JOIN users u ON f.reviewer_id = u.id
           WHERE f.submission_id = sub.id
           ORDER BY f.created_at DESC LIMIT 1
         ) fb ON true
         WHERE a.stage_id = ANY($2) AND a.is_archived = false
         ORDER BY a.order_index ASC, a.created_at ASC`,
        [userId, stageIds]
      );
      activities = actRes.rows;
    }

    // Fetch diagnostic needs
    const needsRes = await query(
      `SELECT id, academic_year, branch, academic_situation, career_interests, skills, challenges, learning_goals, weekly_hours, prior_experience, created_at
       FROM learner_needs WHERE user_id = $1`,
      [userId]
    );
    const diagnosticNeeds = needsRes.rows[0] || null;

    // Fetch growth profiles if any
    const gpRes = await query(
      `SELECT id, journey_id, diagnostic_id, responses, competency_level, prior_experience, hesitation_areas, personal_goals, created_at
       FROM growth_profiles WHERE user_id = $1 AND journey_id = ANY($2)`,
      [userId, journeyIds]
    );
    const growthProfilesMap = {};
    gpRes.rows.forEach(gp => {
      growthProfilesMap[gp.journey_id] = gp;
    });

    // Fetch portfolios for all enrolled journeys
    const portRes = await query(
      `SELECT p.id, p.journey_id, p.artifacts, p.self_reflection, p.stage_reflections, p.know_score, p.do_score, p.become_score, p.badge_issued, p.updated_at
       FROM portfolios p
       WHERE p.user_id = $1 AND p.journey_id = ANY($2)`,
      [userId, journeyIds]
    );
    const portfolioMap = {};
    portRes.rows.forEach(p => {
      portfolioMap[p.journey_id] = p;
    });

    // Fetch certificates for enrolled journeys
    const certRes = await query(
      `SELECT id, journey_id, certificate_number, verification_token, status, issued_at, email_status
       FROM certificates
       WHERE user_id = $1 AND journey_id = ANY($2)`,
      [userId, journeyIds]
    );
    const certMap = {};
    certRes.rows.forEach(c => {
      certMap[c.journey_id] = c;
    });

    // Assemble journey-specific breakdowns & calculate transparent metrics
    let totalLessonsCount = capsules.length;
    let completedLessonsCount = capsules.filter(c => c.completed).length;

    let totalActivitiesCount = activities.length;
    let submittedActivitiesCount = activities.filter(a => !!a.submission_id).length;
    let approvedActivitiesCount = activities.filter(a => a.submission_status === 'approved').length;
    let pendingReviewCount = activities.filter(a => a.submission_status === 'submitted' || a.submission_status === 'under_review').length;
    let revisionRequestedCount = activities.filter(a => a.submission_status === 'revision_requested').length;

    // Build timeline buckets across the 6 pedagogical stages
    const timeline = {
      explore: {
        stage_type: 'explore',
        title: 'Explore: Diagnostic Assessment',
        description: 'Baseline competency, hesitation areas, academic situation, and personalized learning goals.',
        has_activity: false,
        evidence: [],
      },
      learn: {
        stage_type: 'learn',
        title: 'Learn: Educator-Led Learning Capsules',
        description: 'Focused video lessons authored by educators delivering concept frameworks and case insights.',
        has_activity: false,
        evidence: [],
      },
      experience: {
        stage_type: 'experience',
        title: 'Experience: Practical Activity Challenges',
        description: 'Demonstrated hands-on performance submitted by the learner for educator evaluation.',
        has_activity: false,
        evidence: [],
      },
      validate: {
        stage_type: 'validate',
        title: 'Validate: Multi-Source Educator Feedback',
        description: 'Formal rubric assessments, evaluator comments, and actionable guidance provided by educators.',
        has_activity: false,
        evidence: [],
      },
      apply: {
        stage_type: 'apply',
        title: 'Apply: Authentic Tasks & Project Artifacts',
        description: 'Verified real-world project links and demonstrated practical artifacts resulting from applied practice.',
        has_activity: false,
        evidence: [],
      },
      transform: {
        stage_type: 'transform',
        title: 'Transform: Growth Portfolio & Self-Reflections',
        description: 'Curated evidence portfolio, self-reflections on challenges overcome, and next-step growth targets.',
        has_activity: false,
        evidence: [],
      },
    };

    // Populate Explore evidence
    if (diagnosticNeeds) {
      timeline.explore.has_activity = true;
      timeline.explore.evidence.push({
        type: 'diagnostic_needs',
        source: 'Learning Needs Diagnostic',
        academic_year: diagnosticNeeds.academic_year,
        branch: diagnosticNeeds.branch,
        academic_situation: diagnosticNeeds.academic_situation,
        learning_goals: diagnosticNeeds.learning_goals,
        career_interests: diagnosticNeeds.career_interests,
        challenges: diagnosticNeeds.challenges,
        created_at: diagnosticNeeds.created_at,
      });
    }

    Object.values(growthProfilesMap).forEach(gp => {
      timeline.explore.has_activity = true;
      timeline.explore.evidence.push({
        type: 'growth_profile',
        journey_id: gp.journey_id,
        competency_level: gp.competency_level,
        prior_experience: gp.prior_experience,
        hesitation_areas: gp.hesitation_areas,
        personal_goals: gp.personal_goals,
        created_at: gp.created_at,
      });
    });

    // Populate Learn evidence (completed lessons)
    capsules.forEach(c => {
      if (c.completed) {
        timeline.learn.has_activity = true;
        const j = enrolledJourneys.find(ej => ej.journey_id === c.journey_id);
        timeline.learn.evidence.push({
          capsule_id: c.capsule_id,
          journey_id: c.journey_id,
          journey_title: j?.title || 'Growth Journey',
          title: c.title,
          duration_min: c.duration_min,
          completed_at: c.completed_at,
        });
      }
    });

    // Populate Experience & Validate & Apply evidence
    activities.forEach(a => {
      if (a.submission_id) {
        // Experience stage evidence
        timeline.experience.has_activity = true;
        timeline.experience.evidence.push({
          activity_id: a.activity_id,
          journey_id: a.journey_id,
          journey_title: a.journey_title,
          stage_id: a.stage_id,
          stage_type: a.stage_type,
          title: a.title,
          submission_type: a.submission_type,
          attempt_num: a.attempt_num,
          submission_status: a.submission_status,
          submitted_at: a.submitted_at,
          content_url: a.content_url,
          content_text: a.content_text ? a.content_text.substring(0, 200) : null,
        });

        // Validate stage evidence (if feedback received or approved)
        if (a.feedback_id || a.submission_status === 'approved' || a.submission_status === 'revision_requested') {
          timeline.validate.has_activity = true;
          timeline.validate.evidence.push({
            activity_id: a.activity_id,
            activity_title: a.title,
            journey_id: a.journey_id,
            journey_title: a.journey_title,
            submission_id: a.submission_id,
            submission_status: a.submission_status,
            reviewer_name: a.reviewer_name || 'Educator',
            feedback_comments: a.feedback_comments,
            feedback_score: a.feedback_score,
            feedback_rubric: a.feedback_rubric,
            reviewed_at: a.feedback_created_at || a.submission_updated_at,
          });
        }

        // Apply stage evidence (authentic approved projects)
        if (a.submission_status === 'approved') {
          timeline.apply.has_activity = true;
          timeline.apply.evidence.push({
            activity_id: a.activity_id,
            activity_title: a.title,
            journey_id: a.journey_id,
            journey_title: a.journey_title,
            submission_id: a.submission_id,
            project_url: a.content_url,
            content_text: a.content_text,
            feedback_comments: a.feedback_comments,
            feedback_score: a.feedback_score,
            approved_at: a.submission_updated_at,
          });
        }
      }
    });

    // Populate Transform evidence (featured portfolio & reflections)
    const allFeatured = [];
    const allReflections = [];

    Object.values(portfolioMap).forEach(port => {
      const j = enrolledJourneys.find(ej => ej.journey_id === port.journey_id);
      const journeyTitle = j?.title || 'Growth Journey';

      if (Array.isArray(port.artifacts) && port.artifacts.length > 0) {
        timeline.transform.has_activity = true;
        port.artifacts.forEach(art => {
          allFeatured.push({
            ...art,
            journey_title: art.journey_title || journeyTitle,
          });
        });
      }

      if (port.self_reflection) {
        timeline.transform.has_activity = true;
        allReflections.push({
          journey_id: port.journey_id,
          journey_title: journeyTitle,
          stage_id: null,
          scope: 'journey',
          reflection_text: port.self_reflection,
          is_self_reported: true,
          updated_at: port.updated_at,
        });
      }

      if (port.stage_reflections && typeof port.stage_reflections === 'object') {
        Object.entries(port.stage_reflections).forEach(([stId, refData]) => {
          timeline.transform.has_activity = true;
          const stageObj = stages.find(s => s.stage_id === stId);
          allReflections.push({
            journey_id: port.journey_id,
            journey_title: journeyTitle,
            stage_id: stId,
            stage_type: stageObj?.stage_type || 'stage',
            stage_title: stageObj?.title || 'Stage',
            scope: 'stage',
            ...refData,
            is_self_reported: true,
          });
        });
      }
    });

    timeline.transform.evidence = allFeatured;

    // Assemble journey-specific detail structures
    const detailedJourneys = enrolledJourneys.map(j => {
      const jStages = stages.filter(s => s.journey_id === j.journey_id);
      const jCaps = capsules.filter(c => c.journey_id === j.journey_id);
      const jActs = activities.filter(a => a.journey_id === j.journey_id);
      const jPort = portfolioMap[j.journey_id] || null;

      const jTotalLessons = jCaps.length;
      const jCompletedLessons = jCaps.filter(c => c.completed).length;
      const jLessonPct = jTotalLessons > 0 ? Math.round((jCompletedLessons / jTotalLessons) * 100) : 0;

      // Journey completion rules matching existing backend:
      // stages with lessons are all completed
      const stagesWithLessons = jStages.filter(st => jCaps.some(c => c.stage_id === st.stage_id));
      const jStagesCompleted = stagesWithLessons.length > 0 && stagesWithLessons.every(st => {
        const caps = jCaps.filter(c => c.stage_id === st.stage_id);
        return caps.length > 0 && caps.every(c => c.completed);
      });

      const stagesBreakdown = jStages.map(st => {
        const stCaps = jCaps.filter(c => c.stage_id === st.stage_id);
        const stActs = jActs.filter(a => a.stage_id === st.stage_id);
        const stTotalLessons = stCaps.length;
        const stCompletedLessons = stCaps.filter(c => c.completed).length;
        const stCompleted = stTotalLessons > 0 && stCompletedLessons === stTotalLessons;

        const stReflection = jPort?.stage_reflections ? jPort.stage_reflections[st.stage_id] : null;

        return {
          stage_id: st.stage_id,
          stage_type: st.stage_type,
          title: st.title,
          description: st.description,
          order_index: st.order_index,
          total_lessons: stTotalLessons,
          completed_lessons: stCompletedLessons,
          completed: stCompleted,
          lessons: stCaps.map(c => ({
            capsule_id: c.capsule_id,
            title: c.title,
            duration_min: c.duration_min,
            completed: c.completed,
            completed_at: c.completed_at,
          })),
          activities: stActs.map(a => ({
            activity_id: a.activity_id,
            title: a.title,
            submission_type: a.submission_type,
            is_required: a.is_required,
            submission_id: a.submission_id,
            submission_status: a.submission_status || 'not_submitted',
            attempt_num: a.attempt_num,
            submitted_at: a.submitted_at,
            content_url: a.content_url,
            feedback_comments: a.feedback_comments,
            feedback_score: a.feedback_score,
            reviewer_name: a.reviewer_name,
          })),
          reflection: stReflection || null,
        };
      });

      return {
        journey_id: j.journey_id,
        title: j.title,
        description: j.description,
        thumbnail_url: j.thumbnail_url,
        category: j.category,
        skill_domain: j.skill_domain,
        difficulty: j.difficulty,
        badge: j.badge,
        enrolled_at: j.enrolled_at,
        enrollment_status: j.enrollment_status,
        total_lessons: jTotalLessons,
        completed_lessons: jCompletedLessons,
        lesson_progress_pct: jLessonPct,
        completed: jStagesCompleted,
        stages: stagesBreakdown,
        self_reflection: jPort?.self_reflection || null,
        featured_projects_count: jPort?.artifacts ? jPort.artifacts.length : 0,
        certificate: certMap[j.journey_id] || null,
      };
    });

    const lessonPctOverall = totalLessonsCount > 0
      ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
      : 0;

    res.json({
      success: true,
      learner,
      generated_at: new Date().toISOString(),
      is_starter_report: false,
      overview: {
        enrolled_journeys_count: enrolledJourneys.length,
        total_lessons: totalLessonsCount,
        completed_lessons: completedLessonsCount,
        lesson_completion_pct: lessonPctOverall,
        total_activities: totalActivitiesCount,
        submitted_activities: submittedActivitiesCount,
        approved_activities: approvedActivitiesCount,
        pending_review_activities: pendingReviewCount,
        revision_requested_activities: revisionRequestedCount,
        featured_projects_count: allFeatured.length,
        certificates_issued_count: certRes.rows.filter(c => c.status === 'issued').length,
      },
      journeys: detailedJourneys,
      certificates: certRes.rows,
      stages_timeline: timeline,
      reflections: allReflections,
      featured_portfolio: allFeatured,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 2. GET /api/portfolio — Learner Curated Portfolio ────────────────────────
export const getLearnerPortfolio = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { journeyId } = req.query;

    let portQuery = `
      SELECT p.id, p.user_id, p.journey_id, p.artifacts, p.self_reflection,
             p.stage_reflections, p.know_score, p.do_score, p.become_score,
             p.badge_issued, p.created_at, p.updated_at,
             j.title as journey_title, j.badge as journey_badge, j.skill_domain, j.category
      FROM portfolios p
      JOIN journeys j ON p.journey_id = j.id
      WHERE p.user_id = $1
    `;
    const params = [userId];

    if (journeyId) {
      if (!UUID_REGEX.test(journeyId)) {
        return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
      }
      params.push(journeyId);
      portQuery += ` AND p.journey_id = $2`;
    }

    portQuery += ` ORDER BY p.updated_at DESC`;

    const portRes = await query(portQuery, params);
    const portfolios = portRes.rows;

    // Collect all submission IDs referenced in portfolios to hydrate with DB truth
    const allSubmissionIds = [];
    portfolios.forEach(p => {
      if (Array.isArray(p.artifacts)) {
        p.artifacts.forEach(a => {
          if (a.submission_id && UUID_REGEX.test(a.submission_id)) {
            allSubmissionIds.push(a.submission_id);
          }
        });
      }
    });

    let hydratedSubmissions = {};
    if (allSubmissionIds.length > 0) {
      const subRes = await query(
        `SELECT sub.id as submission_id, sub.content_url, sub.content_text, sub.attempt_num,
                sub.status as current_status, sub.submitted_at, sub.updated_at,
                a.id as activity_id, a.title as activity_title, a.instructions as activity_instructions,
                s.id as stage_id, s.stage_type, s.title as stage_title,
                j.id as journey_id, j.title as journey_title,
                fb.id as feedback_id, fb.comments as feedback_comments, fb.overall_score as feedback_score,
                fb.rubric_scores as feedback_rubric, fb.created_at as feedback_created_at,
                fb.reviewer_name
         FROM submissions sub
         JOIN activities a ON sub.activity_id = a.id
         JOIN stages s ON a.stage_id = s.id
         JOIN journeys j ON s.journey_id = j.id
         LEFT JOIN LATERAL (
           SELECT f.*, u.name as reviewer_name FROM feedback f
           LEFT JOIN users u ON f.reviewer_id = u.id
           WHERE f.submission_id = sub.id
           ORDER BY f.created_at DESC LIMIT 1
         ) fb ON true
         WHERE sub.id = ANY($1) AND sub.user_id = $2`,
        [allSubmissionIds, userId]
      );

      subRes.rows.forEach(row => {
        hydratedSubmissions[row.submission_id] = row;
      });
    }

    // Hydrate artifacts with database truth
    const enrichedPortfolios = portfolios.map(p => {
      const rawArtifacts = Array.isArray(p.artifacts) ? p.artifacts : [];
      const enrichedArtifacts = rawArtifacts.map(art => {
        const live = hydratedSubmissions[art.submission_id];
        return {
          submission_id: art.submission_id,
          activity_id: live?.activity_id || art.activity_id,
          activity_title: live?.activity_title || art.activity_title || 'Project Activity',
          stage_id: live?.stage_id || art.stage_id,
          stage_type: live?.stage_type || art.stage_type || 'experience',
          stage_title: live?.stage_title || art.stage_title || 'Practical Stage',
          journey_id: live?.journey_id || p.journey_id,
          journey_title: live?.journey_title || p.journey_title,
          project_url: live?.content_url || art.project_url,
          content_text: live?.content_text || art.content_text,
          description: art.description || '',
          featured_at: art.featured_at || p.created_at,
          submission_status: live?.current_status || 'approved',
          feedback_comments: live?.feedback_comments || null,
          feedback_score: live?.feedback_score || null,
          reviewer_name: live?.reviewer_name || 'Educator',
          reviewed_at: live?.feedback_created_at || live?.updated_at || null,
        };
      });

      return {
        ...p,
        artifacts: enrichedArtifacts,
      };
    });

    const totalFeatured = enrichedPortfolios.reduce((sum, p) => sum + p.artifacts.length, 0);

    res.json({
      success: true,
      portfolios: enrichedPortfolios,
      total_featured: totalFeatured,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 3. GET /api/portfolio/approved-projects ──────────────────────────────────
// Returns all approved submissions across learner's enrolled published journeys
export const getApprovedProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const approvedRes = await query(
      `SELECT sub.id as submission_id, sub.content_url, sub.content_text, sub.attempt_num,
              sub.status as submission_status, sub.submitted_at, sub.updated_at,
              a.id as activity_id, a.title as activity_title, a.instructions as activity_instructions,
              a.submission_type,
              s.id as stage_id, s.stage_type, s.title as stage_title,
              j.id as journey_id, j.title as journey_title, j.badge as journey_badge,
              fb.id as feedback_id, fb.comments as feedback_comments, fb.overall_score as feedback_score,
              fb.rubric_scores as feedback_rubric, fb.created_at as feedback_created_at,
              fb.reviewer_name
       FROM submissions sub
       JOIN activities a ON sub.activity_id = a.id
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       JOIN enrollments e ON e.journey_id = j.id AND e.user_id = $1
       LEFT JOIN LATERAL (
         SELECT f.*, u.name as reviewer_name FROM feedback f
         LEFT JOIN users u ON f.reviewer_id = u.id
         WHERE f.submission_id = sub.id
         ORDER BY f.created_at DESC LIMIT 1
       ) fb ON true
       WHERE sub.user_id = $1
         AND sub.status = 'approved'
         AND j.status = 'published'
         AND a.is_archived = false
       ORDER BY sub.updated_at DESC`,
      [userId]
    );

    // Also get currently featured submission IDs from portfolios
    const portRes = await query(
      `SELECT artifacts FROM portfolios WHERE user_id = $1`,
      [userId]
    );

    const featuredIds = new Set();
    const customDescriptions = {};

    portRes.rows.forEach(p => {
      if (Array.isArray(p.artifacts)) {
        p.artifacts.forEach(a => {
          if (a.submission_id) {
            featuredIds.add(a.submission_id);
            if (a.description) {
              customDescriptions[a.submission_id] = a.description;
            }
          }
        });
      }
    });

    const approvedProjects = approvedRes.rows.map(row => ({
      ...row,
      is_featured: featuredIds.has(row.submission_id),
      custom_description: customDescriptions[row.submission_id] || '',
    }));

    res.json({
      success: true,
      count: approvedProjects.length,
      projects: approvedProjects,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 4. POST /api/portfolio/feature ───────────────────────────────────────────
// Feature an approved submission in the learner's portfolio
export const featureProject = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { submission_id, description = '' } = req.body;

    if (!submission_id || !UUID_REGEX.test(submission_id)) {
      return res.status(400).json({ success: false, message: 'A valid submission ID is required' });
    }

    if (description && typeof description === 'string' && description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Project description cannot exceed 1000 characters',
      });
    }

    // Security check: Verify submission exists, belongs to this user, and is APPROVED
    const subRes = await client.query(
      `SELECT sub.id as submission_id, sub.user_id, sub.content_url, sub.content_text, sub.status,
              a.id as activity_id, a.title as activity_title,
              s.id as stage_id, s.stage_type, s.title as stage_title,
              j.id as journey_id, j.title as journey_title, j.status as journey_status,
              e.id as enrollment_id
       FROM submissions sub
       JOIN activities a ON sub.activity_id = a.id
       JOIN stages s ON a.stage_id = s.id
       JOIN journeys j ON s.journey_id = j.id
       LEFT JOIN enrollments e ON e.journey_id = j.id AND e.user_id = sub.user_id
       WHERE sub.id = $1`,
      [submission_id]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = subRes.rows[0];

    // Check ownership
    if (sub.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot feature another learner’s submission',
      });
    }

    // Check approval status
    if (sub.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Only educator-approved practical work can be featured in your portfolio (current status: ${sub.status})`,
      });
    }

    if (sub.journey_status !== 'published' || !sub.enrollment_id) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active enrollment in a published journey to feature work',
      });
    }

    // Begin transaction
    await client.query('BEGIN');

    // Fetch or create portfolio for (user_id, journey_id)
    const portRes = await client.query(
      `SELECT id, artifacts FROM portfolios WHERE user_id = $1 AND journey_id = $2 FOR UPDATE`,
      [userId, sub.journey_id]
    );

    let artifacts = [];
    let portfolioId = null;

    if (portRes.rows.length > 0) {
      portfolioId = portRes.rows[0].id;
      artifacts = Array.isArray(portRes.rows[0].artifacts) ? portRes.rows[0].artifacts : [];
    }

    const now = new Date().toISOString();
    const existingIndex = artifacts.findIndex(a => a.submission_id === submission_id);

    const artifactItem = {
      submission_id,
      activity_id: sub.activity_id,
      activity_title: sub.activity_title,
      stage_id: sub.stage_id,
      stage_type: sub.stage_type,
      stage_title: sub.stage_title,
      journey_id: sub.journey_id,
      journey_title: sub.journey_title,
      project_url: sub.content_url || null,
      content_text: sub.content_text ? sub.content_text.substring(0, 500) : null,
      description: typeof description === 'string' ? description.trim() : '',
      featured_at: existingIndex >= 0 ? artifacts[existingIndex].featured_at : now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      artifacts[existingIndex] = artifactItem;
    } else {
      artifacts.push(artifactItem);
    }

    let savedPort;
    if (portfolioId) {
      const updateRes = await client.query(
        `UPDATE portfolios
         SET artifacts = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(artifacts), portfolioId]
      );
      savedPort = updateRes.rows[0];
    } else {
      const insertRes = await client.query(
        `INSERT INTO portfolios (user_id, journey_id, artifacts, updated_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [userId, sub.journey_id, JSON.stringify(artifacts)]
      );
      savedPort = insertRes.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Project featured in portfolio successfully',
      featured_project: artifactItem,
      portfolio: savedPort,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 5. DELETE /api/portfolio/feature/:submissionId ───────────────────────────
// Unfeature project from portfolio (Preserves submission and feedback in DB!)
export const unfeatureProject = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { submissionId } = req.params;

    if (!submissionId || !UUID_REGEX.test(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID format' });
    }

    await client.query('BEGIN');

    // Find all portfolios of user that contain this submission in artifacts
    const portRes = await client.query(
      `SELECT id, journey_id, artifacts
       FROM portfolios
       WHERE user_id = $1 AND artifacts @> $2::jsonb
       FOR UPDATE`,
      [userId, JSON.stringify([{ submission_id: submissionId }])]
    );

    if (portRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'This project is not currently featured in your portfolio',
      });
    }

    const portfolio = portRes.rows[0];
    const currentArtifacts = Array.isArray(portfolio.artifacts) ? portfolio.artifacts : [];
    const updatedArtifacts = currentArtifacts.filter(a => a.submission_id !== submissionId);

    const updateRes = await client.query(
      `UPDATE portfolios
       SET artifacts = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(updatedArtifacts), portfolio.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Project removed from featured portfolio. Assessment record preserved.',
      portfolio: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 6. PUT /api/portfolio/feature/:submissionId ─────────────────────────────
// Update custom description of featured project
export const updateFeaturedProject = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { submissionId } = req.params;
    const { description = '' } = req.body;

    if (!submissionId || !UUID_REGEX.test(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission ID format' });
    }

    if (description && typeof description === 'string' && description.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Project description cannot exceed 1000 characters',
      });
    }

    await client.query('BEGIN');

    const portRes = await client.query(
      `SELECT id, artifacts
       FROM portfolios
       WHERE user_id = $1 AND artifacts @> $2::jsonb
       FOR UPDATE`,
      [userId, JSON.stringify([{ submission_id: submissionId }])]
    );

    if (portRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'This project is not currently featured in your portfolio',
      });
    }

    const portfolio = portRes.rows[0];
    const currentArtifacts = Array.isArray(portfolio.artifacts) ? portfolio.artifacts : [];
    const index = currentArtifacts.findIndex(a => a.submission_id === submissionId);

    if (index === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Featured project not found' });
    }

    currentArtifacts[index].description = typeof description === 'string' ? description.trim() : '';
    currentArtifacts[index].updated_at = new Date().toISOString();

    const updateRes = await client.query(
      `UPDATE portfolios
       SET artifacts = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(currentArtifacts), portfolio.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Featured project details updated successfully',
      featured_project: currentArtifacts[index],
      portfolio: updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 7. GET /api/portfolio/reflections ───────────────────────────────────────
// Get all private reflections of learner across journeys and stages
export const getLearnerReflections = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { journeyId } = req.query;

    let queryText = `
      SELECT p.id, p.journey_id, p.self_reflection, p.stage_reflections, p.updated_at,
             j.title as journey_title
      FROM portfolios p
      JOIN journeys j ON p.journey_id = j.id
      WHERE p.user_id = $1
    `;
    const params = [userId];

    if (journeyId) {
      if (!UUID_REGEX.test(journeyId)) {
        return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
      }
      params.push(journeyId);
      queryText += ` AND p.journey_id = $2`;
    }

    const portRes = await query(queryText, params);
    const reflections = [];

    // Also fetch stage metadata if stage reflections exist
    const stageIds = [];
    portRes.rows.forEach(p => {
      if (p.stage_reflections && typeof p.stage_reflections === 'object') {
        Object.keys(p.stage_reflections).forEach(k => {
          if (UUID_REGEX.test(k)) stageIds.push(k);
        });
      }
    });

    let stageMap = {};
    if (stageIds.length > 0) {
      const sRes = await query(
        `SELECT id, stage_type, title, order_index FROM stages WHERE id = ANY($1)`,
        [stageIds]
      );
      sRes.rows.forEach(st => {
        stageMap[st.id] = st;
      });
    }

    portRes.rows.forEach(p => {
      if (p.self_reflection) {
        reflections.push({
          portfolio_id: p.id,
          journey_id: p.journey_id,
          journey_title: p.journey_title,
          stage_id: null,
          scope: 'journey',
          reflection_text: p.self_reflection,
          is_self_reported: true,
          updated_at: p.updated_at,
        });
      }

      if (p.stage_reflections && typeof p.stage_reflections === 'object') {
        Object.entries(p.stage_reflections).forEach(([stId, stRef]) => {
          const stMeta = stageMap[stId];
          reflections.push({
            portfolio_id: p.id,
            journey_id: p.journey_id,
            journey_title: p.journey_title,
            stage_id: stId,
            stage_type: stMeta?.stage_type || 'stage',
            stage_title: stMeta?.title || 'Stage',
            scope: 'stage',
            ...stRef,
            is_self_reported: true,
            updated_at: stRef.updated_at || p.updated_at,
          });
        });
      }
    });

    res.json({
      success: true,
      reflections,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 8. PUT /api/portfolio/reflections ───────────────────────────────────────
// Save or edit a private self-reflection for journey or stage
export const saveLearnerReflection = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const {
      journey_id,
      stage_id,
      reflection_text,
      prompt,
      learned,
      challenge,
      evidence,
      improvement,
    } = req.body;

    if (!journey_id || !UUID_REGEX.test(journey_id)) {
      return res.status(400).json({ success: false, message: 'A valid journey ID is required' });
    }

    if (stage_id && !UUID_REGEX.test(stage_id)) {
      return res.status(400).json({ success: false, message: 'Invalid stage ID format' });
    }

    // Text length validations
    if (reflection_text && typeof reflection_text === 'string' && reflection_text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Reflection text cannot exceed 2000 characters',
      });
    }

    const promptFields = [learned, challenge, evidence, improvement];
    for (const f of promptFields) {
      if (f && typeof f === 'string' && f.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Structured reflection fields cannot exceed 1000 characters each',
        });
      }
    }

    // Check user enrollment in published journey
    const enrollRes = await client.query(
      `SELECT e.id FROM enrollments e
       JOIN journeys j ON e.journey_id = j.id
       WHERE e.user_id = $1 AND e.journey_id = $2 AND j.status = 'published'`,
      [userId, journey_id]
    );

    if (enrollRes.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this published journey',
      });
    }

    // If stage_id provided, verify it belongs to this journey
    if (stage_id) {
      const sRes = await client.query(
        `SELECT id, stage_type, title FROM stages WHERE id = $1 AND journey_id = $2`,
        [stage_id, journey_id]
      );
      if (sRes.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Specified stage does not belong to the selected journey',
        });
      }
    }

    await client.query('BEGIN');

    // Fetch existing portfolio or prepare new
    const portRes = await client.query(
      `SELECT id, self_reflection, stage_reflections
       FROM portfolios
       WHERE user_id = $1 AND journey_id = $2
       FOR UPDATE`,
      [userId, journey_id]
    );

    const now = new Date().toISOString();
    let updatedSelfReflection = null;
    let updatedStageReflections = {};

    if (portRes.rows.length > 0) {
      const port = portRes.rows[0];
      updatedSelfReflection = port.self_reflection;
      updatedStageReflections = (port.stage_reflections && typeof port.stage_reflections === 'object')
        ? { ...port.stage_reflections }
        : {};

      if (stage_id) {
        updatedStageReflections[stage_id] = {
          reflection_text: reflection_text ? reflection_text.trim() : (updatedStageReflections[stage_id]?.reflection_text || ''),
          prompt: prompt || updatedStageReflections[stage_id]?.prompt || null,
          learned: learned !== undefined ? (learned ? learned.trim() : '') : (updatedStageReflections[stage_id]?.learned || ''),
          challenge: challenge !== undefined ? (challenge ? challenge.trim() : '') : (updatedStageReflections[stage_id]?.challenge || ''),
          evidence: evidence !== undefined ? (evidence ? evidence.trim() : '') : (updatedStageReflections[stage_id]?.evidence || ''),
          improvement: improvement !== undefined ? (improvement ? improvement.trim() : '') : (updatedStageReflections[stage_id]?.improvement || ''),
          updated_at: now,
        };
      } else {
        updatedSelfReflection = reflection_text ? reflection_text.trim() : '';
      }

      const updateRes = await client.query(
        `UPDATE portfolios
         SET self_reflection = $1, stage_reflections = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [updatedSelfReflection, JSON.stringify(updatedStageReflections), port.id]
      );

      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Reflection saved successfully',
        portfolio: updateRes.rows[0],
      });
    } else {
      // Insert new portfolio
      if (stage_id) {
        updatedStageReflections[stage_id] = {
          reflection_text: reflection_text ? reflection_text.trim() : '',
          prompt: prompt || null,
          learned: learned ? learned.trim() : '',
          challenge: challenge ? challenge.trim() : '',
          evidence: evidence ? evidence.trim() : '',
          improvement: improvement ? improvement.trim() : '',
          updated_at: now,
        };
      } else {
        updatedSelfReflection = reflection_text ? reflection_text.trim() : '';
      }

      const insertRes = await client.query(
        `INSERT INTO portfolios (user_id, journey_id, self_reflection, stage_reflections, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [userId, journey_id, updatedSelfReflection, JSON.stringify(updatedStageReflections)]
      );

      await client.query('COMMIT');
      return res.status(201).json({
        success: true,
        message: 'Reflection created and saved successfully',
        portfolio: insertRes.rows[0],
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
