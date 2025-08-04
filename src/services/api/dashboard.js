import request from './request';
import { API_ENDPOINTS } from './config';

export const dashboardApi = {
  // Get dashboard statistics
  getStats: () => 
    request.get(API_ENDPOINTS.DASHBOARD_STATS),

  // Get recent patients
  getRecentPatients: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.RECENT_PATIENTS, { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data.items || [];
      }
      // Fallback for old format
      return response.data || [];
    } catch (error) {
      console.error('Error fetching recent patients:', error);
      return [];
    }
  },

  // Get AI diagnosis alerts
  getAiAlerts: async (params = {}) => {
    try {
      const response = await request.get(API_ENDPOINTS.AI_DIAGNOSIS_ALERTS, { params });
      // Handle new paginated response format
      if (response.data && response.data.items) {
        return response.data.items || [];
      }
      // Fallback for old format
      return response.data || [];
    } catch (error) {
      console.error('Error fetching AI alerts:', error);
      return [];
    }
  },
};
