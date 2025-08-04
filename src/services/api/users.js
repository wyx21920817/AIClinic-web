import request from './request';
import { API_ENDPOINTS } from './config';

export const usersApi = {
  getUsers: async () => {
    try {
      const response = await request.get('/api/users');
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data.items || [];
      }
      // Fallback for old format
      return response.data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },
  deleteUser: (userId) => request.delete(`/api/user/${userId}`),
  updateUser: (userId, data) => request.put(`/api/user/${userId}`, data),
  getUserDetail: (userId) => request.get(`/api/user/${userId}`),
};
