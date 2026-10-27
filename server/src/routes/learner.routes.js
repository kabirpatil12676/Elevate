/**
 * ELEVATE Phase 4B — Learner Routes
 *
 * All routes require authentication.
 * Journey-specific routes also require active enrollment in a published journey.
 * The enrollment check is performed server-side in the controller.
 */

import express from 'express';
import {
  getJourneyPlayerData,
  getJourneyProgress,
  markLessonComplete,
  getLearnerDashboard,
  submitActivity,
  getActivitySubmissions,
} from '../controllers/learner.controller.js';
import { getGrowthReport } from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// ── Dashboard: enrolled journeys + overall progress ──────────────────────────
router.get('/dashboard', getLearnerDashboard);

// ── Growth Report: consolidated learner report ───────────────────────────────
router.get('/growth-report', getGrowthReport);

// ── Journey player: stages + lessons + activities (requires enrollment) ──────
router.get('/:journeyId', getJourneyPlayerData);

// ── Progress: per-lesson and per-stage completion (requires enrollment) ───────
router.get('/:journeyId/progress', getJourneyProgress);

// ── Mark lesson complete (requires enrollment) ────────────────────────────────
router.post('/:journeyId/lessons/:capsuleId/complete', markLessonComplete);

// ── Practical Activity Submissions (requires enrollment) ──────────────────────
router.post('/:journeyId/activities/:activityId/submit', submitActivity);
router.get('/:journeyId/activities/:activityId/submissions', getActivitySubmissions);

export default router;
