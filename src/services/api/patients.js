import request from './request';
import { API_ENDPOINTS } from './config';

export const patientsApi = {
  // Get all patients with pagination support
  getPatients: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.PATIENTS, { params });

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
      console.error('Error fetching patients:', error);
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10,
      };
    }
  },

  // Get patient by ID
  getPatient: (id) =>
    request.get(API_ENDPOINTS.PATIENT_DETAIL(id)),

  // Create new patient
  createPatient: async (data) => {
    try {
      const formData = new URLSearchParams();
      formData.append('patient_id', data.patient_id);
      formData.append('name', data.name);
      formData.append('gender', data.gender);
      formData.append('birth_date', data.birth_date.toISOString());
      if (data.contact_info) {
        formData.append('contact_info', JSON.stringify(data.contact_info));
      }

      const response = await request.post(API_ENDPOINTS.PATIENTS, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response;
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail === 'Patient ID already exists') {
        throw new Error('A patient with this ID already exists. Please use a different patient ID.');
      }
      throw error;
    }
  },

  // Update patient
  updatePatient: (id, data) => {
    const formData = new URLSearchParams();
    if (data.name) formData.append('name', data.name);
    if (data.gender) formData.append('gender', data.gender);
    if (data.birth_date) formData.append('birth_date', data.birth_date.toISOString());
    if (data.contact_info) formData.append('contact_info', JSON.stringify(data.contact_info));

    return request.put(API_ENDPOINTS.PATIENT_DETAIL(id), formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  // Delete patient
  deletePatient: (id) =>
    request.delete(API_ENDPOINTS.PATIENT_DETAIL(id)),

  // Get patient's ECG files
  getPatientEcgFiles: (patientId) =>
    request.get(API_ENDPOINTS.ECG_PATIENT_FILES(patientId)),

  // Get patient's ECG file
  getPatientEcgFile: (userId, fileId, options = {}) =>
    request.get(API_ENDPOINTS.ECG_FILE_DETAIL(userId, fileId), { params: options }),

  // Download patient's ECG file (DICOM)
  downloadEcgFile: (userId, fileId) =>
    request.get(
      `${API_ENDPOINTS.ECG_FILE_DETAIL(userId, fileId)}?download=true`,
      { responseType: 'blob' }
    ),

  // Upload ECG file
  uploadEcgFile: (userId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return request.post(API_ENDPOINTS.ECG_FILES(userId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Update ECG file
  updateEcgFile: (userId, fileId, data) => {
    const formData = new URLSearchParams();
    formData.append('notes', data.notes);
    formData.append('tags', data.tags);

    return request.put(API_ENDPOINTS.ECG_FILE_UPDATE(userId, fileId), formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  // Delete ECG file
  deleteEcgFile: (userId, fileId) =>
    request.delete(API_ENDPOINTS.ECG_FILE_UPDATE(userId, fileId)),

  // Get patient's diagnosis
  getPatientDiagnosis: (userId) =>
    request.get(API_ENDPOINTS.ECG_DIAGNOSIS(userId)),

  // Get doctor's patients with pagination support
  getDoctorPatients: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.DOCTOR_PATIENTS, { params });

      if (response && response.items) {
        return {
          items: response.items,
          total: response.total ?? 0,
          page: response.page ?? 1,
          page_size: response.page_size ?? params.page_size ?? 10,
        };
      }

      return {
        items: Array.isArray(response) ? response : [],
        total: Array.isArray(response) ? response.length : 0,
        page: params.page || 1,
        page_size: params.page_size || (Array.isArray(response) ? response.length : 10),
      };
    } catch (error) {
      console.error('Error fetching doctor patients:', error);
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10,
      };
    }
  },

  // Search patients from Orthanc server
  searchOrthancPatients: async (query) => {
    try {
      const response = await request.get('/api/orthanc/patients/search', { params: { query } });
      return response || { patients: [] };
    } catch (error) {
      console.error('Error searching Orthanc patients:', error);
      return { patients: [] };
    }
  },

  // Import patient from Orthanc to local database
  importOrthancPatient: async (patient) => {
    const formData = new URLSearchParams();
    formData.append('patient_id', patient.ID);
    formData.append('name', patient.MainDicomTags.PatientName || 'Anonymous');
    formData.append('gender', patient.MainDicomTags.PatientSex || 'Unknown');
    formData.append('birth_date', patient.MainDicomTags.PatientBirthDate || '1900-01-01');

    try {
      const response = await request.post('/api/patients', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Failed to import patient');
      }
      throw error;
    }
  },

};
