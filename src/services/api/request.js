import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // List of paths that don't require a token
    const noAuthPaths = [
      '/api/login',
      '/api/login/mfa',
      '/api/register'
    ];

    // Check if the current request path requires a token
    const needsAuth = !noAuthPaths.some(path => config.url.includes(path));

    if (needsAuth) {
      const token = localStorage.getItem('token');
      if (!token) {
        // If token is required but not present, redirect to login page
        window.location.href = '/login';
        throw new Error('No token available');
      }
      // Ensure headers object exists
      config.headers = config.headers || {};
      // Set Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // For arraybuffer requests, ensure correct headers are set
    if (config.responseType === 'arraybuffer') {
      config.headers = config.headers || {};
      config.headers['Accept'] = '*/*';
    }

    console.log('Request interceptor - Config:', config);
    console.log('Request interceptor - Final headers:', config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden');
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        default:
          console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.request);
    } else {
      // Other errors
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const request = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};

export default request;
