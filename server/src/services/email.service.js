/**
 * ELEVATE Phase 5C — Email Delivery Service
 *
 * Implements transactional certificate delivery using Resend.
 *
 * Safe handling:
 * - If RESEND_API_KEY is not configured, logs transparently and returns notConfigured.
 * - Errors during delivery are recorded in database without rolling back the issued certificate.
 * - Test mocking support allows automated testing without real network calls.
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Global mock handler for automated testing
let mockSendHandler = null;

export function setMockSendHandler(fn) {
  mockSendHandler = fn;
}

export function clearMockSendHandler() {
  mockSendHandler = null;
}

/**
 * Check if Resend is configured with a valid API key.
 */
export function isEmailConfigured() {
  const key = process.env.RESEND_API_KEY;
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim().length > 0 &&
    !key.includes('your_resend_api_key_here')
  );
}

/**
 * Send certificate notification email to learner.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.learnerName - Full name of learner
 * @param {string} params.journeyTitle - Title of the completed journey
 * @param {string} params.certificateNumber - Unique certificate ID
 * @param {string} params.verificationUrl - Public verification link
 * @param {string} params.dashboardUrl - Authenticated dashboard URL
 * @param {Buffer} [params.pdfBuffer] - Optional binary PDF attachment
 * @returns {Promise<{success: boolean, notConfigured?: boolean, messageId?: string, error?: string}>}
 */
