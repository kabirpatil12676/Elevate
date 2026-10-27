/**
 * ELEVATE Phase 6B.2 — Workshop Certificate Controller
 *
 * Implements:
 *   - Checking certificate eligibility for workshop participants
 *   - Idempotent certificate issuance with cryptographic verification tokens
 *   - PDF certificate generation & download
 *   - Listing learner's workshop certificates
 *   - Certificate revocation (Admin / Educator)
 *   - Certificate email retry (optional Resend delivery)
 *
 * Strict Security Rules:
 *   - Learner must have a confirmed registration (status = 'registered').
 *   - Workshop must be ended and lifecycle status must be 'completed'.
 *   - Attendance must be authoritatively marked 'present'.
 *   - Paid workshops must have confirmed captured payment (payment_status = 'paid').
 *   - Unresolved payment states or cancelled/waitlisted registrations are strictly ineligible.
 *   - Free workshops require no payment but require verified attendance & event completion.
 *   - Cryptographically unguessable verification tokens (256-bit entropy).
 *   - Zero private data leakage on public verification.
 */

import crypto from 'crypto';
import pool, { query } from '../config/db.js';
import { generateWorkshopCertificatePdf } from '../services/pdf.service.js';
import { sendWorkshopCertificateEmail } from '../services/email.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id) {
  return id && UUID_REGEX.test(id);
}

function getBaseUrl() {
  return process.env.APP_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
}

function isUnresolvedPaymentOrder(order) {
  if (!order) return false;
  if (order.status === 'captured_unresolved') {
    const rs = order.resolution_status || '';
    return !String(rs).startsWith('resolved');
  }
  return false;
}

function publicCertificatePayload(row, verificationToken) {
  return {
    success: true,
    valid: true,
    status: 'issued',
    type: 'workshop',
    certificate_type: 'workshop',
    certificate_number: row.certificate_number,
    learner_name: row.metadata?.learner_name || row.learner_name || 'Verified Attendee',
    recipient_name: row.metadata?.learner_name || row.learner_name || 'Verified Attendee',
    event_title: row.metadata?.event_title || row.event_title,
    workshop_title: row.metadata?.event_title || row.event_title,
    journey_title: row.metadata?.event_title || row.event_title,
    title: row.metadata?.event_title || row.event_title,
    category: row.metadata?.category || row.event_category || 'Interactive Workshop',
    facilitator_name: row.metadata?.facilitator_name || row.facilitator_name,
    completion_date: row.metadata?.completion_date || row.completion_date,
    issued_at: row.issued_at,
    verification_url: `${getBaseUrl()}/verify-certificate/${verificationToken}`,
    verified_registry: 'ELEVATE PostgreSQL Credential Registry',
    disclaimer: 'Authoritative participation record verified against PostgreSQL event attendance and completion.',
  };
}

/**
 * Helper to generate an authoritative unique certificate number
 * Format: ELV-WS-YYYYMM-XXXXXX
 */
