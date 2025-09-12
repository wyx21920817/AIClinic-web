import request from './request';
import { API_ENDPOINTS } from './config';

// Audit API Service
export const auditAPI = {
  // Get audit logs with pagination and filters
  getAuditLogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);
      
      // Add filter parameters
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.action) queryParams.append('action', params.action);
      if (params.resource_type) queryParams.append('resource_type', params.resource_type);
      if (params.search_text) queryParams.append('search_text', params.search_text);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/logs?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get audit log statistics
  getAuditStats: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.user_id) queryParams.append('user_id', params.user_id);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/stats?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      throw error;
    }
  },

  // Export audit logs
  exportAuditLogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.action) queryParams.append('action', params.action);
      if (params.resource_type) queryParams.append('resource_type', params.resource_type);
      if (params.format) queryParams.append('format', params.format || 'csv');

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/export?${queryParams.toString()}`, {
        responseType: 'blob',
        headers: { Accept: 'text/csv,application/octet-stream,*/*' },
        timeout: 60000
      });
      return response.data || response;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  },

  // Get specific audit log by ID
  getAuditLogById: async (logId) => {
    try {
      const response = await request.get(`${API_ENDPOINTS.AUDIT}/logs/${logId}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  },

  // Get audit log summary
  getAuditSummary: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/summary?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      throw error;
    }
  }
};

// Error handling utilities for audit API
export const handleAuditAPIError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        throw new Error('Authentication required to access audit logs.');
      case 403:
        throw new Error('Access denied. Only administrators can view audit logs.');
      case 404:
        throw new Error('Audit log not found.');
      case 422:
        throw new Error(data?.detail || 'Invalid filter parameters.');
      case 500:
        throw new Error('Server error while fetching audit logs.');
      default:
        throw new Error(data?.message || `Request failed with status ${status}`);
    }
  } else if (error.request) {
    throw new Error('Network error. Please check your connection and try again.');
  } else {
    throw new Error(error.message || 'An unexpected error occurred.');
  }
};

export default {
  auditAPI,
  handleAuditAPIError
}; 