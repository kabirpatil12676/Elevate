/**
 * ELEVATE Phase 6A & 6B.2 — Event Routes
 *
 * Exposes endpoints for:
 *   - Public event catalogue & details
 *   - Learner registration, cancellation & my-registrations
 *   - Educator event CRUD, publishing, cancellation, completion & attendee management
 *   - Attendance management (present/absent)
 *   - Workshop certificate eligibility, issuance, PDF download, revocation & email retry
 *   - Admin management across all events
 */

import express from 'express';
import {
  listEvents,
  getEventDetail,
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  completeEvent,
  deleteEvent,
  getMyEvents,
  getEventRegistrations,
  recordAttendance,
  getEventAttendance,
} from '../controllers/event.controller.js';
import {
  getWorkshopCertificateEligibility,
  issueWorkshopCertificate,
  downloadWorkshopCertificate,
  downloadWorkshopCertificateById,
  getLearnerWorkshopCertificates,
  revokeWorkshopCertificate,
  revokeWorkshopCertificateById,
  retryWorkshopCertificateEmail,
  retryWorkshopCertificateEmailById,
} from '../controllers/workshopCertificate.controller.js';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Specific Authenticated Routes (Must precede /:eventId) ────────────────────
router.get('/my-registrations', authenticate, getMyRegistrations);
router.get('/my-events', authenticate, authorize('educator', 'admin'), getMyEvents);
router.get('/certificates/my-certificates', authenticate, getLearnerWorkshopCertificates);
router.get('/certificates/:certificateId/download', authenticate, downloadWorkshopCertificateById);
router.post('/certificates/:certificateId/revoke', authenticate, authorize('educator', 'admin'), revokeWorkshopCertificateById);
router.post('/certificates/:certificateId/retry-email', authenticate, retryWorkshopCertificateEmailById);

// ── Public / Semi-Public Browsing ─────────────────────────────────────────────
router.get('/', listEvents);
router.get('/:eventId', optionalAuthenticate, getEventDetail);

// ── Learner Registration Actions ──────────────────────────────────────────────
router.post('/:eventId/register', authenticate, registerForEvent);
router.delete('/:eventId/register', authenticate, cancelRegistration);

// ── Educator / Admin Event Management ─────────────────────────────────────────
router.post('/', authenticate, authorize('educator', 'admin'), createEvent);
router.put('/:eventId', authenticate, authorize('educator', 'admin'), updateEvent);
router.patch('/:eventId/publish', authenticate, authorize('educator', 'admin'), publishEvent);
router.patch('/:eventId/cancel', authenticate, authorize('educator', 'admin'), cancelEvent);
router.patch('/:eventId/complete', authenticate, authorize('educator', 'admin'), completeEvent);
router.delete('/:eventId', authenticate, authorize('educator', 'admin'), deleteEvent);
router.get('/:eventId/registrations', authenticate, authorize('educator', 'admin'), getEventRegistrations);

// ── Attendance Management ─────────────────────────────────────────────────────
router.post('/:eventId/attendance', authenticate, authorize('educator', 'admin'), recordAttendance);
router.patch('/:eventId/attendance', authenticate, authorize('educator', 'admin'), recordAttendance);
router.get('/:eventId/attendance', authenticate, authorize('educator', 'admin'), getEventAttendance);

// ── Workshop Certificates ─────────────────────────────────────────────────────
router.get('/:eventId/certificate/eligibility', authenticate, getWorkshopCertificateEligibility);
router.get('/:eventId/certificates/eligibility', authenticate, getWorkshopCertificateEligibility);
router.post('/:eventId/certificate/issue', authenticate, issueWorkshopCertificate);
router.post('/:eventId/certificates/issue', authenticate, issueWorkshopCertificate);
router.get('/:eventId/certificate/download', authenticate, downloadWorkshopCertificate);
router.patch('/:eventId/certificate/:certificateId/revoke', authenticate, authorize('educator', 'admin'), revokeWorkshopCertificate);
router.post('/:eventId/certificate/:certificateId/send-email', authenticate, retryWorkshopCertificateEmail);

export default router;
