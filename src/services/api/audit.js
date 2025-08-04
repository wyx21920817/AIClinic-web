import request from './request';

export const auditApi = {
  // Get audit logs with pagination support
  getAuditLogs: async (params = {}) => {
    try {
      const response = await request.get('/api/audit_logs', { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data;
      }
      // Fallback for old format
      return { items: response.data || [], total: 0, page: 0, page_size: 0 };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { items: [], total: 0, page: 0, page_size: 0 };
    }
  },

  // Get audit logs for a specific user
  getUserAuditLogs: async (userId, params = {}) => {
    try {
      const response = await request.get(`/api/audit_logs/user/${userId}`, { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data;
      }
      // Fallback for old format
      return { items: response.data || [], total: 0, page: 0, page_size: 0 };
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      return { items: [], total: 0, page: 0, page_size: 0 };
    }
  },

  // Get audit logs for a specific patient
  getPatientAuditLogs: async (patientId, params = {}) => {
    try {
      const response = await request.get(`/api/audit_logs/patient/${patientId}`, { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data;
      }
      // Fallback for old format
      return { items: response.data || [], total: 0, page: 0, page_size: 0 };
    } catch (error) {
      console.error('Error fetching patient audit logs:', error);
      return { items: [], total: 0, page: 0, page_size: 0 };
    }
  },
}; 