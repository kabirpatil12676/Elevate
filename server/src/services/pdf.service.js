/**
 * ELEVATE Phase 5C — Certificate PDF Generation Service
 *
 * Generates an authoritative, publication-quality certificate PDF in landscape format
 * using pure JavaScript (pdfkit + qrcode) in memory.
 *
 * No headless browser or external binary dependencies required.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Generate a PDF buffer for a completed Growth Journey certificate.
 *
 * @param {object} params
 * @param {string} params.learnerName - Full name of the learner
 * @param {string} params.journeyTitle - Title of the completed Growth Journey
 * @param {string} params.category - Journey category (e.g. Technical Writing, Software Development)
 * @param {string} params.skillDomain - Skill domain (e.g. Experiential Engineering)
 * @param {string} params.certificateNumber - Unique human-readable certificate number (e.g. ELV-202610-A1B2C3)
 * @param {string} params.issuedAt - ISO timestamp or formatted date string of issuance
 * @param {string} params.verificationUrl - Public URL where authenticity can be verified
 * @returns {Promise<Buffer>} - Resolves with the binary PDF buffer
 */
export async function generateCertificatePdf({
  learnerName,
  journeyTitle,
  category = 'Experiential Learning',
  skillDomain = 'Engineering Leadership',
  certificateNumber,
  issuedAt,
  verificationUrl,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Generate QR code buffer for the verification URL
      let qrBuffer = null;
      if (verificationUrl) {
        try {
          qrBuffer = await QRCode.toBuffer(verificationUrl, {
            width: 110,
            margin: 1,
            color: {
              dark: '#1e293b',
              light: '#ffffff',
            },
          });
        } catch (qrErr) {
          console.warn('QR code generation warning:', qrErr.message);
        }
      }

      // 2. Format Issue Date
      let formattedDate = 'N/A';
      try {
        const d = new Date(issuedAt || Date.now());
        formattedDate = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (_) {
        formattedDate = String(issuedAt);
      }

      // 3. Create PDF in Landscape A4 (841.89 x 595.28 points)
      const doc = new PDFDocument({
        size: [841.89, 595.28],
        margins: { top: 32, bottom: 32, left: 32, right: 32 },
        info: {
          Title: `ELEVATE Certificate — ${certificateNumber}`,
          Author: 'ELEVATE Pedagogical Platform',
          Subject: `Certificate of Completion for ${journeyTitle}`,
          Keywords: 'ELEVATE, Growth Journey, Certificate, Experiential Learning',
          CreationDate: new Date(),
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // ── Outer & Inner Decorative Borders ──────────────────────────────────
      // Outer border (Deep Indigo)
      doc.rect(24, 24, pageWidth - 48, pageHeight - 48)
        .lineWidth(3)
        .strokeColor('#4353cf')
        .stroke();

      // Middle thin gap border (Slate/Gold)
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .stroke();

      // Inner border
      doc.rect(34, 34, pageWidth - 68, pageHeight - 68)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      // Corner geometric accents
      const cornerSize = 14;
      const drawCorner = (x, y) => {
        doc.rect(x, y, cornerSize, cornerSize)
          .fillColor('#4353cf')
          .fill();
      };
      drawCorner(24, 24);
      drawCorner(pageWidth - 24 - cornerSize, 24);
      drawCorner(24, pageHeight - 24 - cornerSize);
      drawCorner(pageWidth - 24 - cornerSize, pageHeight - 24 - cornerSize);

      // ── Header Section ───────────────────────────────────────────────────
      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#4353cf')
        .text('ELEVATE EXPERIENTIAL PEDAGOGICAL PLATFORM', 0, 56, {
          align: 'center',
          characterSpacing: 2,
        });

      doc.font('Helvetica')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('Autonomous Framework for Measurable Skill & Value Advancement', 0, 74, {
          align: 'center',
          characterSpacing: 0.5,
        });

      // Horizontal separator rule with center diamond
      doc.moveTo(180, 92).lineTo(395, 92).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
      doc.moveTo(445, 92).lineTo(660, 92).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
      doc.rect(416, 88, 8, 8).fillColor('#4353cf').fill();

      // ── Main Certificate Title ───────────────────────────────────────────
      doc.font('Helvetica-Bold')
        .fontSize(25)
        .fillColor('#0f172a')
        .text('CERTIFICATE OF COMPLETION', 0, 114, {
          align: 'center',
          characterSpacing: 1.5,
        });

      doc.font('Helvetica')
        .fontSize(11)
        .fillColor('#64748b')
        .text('This is authoritatively awarded to', 0, 150, {
          align: 'center',
        });

      // ── Learner Name ─────────────────────────────────────────────────────
      doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#1e293b')
        .text(learnerName || 'Registered Learner', 0, 172, {
          align: 'center',
        });

      // Underline accent for learner name
      const nameWidth = Math.min(doc.widthOfString(learnerName || 'Registered Learner') + 40, 480);
      const nameStartX = (pageWidth - nameWidth) / 2;
      doc.moveTo(nameStartX, 210)
        .lineTo(nameStartX + nameWidth, 210)
        .lineWidth(1.5)
        .strokeColor('#4353cf')
        .stroke();

      // ── Inscription Body ─────────────────────────────────────────────────
      const bodyText =
        'for successfully fulfilling all curriculum requirements, completing every educator-authored learning capsule, ' +
        'and demonstrating verified hands-on competence through approved practical activity deliverables in the Growth Journey:';

      doc.font('Helvetica')
        .fontSize(10.5)
        .fillColor('#334155')
        .text(bodyText, 120, 226, {
          align: 'center',
          lineGap: 4,
          width: pageWidth - 240,
        });

      // ── Journey Title ────────────────────────────────────────────────────
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#4353cf')
        .text(`"${journeyTitle}"`, 80, 282, {
          align: 'center',
          width: pageWidth - 160,
        });

      // Category & Skill Domain Tagline
      const domainText = `${category} • ${skillDomain} • 6-Stage Experiential Model`;
      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#64748b')
        .text(domainText.toUpperCase(), 0, 314, {
          align: 'center',
          characterSpacing: 1,
        });

      // ── Middle Milestone Box (Six Stages Completed) ──────────────────────
      const boxY = 340;
      doc.roundedRect(120, boxY, pageWidth - 240, 48, 8)
        .fillColor('#f8fafc')
        .fillAndStroke('#e2e8f0');

      doc.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#475569')
        .text('VERIFIED COMPLETION ACROSS SIX PEDAGOGICAL STAGES', 130, boxY + 10, {
          align: 'center',
          characterSpacing: 1,
        });

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(
          '1. Explore (Diagnostic)  →  2. Learn (Capsules)  →  3. Experience (Tasks)  →  4. Validate (Feedback)  →  5. Apply (Projects)  →  6. Transform (Portfolio)',
          130,
          boxY + 26,
          { align: 'center' }
        );

      // ── Bottom Credentials & Verification Block ──────────────────────────
      const bottomY = 412;

      // Left Column: Certificate Details
      doc.font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('CREDENTIAL DETAILS', 80, bottomY, { characterSpacing: 1 });

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text('Certificate ID:', 80, bottomY + 18)
        .font('Helvetica-Bold')
        .text(certificateNumber, 170, bottomY + 18);

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text('Date of Issuance:', 80, bottomY + 34)
        .font('Helvetica-Bold')
        .text(formattedDate, 170, bottomY + 34);

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text('Auth Authority:', 80, bottomY + 50)
        .font('Helvetica')
        .text('ELEVATE Autonomous Registry', 170, bottomY + 50);

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#1e293b')
        .text('Verification State:', 80, bottomY + 66)
        .font('Helvetica-Bold')
        .fillColor('#059669')
        .text('Authoritatively Verified', 170, bottomY + 66);

      // Right Column: QR Code & Verification URL
      if (qrBuffer) {
        doc.image(qrBuffer, pageWidth - 80 - 100, bottomY - 6, {
          width: 90,
          height: 90,
        });
      }

      const qrRightOffset = qrBuffer ? 200 : 80;
      doc.font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('AUTHENTICITY VERIFICATION', pageWidth - qrRightOffset - 220, bottomY, {
          characterSpacing: 0.5,
          width: 210,
          align: 'right',
        });

      doc.font('Helvetica')
        .fontSize(7.5)
        .fillColor('#475569')
        .text(
          'This credential has been registered in the ELEVATE database. Scan the QR code or verify online at:',
          pageWidth - qrRightOffset - 220,
          bottomY + 16,
          { width: 210, align: 'right', lineGap: 2 }
        );

      if (verificationUrl) {
        doc.font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#4353cf')
          .text(verificationUrl, pageWidth - qrRightOffset - 220, bottomY + 44, {
            width: 210,
            align: 'right',
            link: verificationUrl,
            underline: true,
          });
      }

      // ── Document Footer & Transparency Disclaimer ────────────────────────
      doc.moveTo(80, 520)
        .lineTo(pageWidth - 80, 520)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc.font('Helvetica')
        .fontSize(7)
        .fillColor('#94a3b8')
        .text(
          'ELEVATE Pedagogical Platform • Walchand Institute of Technology • Final Year BTech IT Project (Group B-07). ' +
          'This document certifies completion of experiential coursework and educator-approved submissions. No unverified grades or official accreditations are represented.',
          80,
          532,
          { align: 'center', width: pageWidth - 160, lineGap: 2 }
        );

      // Finalize the PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a PDF buffer for a completed Workshop / Event Certificate of Participation.
 */
export async function generateWorkshopCertificatePdf({
  learnerName,
  eventTitle,
  category = 'AI & Digital',
  facilitatorName = 'Workshop Facilitator',
  certificateNumber,
  completionDate,
  issuedAt,
  verificationUrl,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      let qrBuffer = null;
      if (verificationUrl) {
        try {
          qrBuffer = await QRCode.toBuffer(verificationUrl, {
            width: 110,
            margin: 1,
            color: { dark: '#1e293b', light: '#ffffff' },
          });
        } catch (qrErr) {
          console.warn('QR code generation warning:', qrErr.message);
        }
      }

      let formattedDate = 'N/A';
      try {
        const d = new Date(issuedAt || Date.now());
        formattedDate = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (_) {
        formattedDate = String(issuedAt);
      }

      let formattedCompletion = 'N/A';
      try {
        const cd = new Date(completionDate || Date.now());
        formattedCompletion = cd.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (_) {
        formattedCompletion = String(completionDate);
      }

      const doc = new PDFDocument({
        size: [841.89, 595.28],
        margins: { top: 32, bottom: 32, left: 32, right: 32 },
        info: {
          Title: `ELEVATE Workshop Certificate — ${certificateNumber}`,
          Author: 'ELEVATE Pedagogical Platform',
          Subject: `Certificate of Participation for ${eventTitle}`,
          Keywords: 'ELEVATE, Workshop, Certificate, Participation, Attendance',
          CreationDate: new Date(),
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // Outer border (Emerald / Indigo Accent)
      doc.rect(24, 24, pageWidth - 48, pageHeight - 48)
        .lineWidth(3)
        .strokeColor('#059669')
        .stroke();

      // Middle thin border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .stroke();

      // Inner border
      doc.rect(34, 34, pageWidth - 68, pageHeight - 68)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      // Corner geometric accents
      const cornerSize = 14;
      const drawCorner = (x, y) => {
        doc.rect(x, y, cornerSize, cornerSize).fillColor('#059669').fill();
      };
      drawCorner(24, 24);
      drawCorner(pageWidth - 24 - cornerSize, 24);
      drawCorner(24, pageHeight - 24 - cornerSize);
      drawCorner(pageWidth - 24 - cornerSize, pageHeight - 24 - cornerSize);

      // Header
      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#059669')
        .text('ELEVATE WORKSHOPS & MASTERCLASSES', 0, 56, { align: 'center', characterSpacing: 2 });

      doc.font('Helvetica')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('Interactive Cohort Learning & Verified Educator Sessions', 0, 74, { align: 'center', characterSpacing: 0.5 });

      // Separator rule
      doc.moveTo(180, 92).lineTo(395, 92).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
      doc.moveTo(445, 92).lineTo(660, 92).lineWidth(0.8).strokeColor('#cbd5e1').stroke();
      doc.rect(416, 88, 8, 8).fillColor('#059669').fill();

      // Main Title
      doc.font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#0f172a')
        .text('CERTIFICATE OF PARTICIPATION', 0, 114, { align: 'center', characterSpacing: 1.5 });

      doc.font('Helvetica')
        .fontSize(11)
        .fillColor('#64748b')
        .text('This is proudly awarded to', 0, 150, { align: 'center' });

      // Learner Name
      doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#1e293b')
        .text(learnerName || 'Registered Learner', 0, 172, { align: 'center' });

      const nameWidth = Math.min(doc.widthOfString(learnerName || 'Registered Learner') + 40, 480);
      const nameStartX = (pageWidth - nameWidth) / 2;
      doc.moveTo(nameStartX, 210)
        .lineTo(nameStartX + nameWidth, 210)
        .lineWidth(1.5)
        .strokeColor('#059669')
        .stroke();

      // Inscription
      const bodyText =
        'for active participation, verified attendance, and successful engagement in the comprehensive live workshop:';

      doc.font('Helvetica')
        .fontSize(10.5)
        .fillColor('#334155')
        .text(bodyText, 120, 226, { align: 'center', lineGap: 4, width: pageWidth - 240 });

      // Workshop Title
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#059669')
        .text(`"${eventTitle}"`, 80, 276, { align: 'center', width: pageWidth - 160 });

      // Tagline
      const domainText = `Category: ${category} • Facilitated by: ${facilitatorName} • Verified Present`;
      doc.font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#64748b')
        .text(domainText, 0, 312, { align: 'center', characterSpacing: 0.5 });

      // Metadata section
      const metaLeft = 80;
      const metaY = 360;

      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#64748b')
        .text('CREDENTIAL METADATA', metaLeft, metaY);

      doc.font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(`Certificate ID: ${certificateNumber}`, metaLeft, metaY + 18)
        .text(`Completed On: ${formattedCompletion}`, metaLeft, metaY + 34)
        .text(`Issued On: ${formattedDate}`, metaLeft, metaY + 50)
        .text(`Registry: Official PostgreSQL Database Record`, metaLeft, metaY + 66);

      // Signatures
      const sig1X = 330;
      const sig2X = 510;
      const sigY = 405;

      doc.moveTo(sig1X, sigY).lineTo(sig1X + 140, sigY).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(facilitatorName, sig1X, sigY + 6, { width: 140, align: 'center' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Workshop Facilitator', sig1X, sigY + 18, { width: 140, align: 'center' });

      doc.moveTo(sig2X, sigY).lineTo(sig2X + 140, sigY).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text('ELEVATE Academic Board', sig2X, sigY + 6, { width: 140, align: 'center' });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Institutional Lead, WIT', sig2X, sigY + 18, { width: 140, align: 'center' });

      // QR Code
      const qrRightOffset = 80;
      const bottomY = 430;
      if (qrBuffer) {
        doc.image(qrBuffer, pageWidth - qrRightOffset - 85, bottomY - 30, { width: 85, height: 85 });
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569').text('SCAN TO VERIFY', pageWidth - qrRightOffset - 85, bottomY + 58, { width: 85, align: 'center' });
      }

      if (verificationUrl) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#059669').text('Verify Online:', pageWidth - qrRightOffset - 220, bottomY + 28, { width: 210, align: 'right' });
        doc.font('Helvetica').fontSize(7.5).fillColor('#059669').text(verificationUrl, pageWidth - qrRightOffset - 220, bottomY + 42, { width: 210, align: 'right', link: verificationUrl, underline: true });
      }

      // Footer
      doc.moveTo(80, 520).lineTo(pageWidth - 80, 520).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
        'ELEVATE Pedagogical Platform • Walchand Institute of Technology • Final Year BTech IT Project (Group B-07). ' +
        'This document certifies verified live workshop attendance and active participation. No unverified accreditations represented.',
        80, 532, { align: 'center', width: pageWidth - 160, lineGap: 2 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default { generateCertificatePdf, generateWorkshopCertificatePdf };
