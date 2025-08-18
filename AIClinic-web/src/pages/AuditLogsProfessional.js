import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  message,
  Space,
  Tag,
  Alert,
  Input,
  DatePicker,
  Select,
  Tooltip,
  Badge,
  Modal,
  Descriptions,
  Statistic,
  Progress,
  Row,
  Col,
  Tabs,
  List,
  Avatar,
  Timeline,
  Drawer,
  Form,
  Empty
} from 'antd';
import {
  ReloadOutlined,
  SecurityScanOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LockOutlined,
  BarChartOutlined,
  AlertOutlined,
  FileTextOutlined,
  DashboardOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { auditAPI, handleAuditAPIError } from '../services/api/audit';
import { API_BASE_URL } from '../services/api/config';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const AuditLogsProfessional = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState({});

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0
  });

  const [filters, setFilters] = useState({
    username: '',
    category: '',
    risk_level: '',
    status: ''
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const token = localStorage.getItem('token');
    
    if (userData.role !== 'admin') {
      setError('Access denied. Only administrators can view audit logs.');
      return;
    }
    
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }
    
    loadAllData();
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading all audit data...');
      
      // First fetch users, then audit logs (since logs depend on user data)
      await fetchUsers();
      await fetchAuditLogs();
      
      // Fetch additional data in parallel
      await Promise.all([
        fetchAnalytics(),
        fetchSummary(),
        fetchSecurityAlerts()
      ]);
      
      console.log('All audit data loaded successfully');
    } catch (error) {
      console.error('Error loading audit data:', error);
      const errorInfo = handleAuditAPIError(error);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    console.log('Refreshing audit data...');
    await loadAllData();
    message.success('Audit logs refreshed successfully');
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users?page_size=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.items && Array.isArray(data.items)) {
          const userMap = {};
          data.items.forEach(user => {
            if (user.id && user.username) {
              userMap[user.id] = {
                username: user.username,
                email: user.email || '',
                role: user.role || 'user'
              };
            }
          });
          setUsers(userMap);
        }
      } else {
        console.error('Failed to fetch users:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      console.log('Fetching audit logs with params:', {
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters
      });
      
      const response = await auditAPI.getAuditLogs({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters
      });
      
      console.log('Audit logs response:', response);
      
      if (response && response.items) {
        // Enhance logs with user information
        const enhancedLogs = response.items.map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role
          };
        });
        
        console.log('Enhanced audit logs:', enhancedLogs);
        
        // Debug: Check event data structure
        if (enhancedLogs.length > 0) {
          console.log('Sample audit log entry:', enhancedLogs[0]);
          console.log('Available fields:', Object.keys(enhancedLogs[0]));
          console.log('Event action field:', enhancedLogs[0].action);
          console.log('Event category field:', enhancedLogs[0].category);
          console.log('Event status field:', enhancedLogs[0].status);
          console.log('Event risk_level field:', enhancedLogs[0].risk_level);
        }
        
        setAuditLogs(enhancedLogs);
        setPagination(prev => ({ ...prev, total: response.pagination?.total || enhancedLogs.length }));
      } else {
        console.warn('No audit logs found or invalid response format:', response);
        setAuditLogs([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      message.error('Failed to load audit logs. Please try again.');
      throw error;
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await auditAPI.getAuditAnalytics();
      setAnalytics(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await auditAPI.getAuditSummary({ period: 'last_24_hours' });
      setSummary(response);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      const response = await auditAPI.getSecurityAlerts();
      setSecurityAlerts(response.alerts || []);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      username: '',
      category: '',
      risk_level: '',
      status: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const exportLogs = async () => {
    try {
      // Get all audit logs for export
      const allLogs = await auditAPI.getAuditLogs({ 
        page: 1, 
        page_size: 1000 // Get a large number of logs
      });
      
      if (!allLogs || !allLogs.items || allLogs.items.length === 0) {
        message.warning('No audit logs to export');
        return;
      }
      
      // Create CSV content
      const csvHeaders = [
        'Timestamp', 'Event Type', 'User ID', 'Username', 'Action', 
        'Resource Type', 'Resource ID', 'Status', 'Details', 'Category',
        'Priority', 'Risk Level', 'Data Classification', 'IP Address',
        'Session ID', 'Patient ID', 'Response Time', 'Error Code',
        'Anomaly Detected', 'Business Unit', 'Regulatory Requirement'
      ];
      
      const csvRows = allLogs.items.map(log => [
        log.timestamp ? new Date(log.timestamp).toISOString() : '',
        log.event_type || '',
        log.user_id || '',
        log.username || '',
        log.action || '',
        log.resource_type || '',
        log.resource_id || '',
        log.status || '',
        log.details || '',
        log.category || '',
        log.priority || '',
        log.risk_level || '',
        log.data_classification || '',
        log.ip_address || '',
        log.session_id || '',
        log.patient_id || '',
        log.response_time || '',
        log.error_code || '',
        log.anomaly_detected ? 'Yes' : 'No',
        log.business_unit || '',
        log.regulatory_requirement || ''
      ]);
      
      // Combine headers and rows
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`Exported ${allLogs.items.length} audit logs successfully`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export audit logs');
    }
  };

  const showLogDetails = (record) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '🕒 Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 200,
      render: (timestamp) => {
        if (!timestamp) return <span style={{ color: '#ccc', fontStyle: 'italic' }}>N/A</span>;
        
        // Convert to Perth time (UTC+8)
        const date = new Date(timestamp);
        const perthDate = new Date(date.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for Perth time
        
        return (
          <div style={{ 
            padding: '8px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e8e8e8'
          }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '13px',
              color: '#262626',
              marginBottom: '4px'
            }}>
              {perthDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                timeZone: 'Australia/Perth'
              })}
            </div>
            <div style={{ 
              fontWeight: '500', 
              fontSize: '12px',
              color: '#595959',
              marginBottom: '2px'
            }}>
              {perthDate.toLocaleTimeString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Australia/Perth'
              })}
            </div>
            <div style={{ 
              fontSize: '10px',
              color: '#8c8c8c',
              fontStyle: 'italic'
            }}>
              (Perth time)
            </div>
          </div>
        );
      }
    },
        {
      title: '👤 User Information',
      dataIndex: 'realUsername',
      key: 'realUsername',
      width: 250,
      render: (realUsername, record) => {
        const userId = record.user_id;
        const userRole = record.userRole;
        const userEmail = record.userEmail;
        
        // Debug: Log user data for troubleshooting
        console.log('User data for record:', {
          realUsername,
          username: record.username,
          userId,
          userRole,
          userEmail,
          recordId: record.id
        });
        
        // Get display name with unique identifier
        let displayName = 'Unknown';
        let uniqueId = '';
        
        if (realUsername && realUsername !== userId) {
          displayName = realUsername.replace(/_/g, ' ').replace(/-/g, ' ');
          displayName = displayName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          uniqueId = userId ? `#${userId.slice(-4)}` : '';
        } else if (record.username && record.username !== userId) {
          displayName = record.username.replace(/_/g, ' ').replace(/-/g, ' ');
          displayName = displayName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          uniqueId = userId ? `#${userId.slice(-4)}` : '';
        } else if (userId) {
          displayName = `User_${userId.slice(-6)}`;
          uniqueId = `#${userId.slice(-4)}`;
        } else {
          displayName = 'System';
          uniqueId = record.id ? `#${record.id.slice(-4)}` : '';
        }
        
        // Get role color and icon
        const getRoleConfig = () => {
          if (userRole === 'admin') {
            return { color: '#1890ff', icon: '🔧', text: 'Admin' };
          } else if (userRole === 'doctor') {
            return { color: '#52c41a', icon: '👨‍⚕️', text: 'Doctor' };
          } else {
            return { color: '#8c8c8c', icon: '👤', text: 'User' };
          }
        };
        
        const roleConfig = getRoleConfig();
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 12,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e8e8e8',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            minHeight: '80px'
          }}>
            <div style={{ 
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: `${roleConfig.color}15`,
              border: `2px solid ${roleConfig.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: `0 3px 6px ${roleConfig.color}25`,
              flexShrink: 0
            }}>
              {roleConfig.icon}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Username with Unique ID */}
              <div style={{ 
                fontWeight: '800', 
                fontSize: '15px',
                color: '#1a1a1a',
                marginBottom: '6px',
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>👤</span>
                <span>{displayName}</span>
                {uniqueId && (
                  <span style={{ 
                    fontSize: '11px',
                    color: '#666',
                    fontWeight: '500',
                    backgroundColor: '#f0f0f0',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontFamily: 'monospace'
                  }}>
                    {uniqueId}
                  </span>
                )}
              </div>
              
              {/* Role Badge */}
              <div style={{ 
                fontSize: '11px',
                color: roleConfig.color,
                fontWeight: '700',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                backgroundColor: `${roleConfig.color}12`,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-block',
                border: `1px solid ${roleConfig.color}25`,
                boxShadow: `0 1px 3px ${roleConfig.color}15`
              }}>
                {roleConfig.text}
              </div>
              
              {/* Email */}
              {userEmail && (
                <div style={{ 
                  fontSize: '11px',
                  color: '#555',
                  fontFamily: 'monospace',
                  backgroundColor: '#f8f9fa',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: '1px solid #e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <span style={{ fontSize: '10px', color: '#666' }}>📧</span>
                  <span style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: '500'
                  }}>
                    {userEmail}
                  </span>
                </div>
              )}
              
              {/* User ID (if available) */}
              {userId && (
                <div style={{ 
                  fontSize: '9px',
                  color: '#888',
                  fontFamily: 'monospace',
                  marginTop: '4px',
                  padding: '2px 6px',
                  backgroundColor: '#f1f3f4',
                  borderRadius: '3px',
                  display: 'inline-block'
                }}>
                  ID: {userId.slice(-8)}
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Event',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (action, record) => {
        // Debug: Log the action and record for troubleshooting
        console.log('Rendering event:', { action, record });
        
        // Get event icon based on action type
        const getEventIcon = (action) => {
          if (!action) return '📋';
          const actionLower = action.toLowerCase();
          if (actionLower.includes('login') || actionLower.includes('auth')) return '🔐';
          if (actionLower.includes('create') || actionLower.includes('add')) return '➕';
          if (actionLower.includes('update') || actionLower.includes('edit')) return '✏️';
          if (actionLower.includes('delete') || actionLower.includes('remove')) return '🗑️';
          if (actionLower.includes('view') || actionLower.includes('read')) return '👁️';
          if (actionLower.includes('export') || actionLower.includes('download')) return '📥';
          if (actionLower.includes('upload') || actionLower.includes('import')) return '📤';
          if (actionLower.includes('verify') || actionLower.includes('check')) return '✅';
          if (actionLower.includes('error') || actionLower.includes('fail')) return '❌';
          return '📋';
        };

        const eventIcon = getEventIcon(action);
        const eventColor = record?.status === 'failure' ? '#ff4d4f' : 
                          record?.risk_level === 'high' || record?.risk_level === 'critical' ? '#ff7a45' : '#1890ff';

        const displayAction = action || record?.event_type || record?.action_type || 'Unknown Event';

        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '4px 8px',
            backgroundColor: `${eventColor}10`,
            borderRadius: '6px',
            border: `1px solid ${eventColor}20`
          }}>
            <span style={{ fontSize: '12px' }}>{eventIcon}</span>
            <Tag 
              color={eventColor} 
              style={{ 
                fontSize: '11px', 
                fontWeight: '500',
                margin: 0,
                border: 'none',
                backgroundColor: 'transparent',
                color: eventColor
              }}
            >
              {displayAction}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category, record) => {
        // Debug: Log the category for troubleshooting
        console.log('Rendering category:', { category, record });
        
        const getCategoryConfig = (category) => {
          const configs = {
            'security': { color: '#ff4d4f', icon: '🔒', text: 'Security' },
            'compliance': { color: '#722ed1', icon: '📋', text: 'Compliance' },
            'operational': { color: '#1890ff', icon: '⚙️', text: 'Operational' },
            'clinical': { color: '#52c41a', icon: '🏥', text: 'Clinical' },
            'administrative': { color: '#fa8c16', icon: '👔', text: 'Admin' },
            'user_management': { color: '#13c2c2', icon: '👥', text: 'Users' },
            'data_access': { color: '#eb2f96', icon: '📊', text: 'Data' },
            'system': { color: '#8c8c8c', icon: '🖥️', text: 'System' }
          };
          
          // Try to determine category from action if not provided
          let determinedCategory = category;
          if (!category && record?.action) {
            const actionLower = record.action.toLowerCase();
            if (actionLower.includes('login') || actionLower.includes('auth')) determinedCategory = 'security';
            else if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('update') || actionLower.includes('edit')) determinedCategory = 'operational';
            else if (actionLower.includes('view') || actionLower.includes('read')) determinedCategory = 'data_access';
            else if (actionLower.includes('export') || actionLower.includes('download')) determinedCategory = 'data_access';
            else determinedCategory = 'system';
          }
          
          return configs[determinedCategory?.toLowerCase()] || { color: '#8c8c8c', icon: '📋', text: determinedCategory || 'General' };
        };

        const config = getCategoryConfig(category);
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            padding: '3px 6px',
            backgroundColor: `${config.color}10`,
            borderRadius: '4px',
            border: `1px solid ${config.color}20`
          }}>
            <span style={{ fontSize: '10px' }}>{config.icon}</span>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '500',
              color: config.color
            }}>
              {config.text}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Risk Level',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (riskLevel) => {
        const color = auditAPI.utils.getRiskLevelColor(riskLevel);
        return (
          <Badge 
            color={color} 
            text={riskLevel?.toUpperCase() || 'N/A'}
            style={{ fontSize: '10px', fontWeight: '500' }}
          />
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const statusConfig = {
          success: { color: '#52c41a', icon: <CheckCircleOutlined /> },
          failure: { color: '#ff4d4f', icon: <CloseCircleOutlined /> },
          pending: { color: '#faad14', icon: <SyncOutlined spin /> }
        };
        
        const config = statusConfig[status] || statusConfig.success;
        
        return (
          <Tag color={config.color} icon={config.icon} style={{ fontSize: '10px' }}>
            {status?.toUpperCase() || 'N/A'}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => showLogDetails(record)}
          />
        </Tooltip>
      )
    }
  ];

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Access Denied"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => window.location.href = '/#/login'}>
              Login
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
        {/* Professional Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          margin: -24,
          marginBottom: 24,
          padding: 24,
          borderRadius: '12px 12px 0 0',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                <SecurityScanOutlined style={{ marginRight: 12 }} />
                Audit Logs Dashboard
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 16 }}>
                Enterprise-grade security monitoring and compliance tracking
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  size={60}
                  percent={summary?.security_score || 100}
                  format={(percent) => `${percent}%`}
                  strokeColor="#52c41a"
                  trailColor="rgba(255, 255, 255, 0.3)"
                />
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>
                  Security Score
                </div>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={refreshData}
                  loading={loading}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    color: '#1890ff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: '500'
                  }}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={exportLogs}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    color: '#1890ff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: '500'
                  }}
                >
                  Export
                </Button>
              </Space>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <Alert
          message={`Audit Logs Status: ${auditLogs.length} entries loaded`}
          description={
            <div>
              <div>Last updated: {new Date().toLocaleString('en-US', { timeZone: 'Australia/Perth' })} (Perth time)</div>
              {auditLogs.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                  <div>Sample event: {auditLogs[0]?.action || 'No action field'} | 
                  Category: {auditLogs[0]?.category || 'No category field'} | 
                  Status: {auditLogs[0]?.status || 'No status field'}</div>
                  <div style={{ marginTop: '2px' }}>
                    Unique users: {new Set(auditLogs.map(log => log.user_id || log.realUsername)).size} | 
                    Users: {Array.from(new Set(auditLogs.map(log => log.realUsername || log.username).filter(Boolean))).slice(0, 3).join(', ')}
                    {auditLogs.length > 3 && '...'}
                  </div>
                </div>
              )}
            </div>
          }
          type="info"
          showIcon
          icon={<DatabaseOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="link" onClick={refreshData}>
              Refresh Now
            </Button>
          }
        />

        {/* Security Alerts */}
        {securityAlerts.length > 0 && (
          <Alert
            message={`${securityAlerts.length} Security Alert${securityAlerts.length > 1 ? 's' : ''} Detected`}
            description="Recent security events require attention"
            type="warning"
            showIcon
            icon={<AlertOutlined />}
            style={{ marginBottom: 24 }}
            action={
              <Button size="small" type="link" onClick={() => setActiveTab('alerts')}>
                View Details
              </Button>
            }
          />
        )}

        {/* Main Content Tabs */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
          {/* Overview Tab */}
          <TabPane tab={<span><DashboardOutlined />Overview</span>} key="overview">
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Events"
                    value={summary?.total_events || 0}
                    prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: '600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Unique Users"
                    value={summary?.unique_users || 0}
                    prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: '600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Security Score"
                    value={summary?.security_score || 100}
                    suffix="%"
                    prefix={<LockOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: '600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Critical Events"
                    value={summary?.critical_events || 0}
                    prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f', fontSize: '24px', fontWeight: '600' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Audit Logs Tab */}
          <TabPane tab={<span><FileTextOutlined />Audit Logs</span>} key="logs">
            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <Input
                    placeholder="Search by username..."
                    prefix={<SearchOutlined />}
                    value={filters.username}
                    onChange={(e) => handleFilterChange('username', e.target.value)}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Category"
                    value={filters.category}
                    onChange={(value) => handleFilterChange('category', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {['security', 'compliance', 'operational', 'clinical', 'administrative'].map(cat => (
                      <Select.Option key={cat} value={cat}>
                        {cat}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Risk Level"
                    value={filters.risk_level}
                    onChange={(value) => handleFilterChange('risk_level', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {['low', 'medium', 'high', 'critical'].map(level => (
                      <Select.Option key={level} value={level}>
                        {level.toUpperCase()}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Status"
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {['success', 'failure', 'pending'].map(status => (
                      <Select.Option key={status} value={status}>
                        {status.toUpperCase()}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Space>
                    <Button onClick={clearFilters}>
                      Clear
                    </Button>
                    <Button type="primary" onClick={fetchAuditLogs}>
                      Apply
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Audit Logs Table */}
            <Table
              columns={columns}
              dataSource={auditLogs}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} events`,
                pageSizeOptions: ['25', '50', '100', '200'],
                onChange: (page, pageSize) => {
                  setPagination(prev => ({ ...prev, current: page, pageSize }));
                }
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          {/* Security Alerts Tab */}
          <TabPane tab={<span><AlertOutlined />Security Alerts</span>} key="alerts">
            {securityAlerts.length > 0 ? (
              <Timeline>
                {securityAlerts.map((alert, index) => (
                  <Timeline.Item
                    key={index}
                    color={alert.severity === 'high' ? 'red' : 'orange'}
                    dot={<ExclamationCircleOutlined />}
                  >
                    <Card size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{alert.message}</Text>
                          <br />
                          <Text type="secondary">
                            {auditAPI.utils.formatTimestamp(alert.timestamp)}
                          </Text>
                        </div>
                        <Tag color={alert.severity === 'high' ? 'red' : 'orange'}>
                          {alert.severity.toUpperCase()}
                        </Tag>
                      </div>
                    </Card>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="No security alerts detected" />
            )}
          </TabPane>
        </Tabs>

        {/* Log Details Modal */}
        <Modal
          title="Audit Log Details"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedLog && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Timestamp" span={2}>
                {auditAPI.utils.formatTimestamp(selectedLog.timestamp)}
              </Descriptions.Item>
              
              <Descriptions.Item label="User Information" span={2}>
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Avatar size="large" icon={<UserOutlined />} />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '16px',
                        color: '#262626',
                        marginBottom: 4
                      }}>
                        {selectedLog.realUsername || selectedLog.username || 'System'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        User ID: {selectedLog.user_id}
                      </div>
                      {selectedLog.userEmail && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Email: {selectedLog.userEmail}
                        </div>
                      )}
                      {selectedLog.userRole && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Role: {selectedLog.userRole}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Event Type">
                <Tag color="blue">{selectedLog.event_type}</Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Action">
                <Tag color="green">{selectedLog.action}</Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Resource Type">
                {selectedLog.resource_type}
              </Descriptions.Item>
              
              <Descriptions.Item label="Resource ID">
                <Text code>{selectedLog.resource_id || 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Category">
                <Tag color="purple">{selectedLog.category || 'N/A'}</Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="Risk Level">
                <Badge 
                  color={auditAPI.utils.getRiskLevelColor(selectedLog.risk_level)} 
                  text={selectedLog.risk_level?.toUpperCase() || 'N/A'} 
                />
              </Descriptions.Item>
              
              <Descriptions.Item label="Status">
                <Tag color={selectedLog.status === 'success' ? 'green' : 'red'}>
                  {selectedLog.status?.toUpperCase() || 'N/A'}
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="IP Address">
                <Text code>{selectedLog.ip_address || 'N/A'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Details" span={2}>
                <Text>{selectedLog.details || 'No details provided'}</Text>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default AuditLogsProfessional;
