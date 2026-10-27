/**
 * ELEVATE Phase 6A — Event & Workshop API Service
 */

import api from './api';

export const eventService = {
  /**
   * Fetch published events for public browse (supports ?category=&status=&search=)
   */
  async getEvents(params = {}) {
    const response = await api.get('/events', { params });
    return response.data;
  },

  /**
   * Fetch single event details by ID
   */
  async getEventDetail(eventId) {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },

  /**
   * Learner registers for an event
   */
  async registerForEvent(eventId) {
    const response = await api.post(`/events/${eventId}/register`);
    return response.data;
  },

  /**
   * Learner cancels their registration
   */
  async cancelRegistration(eventId) {
    const response = await api.delete(`/events/${eventId}/register`);
    return response.data;
  },

  /**
   * Learner gets their own registrations
   */
  async getMyRegistrations() {
    const response = await api.get('/events/my-registrations');
    return response.data;
  },

  /**
   * Educator / Admin gets events they created (or all for admin)
   */
  async getMyEvents() {
    const response = await api.get('/events/my-events');
    return response.data;
  },

  /**
   * Educator / Admin creates a new draft event
   */
  async createEvent(eventData) {
    const response = await api.post('/events', eventData);
    return response.data;
  },

  /**
   * Educator / Admin updates an event
   */
  async updateEvent(eventId, eventData) {
    const response = await api.put(`/events/${eventId}`, eventData);
    return response.data;
  },

  /**
   * Educator / Admin publishes a draft event
   */
  async publishEvent(eventId) {
    const response = await api.patch(`/events/${eventId}/publish`);
    return response.data;
  },

  /**
   * Educator / Admin cancels an event
   */
  async cancelEvent(eventId) {
    const response = await api.patch(`/events/${eventId}/cancel`);
    return response.data;
  },

  /**
   * Educator / Admin deletes a draft event
   */
  async deleteEvent(eventId) {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  },

  /**
   * Educator / Admin views attendee registrations for an event
   */
  async getEventRegistrations(eventId) {
    const response = await api.get(`/events/${eventId}/registrations`);
    return response.data;
  },

  /**
   * Educator / Admin marks an event completed
   */
  async completeEvent(eventId, force = false) {
    const response = await api.patch(`/events/${eventId}/complete`, { force });
    return response.data;
  },

  /**
   * Educator / Admin records attendance for an event
   */
  async recordAttendance(eventId, records, force = false) {
    const response = await api.post(`/events/${eventId}/attendance`, { records, force });
    return response.data;
  },

  /**
   * Educator / Admin gets attendance records for an event
   */
  async getEventAttendance(eventId) {
    const response = await api.get(`/events/${eventId}/attendance`);
    return response.data;
  },

  /**
   * Learner checks workshop certificate eligibility
   */
  async getCertificateEligibility(eventId) {
    const response = await api.get(`/events/${eventId}/certificate/eligibility`);
    return response.data;
  },

  /**
   * Learner requests certificate issuance for a completed workshop
   */
  async issueCertificate(eventId) {
    const response = await api.post(`/events/${eventId}/certificate/issue`);
    return response.data;
  },

  async issueWorkshopCertificate(eventId) {
    return this.issueCertificate(eventId);
  },

  /**
   * Learner / Admin downloads workshop certificate PDF by event (own certificate)
   */
  async downloadCertificate(eventId) {
    const response = await api.get(`/events/${eventId}/certificate/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Download a workshop certificate PDF by certificate id and trigger a browser save.
   */
  async downloadWorkshopCertificatePdf(certificateId, filename = 'ELEVATE_Workshop_Certificate.pdf') {
    const response = await api.get(`/events/certificates/${encodeURIComponent(certificateId)}/download`, {
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

  /**
   * Learner gets all issued workshop certificates
   */
  async getMyWorkshopCertificates() {
    const response = await api.get('/events/certificates/my-certificates');
    return response.data;
  },

  /**
   * Educator / Admin revokes a workshop certificate
   */
  async revokeCertificate(eventId, certificateId, reason) {
    const response = await api.patch(`/events/${eventId}/certificate/${certificateId}/revoke`, { reason });
    return response.data;
  },

  /**
   * Retry certificate email delivery
   */
  async retryCertificateEmail(eventId, certificateId) {
    const response = await api.post(`/events/${eventId}/certificate/${certificateId}/send-email`);
    return response.data;
  },

  async retryWorkshopCertificateEmail(certificateId) {
    const response = await api.post(`/events/certificates/${encodeURIComponent(certificateId)}/retry-email`);
    return response.data;
  },
};

export default eventService;

