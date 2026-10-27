import express from 'express';
import {
  getMyJourneys,
  getManageJourney,
  createDraftJourney,
  updateJourneyMetadata,
  deleteDraftJourney,
  updateStage,
  addLessonToStage,
  updateLesson,
  deleteLesson,
  togglePublishJourney,
} from '../controllers/educator.controller.js';
import {
  createActivity,
  updateActivity,
  deleteActivity,
  getEducatorSubmissions,
  getSubmissionDetails,
  reviewSubmission,
} from '../controllers/activity.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Global middleware for all educator routes ──────────────────────────────
router.use(authenticate);
router.use(authorize('educator', 'admin'));

// ── Journey Authoring Routes ───────────────────────────────────────────────
router.get('/journeys',         getMyJourneys);
router.get('/journeys/:id',     getManageJourney);
router.post('/journeys',        createDraftJourney);
router.put('/journeys/:id',     updateJourneyMetadata);
router.delete('/journeys/:id',  deleteDraftJourney);

// ── Publishing Route (Admin Only) ──────────────────────────────────────────
router.patch('/journeys/:id/publish', authorize('admin'), togglePublishJourney);

// ── Stage & Lesson (Capsule) Routes ────────────────────────────────────────
router.put('/stages/:stageId',            updateStage);
router.post('/stages/:stageId/lessons',   addLessonToStage);
router.put('/lessons/:lessonId',          updateLesson);
router.delete('/lessons/:lessonId',       deleteLesson);

// ── Practical Activity Routes ──────────────────────────────────────────────
router.post('/stages/:stageId/activities', createActivity);
router.put('/activities/:activityId',       updateActivity);
router.delete('/activities/:activityId',    deleteActivity);

// ── Submission Review & Feedback Routes ─────────────────────────────────────
router.get('/submissions',                  getEducatorSubmissions);
router.get('/submissions/:submissionId',    getSubmissionDetails);
router.post('/submissions/:submissionId/review', reviewSubmission);

export default router;
