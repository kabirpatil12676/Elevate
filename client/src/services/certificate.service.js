import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * ELEVATE Phase 5C — Certificate Service
 *
 * Client API wrapper for eligibility, issuance, retrieval, PDF downloading,
 * email retry, and public authenticity verification.
 */
export const certificateService = {
  /**
   * Check learner's certificate eligibility for a given Growth Journey.
   * @param {string} journeyId - UUID of the journey
   */
  async getEligibility(journeyId) {
    const response = await api.get(`/certificates/eligibility/${encodeURIComponent(journeyId)}`);
    return response.data;
  },

  /**
   * Request authoritative certificate issuance for an eligible Growth Journey.
   * @param {string} journeyId - UUID of the journey
   */
  async issueCertificate(journeyId) {
    const response = await api.post(`/certificates/issue/${encodeURIComponent(journeyId)}`);
    return response.data;
  },

  /**
   * Fetch all issued certificates for the authenticated learner.
   */
  async getMyCertificates() {
    const response = await api.get('/certificates');
    return response.data;
  },

  /**
   * Verify certificate authenticity publicly (no login required).
   * @param {string} verificationToken - Unpredictable verification token
   */
  async verifyCertificatePublic(verificationToken) {
    const response = await api.get(`/certificates/verify/${encodeURIComponent(verificationToken)}`);
    return response.data;
  },

  /**
   * Trigger email delivery retry for an existing certificate.
   * @param {string} certificateId - Certificate UUID
   */
  async retryEmail(certificateId) {
    const response = await api.post(`/certificates/${encodeURIComponent(certificateId)}/send-email`);
    return response.data;
  },

  /**
   * Get direct authenticated download URL for a certificate PDF.
   * @param {string} certificateId - Certificate UUID
   */
  getDownloadUrl(certificateId) {
    return `${API_BASE_URL}/certificates/${encodeURIComponent(certificateId)}/download`;
  },

  /**
   * Download certificate PDF directly as a blob.
   * @param {string} certificateId - Certificate UUID
   * @param {string} [filename] - Suggested download filename
   */
  async downloadCertificatePdf(certificateId, filename = 'ELEVATE_Certificate.pdf') {
    const response = await api.get(`/certificates/${encodeURIComponent(certificateId)}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  },
};

export default certificateService;
