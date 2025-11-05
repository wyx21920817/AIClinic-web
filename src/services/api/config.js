// API base URL and chat API URL
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ;
export const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL ;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/login',
  LOGIN_MFA: '/api/login/mfa',
  REGISTER: '/api/register',

  // Users
  USERS: '/api/users',
  USER_DETAIL: (id) => `/api/user/${id}`,

  // Doctors
  DOCTORS: '/api/doctors',
  DOCTOR_DETAIL: (id) => `/api/doctors/${id}`,
  DOCTOR_PATIENTS: '/api/doctors/patients',

  // Patients
  PATIENTS: '/api/patients',
  PATIENT_DETAIL: (id) => `/api/patients/${id}`,

  // ECG
  ECG: '/api/ecg',
  ECG_FILES: (userId) => `/api/ecg/${userId}/files`,
  ECG_FILE_DETAIL: (userId, fileId) => `/api/ecg/${userId}/files/${fileId}`,
  ECG_INSTANCE: (userId, instanceId) => `/api/ecg/${userId}/instances/${instanceId}`,
  ECG_FILE_UPDATE: (userId, fileId) => `/api/ecg/${userId}/files/${fileId}`,
  ECG_DIAGNOSIS: (userId) => `/api/ecg/${userId}/diagnosis`,
  ECG_PATIENT_FILES: (patientId) => `/api/ecg/patient/${patientId}/files`,

  // AI Diagnosis
  AI_DIAGNOSIS: '/api/ai-diagnosis',

  // Doctor Feedback
  FEEDBACK: '/api/feedback',

  // PDF Export
  PDF: '/api/pdf',

  // Audit Logs
  AUDIT: '/api/audit',

  // Auth verification
  VERIFY_TOKEN: '/api/auth/verify-token',
  TEMP_TOKEN: '/api/auth/temp-token',

  // Chat
  CHAT: '/api/chat',
};
