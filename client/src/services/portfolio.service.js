import api from './api';

/**
 * ELEVATE Phase 5B — Portfolio & Growth Report Service
 *
 * Client API methods for consolidated growth reports, portfolio curation,
 * and learner self-reflections. All methods require authentication.
 */
export const portfolioService = {
  /**
   * Fetch consolidated Growth Report containing learning overview,
   * 6-stage evidence timeline, transparent metrics, reflections, and featured projects.
   */
  async getGrowthReport() {
    const response = await api.get('/portfolio/growth-report');
    return response.data;
  },

  /**
   * Fetch learner's curated personal portfolio.
   * @param {string} [journeyId] - Optional journey UUID filter
   */
  async getPortfolio(journeyId = null) {
    const url = journeyId ? `/portfolio?journeyId=${encodeURIComponent(journeyId)}` : '/portfolio';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Fetch all approved project submissions across enrolled journeys eligible for curation.
   */
  async getApprovedProjects() {
    const response = await api.get('/portfolio/approved-projects');
    return response.data;
  },

  /**
   * Feature an educator-approved submission in personal portfolio.
   * @param {object} payload - { submission_id, description }
   */
  async featureProject(payload) {
    const response = await api.post('/portfolio/feature', payload);
    return response.data;
  },

  /**
   * Remove an item from the featured portfolio without altering the underlying submission or educator feedback.
   * @param {string} submissionId - UUID of submission to unfeature
   */
  async unfeatureProject(submissionId) {
    const response = await api.delete(`/portfolio/feature/${encodeURIComponent(submissionId)}`);
    return response.data;
  },

  /**
   * Update personal project description or notes for a featured project.
   * @param {string} submissionId - UUID of featured submission
   * @param {object} payload - { description }
   */
  async updateFeaturedProject(submissionId, payload) {
    const response = await api.put(`/portfolio/feature/${encodeURIComponent(submissionId)}`, payload);
    return response.data;
  },

  /**
   * Fetch private reflections organized by journey and stage.
   * @param {string} [journeyId] - Optional journey UUID filter
   */
  async getReflections(journeyId = null) {
    const url = journeyId ? `/portfolio/reflections?journeyId=${encodeURIComponent(journeyId)}` : '/portfolio/reflections';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Save or edit a private self-reflection for a journey or specific stage.
   * @param {object} payload - { journey_id, stage_id, reflection_text, prompt, learned, challenge, evidence, improvement }
   */
  async saveReflection(payload) {
    const response = await api.put('/portfolio/reflections', payload);
    return response.data;
  },
};

export default portfolioService;
