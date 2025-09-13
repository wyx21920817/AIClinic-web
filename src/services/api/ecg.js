import request from './request';
import { API_ENDPOINTS, API_BASE_URL } from './config';

// ECG API Service
export const ecgAPI = {
  // Get ECG files for a specific patient
  getECGFiles: async (userId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.ECG}/${userId}/files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ECG files:', error);
      throw error;
    }
  },

  // Send ECG instance for AI diagnosis via server
  diagnoseInstance: async (userId, instanceId) => {
    try {
      const response = await request.post(`${API_ENDPOINTS.ECG}/${userId}/instances/${instanceId}/diagnose`);
      return response.data;
    } catch (error) {
      console.error('Error sending ECG instance for diagnosis:', error);
      throw error;
    }
  },

  // Upload ECG file
  uploadECGFile: async (userId, file, notes = '', tags = []) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', notes);
      formData.append('tags', JSON.stringify(tags));

      const response = await request.post(`${API_ENDPOINTS.ECG}/${userId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading ECG file:', error);
      throw error;
    }
  },

  // Get specific ECG file details
  getECGFile: async (userId, fileId, options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.download) params.append('download', 'true');
      if (options.waveform) params.append('waveform', 'true');

      const response = await request.get(
        `${API_ENDPOINTS.ECG}/${userId}/files/${fileId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching ECG file:', error);
      throw error;
    }
  },

  // Update ECG file metadata
  updateECGFile: async (userId, instanceId, notes, tags, approvedStatus = false) => {
    try {
      const formData = new URLSearchParams();
      formData.append('notes', notes);
      formData.append('tags', tags);
      formData.append('approved_status', approvedStatus);

      const response = await request.put(
        `${API_ENDPOINTS.ECG}/${userId}/files/${instanceId}`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating ECG file:', error);
      throw error;
    }
  },

  // Delete ECG file
  deleteECGFile: async (userId, instanceId) => {
    try {
      const response = await request.delete(`${API_ENDPOINTS.ECG}/${userId}/files/${instanceId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting ECG file:', error);
      throw error;
    }
  },

  // Get AI diagnosis results
  getDiagnosis: async (userId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.ECG}/${userId}/diagnosis`);
      return response.data;
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      throw error;
    }
  },

  // Get ECG file by instance ID (for Orthanc integration)
  getECGInstance: async (userId, instanceId, download = true) => {
    try {
      const params = new URLSearchParams();
      if (download) params.append('download', 'true');

      const response = await request.get(
        `${API_ENDPOINTS.ECG}/${userId}/instances/${instanceId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching ECG instance:', error);
      throw error;
    }
  },

  // Get patient ECG files
  getPatientECGFiles: async (patientId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.ECG}/patient/${patientId}/files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient ECG files:', error);
      throw error;
    }
  }
};

// Doctor Feedback API Service
export const feedbackAPI = {
  // Submit doctor feedback
  submitFeedback: async (feedbackData) => {
    try {
      const response = await request.post(`${API_ENDPOINTS.FEEDBACK}/submit`, feedbackData);
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // Get feedback history
  getFeedbackHistory: async (ecgFileId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.FEEDBACK}/history/${ecgFileId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback history:', error);
      throw error;
    }
  },

  // Update feedback
  updateFeedback: async (feedbackId, feedbackData) => {
    try {
      const response = await request.put(`${API_ENDPOINTS.FEEDBACK}/${feedbackId}`, feedbackData);
      return response.data;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }
};

// PDF Export API Service
export const pdfAPI = {
  // Generate PDF report
  generateReport: async (reportData) => {
    try {
      const response = await request.post(`${API_ENDPOINTS.PDF}/generate`, reportData, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  },

  // Get report templates
  getReportTemplates: async () => {
    try {
      const response = await request.get(`${API_ENDPOINTS.PDF}/templates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw error;
    }
  },

  // Save report template
  saveReportTemplate: async (templateData) => {
    try {
      const response = await request.post(`${API_ENDPOINTS.PDF}/templates`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error saving report template:', error);
      throw error;
    }
  }
};

// AI Diagnosis API Service - Connected to AIClinic Engine Server
export const aiDiagnosisAPI = {
  // Get AI diagnosis for ECG file from AIClinic engine
  getDiagnosis: async (instanceId) => {
    try {
      // Connect to AIClinic engine server
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ecg/diagnose/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI Diagnosis response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching AI diagnosis:', error);
      throw error;
    }
  },

  // Request new AI diagnosis from AIClinic engine
  requestDiagnosis: async (instanceId, options = {}) => {
    try {
      console.log('Requesting AI diagnosis for instance:', instanceId);
      
      // Connect to AIClinic engine server
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ecg/diagnose/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI Diagnosis request response:', data);
      return data;
    } catch (error) {
      console.error('Error requesting AI diagnosis:', error);
      throw error;
    }
  },

  // Get XAI interpretation from AIClinic engine
  getXAIInterpretation: async (instanceId, diseases = []) => {
    try {
      console.log('Requesting XAI interpretation for instance:', instanceId, 'diseases:', diseases);
      
      const form = new URLSearchParams();
      diseases.forEach(disease => form.append('disease', disease));
      
      // Connect to AIClinic engine server for XAI
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ecg/interpretation/${instanceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('XAI Interpretation response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching XAI interpretation:', error);
      throw error;
    }
  },

  // Get diagnosis confidence scores
  getConfidenceScores: async (ecgFileId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.AI_DIAGNOSIS}/${ecgFileId}/confidence`);
      return response.data;
    } catch (error) {
      console.error('Error fetching confidence scores:', error);
      throw error;
    }
  },

  // Get highlighted leads
  getHighlightedLeads: async (ecgFileId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.AI_DIAGNOSIS}/${ecgFileId}/leads`);
      return response.data;
    } catch (error) {
      console.error('Error fetching highlighted leads:', error);
      throw error;
    }
  },

  // Get interpretation PDF
  getInterpretationPDF: async (instanceId, diseases = []) => {
    try {
      console.log('Requesting interpretation PDF for instance:', instanceId, 'diseases:', diseases);
      
      const form = new URLSearchParams();
      diseases.forEach(disease => form.append('disease', disease));
      
      // Connect to AIClinic engine server for PDF generation
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/ecg/interpretation-pdf/${instanceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Interpretation PDF response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching interpretation PDF:', error);
      throw error;
    }
  }
};

// Error handling utilities
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 401:
        throw new Error('Authentication required. Please log in again.');
      case 403:
        throw new Error('Access denied. You do not have permission to perform this action.');
      case 404:
        throw new Error('Resource not found. Please check your request.');
      case 422:
        throw new Error(data?.detail || 'Validation error. Please check your input.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(data?.message || `Request failed with status ${status}`);
    }
  } else if (error.request) {
    // Network error
    throw new Error('Network error. Please check your connection and try again.');
  } else {
    // Other error
    throw new Error(error.message || 'An unexpected error occurred.');
  }
};

// CORS handling
export const handleCORSError = (error) => {
  if (error.message.includes('CORS')) {
    console.error('CORS Error:', error);
    throw new Error('Cross-origin request blocked. Please check server configuration.');
  }
  throw error;
};

// Authentication error handling
export const handleAuthError = (error) => {
  if (error.response?.status === 401) {
    // Redirect to login or refresh token
    window.location.href = '/login';
    return;
  }
  throw error;
};

export default {
  ecgAPI,
  feedbackAPI,
  pdfAPI,
  aiDiagnosisAPI,
  handleAPIError,
  handleCORSError,
  handleAuthError
};
