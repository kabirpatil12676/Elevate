/**
 * ELEVATE Phase 5C — Certificate Routes
 *
 * Exposes endpoints for:
 * - Public certificate authenticity verification
 * - Authenticated learner eligibility checks
 * - Idempotent certificate issuance
 * - PDF downloading
 * - Email delivery retry
 * - Administrative revocation
 */

import express from 'express';
import {
  getCertificateEligibility,
  issueCertificate,
  getLearnerCertificates,
  downloadCertificate,
  verifyCertificatePublic,
  retryCertificateEmail,
  revokeCertificate,
} from '../controllers/certificate.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Public Routes (No authentication required) ──────────────────────────────
router.get('/verify/:verificationToken', verifyCertificatePublic);

// ── Authenticated Learner Routes ────────────────────────────────────────────
router.get('/eligibility/:journeyId', authenticate, getCertificateEligibility);
router.post('/issue/:journeyId', authenticate, issueCertificate);
router.get('/', authenticate, getLearnerCertificates);
router.get('/:certificateId/download', authenticate, downloadCertificate);
router.post('/:certificateId/send-email', authenticate, retryCertificateEmail);

// ── Administrative Routes ───────────────────────────────────────────────────
router.patch('/:certificateId/revoke', authenticate, authorize('admin'), revokeCertificate);

export default router;
