import request from './request';
import { API_ENDPOINTS } from './config';

export const authApi = {
  // Login step 1 - Password verification
  login: (credentials) => 
    request.post(API_ENDPOINTS.LOGIN, credentials, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }),

  // Login step 2 - Email verification
  verifyMfa: (data) => 
    request.post(API_ENDPOINTS.LOGIN_MFA, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }),

  // Register new user
  register: (data) => 
    request.post(API_ENDPOINTS.REGISTER, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }),

  // Verify token
  verifyToken: () => 
    request.post(API_ENDPOINTS.VERIFY_TOKEN),

  // Get temporary token
  getTempToken: () => 
    request.get(API_ENDPOINTS.TEMP_TOKEN),
};
