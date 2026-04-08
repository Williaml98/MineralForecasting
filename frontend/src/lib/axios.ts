import axios from 'axios';

/**
 * Pre-configured Axios instance for all backend API calls.
 *
 * Uses an empty baseURL so all requests go to the same origin as the frontend
 * (e.g. http://localhost:3000/api/...). Next.js rewrites in next.config.js
 * then proxy those requests to the Spring Boot backend — no CORS needed.
 */
const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auth endpoints that must never be auto-refreshed (would cause infinite loops)
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => url.includes(e));

    // Only attempt silent refresh for protected endpoints, not for auth routes
    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api.request(error.config);
      } catch {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
