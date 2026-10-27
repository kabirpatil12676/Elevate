/**
 * ELEVATE Phase 4A — Educator Service
 *
 * Client API wrapper for educator Growth Journey authoring,
 * 6-stage management, video capsule curation, and admin publication.
 */

import api from './api';

export const educatorService = {
  /**
   * Fetch all journeys manageable by the current user.
   * @returns {Promise<Array>} List of journeys with stage and lesson counts
   */
  async getMyJourneys() {
    const res = await api.get('/educator/journeys');
    return res.data.journeys;
  },

  /**
   * Fetch full journey authoring details including all 6 stages and lessons.
   * @param {string} id - Journey UUID
   * @returns {Promise<{ journey: object, stages: Array }>}
   */
  async getManageJourney(id) {
    const res = await api.get(`/educator/journeys/${id}`);
    return res.data;
  },

  /**
   * Create a new Growth Journey draft. Automatically creates the 6 canonical stages.
   * @param {object} data - { title, description, category, skill_domain, difficulty, duration_hours, badge, thumbnail_url }
   * @returns {Promise<object>} Created journey and initial stages
   */
  async createDraftJourney(data) {
    const res = await api.post('/educator/journeys', data);
    return res.data;
  },

  /**
   * Update journey metadata (educators cannot publish).
   * @param {string} id - Journey UUID
   * @param {object} data - Updated metadata fields
   * @returns {Promise<object>} Updated journey
   */
  async updateJourneyMetadata(id, data) {
    const res = await api.put(`/educator/journeys/${id}`, data);
    return res.data;
  },

  /**
   * Delete a draft journey and its stages.
   * @param {string} id - Journey UUID
   * @returns {Promise<object>}
   */
  async deleteDraftJourney(id) {
    const res = await api.delete(`/educator/journeys/${id}`);
    return res.data;
  },

  /**
   * Update stage title or description.
   * @param {string} stageId - Stage UUID
   * @param {object} data - { title, description }
   * @returns {Promise<object>} Updated stage
   */
  async updateStage(stageId, data) {
    const res = await api.put(`/educator/stages/${stageId}`, data);
    return res.data;
  },

  /**
   * Add a video lesson (capsule) to a stage.
   * @param {string} stageId - Stage UUID
   * @param {object} data - { title, description, content_url, duration_min }
   * @returns {Promise<object>} Created lesson
   */
  async addLesson(stageId, data) {
    const res = await api.post(`/educator/stages/${stageId}/lessons`, data);
    return res.data;
  },

  /**
   * Update a lesson's metadata or video URL.
   * @param {string} lessonId - Capsule UUID
   * @param {object} data - { title, description, content_url, duration_min, order_index }
   * @returns {Promise<object>} Updated lesson
   */
  async updateLesson(lessonId, data) {
    const res = await api.put(`/educator/lessons/${lessonId}`, data);
    return res.data;
  },

  /**
   * Delete a lesson.
   * @param {string} lessonId - Capsule UUID
   * @returns {Promise<object>}
   */
  async deleteLesson(lessonId) {
    const res = await api.delete(`/educator/lessons/${lessonId}`);
    return res.data;
  },

  /**
   * Toggle journey publication (Administrator only).
   * @param {string} id - Journey UUID
   * @param {'draft' | 'published' | 'archived'} status
   * @returns {Promise<object>}
   */
  async publishJourney(id, status = 'published') {
    const res = await api.patch(`/educator/journeys/${id}/publish`, { status });
    return res.data;
  },

  /**
   * Create a practical activity within a stage.
   * @param {string} stageId - Stage UUID
   * @param {object} data - { title, instructions, submission_type, is_required, due_date, max_attempts }
   */
  async createActivity(stageId, data) {
    const res = await api.post(`/educator/stages/${stageId}/activities`, data);
    return res.data;
  },

  /**
   * Update an existing practical activity.
   * @param {string} activityId - Activity UUID
   * @param {object} data - Updated fields
   */
  async updateActivity(activityId, data) {
    const res = await api.put(`/educator/activities/${activityId}`, data);
    return res.data;
  },

  /**
   * Delete or archive an activity.
   * @param {string} activityId - Activity UUID
   */
  async deleteActivity(activityId) {
    const res = await api.delete(`/educator/activities/${activityId}`);
    return res.data;
  },

  /**
   * List submissions across educator's journeys.
   * @param {object} params - { status, journey_id, activity_id }
   */
  async getSubmissions(params = {}) {
    const res = await api.get('/educator/submissions', { params });
    return res.data.submissions;
  },

  /**
   * Get full submission details, learner information, earlier attempts, and feedback.
   * @param {string} submissionId - Submission UUID
   */
  async getSubmissionDetails(submissionId) {
    const res = await api.get(`/educator/submissions/${submissionId}`);
    return res.data.submission;
  },

  /**
   * Review a submission (approve, request revision, or mark under review) with feedback.
   * @param {string} submissionId - Submission UUID
   * @param {object} data - { status: 'approved' | 'revision_requested' | 'under_review', comments, overall_score }
   */
  async reviewSubmission(submissionId, data) {
    const res = await api.post(`/educator/submissions/${submissionId}/review`, data);
    return res.data;
  },
};

export default educatorService;
