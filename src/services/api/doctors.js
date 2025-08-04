import request from './request';
import { API_ENDPOINTS } from './config';

export const doctorsApi = {
  // Get all doctors
  getDoctors: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.DOCTORS, { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data.items || [];
      }
      // Fallback for old format
      return response.data || [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return [];
    }
  },

  // Get doctor by ID
  getDoctor: (id) => 
    request.get(API_ENDPOINTS.DOCTOR_DETAIL(id)),

  // Create new doctor
  createDoctor: (data) => 
    request.post(API_ENDPOINTS.DOCTORS, data),

  // Update doctor
  updateDoctor: (id, data) => 
    request.put(API_ENDPOINTS.DOCTOR_DETAIL(id), data),

  // Delete doctor
  deleteDoctor: (id) => 
    request.delete(API_ENDPOINTS.DOCTOR_DETAIL(id)),
};
