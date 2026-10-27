/**
 * ELEVATE Phase 5C — Certificate Controller
 *
 * Implements authoritative certificate workflow:
 * - Server-side eligibility verification based on lesson progress and approved activities
 * - Idempotent, transaction-safe certificate issuance
 * - PDF generation and streaming
 * - Public authenticity verification with strict learner privacy
 * - Resend transactional email integration with delivery status persistence
 * - Administrative revocation
 */

import crypto from 'crypto';
import pool, { query } from '../config/db.js';
import { generateCertificatePdf } from '../services/pdf.service.js';
import { sendCertificateEmail } from '../services/email.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBaseUrl() {
  return process.env.APP_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
}

/**
 * Authoritative Server-Side Eligibility Check.
 *
 * Rules:
 * 1. Journey must be published.
 * 2. Learner must have an active enrollment.
 * 3. Journey must contain learning content or required activities (cannot be empty).
 * 4. Every lesson (content_type='video') must have a persisted completed=true in lesson_progress.
 * 5. Every required, non-archived activity must have latest submission attempt approved.
 * 6. Returns detailed requirement breakdown and outstanding reasons if not eligible.
 *
 * @param {string} userId - Learner UUID
 * @param {string} journeyId - Journey UUID
 * @returns {Promise<object>} - Eligibility assessment result
 */
