import express from 'express';
import { getAllJourneys, getJourneyById, createJourney, enrollInJourney } from '../controllers/journey.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getAllJourneys);
router.get('/:id', getJourneyById);

// Educator and Admin only
router.post('/', authenticate, authorize('educator', 'admin'), createJourney);

// Authenticated learners
router.post('/:id/enroll', authenticate, enrollInJourney);

export default router;
