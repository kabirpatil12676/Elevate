/**
 * ELEVATE Phase 3B — Payment Routes
 *
 * POST /api/payments/create-order  — authenticated learner
 * POST /api/payments/verify        — authenticated learner
 *
 * NOTE: POST /api/payments/webhook is registered directly in index.js
 * BEFORE express.json() middleware so Razorpay's raw body is preserved
 * for HMAC-SHA256 signature verification.
 */

import express from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Authenticated routes
router.post('/create-order', authenticate, createOrder);
router.post('/verify',       authenticate, verifyPayment);

export default router;
