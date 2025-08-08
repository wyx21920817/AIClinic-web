import request from './request';
import { API_ENDPOINTS } from './config';

export const usersApi = {
  getUsers: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.USERS, { params });

      // Interceptor returns response.data already
      if (response && response.items) {
        return {
          items: response.items,
          total: response.total ?? 0,
          page: response.page ?? 1,
          page_size: response.page_size ?? params.page_size ?? 10,
        };
      }

      // Fallback for array response
      return {
        items: Array.isArray(response) ? response : [],
        total: Array.isArray(response) ? response.length : 0,
        page: params.page || 1,
        page_size: params.page_size || (Array.isArray(response) ? response.length : 10),
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10,
      };
    }
  },

  // Create new user
  createUser: (data) => {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('email', data.email);
    if (data.role) {
      formData.append('role', data.role);
    }

    return request.post(API_ENDPOINTS.USERS, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  // Update user
  updateUser: (userId, data) => {
    const formData = new URLSearchParams();
    if (data.username) formData.append('username', data.username);
    if (data.email) formData.append('email', data.email);
    if (data.password) formData.append('password', data.password);
    if (data.role) formData.append('role', data.role);

    return request.put(API_ENDPOINTS.USER_DETAIL(userId), formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  deleteUser: (userId) => request.delete(API_ENDPOINTS.USER_DETAIL(userId)),
  getUserDetail: (userId) => request.get(API_ENDPOINTS.USER_DETAIL(userId)),
};
