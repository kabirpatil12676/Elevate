/**
 * ELEVATE Phase 5B — Portfolio & Growth Report Routes
 *
 * All routes require authentication. Learner ID is extracted
 * strictly from server-side JWT context (req.user.id).
 */

import express from 'express';
import {
  getGrowthReport,
  getLearnerPortfolio,
  getApprovedProjects,
  featureProject,
  unfeatureProject,
  updateFeaturedProject,
  getLearnerReflections,
  saveLearnerReflection,
} from '../controllers/portfolio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Require authentication for all portfolio endpoints
router.use(authenticate);

// ── Growth Report ────────────────────────────────────────────────────────────
router.get('/growth-report', getGrowthReport);

// ── Personal Portfolio Curation ──────────────────────────────────────────────
router.get('/approved-projects', getApprovedProjects);
router.get('/', getLearnerPortfolio);
router.post('/feature', featureProject);
router.delete('/feature/:submissionId', unfeatureProject);
router.put('/feature/:submissionId', updateFeaturedProject);

// ── Private Learner Reflections ──────────────────────────────────────────────
router.get('/reflections', getLearnerReflections);
router.put('/reflections', saveLearnerReflection);
router.post('/reflections', saveLearnerReflection);

export default router;
