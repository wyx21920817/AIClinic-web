import request from './request';
import { API_ENDPOINTS, API_BASE_URL } from './config';

// Professional Audit API Service
export const auditAPI = {
  // Get audit logs with enhanced pagination and professional filtering
  getAuditLogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Pagination parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.page_size) queryParams.append('page_size', params.page_size);
      
      // Date filters
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      
      // User filters
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.username) queryParams.append('username', params.username);
      
      // Action and resource filters
      if (params.action) queryParams.append('action', params.action);
      if (params.resource_type) queryParams.append('resource_type', params.resource_type);
      if (params.status) queryParams.append('status', params.status);
      
      // Professional filters
      if (params.category) queryParams.append('category', params.category);
      if (params.risk_level) queryParams.append('risk_level', params.risk_level);
      if (params.data_classification) queryParams.append('data_classification', params.data_classification);
      if (params.priority) queryParams.append('priority', params.priority);
      
      // Security filters
      if (params.patient_id) queryParams.append('patient_id', params.patient_id);
      if (params.session_id) queryParams.append('session_id', params.session_id);
      if (params.ip_address) queryParams.append('ip_address', params.ip_address);
      if (params.anomaly_detected !== undefined) queryParams.append('anomaly_detected', params.anomaly_detected);
      
      // Sorting
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.sort_order) queryParams.append('sort_order', params.sort_order);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/logs?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get comprehensive audit analytics
  getAuditAnalytics: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/analytics?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit analytics:', error);
      throw error;
    }
  },

  // Get audit summary statistics
  getAuditSummary: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.period) queryParams.append('period', params.period);

      const response = await request.get(`${API_ENDPOINTS.AUDIT}/summary?${queryParams.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      throw error;
    }
  },

  // Export audit logs in professional formats
  exportAuditLogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Date filters
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.format) queryParams.append('format', params.format || 'csv');

      // For blob responses, we need to use axios directly to get the full response
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUDIT}/export?${queryParams.toString()}`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  },

  // Get security alerts and anomalies
  getSecurityAlerts: async () => {
    try {
      const response = await request.get(`${API_ENDPOINTS.AUDIT}/security-alerts`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching security alerts:', error);
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

  // Professional utility functions
  utils: {
    // Get available filter options
    getFilterOptions: () => {
      return {
        categories: ['security', 'compliance', 'operational', 'clinical', 'administrative'],
        riskLevels: ['low', 'medium', 'high', 'critical'],
        dataClassifications: ['public', 'internal', 'confidential', 'restricted', 'phi'],
        priorities: ['low', 'medium', 'high', 'urgent'],
        statuses: ['success', 'failure', 'pending', 'cancelled'],
        eventTypes: ['authentication', 'data_access', 'data_modification', 'system_operation', 'security_event', 'compliance_event', 'ai_operation', 'admin_operation']
      };
    },

    // Format timestamp for display
    formatTimestamp: (timestamp, timezone = 'UTC') => {
      if (!timestamp) return 'N/A';
      try {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { 
          timeZone: timezone,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch (error) {
        return 'Invalid Date';
      }
    },

    // Get severity color for risk levels
    getRiskLevelColor: (riskLevel) => {
      const colors = {
        'low': '#52c41a',
        'medium': '#faad14',
        'high': '#ff7a45',
        'critical': '#ff4d4f'
      };
      return colors[riskLevel] || '#d9d9d9';
    },

    // Get priority color
    getPriorityColor: (priority) => {
      const colors = {
        'low': '#52c41a',
        'medium': '#faad14',
        'high': '#ff7a45',
        'urgent': '#ff4d4f'
      };
      return colors[priority] || '#d9d9d9';
    },

    // Get category icon
    getCategoryIcon: (category) => {
      const icons = {
        'security': '🔒',
        'compliance': '📋',
        'operational': '⚙️',
        'clinical': '🏥',
        'administrative': '👔'
      };
      return icons[category] || '📊';
    },

    // Format response time
    formatResponseTime: (responseTime) => {
      if (!responseTime) return 'N/A';
      if (responseTime < 1000) return `${responseTime}ms`;
      return `${(responseTime / 1000).toFixed(2)}s`;
    },

    // Check if event is security-related
    isSecurityEvent: (event) => {
      return event.category === 'security' || 
             event.risk_level === 'high' || 
             event.risk_level === 'critical' ||
             event.anomaly_detected ||
             event.event_type === 'security_event';
    },

    // Check if event is compliance-related
    isComplianceEvent: (event) => {
      return event.category === 'compliance' || 
             event.event_type === 'compliance_event' ||
             event.compliance_tags?.length > 0;
    }
  }
};

// Error handling utilities for audit API
export const handleAuditAPIError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 403:
        return {
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to view audit logs. Administrator access required.',
          details: data?.detail || 'Insufficient permissions'
        };
      
      case 404:
        return {
          type: 'warning',
          title: 'Not Found',
          message: 'The requested audit log data could not be found.',
          details: data?.detail || 'Resource not found'
        };
      
      case 500:
        return {
          type: 'error',
          title: 'Server Error',
          message: 'An internal server error occurred while processing your request.',
          details: data?.detail || 'Internal server error'
        };
      
      default:
        return {
          type: 'error',
          title: 'API Error',
          message: 'An error occurred while communicating with the server.',
          details: data?.detail || error.message
        };
    }
  }
  
  return {
    type: 'error',
    title: 'Network Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    details: error.message
  };
};

// Professional audit log constants
export const AUDIT_CONSTANTS = {
  // Event types
  EVENT_TYPES: {
    AUTHENTICATION: 'authentication',
    DATA_ACCESS: 'data_access',
    DATA_MODIFICATION: 'data_modification',
    SYSTEM_OPERATION: 'system_operation',
    SECURITY_EVENT: 'security_event',
    COMPLIANCE_EVENT: 'compliance_event',
    AI_OPERATION: 'ai_operation',
    ADMIN_OPERATION: 'admin_operation'
  },

  // Risk levels
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Data classifications
  DATA_CLASSIFICATIONS: {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted',
    PHI: 'phi'
  },

  // Categories
  CATEGORIES: {
    SECURITY: 'security',
    COMPLIANCE: 'compliance',
    OPERATIONAL: 'operational',
    CLINICAL: 'clinical',
    ADMINISTRATIVE: 'administrative'
  },

  // Priorities
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  },

  // Statuses
  STATUSES: {
    SUCCESS: 'success',
    FAILURE: 'failure',
    PENDING: 'pending',
    CANCELLED: 'cancelled'
  }
}; 