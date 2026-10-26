import api from './api';

/**
 * Journey (Course Catalogue) Service
 *
 * Wraps GET /api/journeys and GET /api/journeys/:id.
 * Both endpoints are public — no authentication required.
 */
export const journeyService = {
  /**
   * Fetch all published journeys for the course catalogue.
   * @returns {Promise<Array>} Array of journey objects
   */
  async getAllJourneys() {
    const response = await api.get('/journeys');
    // API shape: { success: true, journeys: [...] }
    return response.data.journeys;
  },

  /**
   * Fetch a single journey with its stages.
   * @param {string} id - Journey UUID
   * @returns {Promise<{ journey: object, stages: Array }>}
   */
  async getJourneyById(id) {
    const response = await api.get(`/journeys/${id}`);
    // API shape: { success: true, journey: {...}, stages: [...] }
    return { journey: response.data.journey, stages: response.data.stages };
  },

  /**
   * Enroll the current authenticated user in a journey.
   * Requires a valid session cookie.
   * @param {string} id - Journey UUID
   * @returns {Promise<object>} Enrollment record
   */
  async enrollInJourney(id) {
    const response = await api.post(`/journeys/${id}/enroll`);
    return response.data.enrollment;
  },
};

export default journeyService;
