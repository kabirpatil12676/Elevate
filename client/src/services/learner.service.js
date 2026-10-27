import api from './api';

/**
 * Learner Service
 *
 * Provides API client methods for learner lesson player and progress tracking.
 * All methods require an authenticated session and active journey enrollment.
 */
export const learnerService = {
  /**
   * Fetch complete player data for an enrolled journey (stages, lessons/capsules, enrollment status).
   * @param {string} journeyId - UUID of the journey
   */
  async getJourneyPlayerData(journeyId) {
    const response = await api.get(`/learn/${journeyId}`);
    return response.data;
  },

  /**
   * Fetch lesson and stage completion progress for an enrolled journey.
   * @param {string} journeyId - UUID of the journey
   */
  async getJourneyProgress(journeyId) {
    const response = await api.get(`/learn/${journeyId}/progress`);
    return response.data;
  },

  /**
   * Mark a specific lesson (video capsule) as completed.
   * @param {string} journeyId - UUID of the journey
   * @param {string} capsuleId - UUID of the lesson/capsule
   */
  async markLessonComplete(journeyId, capsuleId) {
    const response = await api.post(`/learn/${journeyId}/lessons/${capsuleId}/complete`);
    return response.data;
  },

  /**
   * Fetch enrolled journeys with progress and next recommended lessons for learner dashboard.
   */
  async getLearnerDashboard() {
    const response = await api.get('/learn/dashboard');
    return response.data;
  },

  /**
   * Submit practical activity work (written response, project URL, or both).
   * @param {string} journeyId - UUID of the journey
   * @param {string} activityId - UUID of the activity
   * @param {object} data - { content_text, content_url }
   */
  async submitActivity(journeyId, activityId, data) {
    const response = await api.post(`/learn/${journeyId}/activities/${activityId}/submit`, data);
    return response.data;
  },

  /**
   * Fetch all submission attempts and feedback history for a practical activity.
   * @param {string} journeyId - UUID of the journey
   * @param {string} activityId - UUID of the activity
   */
  async getActivitySubmissions(journeyId, activityId) {
    const response = await api.get(`/learn/${journeyId}/activities/${activityId}/submissions`);
    return response.data;
  },
};

export default learnerService;
