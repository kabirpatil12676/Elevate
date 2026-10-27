/**
 * ELEVATE Phase 3B, 6B.1 & 6B.1.1 — Payment Routes
 *
 * POST  /api/payments/create-order           — authenticated learner (journey or event)
 * POST  /api/payments/create-event-order     — authenticated learner (explicit event order)
 * POST  /api/payments/verify                 — authenticated learner
 * GET   /api/payments/unresolved             — admin / educator: list captured unresolved cases
 * PATCH /api/payments/unresolved/:id/resolve — admin / educator: record manual resolution
 *
 * NOTE: POST /api/payments/webhook is registered directly in index.js
 * BEFORE express.json() middleware so Razorpay's raw body is preserved
 * for HMAC-SHA256 signature verification.
 */

import express from 'express';
import {
  createOrder,
  verifyPayment,
  getUnresolvedPayments,
  resolveUnresolvedPayment,
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Authenticated routes
router.post('/create-order',       authenticate, createOrder);
router.post('/create-event-order', authenticate, createOrder);
router.post('/verify',             authenticate, verifyPayment);

// Authorized inspection & resolution routes
router.get(
  '/unresolved',
  authenticate,
  authorize('admin', 'educator'),
  getUnresolvedPayments,
);

router.patch(
  '/unresolved/:id/resolve',
  authenticate,
  authorize('admin', 'educator'),
  resolveUnresolvedPayment,
);

export default router;
