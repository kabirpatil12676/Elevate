import api from './api';

export const authService = {
  /**
   * Register a new user. Public registration always assigns the 'learner' role.
   * @param {{ name: string, email: string, password: string }} data
   */
  async register({ name, email, password }) {
    const response = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'learner', // Enforce learner role for public registration
    });
    return response.data;
  },

  /**
   * Log in an existing user.
   * @param {{ email: string, password: string }} credentials
   */
  async login({ email, password }) {
    const response = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    return response.data;
  },

  /**
   * Retrieve the current authenticated user's profile.
   * Uses HTTP-only session cookie sent automatically via withCredentials: true.
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Log out the user and clear the server session cookie.
   */
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export default authService;