function generateCertificateNumber() {
  const d = new Date();
  const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ELV-WS-${yearMonth}-${randHex}`;
}

/**
 * Authoritative check for Workshop Certificate Eligibility.
 */
export async function checkWorkshopCertificateEligibility(userId, eventId) {
  // 1. Fetch Event Details
  const evRes = await query(
    `SELECT id, title, category, facilitator_name, starts_at, ends_at, status, price, currency
     FROM events WHERE id = $1`,
    [eventId]
  );

  if (evRes.rows.length === 0) {
    return {
      is_eligible: false,
      already_issued: false,
      reasons: ['Workshop not found'],
    };
  }

  const event = evRes.rows[0];

  // 2. Check if certificate is already issued
  const existingCert = await query(
    `SELECT id, certificate_number, verification_token, status, issued_at, email_status, metadata
     FROM workshop_certificates
     WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );

    if (existingCert.rows.length > 0) {
    const existing = existingCert.rows[0];
    return {
      is_eligible: existing.status !== 'revoked',
      eligible: existing.status !== 'revoked',
      already_issued: true,
      certificate: existing,
      reasons: existing.status === 'revoked' ? ['Certificate was revoked'] : [],
      reason: existing.status === 'revoked' ? 'Certificate was revoked' : '',
    };
  }

  const reasons = [];

  // 3. Verify event lifecycle status is 'completed'
  if (event.status !== 'completed') {
    reasons.push(`Workshop lifecycle status is '${event.status}'. It must be marked as 'completed'.`);
  }

  // 4. Verify workshop scheduled end time has passed
  if (new Date(event.ends_at) > new Date()) {
    reasons.push('Workshop has not yet concluded.');
  }

  // 5. Check registration status
  const regRes = await query(
    `SELECT id, status, payment_status, amount_paid_paise
     FROM event_registrations
     WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );

  if (regRes.rows.length === 0) {
    reasons.push('Learner does not have a registration for this workshop.');
    return {
      is_eligible: false,
      eligible: false,
      already_issued: false,
      reasons,
      reason: reasons[0],
    };
  }

  const registration = regRes.rows[0];

  if (registration.status !== 'registered') {
    reasons.push(`Registration is ${registration.status} (must be active and confirmed).`);
  }

  // 6. If paid workshop, verify payment is captured
  const isPaid = Number(event.price) > 0;
  if (isPaid) {
    if (registration.payment_status !== 'paid') {
      reasons.push('Payment for this workshop has not been verified and captured.');
    }

    const orderCheck = await query(
      `SELECT status, resolution_status
       FROM payment_orders
       WHERE event_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [eventId, userId]
    );

    if (orderCheck.rows.length > 0 && isUnresolvedPaymentOrder(orderCheck.rows[0])) {
      reasons.push('Registration has an unresolved payment status awaiting administrative review.');
    }
  }

  // 7. Check Attendance
  const attRes = await query(
    `SELECT status FROM event_attendance WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );

  if (attRes.rows.length === 0 || attRes.rows[0].status !== 'present') {
    reasons.push('Attendance has not been marked as present');
  }

  return {
    is_eligible: reasons.length === 0,
    eligible: reasons.length === 0,
    already_issued: false,
    reasons,
    reason: reasons[0] || '',
    event: {
      id: event.id,
      title: event.title,
      category: event.category,
      facilitator_name: event.facilitator_name,
      ends_at: event.ends_at,
    },
  };
}

// ─── 1. GET /api/events/:eventId/certificate/eligibility ─────────────────────
export const getWorkshopCertificateEligibility = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const eligibility = await checkWorkshopCertificateEligibility(userId, eventId);

    if (eligibility.already_issued && eligibility.certificate) {
      const baseUrl = getBaseUrl();
      return res.json({
        success: true,
        already_issued: true,
        is_eligible: eligibility.is_eligible !== false,
        eligible: eligibility.eligible !== false,
        certificate: eligibility.certificate,
        verification_url: `${baseUrl}/verify-certificate/${eligibility.certificate.verification_token}`,
        download_url: `/api/events/${eventId}/certificate/download`,
      });
    }

    res.json({
      success: true,
      already_issued: false,
      is_eligible: eligibility.is_eligible,
      eligible: eligibility.eligible === true || eligibility.is_eligible === true,
      reasons: eligibility.reasons,
      reason: eligibility.reason || (eligibility.reasons && eligibility.reasons[0]) || '',
      event: eligibility.event,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 2. POST /api/events/:eventId/certificate/issue ───────────────────────────
export const issueWorkshopCertificate = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    if (!validateUUID(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    // Check eligibility
    const eligibility = await checkWorkshopCertificateEligibility(userId, eventId);

    if (eligibility.already_issued && eligibility.certificate) {
      const baseUrl = getBaseUrl();
      return res.status(200).json({
        success: true,
        message: 'Certificate has already been issued for this workshop',
        already_issued: true,
        certificate: eligibility.certificate,
        verification_url: `${baseUrl}/verify-certificate/${eligibility.certificate.verification_token}`,
        download_url: `/api/events/${eventId}/certificate/download`,
      });
    }

    if (!eligibility.is_eligible) {
      return res.status(400).json({
        success: false,
        message: 'Learner is not eligible for a workshop certificate. Requirements must be satisfied.',
        reasons: eligibility.reasons,
      });
    }

    // Fetch user details for metadata
    const userRes = await client.query(`SELECT id, name, email FROM users WHERE id = $1`, [userId]);
    const user = userRes.rows[0];

    await client.query('BEGIN');
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))`,
      [eventId, userId]
    );

    await client.query(
      `SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2 FOR UPDATE`,
      [eventId, userId]
    );

    const existingCheck = await client.query(
      `SELECT id, certificate_number, verification_token, status, issued_at, email_status, metadata
       FROM workshop_certificates WHERE event_id = $1 AND user_id = $2 FOR UPDATE`,
      [eventId, userId]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('COMMIT');
      const existing = existingCheck.rows[0];
      const baseUrl = getBaseUrl();
      return res.status(200).json({
        success: true,
        message: 'Certificate has already been issued for this workshop',
        already_issued: true,
        certificate: existing,
        verification_url: `${baseUrl}/verify-certificate/${existing.verification_token}`,
        download_url: `/api/events/${eventId}/certificate/download`,
      });
    }

    const certificateNumber = generateCertificateNumber();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const metadata = {
      learner_name: user.name,
      event_title: eligibility.event.title,
      category: eligibility.event.category,
      facilitator_name: eligibility.event.facilitator_name,
      completion_date: eligibility.event.ends_at,
    };

    let certificate;
    let insertNumber = certificateNumber;
    let insertToken = verificationToken;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const insertRes = await client.query(
          `INSERT INTO workshop_certificates
             (user_id, event_id, certificate_number, verification_token, status, metadata, email_status)
           VALUES ($1, $2, $3, $4, 'issued', $5, 'pending')
           RETURNING id, certificate_number, verification_token, status, issued_at, email_status, metadata`,
          [userId, eventId, insertNumber, insertToken, JSON.stringify(metadata)]
        );
        certificate = insertRes.rows[0];
        break;
      } catch (insertErr) {
        if (insertErr.code !== '23505') throw insertErr;

        const raced = await client.query(
          `SELECT id, certificate_number, verification_token, status, issued_at, email_status, metadata
           FROM workshop_certificates WHERE event_id = $1 AND user_id = $2`,
          [eventId, userId]
        );
        if (raced.rows.length > 0) {
          await client.query('COMMIT');
          const existing = raced.rows[0];
          const baseUrl = getBaseUrl();
          return res.status(200).json({
            success: true,
            message: 'Certificate has already been issued for this workshop',
            already_issued: true,
            certificate: existing,
            verification_url: `${baseUrl}/verify-certificate/${existing.verification_token}`,
            download_url: `/api/events/${eventId}/certificate/download`,
          });
        }

        insertNumber = generateCertificateNumber();
        insertToken = crypto.randomBytes(32).toString('hex');
        if (attempt === 4) throw insertErr;
      }
    }

    if (!certificate) {
      throw new Error('Failed to persist workshop certificate');
    }

    await client.query('COMMIT');

    const baseUrl = getBaseUrl();
    const persistedNumber = certificate.certificate_number || insertNumber;
    const persistedToken = certificate.verification_token || insertToken;
    const verificationUrl = `${baseUrl}/verify-certificate/${persistedToken}`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    let emailStatus = 'pending';
    let emailError = null;
    try {
      const pdfBuffer = await generateWorkshopCertificatePdf({
        learnerName: user.name,
        eventTitle: eligibility.event.title,
        category: eligibility.event.category,
        facilitatorName: eligibility.event.facilitator_name,
        certificateNumber: persistedNumber,
        completionDate: eligibility.event.ends_at,
        issuedAt: certificate.issued_at,
        verificationUrl,
      });

      const emailResult = await sendWorkshopCertificateEmail({
        to: user.email,
        learnerName: user.name,
        eventTitle: eligibility.event.title,
        certificateNumber: persistedNumber,
        verificationUrl,
        dashboardUrl,
        pdfBuffer,
      });

      if (emailResult.notConfigured) {
        emailStatus = 'not_configured';
      } else if (!emailResult.success) {
        emailStatus = 'failed';
        emailError = emailResult.error || 'Delivery failed';
      } else {
        emailStatus = 'sent';
      }
    } catch (eErr) {
      console.error('[issueWorkshopCertificate] Delivery error:', eErr.message);
      emailStatus = 'failed';
      emailError = eErr.message;
    }

    const updated = await query(
      `UPDATE workshop_certificates
       SET email_status = $1::varchar, email_sent_at = CASE WHEN $1::text = 'sent' THEN NOW() ELSE NULL END,
           email_error = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, certificate_number, verification_token, status, issued_at, email_status, metadata`,
      [emailStatus, emailError, certificate.id]
    );

    const issued = updated.rows[0] || { ...certificate, email_status: emailStatus };

    res.status(201).json({
      success: true,
      message: 'Workshop certificate issued successfully',
      certificate: issued,
      verification_url: verificationUrl,
      download_url: `/api/events/${eventId}/certificate/download`,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    next(err);
  } finally {
    client.release();
  }
};

