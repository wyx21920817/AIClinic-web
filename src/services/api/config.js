export const API_BASE_URL = 'http://54.79.224.136:8000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/login',
  LOGIN_MFA: '/api/login/mfa',
  REGISTER: '/api/register',
  
  // Users
  USERS: '/api/users',
  USER_DETAIL: (id) => `/api/user/${id}`,
  
  // Patients
  PATIENTS: '/api/patients',
  PATIENT_DETAIL: (id) => `/api/patients/${id}`,
  
  // ECG
  ECG_FILES: (userId) => `/api/ecg/${userId}/files`,
  ECG_FILE_DETAIL: (userId, fileId) => `/api/ecg/${userId}/instances/${fileId}`,
  ECG_DIAGNOSIS: (userId) => `/api/ecg/${userId}/diagnosis`,
  
  // Auth verification
  VERIFY_TOKEN: '/api/auth/verify-token',
  TEMP_TOKEN: '/api/auth/temp-token',
};