export async function checkCertificateEligibility(userId, journeyId) {
  if (!userId || !journeyId || !UUID_REGEX.test(userId) || !UUID_REGEX.test(journeyId)) {
    return {
      is_eligible: false,
      already_issued: false,
      outstanding_reasons: ['Invalid user or journey identifier'],
      requirements: null,
    };
  }

  // 1. Fetch journey details
  const jRes = await query(
    `SELECT id, title, category, skill_domain, status, badge, duration_hours
     FROM journeys WHERE id = $1`,
    [journeyId]
  );

  if (jRes.rows.length === 0) {
    return {
      is_eligible: false,
      already_issued: false,
      outstanding_reasons: ['Growth Journey not found'],
      requirements: null,
    };
  }

  const journey = jRes.rows[0];

  if (journey.status !== 'published') {
    return {
      is_eligible: false,
      already_issued: false,
      journey,
      outstanding_reasons: ['Growth Journey is not published'],
      requirements: { enrollment_valid: false, has_content: false },
    };
  }

  // 2. Fetch enrollment
  const eRes = await query(
    `SELECT id, status, enrolled_at, completed_at
     FROM enrollments WHERE user_id = $1 AND journey_id = $2`,
    [userId, journeyId]
  );

  if (eRes.rows.length === 0) {
    return {
      is_eligible: false,
      already_issued: false,
      journey,
      outstanding_reasons: ['Learner does not have an active enrollment in this Growth Journey'],
      requirements: { enrollment_valid: false, has_content: false },
    };
  }

  const enrollment = eRes.rows[0];

  // 3. Check if certificate is already issued
  const certRes = await query(
    `SELECT id, certificate_number, verification_token, status, issued_at, email_status, metadata
     FROM certificates WHERE user_id = $1 AND journey_id = $2`,
    [userId, journeyId]
  );

  const existingCert = certRes.rows[0] || null;
  const alreadyIssued = Boolean(existingCert && existingCert.status === 'issued');

  // 4. Fetch all stages of this journey
  const stagesRes = await query(
    `SELECT id, stage_type, title, order_index FROM stages WHERE journey_id = $1 ORDER BY order_index ASC`,
    [journeyId]
  );
  const stages = stagesRes.rows;
  const stageIds = stages.map(s => s.id);

  if (stageIds.length === 0) {
    return {
      is_eligible: false,
      already_issued: alreadyIssued,
      certificate: existingCert,
      journey,
      outstanding_reasons: ['Journey has no configured stages or curriculum'],
      requirements: { enrollment_valid: true, has_content: false },
    };
  }

  // 5. Fetch all video lessons and learner's progress
  const capsRes = await query(
    `SELECT c.id as capsule_id, c.stage_id, c.title, c.order_index,
            COALESCE(lp.completed, false) as completed, lp.completed_at
     FROM capsules c
     LEFT JOIN lesson_progress lp ON c.id = lp.capsule_id AND lp.user_id = $1
     WHERE c.stage_id = ANY($2) AND c.content_type = 'video'
     ORDER BY c.order_index ASC`,
    [userId, stageIds]
  );

  const allLessons = capsRes.rows;
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(l => l.completed);
  const incompleteLessons = allLessons.filter(l => !l.completed);
  const allLessonsCompleted = totalLessons > 0 && incompleteLessons.length === 0;

  // 6. Fetch all required, non-archived activities and learner's latest submission review status
  const actRes = await query(
    `SELECT a.id as activity_id, a.stage_id, a.title, a.is_required, a.is_archived,
            sub.id as latest_submission_id,
            sub.status as latest_submission_status,
            sub.attempt_num as latest_attempt_num
     FROM activities a
     LEFT JOIN LATERAL (
       SELECT id, status, attempt_num FROM submissions
       WHERE activity_id = a.id AND user_id = $1
       ORDER BY attempt_num DESC LIMIT 1
     ) sub ON true
     WHERE a.stage_id = ANY($2)
       AND a.is_archived = false
       AND a.is_required = true
     ORDER BY a.order_index ASC, a.created_at ASC`,
    [userId, stageIds]
  );

  const requiredActivities = actRes.rows;
  const totalRequiredActivities = requiredActivities.length;
  const approvedActivities = requiredActivities.filter(a => a.latest_submission_status === 'approved');
  const pendingOrIncompleteActivities = requiredActivities.filter(a => a.latest_submission_status !== 'approved');
  const allRequiredActivitiesApproved = totalRequiredActivities === 0 || pendingOrIncompleteActivities.length === 0;

  // 7. Verify journey has actual content (lessons or required activities)
  const hasContent = totalLessons > 0 || totalRequiredActivities > 0;

  // 8. Compile outstanding reasons
  const outstandingReasons = [];

  if (!hasContent) {
    outstandingReasons.push('Journey does not contain learning content or required activities');
  }

  if (totalLessons > 0 && incompleteLessons.length > 0) {
    outstandingReasons.push(
      `${incompleteLessons.length} of ${totalLessons} video lessons remain incomplete`
    );
  }

  if (totalRequiredActivities > 0 && pendingOrIncompleteActivities.length > 0) {
    pendingOrIncompleteActivities.forEach(a => {
      const statusLabel = a.latest_submission_status
        ? `status: ${a.latest_submission_status}`
        : 'no submission logged';
      outstandingReasons.push(
        `Required activity "${a.title}" is not approved (${statusLabel})`
      );
    });
  }

  const isEligible =
    hasContent &&
    allLessonsCompleted &&
    allRequiredActivitiesApproved &&
    enrollment.status !== 'dropped';

  return {
    is_eligible: isEligible,
    already_issued: alreadyIssued,
    certificate: existingCert,
    journey: {
      id: journey.id,
      title: journey.title,
      category: journey.category,
      skill_domain: journey.skill_domain,
      badge: journey.badge,
    },
    enrollment: {
      id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      status: enrollment.status,
    },
    requirements: {
      enrollment_valid: true,
      has_content: hasContent,
      lessons: {
        total: totalLessons,
        completed: completedLessons.length,
        all_completed: allLessonsCompleted,
        incomplete: incompleteLessons.map(l => ({ id: l.capsule_id, title: l.title })),
      },
      activities: {
        total_required: totalRequiredActivities,
        approved: approvedActivities.length,
        all_approved: allRequiredActivitiesApproved,
        pending_or_incomplete: pendingOrIncompleteActivities.map(a => ({
          id: a.activity_id,
          title: a.title,
          status: a.latest_submission_status || 'unsubmitted',
        })),
      },
    },
    outstanding_reasons: outstandingReasons,
  };
}

