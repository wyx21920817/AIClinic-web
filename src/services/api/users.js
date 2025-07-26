import request from './request';
import { API_ENDPOINTS } from './config';

export const usersApi = {
  getUsers: () => request.get('/api/users'),
  deleteUser: (userId) => request.delete(`/api/user/${userId}`),
  updateUser: (userId, data) => request.put(`/api/user/${userId}`, data),
  getUserDetail: (userId) => request.get(`/api/user/${userId}`),
};