export async function sendCertificateEmail({
  to,
  learnerName,
  journeyTitle,
  certificateNumber,
  verificationUrl,
  dashboardUrl,
  pdfBuffer,
}) {
  // If test mock is active, delegate directly
  if (mockSendHandler) {
    return mockSendHandler({
      to,
      learnerName,
      journeyTitle,
      certificateNumber,
      verificationUrl,
      dashboardUrl,
      pdfBuffer,
    });
  }

  // If Resend is not configured, return clean notConfigured response
  if (!isEmailConfigured()) {
    console.log('[EmailService] Resend API key not configured. Certificate issued without email delivery.');
    return {
      success: false,
      notConfigured: true,
      message: 'Resend API key is not configured in environment variables.',
    };
  }

  const apiKey = process.env.RESEND_API_KEY.trim();
  const fromEmail = process.env.CERTIFICATE_FROM_EMAIL || 'certificates@elevate.edu';

  try {
    const resend = new Resend(apiKey);

    const attachments = [];
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      attachments.push({
        filename: `ELEVATE_Certificate_${certificateNumber}.pdf`,
        content: pdfBuffer,
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f7f9fc; margin: 0; padding: 24px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { text-align: center; border-bottom: 2px solid #4353cf; padding-bottom: 20px; margin-bottom: 28px; }
            .platform-tag { font-size: 11px; font-weight: bold; letter-spacing: 2px; color: #4353cf; text-transform: uppercase; margin-bottom: 8px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
            .content { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .journey-highlight { background: #f0f2fa; border-left: 4px solid #4353cf; padding: 14px 18px; margin: 20px 0; border-radius: 8px; }
            .journey-title { font-size: 16px; font-weight: 700; color: #1e293b; }
            .cert-meta { font-size: 12px; color: #64748b; margin-top: 6px; }
            .btn-group { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; margin: 0 8px; }
            .btn-primary { background-color: #4353cf; color: #ffffff !important; }
            .btn-secondary { background-color: #f1f5f9; color: #334155 !important; border: 1px solid #cbd5e1; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="platform-tag">ELEVATE Experiential Platform</div>
              <h1 class="title">Congratulations, ${learnerName}!</h1>
            </div>

            <p class="greeting">Your Certificate of Completion is Ready</p>

            <p class="content">
              We are pleased to confirm that you have successfully fulfilled all experiential learning requirements,
              completed all educator-authored capsules, and received educator approval for your practical activity deliverables in:
            </p>

            <div class="journey-highlight">
              <div class="journey-title">${journeyTitle}</div>
              <div class="cert-meta">Certificate ID: <strong>${certificateNumber}</strong> • Six-Stage Experiential Model Verified</div>
            </div>

            <p class="content">
              Your official certificate has been permanently recorded in the ELEVATE registry and attached to this email as a PDF.
            </p>

            <div class="btn-group">
              <a href="${verificationUrl}" class="btn btn-primary" target="_blank">Verify Authenticity Online</a>
              <a href="${dashboardUrl}" class="btn btn-secondary" target="_blank">Go to My Dashboard</a>
            </div>

            <div class="footer">
              <p>ELEVATE Pedagogical Platform • Walchand Institute of Technology • Final Year BTech IT Project</p>
              <p>This credential represents verified practical coursework recorded in PostgreSQL.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Your ELEVATE Certificate of Completion — ${journeyTitle}`,
      html,
      attachments,
    });

    if (error) {
      console.error('[EmailService] Resend API error:', error);
      return {
        success: false,
        error: error.message || 'Resend API returned an error',
      };
    }

    return {
      success: true,
      messageId: data?.id || 'delivered',
    };
  } catch (err) {
    console.error('[EmailService] Exception sending certificate email:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Send workshop certificate notification email to learner.
 */
export async function sendWorkshopCertificateEmail({
  to,
  learnerName,
  eventTitle,
  certificateNumber,
  verificationUrl,
  dashboardUrl,
  pdfBuffer,
}) {
  // If test mock is active, delegate directly
  if (mockSendHandler) {
    try {
      return await mockSendHandler({
        to,
        learnerName,
        eventTitle,
        workshopTitle: eventTitle,
        journeyTitle: eventTitle,
        certificateNumber,
        verificationUrl,
        dashboardUrl,
        pdfBuffer,
        type: 'workshop',
      });
    } catch (err) {
      return { success: false, error: err.message || 'Mock email delivery failed' };
    }
  }

  if (!isEmailConfigured()) {
    console.log('[EmailService] Resend API key not configured. Workshop certificate issued without email delivery.');
    return {
      success: false,
      notConfigured: true,
      message: 'Resend API key is not configured in environment variables.',
    };
  }

  const apiKey = process.env.RESEND_API_KEY.trim();
  const fromEmail = process.env.CERTIFICATE_FROM_EMAIL || 'certificates@elevate.edu';

  try {
    const resend = new Resend(apiKey);

    const attachments = [];
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      attachments.push({
        filename: `ELEVATE_Workshop_Certificate_${certificateNumber}.pdf`,
        content: pdfBuffer,
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
            .header { text-align: center; margin-bottom: 24px; }
            .platform-tag { font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .greeting { font-size: 14px; font-weight: 600; color: #059669; margin-top: 16px; margin-bottom: 16px; text-align: center; }
            .content { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
            .workshop-highlight { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .workshop-title { font-size: 18px; font-weight: 800; color: #065f46; margin-bottom: 8px; }
            .cert-meta { font-size: 12px; color: #047857; font-family: monospace; }
            .btn-group { text-align: center; margin: 28px 0; }
            .btn { display: inline-block; padding: 12px 24px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px; margin: 6px; }
            .btn-primary { background-color: #059669; color: #ffffff !important; }
            .btn-secondary { background-color: #f1f5f9; color: #334155 !important; border: 1px solid #cbd5e1; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="platform-tag">ELEVATE Workshops & Cohorts</div>
              <h1 class="title">Congratulations, ${learnerName}!</h1>
            </div>

            <p class="greeting">Your Certificate of Participation is Ready</p>

            <p class="content">
              We are delighted to confirm that you actively attended and successfully completed the live workshop:
            </p>

            <div class="workshop-highlight">
              <div class="workshop-title">${eventTitle}</div>
              <div class="cert-meta">Certificate ID: <strong>${certificateNumber}</strong> • Verified Live Session Attendance</div>
            </div>

            <p class="content">
              Your official certificate has been permanently recorded in the ELEVATE registry and attached as a PDF.
            </p>

            <div class="btn-group">
              <a href="${verificationUrl}" class="btn btn-primary" target="_blank">Verify Credential Online</a>
              <a href="${dashboardUrl}" class="btn btn-secondary" target="_blank">My Dashboard</a>
            </div>

            <div class="footer">
              <p>ELEVATE Pedagogical Platform • Walchand Institute of Technology • Final Year BTech IT Project</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Your ELEVATE Certificate of Participation — ${eventTitle}`,
      html,
      attachments,
    });

    if (error) {
      console.error('[EmailService] Resend API error for workshop:', error);
      return { success: false, error: error.message || 'Resend API returned an error' };
    }

    return { success: true, messageId: data?.id || 'delivered' };
  } catch (err) {
    console.error('[EmailService] Exception sending workshop certificate email:', err.message);
    return { success: false, error: err.message };
  }
}

export default {
  sendCertificateEmail,
  sendWorkshopCertificateEmail,
  isEmailConfigured,
  setMockSendHandler,
  clearMockSendHandler,
};
