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
  Spin,
  Tooltip,
  Modal,
  Descriptions,
  Avatar,
  DatePicker,
  Select
} from 'antd';
import { ReloadOutlined, SecurityScanOutlined, EyeOutlined, FilterOutlined, DownloadOutlined, UserOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';

dayjs.extend(utc);
dayjs.extend(timezone);
const PERTH_TZ = 'Australia/Perth';

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [users, setUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ action: undefined, resourceType: undefined, dateRange: [] });

  useEffect(() => {
    console.log('=== AuditLogs Component Mounted ===');
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const token = localStorage.getItem('token');
    
    console.log('User data:', userData);
    console.log('Token present:', !!token);
    console.log('User role:', userData.role);
    
    setDebugInfo({
      userRole: userData.role,
      tokenPresent: !!token,
      timestamp: new Date().toISOString()
    });
    
    if (userData.role !== 'admin') {
      setError('Access denied. Only administrators can view audit logs.');
      return;
    }
    
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }
    
    fetchUsersAndLogs();
  };

  const fetchUsersAndLogs = async () => {
    try {
      await fetchUsers();
      await fetchAuditLogs({ page: 1, pageSize: pagination.pageSize });
    } catch (error) {
      console.error('Error during initialization:', error);
      setError(`Initialization failed: ${error.message}`);
    }
  };

  const fetchUsers = async () => {
    console.log('Fetching users...');
    setLoadingUsers(true);
    try {
      const response = await request.get('/api/users?page_size=100');
      console.log('Users API response:', response);
      
      if (response && response.items && Array.isArray(response.items)) {
        const userMap = {};
        response.items.forEach(user => {
          if (user.id && user.username) {
            userMap[user.id] = {
              username: user.username, // This is the actual username they use to login
              email: user.email || '',
              role: user.role || 'user',
              fullName: user.full_name || user.fullName
            };
            console.log(`✅ Mapped user: ${user.id.slice(-8)} → ${user.username} (${user.role})`);
          }
        });
        
        // Add manual mappings for any missing users
        const manualMappings = getManualUserMappings();
        Object.assign(userMap, manualMappings);
        
        setUsers(userMap);
        console.log('User map created with', Object.keys(userMap).length, 'users');
        console.log('User map sample:', Object.keys(userMap).slice(0, 3).map(id => ({ id, ...userMap[id] })));
        message.success(`Loaded ${Object.keys(userMap).length} users with their actual usernames`);
      } else {
        console.log('No users found or invalid response format');
        console.log('Response structure:', response);
        message.warning('No users found - will show user IDs instead');
        
        // Use manual mappings as fallback
        const manualMappings = getManualUserMappings();
        setUsers(manualMappings);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.warning('Could not load users - will show user IDs instead');
      
      // Use manual mappings as fallback
      const manualMappings = getManualUserMappings();
      setUsers(manualMappings);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Function to manually map known user IDs to usernames
  const getManualUserMappings = () => {
    return {
      // Add any user IDs that might not be in the main user database
      // These are fallback mappings for special cases
      
      // Example: If you have a system user or special admin account
      // 'system_user_id': {
      //   username: 'system_admin',
      //   email: 'system@example.com',
      //   role: 'admin'
      // }
    };
  };

  // Quick function to map the specific user ID you mentioned
  const mapSpecificUser = () => {
    // This function is now mainly for testing or special cases
    // Most users will be automatically mapped from the database
    message.info('Most users are automatically mapped from the database. Check console for details.');
    console.log('Current user mappings:', users);
  };

  // Function to add a new user mapping
  const addUserMapping = (userId, username, email = '', role = 'user') => {
    const newUsers = { ...users };
    newUsers[userId] = {
      username: username,
      email: email,
      role: role
    };
    setUsers(newUsers);
    message.success(`Added mapping: ${userId.slice(-8)} → ${username}`);
    console.log('Updated user map:', newUsers);
  };

  // Function to get all unique user IDs from audit logs
  const getUniqueUserIds = () => {
    const userIds = new Set();
    auditLogs.forEach(log => {
      if (log.user_id && log.user_id !== 'system' && log.user_id !== 'System') {
        userIds.add(log.user_id);
      }
    });
    return Array.from(userIds);
  };

  // Function to show all unmapped user IDs in console
  const showUnmappedUsers = () => {
    const unmappedIds = getUniqueUserIds().filter(userId => !users[userId]);
    console.log('Unmapped User IDs:', unmappedIds);
    console.log('Total unmapped users:', unmappedIds.length);
    
    if (unmappedIds.length > 0) {
      message.info(`Found ${unmappedIds.length} unmapped user IDs. Check console for details.`);
      
      // Show instructions for adding mappings
      console.log('To add mappings, use: addUserMapping(userId, username, email, role)');
      console.log('Example: addUserMapping("688749ee32c624e0251cc83d", "john_doe", "john@example.com", "admin")');
    } else {
      message.success('All user IDs are mapped!');
    }
  };

  // Function to add mapping for a specific user ID (you can call this from browser console)
  const addMappingForUser = (userId, username, email = '', role = 'user') => {
    if (!userId || !username) {
      message.error('User ID and username are required');
      return;
    }
    addUserMapping(userId, username, email, role);
  };

  // Function to help you add mappings for actual usernames from registration
  const addActualUserMapping = (userId, actualUsername, actualEmail = '', actualRole = 'user') => {
    if (!userId || !actualUsername) {
      message.error('User ID and actual username are required');
      return;
    }
    
    // Validate that the username looks like a real username (not an ID)
    if (actualUsername.length > 20 || actualUsername.includes('_') || actualUsername.includes('-')) {
      message.warning('Username seems long or contains special characters. Is this the actual username from registration?');
    }
    
    addUserMapping(userId, actualUsername, actualEmail, actualRole);
    console.log(`✅ Mapped ${userId.slice(-8)} → ${actualUsername} (from registration)`);
  };

  // Function to show instructions for adding actual usernames
  const showUsernameMappingInstructions = () => {
    console.log('=== USERNAME MAPPING SYSTEM ===');
    console.log('✅ AUTOMATIC: Usernames are automatically fetched from your user database');
    console.log('✅ REAL USERNAMES: Shows the actual usernames that doctors/admins use to login');
    console.log('✅ NO MANUAL WORK: No need to manually map user IDs to usernames');
    console.log('');
    console.log('How it works:');
    console.log('1. System fetches all users from /api/users');
    console.log('2. Maps user IDs to their actual login usernames');
    console.log('3. Audit logs show real usernames instead of long IDs');
    console.log('');
    console.log('Example:');
    console.log('   User ID: 688749ee32c624e0251cc83d');
    console.log('   Shows as: john_doe (if that\'s their login username)');
    console.log('');
    console.log('Current user mappings:', users);
    
    message.success('Usernames are automatically mapped from your user database!');
  };

  const fetchAuditLogs = async ({ page, pageSize } = { page: pagination.current, pageSize: pagination.pageSize }) => {
    console.log('Fetching audit logs...');
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        page_size: pageSize
      };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = new Date(filters.dateRange[0]).toISOString();
        params.end_date = new Date(filters.dateRange[1]).toISOString();
      }

      const response = await auditAPI.getAuditLogs(params);
      console.log('API Response:', response);
      
      if (response && response.items && response.items.length >= 0) {
        const enhancedLogs = (response.items || []).map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role,
            userFullName: userInfo?.fullName
          };
        });
        
        setAuditLogs(enhancedLogs);
        setPagination((prev) => ({ ...prev, current: page, pageSize, total: response.pagination?.total || enhancedLogs.length }));
        message.success(`Loaded ${enhancedLogs.length} audit logs`);
        
        // Log first few entries for debugging
        enhancedLogs.slice(0, 3).forEach((log, index) => {
          console.log(`Log ${index + 1}:`, {
            id: log.id,
            timestamp: log.timestamp,
            user_id: log.user_id,
            username: log.username,
            realUsername: log.realUsername,
            action: log.action,
            resource_type: log.resource_type
          });
        });
        
      } else if (response && Array.isArray(response) && response.length > 0) {
        const enhancedLogs = response.map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role,
            userFullName: userInfo?.fullName
          };
        });
        
        setAuditLogs(enhancedLogs);
        setPagination((prev) => ({ ...prev, current: page, pageSize, total: enhancedLogs.length }));
        message.success(`Loaded ${enhancedLogs.length} audit logs`);
        
      } else {
        setAuditLogs([]);
        setPagination((prev) => ({ ...prev, current: page, pageSize, total: 0 }));
        message.info('No audit logs found');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to load audit logs: ${error.message}`);
      setAuditLogs([]);
      setPagination((prev) => ({ ...prev, current: page, pageSize }));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pager) => {
    const newCurrent = pager.current || 1;
    const newPageSize = pager.pageSize || pagination.pageSize;
    setPagination((prev) => ({ ...prev, current: newCurrent, pageSize: newPageSize }));
    fetchAuditLogs({ page: newCurrent, pageSize: newPageSize });
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize });
  };

  const resetFilters = () => {
    setFilters({ action: undefined, resourceType: undefined, dateRange: [] });
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize });
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = new Date(filters.dateRange[0]).toISOString();
        params.end_date = new Date(filters.dateRange[1]).toISOString();
      }

      const blob = await auditAPI.exportAuditLogs({ ...params, format: 'csv' });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `audit-logs-${ts}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Export started');
    } catch (e) {
      console.error(e);
      message.error('Export failed');
    }
  };

  // Quick date presets
  const setLastNDays = (n) => {
    const end = new Date();
    const start = dayjs(end).subtract(n, 'day').toDate();
    setFilters((prev) => ({ ...prev, dateRange: [start, end] }));
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize });
  };

  const clearDateRange = () => {
    setFilters((prev) => ({ ...prev, dateRange: [] }));
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize });
  };

  const loadMore = () => {
    const total = pagination.total || 0;
    const hasMore = pagination.current * pagination.pageSize < total;
    if (hasMore) {
      const next = pagination.current + 1;
      setPagination((prev) => ({ ...prev, current: next }));
      fetchAuditLogs({ page: next, pageSize: pagination.pageSize });
    }
  };

  const testAPI = async () => {
    try {
      console.log('Testing API...');
      const response = await auditAPI.getAuditLogs({ page: 1, page_size: 5 });
      console.log('Test response:', response);
      message.success('API test successful! Check console.');
    } catch (error) {
      console.error('API test error:', error);
      message.error(`API test failed: ${error.message}`);
    }
  };

  // Presentational helpers
  const getResourceIcon = (resource) => {
    switch (resource) {
      case 'user':
        return <UserOutlined />;
      case 'patient':
        return <UserOutlined />;
      case 'ecg_file':
        return <DatabaseOutlined />;
      case 'ai_diagnosis':
        return <ApiOutlined />;
      case 'feedback':
        return <ApiOutlined />;
      case 'permission':
        return <LockOutlined />;
      case 'settings':
        return <SettingOutlined />;
      default:
        return <DatabaseOutlined />;
    }
  };

  const formatResourceLabel = (resource) => {
    if (!resource) return 'N/A';
    return String(resource).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatActionLabel = (action) => {
    if (!action) return 'Unknown';
    return String(action).replace(/_/g, ' ').toUpperCase();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login':
        return <LockOutlined />;
      case 'logout':
        return <LockOutlined />;
      case 'user_created':
      case 'user_deactivated':
        return <UserOutlined />;
      case 'upload_success':
      case 'upload_failed':
        return <UploadOutlined />;
      case 'get_diagnosis':
        return <ApiOutlined />;
      case 'submit_feedback':
        return <ApiOutlined />;
      case 'permission_granted':
      case 'permission_revoked':
        return <LockOutlined />;
      case 'global_settings_changed':
        return <SettingOutlined />;
      default:
        return <ApiOutlined />;
    }
  };

  const extractKeyValues = (details) => {
    if (!details) return [];
    try {
      if (typeof details === 'string' && (details.trim().startsWith('{') || details.trim().startsWith('['))) {
        const obj = JSON.parse(details);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          return Object.entries(obj).slice(0, 6).map(([k, v]) => ({ k, v: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
        }
      }
    } catch (e) {
      // fall through to pattern parsing
    }
    const pairs = [];
    const parts = String(details).split(/\s*[;|]\s*|,\s*/);
    parts.forEach(p => {
      const m = p.split(/[:=]\s*/);
      if (m.length >= 2) {
        const k = m[0].trim();
        const v = m.slice(1).join(':').trim();
        if (k) pairs.push({ k, v });
      }
    });
    return pairs.slice(0, 6);
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => {
        if (!timestamp) return <Text>N/A</Text>;
        const d = dayjs(timestamp).tz(PERTH_TZ);
        const perthDateStr = d.format('ddd, MMM D, YYYY h:mm:ss A');
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{perthDateStr}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{PERTH_TZ}</Text>
          </div>
        );
      }
    },
    {
      title: 'Real Username',
      dataIndex: 'realUsername',
      key: 'realUsername',
      render: (realUsername, record) => {
        const userId = record.user_id;
        const userEmail = record.userEmail;
        const userRole = record.userRole;

        const isSystemUser = !userId || userId === 'system' || userId === 'System';
        const fallbackName = !isSystemUser && userId ? `User_${(userId || '').slice(-6)}` : 'System';
        const displayName = realUsername || record.username || fallbackName;
        const roleColor = userRole === 'admin' ? 'red' : userRole === 'doctor' ? 'green' : 'blue';
        const avatarColor = isSystemUser ? '#595959' : userRole === 'admin' ? '#ff4d4f' : userRole === 'doctor' ? '#52c41a' : '#1890ff';
        const initial = (displayName || 'U').charAt(0).toUpperCase();
        const shortId = userId && userId.length > 8 ? userId.slice(-8) : userId;

        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar style={{ backgroundColor: avatarColor, marginRight: 8 }}>{initial}</Avatar>
            <div>
              <div>
                <Text strong style={{ fontSize: '14px' }}>{displayName}</Text>
                {!isSystemUser && userRole && (
                  <Tag color={roleColor} style={{ marginLeft: 8 }}>{userRole.toUpperCase()}</Tag>
                )}
                {isSystemUser && (
                  <Tag color="default" style={{ marginLeft: 8 }}>SYSTEM</Tag>
                )}
              </div>
              {userEmail && (
                <div>
                  <a href={`mailto:${userEmail}`}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{userEmail}</Text>
                  </a>
                </div>
              )}
              {!isSystemUser && userId && (
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>ID: {shortId}</Text>
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action) => {
        const colorMap = {
          login: 'green',
          logout: 'cyan',
          user_created: 'purple',
          user_deactivated: 'volcano',
          upload_success: 'green',
          upload_failed: 'red',
          get_diagnosis: 'geekblue',
          submit_feedback: 'gold'
        };
        const color = colorMap[action] || 'blue';
        return (
          <Space size={8}>
            {getActionIcon(action)}
            <Tag color={color}>{formatActionLabel(action)}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 220,
      ellipsis: true,
      render: (resource, record) => {
        const label = formatResourceLabel(resource);
        const shortId = record.resource_id && record.resource_id.length > 8 ? record.resource_id.slice(-8) : record.resource_id;
        return (
          <Space size={8}>
            {getResourceIcon(resource)}
            <span style={{ fontWeight: 500 }}>{label}</span>
            {shortId && (
              <span style={{ color: '#8c8c8c', fontSize: 11 }}>#{shortId}</span>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details) => {
        if (!details) return <Text type="secondary">No details</Text>;
        const text = String(details);
        const pairs = extractKeyValues(text);
        const truncated = text.length > 100 ? `${text.slice(0, 100)}…` : text;
        if (pairs.length === 0) {
          return (
            <Tooltip placement="top" title={text}>
              <Text>{truncated}</Text>
            </Tooltip>
          );
        }
        return (
          <Space direction="vertical" size={2} style={{ maxWidth: 360 }}>
            <Tooltip placement="top" title={text}>
              <Text>{truncated}</Text>
            </Tooltip>
            <div style={{ color: '#8c8c8c', fontSize: 11, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pairs.slice(0, 3).map(({ k, v }, i) => (
                <span key={i}><Text strong>{k}:</Text> {v}</span>
              ))}
              {pairs.length > 3 && <span>+{pairs.length - 3} more</span>}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setDetailModalVisible(true);
          }}
        >
          View
        </Button>
      )
    }
  ];

  if (debugInfo.userRole !== 'admin') {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Alert
            message="Access Denied"
            description="Only administrators can view audit logs."
            type="error"
            showIcon
          />
        </Card>
      </div>
    );
  }

  if (!debugInfo.tokenPresent) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Alert
            message="Authentication Required"
            description="Please log in with admin credentials."
            type="warning"
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => window.location.href = '/#/login'}>
                Login
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={2}>
            <SecurityScanOutlined style={{ marginRight: 8 }} />
            Audit Logs (Debug)
          </Title>
        </div>

        {/* Debug Info */}
        <Alert
          message="Debug Information"
          description={
            <div>
              <p>User Role: {debugInfo.userRole}</p>
              <p>Token Present: {debugInfo.tokenPresent ? 'Yes' : 'No'}</p>
              <p>Users Loaded: {Object.keys(users).length}</p>
              <p>Audit Logs: {auditLogs.length}</p>
              <p>Last Update: {debugInfo.timestamp}</p>
              
              {/* Show unmapped user IDs */}
              {auditLogs.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <Text strong>Unmapped User IDs:</Text>
                  <div style={{ marginTop: 5 }}>
                    {getUniqueUserIds()
                      .filter(userId => !users[userId])
                      .slice(0, 5)
                      .map(userId => (
                        <Tag 
                          key={userId} 
                          color="orange" 
                          style={{ margin: '2px' }}
                        >
                          {userId.slice(-8)}
                        </Tag>
                      ))}
                    {getUniqueUserIds().filter(userId => !users[userId]).length > 5 && (
                      <Text type="secondary">... and {getUniqueUserIds().filter(userId => !users[userId]).length - 5} more</Text>
                    )}
                    {getUniqueUserIds().filter(userId => !users[userId]).length === 0 && (
                      <Text type="success">✅ All user IDs are mapped to real usernames!</Text>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show automatic mapping status */}
              <div style={{ marginTop: 10 }}>
                <Text strong>Username Mapping:</Text>
                <div style={{ marginTop: 5 }}>
                  <Text type="success">✅ Automatic mapping from user database</Text>
                  <br />
                  <Text type="secondary">Shows actual login usernames instead of user IDs</Text>
                </div>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchAuditLogs}
            loading={loading}
          >
            Refresh
          </Button>
          <Space>
            <Space>
              <Button size="small" onClick={() => setLastNDays(7)}>Last 7 days</Button>
              <Button size="small" onClick={() => setLastNDays(30)}>Last 30 days</Button>
              <Button size="small" onClick={clearDateRange}>All time</Button>
            </Space>
            <Select
              allowClear
              placeholder="Action"
              style={{ width: 160 }}
              value={filters.action}
              onChange={(val) => setFilters((prev) => ({ ...prev, action: val }))}
              options={[
                { value: 'login', label: 'login' },
                { value: 'logout', label: 'logout' },
                { value: 'user_created', label: 'user_created' },
                { value: 'user_deactivated', label: 'user_deactivated' },
                { value: 'upload_success', label: 'upload_success' },
                { value: 'upload_failed', label: 'upload_failed' },
                { value: 'get_diagnosis', label: 'get_diagnosis' },
                { value: 'submit_feedback', label: 'submit_feedback' }
              ]}
            />
            <Select
              allowClear
              placeholder="Resource"
              style={{ width: 160 }}
              value={filters.resourceType}
              onChange={(val) => setFilters((prev) => ({ ...prev, resourceType: val }))}
              options={[
                { value: 'user', label: 'user' },
                { value: 'patient', label: 'patient' },
                { value: 'ecg_file', label: 'ecg_file' },
                { value: 'ai_diagnosis', label: 'ai_diagnosis' },
                { value: 'feedback', label: 'feedback' },
                { value: 'permission', label: 'permission' },
                { value: 'settings', label: 'settings' }
              ]}
            />
            <DatePicker.RangePicker
              allowEmpty={[true, true]}
              value={
                filters.dateRange && filters.dateRange.length === 2
                  ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])]
                  : []
              }
              onChange={(vals) => {
                if (!vals || vals.length === 0) {
                  setFilters((prev) => ({ ...prev, dateRange: [] }));
                } else {
                  setFilters((prev) => ({ ...prev, dateRange: [vals[0].toDate(), vals[1].toDate()] }));
                }
              }}
              style={{ width: 280 }}
            />
            <Button icon={<FilterOutlined />} type="default" onClick={applyFilters}>Apply</Button>
            <Button onClick={resetFilters}>Reset</Button>
            <Button icon={<DownloadOutlined />} type="default" onClick={handleExport}>Export CSV</Button>
          </Space>
          <Button onClick={testAPI}>
            Test API
          </Button>
          <Button onClick={mapSpecificUser}>
            Map Specific User
          </Button>
          <Button onClick={showUnmappedUsers}>
            Show Unmapped Users
          </Button>
          <Button onClick={showUsernameMappingInstructions}>
            Show Username Mapping Instructions
          </Button>
          <Text>Total: {auditLogs.length} logs</Text>
          <Text>Users: {Object.keys(users).length}</Text>
        </Space>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <p>Loading...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={auditLogs}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} items`
            }}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
          />
        )}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          {pagination.current * pagination.pageSize < (pagination.total || 0) && (
            <Button onClick={loadMore} loading={loading}>Load more</Button>
          )}
        </div>
      </Card>
      <Modal
        title="Audit Log Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>Close</Button>
        ]}
        width={720}
      >
        {selectedLog && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {selectedLog.timestamp ? dayjs(selectedLog.timestamp).tz(PERTH_TZ).format('ddd, MMM D, YYYY h:mm:ss A') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="User ID">{selectedLog.user_id || 'System'}</Descriptions.Item>
            {selectedLog.userFullName && (
              <Descriptions.Item label="Full Name">{selectedLog.userFullName}</Descriptions.Item>
            )}
            {selectedLog.userEmail && (
              <Descriptions.Item label="Email">{selectedLog.userEmail}</Descriptions.Item>
            )}
            <Descriptions.Item label="Username">{selectedLog.realUsername || selectedLog.username || 'Unknown'}</Descriptions.Item>
            <Descriptions.Item label="Action">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="Resource Type">{selectedLog.resource_type}</Descriptions.Item>
            {selectedLog.resource_id && (
              <Descriptions.Item label="Resource ID">{selectedLog.resource_id}</Descriptions.Item>
            )}
            <Descriptions.Item label="Details">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(selectedLog.details || '')}</pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs; 