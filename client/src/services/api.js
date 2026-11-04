import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const isLocalApiUrl = typeof configuredApiUrl === 'string'
  && /localhost|127\.0\.0\.1/.test(configuredApiUrl);

// Production always uses the same-origin /api proxy unless a non-local URL is set.
// A local .env value must not be baked into a production bundle.
const API_BASE_URL = import.meta.env.PROD
  ? (!configuredApiUrl || isLocalApiUrl ? '/api' : configuredApiUrl)
  : (configuredApiUrl || 'http://localhost:5000/api');

/**
 * Pre-configured Axios instance for ELEVATE API.
 * Uses HTTP-only cookie credentials by default.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please try again.';

    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Unable to connect to ELEVATE server. Please ensure the backend is running.';
    } else if (error.message) {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    enhancedError.code = error.code;
    return Promise.reject(enhancedError);
  }
);

export default api;
