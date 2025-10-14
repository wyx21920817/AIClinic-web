import request from './request';
import { API_ENDPOINTS } from './config';
import { getUserDataFromToken } from '../../utils/jwt';

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
  verifyToken: async () => {
    const resp = await request.post(API_ENDPOINTS.VERIFY_TOKEN);
    // Always attach username derived from JWT if backend omits it
    const { username } = getUserDataFromToken();
    if (resp && typeof resp === 'object') {
      return { ...resp, username: resp.username || username };
    }
    // For non-object responses (e.g., "ok"), return a normalized shape
    return { ok: !!resp, username };
  },

  // Get temporary token
  getTempToken: () => 
    request.get(API_ENDPOINTS.TEMP_TOKEN),
};
