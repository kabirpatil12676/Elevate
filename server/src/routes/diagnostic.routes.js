import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getLearnerNeeds,
  saveLearnerNeeds,
  getRecommendations,
} from '../controllers/diagnostic.controller.js';

const router = express.Router();

// All diagnostic endpoints require user authentication
router.use(authenticate);

// GET /api/diagnostic and GET /api/diagnostic/needs
router.get('/', getLearnerNeeds);
router.get('/needs', getLearnerNeeds);

// POST /api/diagnostic and POST /api/diagnostic/submit
router.post('/', saveLearnerNeeds);
router.post('/submit', saveLearnerNeeds);

// GET /api/diagnostic/recommendations
router.get('/recommendations', getRecommendations);

export default router;
