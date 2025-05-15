import request from './request';
import { API_ENDPOINTS } from './config';

export const doctorsApi = {
  // Get all doctors
  getDoctors: (params = {}) => 
    request.get(API_ENDPOINTS.DOCTORS, { params }),

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