// ─── 1. GET /api/certificates/eligibility/:journeyId ─────────────────────────
export const getCertificateEligibility = async (req, res, next) => {
  try {
    const { journeyId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(journeyId)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    const result = await checkCertificateEligibility(userId, journeyId);

    if (result.outstanding_reasons.includes('Growth Journey not found')) {
      return res.status(404).json({ success: false, message: 'Growth Journey not found' });
    }

    if (result.outstanding_reasons.includes('Learner does not have an active enrollment in this Growth Journey')) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this Growth Journey',
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 2. POST /api/certificates/issue/:journeyId ──────────────────────────────
export const issueCertificate = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { journeyId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(journeyId)) {
      return res.status(400).json({ success: false, message: 'Invalid journey ID format' });
    }

    // Check authoritative eligibility
    const eligibility = await checkCertificateEligibility(userId, journeyId);

    if (eligibility.outstanding_reasons.includes('Growth Journey not found')) {
      return res.status(404).json({ success: false, message: 'Growth Journey not found' });
    }

    if (eligibility.outstanding_reasons.includes('Learner does not have an active enrollment in this Growth Journey')) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this published Growth Journey to receive a certificate',
      });
    }

    // If already issued, return existing certificate record (idempotent!)
    if (eligibility.already_issued && eligibility.certificate) {
      const baseUrl = getBaseUrl();
      return res.status(200).json({
        success: true,
        message: 'Certificate has already been issued for this Growth Journey',
        already_issued: true,
        certificate: eligibility.certificate,
        verification_url: `${baseUrl}/verify-certificate/${eligibility.certificate.verification_token}`,
        download_url: `/api/certificates/${eligibility.certificate.id}/download`,
      });
    }

    // If ineligible, reject
    if (!eligibility.is_eligible) {
      return res.status(400).json({
        success: false,
        message: 'Learner is not eligible for a completion certificate. Requirements must be satisfied.',
        outstanding_reasons: eligibility.outstanding_reasons,
        requirements: eligibility.requirements,
      });
    }

    // Fetch user details for certificate metadata
    const userRes = await client.query(
      `SELECT id, name, email FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    // Begin database transaction
    await client.query('BEGIN');

    // Double-check inside transaction with FOR UPDATE on enrollments to avoid race conditions
    await client.query(
      `SELECT id FROM enrollments WHERE user_id = $1 AND journey_id = $2 FOR UPDATE`,
      [userId, journeyId]
    );

    // Check again if certificate was inserted concurrently
    const existingCheck = await client.query(
      `SELECT id, certificate_number, verification_token, status, issued_at, email_status, metadata
       FROM certificates WHERE user_id = $1 AND journey_id = $2 FOR UPDATE`,
      [userId, journeyId]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('COMMIT');
      const existing = existingCheck.rows[0];
      const baseUrl = getBaseUrl();
      return res.status(200).json({
        success: true,
        message: 'Certificate has already been issued for this Growth Journey',
        already_issued: true,
        certificate: existing,
        verification_url: `${baseUrl}/verify-certificate/${existing.verification_token}`,
        download_url: `/api/certificates/${existing.id}/download`,
      });
    }

    // Generate unique human-readable certificate number: ELV-YYYYMM-RANDOMHEX
    const now = new Date();
    const datePrefix = `ELV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certificateNumber = `${datePrefix}-${randomHex}`;

    // Generate cryptographically unpredictable verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Assemble metadata snapshot
    const metadata = {
      learner_id: user.id,
      learner_name: user.name,
      learner_email: user.email,
      journey_id: eligibility.journey.id,
      journey_title: eligibility.journey.title,
      journey_category: eligibility.journey.category || 'Experiential Learning',
      skill_domain: eligibility.journey.skill_domain || 'Experiential Engineering',
      total_lessons: eligibility.requirements.lessons.total,
      completed_lessons: eligibility.requirements.lessons.completed,
      total_required_activities: eligibility.requirements.activities.total_required,
      approved_activities: eligibility.requirements.activities.approved,
      issued_at: now.toISOString(),
      platform: 'ELEVATE',
      pedagogical_model: 'Six-Stage Experiential Model (Explore, Learn, Experience, Validate, Apply, Transform)',
    };

    // Insert certificate row
    const insertRes = await client.query(
      `INSERT INTO certificates (
         user_id, journey_id, certificate_number, verification_token,
         status, metadata, email_status, issued_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'issued', $5, 'pending', NOW(), NOW(), NOW())
       RETURNING *`,
      [userId, journeyId, certificateNumber, verificationToken, JSON.stringify(metadata)]
    );

    const certificate = insertRes.rows[0];

    // Mark enrollment as completed if not already marked
    await client.query(
      `UPDATE enrollments
       SET status = 'completed', completed_at = COALESCE(completed_at, NOW())
       WHERE user_id = $1 AND journey_id = $2`,
      [userId, journeyId]
    );

    await client.query('COMMIT');

    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-certificate/${verificationToken}`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    // Attempt email delivery asynchronously / safely without blocking success
    (async () => {
      try {
        const pdfBuffer = await generateCertificatePdf({
          learnerName: user.name,
          journeyTitle: eligibility.journey.title,
          category: eligibility.journey.category,
          skillDomain: eligibility.journey.skill_domain,
          certificateNumber,
          issuedAt: certificate.issued_at,
          verificationUrl,
        });

        const emailResult = await sendCertificateEmail({
          to: user.email,
          learnerName: user.name,
          journeyTitle: eligibility.journey.title,
          certificateNumber,
          verificationUrl,
          dashboardUrl,
          pdfBuffer,
        });

        if (emailResult.success) {
          await query(
            `UPDATE certificates
             SET email_status = 'sent', email_sent_at = NOW(), email_error = null, updated_at = NOW()
             WHERE id = $1`,
            [certificate.id]
          );
        } else if (emailResult.notConfigured) {
          await query(
            `UPDATE certificates
             SET email_status = 'not_configured', email_error = $2, updated_at = NOW()
             WHERE id = $1`,
            [certificate.id, emailResult.message]
          );
        } else {
          await query(
            `UPDATE certificates
             SET email_status = 'failed', email_error = $2, updated_at = NOW()
             WHERE id = $1`,
            [certificate.id, emailResult.error || 'Email send failed']
          );
        }
      } catch (postErr) {
        console.error('[CertificateController] Post-issuance error:', postErr.message);
        await query(
          `UPDATE certificates
           SET email_status = 'failed', email_error = $2, updated_at = NOW()
           WHERE id = $1`,
          [certificate.id, postErr.message]
        );
      }
    })();

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate: {
        id: certificate.id,
        certificate_number: certificate.certificate_number,
        verification_token: certificate.verification_token,
        status: certificate.status,
        issued_at: certificate.issued_at,
        email_status: certificate.email_status,
        metadata: certificate.metadata,
      },
      verification_url: verificationUrl,
      download_url: `/api/certificates/${certificate.id}/download`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─── 3. GET /api/certificates — Learner's Issued Certificates ────────────────
export const getLearnerCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const baseUrl = getBaseUrl();

    const certRes = await query(
      `SELECT c.id, c.journey_id, c.certificate_number, c.verification_token,
              c.status, c.revoked_at, c.revocation_reason, c.issued_at,
              c.email_status, c.email_sent_at, c.email_error, c.metadata,
              j.title as journey_title, j.category as journey_category,
              j.skill_domain as journey_skill_domain, j.badge as journey_badge
       FROM certificates c
       JOIN journeys j ON c.journey_id = j.id
       WHERE c.user_id = $1
       ORDER BY c.issued_at DESC`,
      [userId]
    );

    const certificates = certRes.rows.map(cert => ({
      id: cert.id,
      journey_id: cert.journey_id,
      journey_title: cert.journey_title,
      journey_category: cert.journey_category,
      journey_skill_domain: cert.journey_skill_domain,
      journey_badge: cert.journey_badge,
      certificate_number: cert.certificate_number,
      verification_token: cert.verification_token,
      status: cert.status,
      revoked_at: cert.revoked_at,
      revocation_reason: cert.revocation_reason,
      issued_at: cert.issued_at,
      email_status: cert.email_status,
      email_sent_at: cert.email_sent_at,
      email_error: cert.email_error,
      metadata: cert.metadata,
      verification_url: `${baseUrl}/verify-certificate/${cert.verification_token}`,
      download_url: `/api/certificates/${cert.id}/download`,
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

// ─── 4. GET /api/certificates/:certificateId/download — Download PDF ─────────
export const downloadCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!UUID_REGEX.test(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID format' });
    }

    const certRes = await query(
      `SELECT c.*, j.title as journey_title, j.category as journey_category, j.skill_domain,
              u.name as learner_name
       FROM certificates c
       JOIN journeys j ON c.journey_id = j.id
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [certificateId]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const cert = certRes.rows[0];

    // Enforce learner ownership (or admin role)
    if (cert.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to download this certificate',
      });
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

    const pdfBuffer = await generateCertificatePdf({
      learnerName: cert.metadata?.learner_name || cert.learner_name,
      journeyTitle: cert.metadata?.journey_title || cert.journey_title,
      category: cert.metadata?.journey_category || cert.journey_category,
      skillDomain: cert.metadata?.skill_domain || cert.skill_domain,
      certificateNumber: cert.certificate_number,
      issuedAt: cert.issued_at,
      verificationUrl,
    });

    const safeFilename = `ELEVATE_Certificate_${cert.certificate_number}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─── 5. GET /api/certificates/verify/:verificationToken — Public Verification 
export const verifyCertificatePublic = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    if (!verificationToken || typeof verificationToken !== 'string' || verificationToken.trim().length === 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        status: 'invalid',
        message: 'A verification token is required to verify a certificate',
      });
    }

    const certRes = await query(
      `SELECT c.certificate_number, c.status, c.issued_at, c.revoked_at, c.revocation_reason, c.metadata,
              j.title as journey_title, j.category as journey_category, j.skill_domain as journey_skill_domain
       FROM certificates c
       JOIN journeys j ON c.journey_id = j.id
       WHERE c.verification_token = $1`,
      [verificationToken.trim()]
    );

    if (certRes.rows.length === 0) {
      // Check workshop_certificates registry
      const wsCertRes = await query(
        `SELECT wc.certificate_number, wc.status, wc.issued_at, wc.revoked_at, wc.revocation_reason, wc.metadata,
                e.title as event_title, e.category as event_category, e.facilitator_name, e.ends_at as completion_date,
                u.name as learner_name
         FROM workshop_certificates wc
         JOIN events e ON wc.event_id = e.id
         JOIN users u ON wc.user_id = u.id
         WHERE wc.verification_token = $1`,
        [verificationToken.trim()]
      );

      if (wsCertRes.rows.length > 0) {
        const wsCert = wsCertRes.rows[0];

        if (wsCert.status === 'revoked') {
          return res.json({
            success: true,
            valid: false,
            status: 'revoked',
            type: 'workshop',
            certificate_type: 'workshop',
            certificate_number: wsCert.certificate_number,
            event_title: wsCert.metadata?.event_title || wsCert.event_title,
            workshop_title: wsCert.metadata?.event_title || wsCert.event_title,
            journey_title: wsCert.metadata?.event_title || wsCert.event_title,
            title: wsCert.metadata?.event_title || wsCert.event_title,
            revoked_at: wsCert.revoked_at,
            revocation_reason: wsCert.revocation_reason || 'Revoked by educator or administrator',
            message: 'This workshop certificate was revoked by platform administration and is no longer valid.',
          });
        }

        return res.json({
          success: true,
          valid: true,
          status: 'issued',
          type: 'workshop',
          certificate_type: 'workshop',
          certificate_number: wsCert.certificate_number,
          learner_name: wsCert.metadata?.learner_name || wsCert.learner_name || 'Verified Attendee',
          recipient_name: wsCert.metadata?.learner_name || wsCert.learner_name || 'Verified Attendee',
          event_title: wsCert.metadata?.event_title || wsCert.event_title,
          workshop_title: wsCert.metadata?.event_title || wsCert.event_title,
          journey_title: wsCert.metadata?.event_title || wsCert.event_title,
          title: wsCert.metadata?.event_title || wsCert.event_title,
          category: wsCert.metadata?.category || wsCert.event_category || 'Interactive Workshop',
          facilitator_name: wsCert.metadata?.facilitator_name || wsCert.facilitator_name,
          completion_date: wsCert.metadata?.completion_date || wsCert.completion_date,
          issued_at: wsCert.issued_at,
          verification_url: `${getBaseUrl()}/verify-certificate/${verificationToken.trim()}`,
          verified_registry: 'ELEVATE PostgreSQL Credential Registry',
          disclaimer: 'Authoritative participation record verified against PostgreSQL event attendance and completion.',
        });
      }

      return res.status(404).json({
        success: false,
        valid: false,
        status: 'invalid',
        message: 'Certificate verification failed. The provided verification token does not match any certificate in the official ELEVATE registry.',
      });
    }

    const cert = certRes.rows[0];

    // If revoked, return explicit revoked state without validating
    if (cert.status === 'revoked') {
      return res.json({
        success: true,
        valid: false,
        status: 'revoked',
        type: 'journey',
        certificate_type: 'journey',
        certificate_number: cert.certificate_number,
        journey_title: cert.metadata?.journey_title || cert.journey_title,
        revoked_at: cert.revoked_at,
        revocation_reason: cert.revocation_reason || 'Revoked by platform administrator',
        message: 'This certificate was revoked by platform administration and is no longer valid.',
      });
    }

    // Return authoritative public verification payload with strict learner privacy
    res.json({
      success: true,
      valid: true,
      status: 'issued',
      type: 'journey',
      certificate_type: 'journey',
      certificate_number: cert.certificate_number,
      learner_name: cert.metadata?.learner_name || 'Verified Learner',
      journey_title: cert.metadata?.journey_title || cert.journey_title,
      category: cert.metadata?.journey_category || cert.journey_category || 'Experiential Learning',
      skill_domain: cert.metadata?.skill_domain || cert.journey_skill_domain || 'Engineering Practice',
      issued_at: cert.issued_at,
      pedagogical_model: 'Six-Stage Experiential Model (Explore → Transform)',
      message: 'This credential represents verified completion of the ELEVATE six-stage experiential curriculum.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6. POST /api/certificates/:certificateId/send-email — Email Retry ───────
export const retryCertificateEmail = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user.id;

    if (!UUID_REGEX.test(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID format' });
    }

    const certRes = await query(
      `SELECT c.*, j.title as journey_title, j.category as journey_category, j.skill_domain,
              u.name as learner_name, u.email as learner_email
       FROM certificates c
       JOIN journeys j ON c.journey_id = j.id
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [certificateId]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    const cert = certRes.rows[0];

    if (cert.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to trigger email delivery for this certificate',
      });
    }

    if (cert.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send email for a revoked certificate',
      });
    }

    const baseUrl = getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-certificate/${cert.verification_token}`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    const pdfBuffer = await generateCertificatePdf({
      learnerName: cert.metadata?.learner_name || cert.learner_name,
      journeyTitle: cert.metadata?.journey_title || cert.journey_title,
      category: cert.metadata?.journey_category || cert.journey_category,
      skillDomain: cert.metadata?.skill_domain || cert.skill_domain,
      certificateNumber: cert.certificate_number,
      issuedAt: cert.issued_at,
      verificationUrl,
    });

    const emailResult = await sendCertificateEmail({
      to: cert.learner_email,
      learnerName: cert.metadata?.learner_name || cert.learner_name,
      journeyTitle: cert.metadata?.journey_title || cert.journey_title,
      certificateNumber: cert.certificate_number,
      verificationUrl,
      dashboardUrl,
      pdfBuffer,
    });

    if (emailResult.success) {
      await query(
        `UPDATE certificates
         SET email_status = 'sent', email_sent_at = NOW(), email_error = null, updated_at = NOW()
         WHERE id = $1`,
        [cert.id]
      );
      return res.json({
        success: true,
        message: 'Certificate email delivered successfully',
        email_status: 'sent',
      });
    } else if (emailResult.notConfigured) {
      await query(
        `UPDATE certificates
         SET email_status = 'not_configured', email_error = $2, updated_at = NOW()
         WHERE id = $1`,
        [cert.id, emailResult.message]
      );
      return res.json({
        success: false,
        message: 'Resend email is not configured in the environment',
        email_status: 'not_configured',
      });
    } else {
      await query(
        `UPDATE certificates
         SET email_status = 'failed', email_error = $2, updated_at = NOW()
         WHERE id = $1`,
        [cert.id, emailResult.error || 'Email send failed']
      );
      return res.status(500).json({
        success: false,
        message: 'Failed to send certificate email',
        error: emailResult.error,
        email_status: 'failed',
      });
    }
  } catch (err) {
    next(err);
  }
};

// ─── 7. PATCH /api/certificates/:certificateId/revoke — Admin Revocation ─────
export const revokeCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const { reason = 'Revoked by administrator' } = req.body;

    if (!UUID_REGEX.test(certificateId)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID format' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators are authorized to revoke certificates',
      });
    }

    const updateRes = await query(
      `UPDATE certificates
       SET status = 'revoked', revoked_at = NOW(), revocation_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, certificateId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({
      success: true,
      message: 'Certificate has been revoked',
      certificate: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};
