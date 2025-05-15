import request from './request';
import { API_ENDPOINTS } from './config';

export const dashboardApi = {
  // Get dashboard statistics
  getStats: () => 
    request.get(API_ENDPOINTS.DASHBOARD_STATS),

  // Get recent patients
  getRecentPatients: (params = {}) => 
    request.get(API_ENDPOINTS.RECENT_PATIENTS, { params }),

  // Get AI diagnosis alerts
  getAiAlerts: (params = {}) => 
    request.get(API_ENDPOINTS.AI_DIAGNOSIS_ALERTS, { params }),
};