// ─── 3. GET /api/events/:eventId/certificate/download ─────────────────────────
async function loadWorkshopCertificateForDownload(certificateId, eventId, userId, userRole) {
  if (certificateId) {
    return query(
      `SELECT wc.*, e.title AS event_title, e.category, e.facilitator_name, e.ends_at AS completion_date,
              u.name AS learner_name
       FROM workshop_certificates wc
       JOIN events e ON wc.event_id = e.id
       JOIN users u ON wc.user_id = u.id
       WHERE wc.id = $1`,
      [certificateId]
    );
  }

  return query(
    `SELECT wc.*, e.title AS event_title, e.category, e.facilitator_name, e.ends_at AS completion_date,
            u.name AS learner_name
     FROM workshop_certificates wc
     JOIN events e ON wc.event_id = e.id
     JOIN users u ON wc.user_id = u.id
     WHERE wc.event_id = $1 AND wc.user_id = $2`,
    [eventId, userId]
  );
}

export const downloadWorkshopCertificate = async (req, res, next) => {
  try {
    const { eventId, certificateId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if ((eventId && !validateUUID(eventId)) || (certificateId && !validateUUID(certificateId))) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const certRes = await loadWorkshopCertificateForDownload(certificateId, eventId, userId, userRole);

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const cert = certRes.rows[0];

    // Enforce learner ownership
    if (cert.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to download this certificate' });
    }

    // Check revocation
    if (cert.status === 'revoked') {
      return res.status(403).json({
        success: false,
        message: 'This certificate has been revoked by platform administration and cannot be downloaded',
        revoked_at: cert.revoked_at,
        revocation_reason: cert.revocation_reason,
      });
    }

    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-certificate/${cert.verification_token}`;

    const pdfBuffer = await generateWorkshopCertificatePdf({
      learnerName: cert.metadata?.learner_name || cert.learner_name,
      eventTitle: cert.metadata?.event_title || cert.event_title,
      category: cert.metadata?.category || cert.category,
      facilitatorName: cert.metadata?.facilitator_name || cert.facilitator_name,
      certificateNumber: cert.certificate_number,
      completionDate: cert.metadata?.completion_date || cert.completion_date,
      issuedAt: cert.issued_at,
      verificationUrl,
    });

    const safeFilename = `ELEVATE_Workshop_Certificate_${cert.certificate_number}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── 4. GET /api/events/certificates/my-certificates ──────────────────────────
export const getLearnerWorkshopCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const baseUrl = getBaseUrl();

    const certRes = await query(
      `SELECT wc.id, wc.event_id, wc.certificate_number, wc.verification_token,
              wc.status, wc.revoked_at, wc.revocation_reason, wc.issued_at,
              wc.email_status, wc.metadata,
              e.title AS event_title, e.category AS event_category,
              e.facilitator_name, e.ends_at AS completion_date
       FROM workshop_certificates wc
       JOIN events e ON wc.event_id = e.id
       WHERE wc.user_id = $1
       ORDER BY wc.issued_at DESC`,
      [userId]
    );

    const certificates = certRes.rows.map(cert => ({
      id: cert.id,
      event_id: cert.event_id,
      event_title: cert.event_title,
      workshop_title: cert.event_title,
      event_category: cert.event_category,
      facilitator_name: cert.facilitator_name,
      completion_date: cert.completion_date,
      certificate_number: cert.certificate_number,
      verification_token: cert.verification_token,
      status: cert.status,
      revoked_at: cert.revoked_at,
      revocation_reason: cert.revocation_reason,
      issued_at: cert.issued_at,
      email_status: cert.email_status,
      metadata: cert.metadata,
      verification_url: `${baseUrl}/verify-certificate/${cert.verification_token}`,
      download_url: `/api/events/certificates/${cert.id}/download`,
    }));

    res.json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 5. PATCH /api/events/:eventId/certificate/:certificateId/revoke ──────────
export const revokeWorkshopCertificate = async (req, res, next) => {
  try {
    const { eventId, certificateId } = req.params;
    const { reason = 'Revoked by educator or administrator' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId) || !validateUUID(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    // Verify educator ownership or admin role
    const evRes = await query(`SELECT created_by FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (userRole !== 'admin' && evRes.rows[0].created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to revoke this certificate' });
    }

    const updRes = await query(
      `UPDATE workshop_certificates
       SET status = 'revoked',
           revoked_at = NOW(),
           revocation_reason = $1,
           revoked_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND event_id = $4
       RETURNING *`,
      [reason, userId, certificateId, eventId]
    );

    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({
      success: true,
      message: 'Workshop certificate revoked successfully',
      certificate: updRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6. POST /api/events/:eventId/certificate/:certificateId/send-email ───────
export const retryWorkshopCertificateEmail = async (req, res, next) => {
  try {
    const { eventId, certificateId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(eventId) || !validateUUID(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const certRes = await query(
      `SELECT wc.*, e.title AS event_title, e.category, e.facilitator_name, e.ends_at AS completion_date,
              u.name AS learner_name, u.email AS learner_email
       FROM workshop_certificates wc
       JOIN events e ON wc.event_id = e.id
       JOIN users u ON wc.user_id = u.id
       WHERE wc.id = $1 AND wc.event_id = $2`,
      [certificateId, eventId]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const cert = certRes.rows[0];

    // Enforce learner ownership
    if (cert.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (cert.status === 'revoked') {
      return res.status(400).json({ success: false, message: 'Cannot email a revoked certificate' });
    }

    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-certificate/${cert.verification_token}`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    const pdfBuffer = await generateWorkshopCertificatePdf({
      learnerName: cert.metadata?.learner_name || cert.learner_name,
      eventTitle: cert.metadata?.event_title || cert.event_title,
      category: cert.metadata?.category || cert.category,
      facilitatorName: cert.metadata?.facilitator_name || cert.facilitator_name,
      certificateNumber: cert.certificate_number,
      completionDate: cert.metadata?.completion_date || cert.completion_date,
      issuedAt: cert.issued_at,
      verificationUrl,
    });

    const emailResult = await sendWorkshopCertificateEmail({
      to: cert.learner_email,
      learnerName: cert.learner_name,
      eventTitle: cert.event_title,
      certificateNumber: cert.certificate_number,
      verificationUrl,
      dashboardUrl,
      pdfBuffer,
    });

    let emailStatus = 'sent';
    let emailError = null;

    if (emailResult.notConfigured) {
      emailStatus = 'not_configured';
    } else if (!emailResult.success) {
      emailStatus = 'failed';
      emailError = emailResult.error || 'Delivery failed';
    }

    const upd = await query(
      `UPDATE workshop_certificates
       SET email_status = $1::varchar, email_sent_at = CASE WHEN $1::text = 'sent' THEN NOW() ELSE NULL END, email_error = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, certificate_number, verification_token, status, issued_at, email_status, email_sent_at, email_error, metadata`,
      [emailStatus, emailError, cert.id]
    );

    res.json({
      success: emailStatus === 'sent' || emailStatus === 'not_configured',
      message: emailStatus === 'sent'
        ? 'Certificate email sent successfully'
        : (emailStatus === 'not_configured' ? 'Resend is not configured' : 'Certificate email delivery failed'),
      email_status: upd.rows[0].email_status,
      email_sent_at: upd.rows[0].email_sent_at,
      certificate: upd.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

export const downloadWorkshopCertificateById = async (req, res, next) => {
  return downloadWorkshopCertificate(req, res, next);
};

export const revokeWorkshopCertificateById = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const { reason = 'Revoked by educator or administrator' } = req.body || {};
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!validateUUID(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const certRes = await query(
      `SELECT wc.id, wc.event_id, e.created_by
       FROM workshop_certificates wc
       JOIN events e ON e.id = wc.event_id
       WHERE wc.id = $1`,
      [certificateId]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    if (userRole !== 'admin' && certRes.rows[0].created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to revoke this certificate' });
    }

    req.params.eventId = certRes.rows[0].event_id;
    return revokeWorkshopCertificate(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const retryWorkshopCertificateEmailById = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    if (!validateUUID(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const certRes = await query(
      `SELECT event_id FROM workshop_certificates WHERE id = $1`,
      [certificateId]
    );
    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    req.params.eventId = certRes.rows[0].event_id;
    return retryWorkshopCertificateEmail(req, res, next);
  } catch (err) {
    next(err);
  }
};
