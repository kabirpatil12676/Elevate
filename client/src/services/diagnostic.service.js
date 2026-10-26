import api from './api';

/**
 * Diagnostic Service
 *
 * Wraps /api/diagnostic endpoints for learner-needs questionnaire
 * and personalized rule-based recommendations.
 */
export const diagnosticService = {
  /**
   * Fetch the current authenticated learner's questionnaire answers and recommendations.
   * @returns {Promise<{ submitted: boolean, needs: object|null, recommendations: Array, catalogueNote: string|null }>}
   */
  async getLearnerNeeds() {
    const response = await api.get('/diagnostic/needs');
    return response.data;
  },

  /**
   * Submit or update the learning-needs questionnaire.
   * @param {object} payload - Questionnaire form data
   * @returns {Promise<{ success: boolean, submitted: boolean, needs: object, recommendations: Array, catalogueNote: string|null }>}
   */
  async submitLearnerNeeds(payload) {
    const response = await api.post('/diagnostic/submit', payload);
    return response.data;
  },

  /**
   * Fetch fresh recommendations based on the stored learner needs.
   * @returns {Promise<{ recommendations: Array, catalogueNote: string|null }>}
   */
  async getRecommendations() {
    const response = await api.get('/diagnostic/recommendations');
    return response.data;
  },
};

export default diagnosticService;
