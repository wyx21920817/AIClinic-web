import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
  Statistic,
  Progress,
  Divider,
  Row,
  Col
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
  ApiOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LockOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [users, setUsers] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0
  });
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    searchText: '',
    showAdminKey: false
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [userTimezone, setUserTimezone] = useState('UTC');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Constants for action types and resource types
  const actionTypes = [
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'EXPORT', 'IMPORT'
  ];

  const resourceTypes = [
    'USER', 'PATIENT', 'ECG', 'AUDIT_LOG', 'SYSTEM', 'FILE', 'REPORT', 'CONFIGURATION'
  ];

  // Detect user's local timezone
  const detectUserTimezone = () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Browser timezone detection:', timezone);
      
      // Get current time in different formats for comparison
      const now = new Date();
      const browserLocal = now.toLocaleString('en-US');
      const browserWithTZ = now.toLocaleString('en-US', { timeZone: timezone });
      const dayjsLocal = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const dayjsWithTZ = dayjs().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
      
      console.log('=== TIME ACCURACY DEBUG ===');
      console.log('Browser Local:', browserLocal);
      console.log('Browser with TZ:', browserWithTZ);
      console.log('DayJS Local:', dayjsLocal);
      console.log('DayJS with TZ:', dayjsWithTZ);
      console.log('System timezone offset:', now.getTimezoneOffset(), 'minutes');
      console.log('========================');
      
      // Test if dayjs timezone is working
      const testTime = dayjs().tz(timezone);
      console.log('Dayjs timezone test:', testTime.format('YYYY-MM-DD HH:mm:ss Z'));
      
      // Verify timezone is working correctly
      const localTime = new Date().toLocaleString('en-US', { timeZone: timezone });
      console.log('Local time verification:', localTime);
      
      setUserTimezone(timezone);
      console.log('✅ Successfully set timezone to:', timezone);
      return timezone;
    } catch (error) {
      console.error('❌ Timezone detection error:', error);
      console.log('Falling back to UTC');
      setUserTimezone('UTC');
      return 'UTC';
    }
  };

  const checkAccessAndLoad = useCallback(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const token = localStorage.getItem('token');
    
    setUserRole(userData.role);
    setTokenPresent(!!token);
    
    // Detect user's timezone with fallback
    const detectedTimezone = detectUserTimezone();
    console.log('Final timezone being used:', detectedTimezone);
    
    // Test timezone conversion
    const now = new Date();
    const localTime = dayjs(now).tz(detectedTimezone);
    console.log('Current time in detected timezone:', localTime.format('YYYY-MM-DD HH:mm:ss Z'));
    
    if (userData.role !== 'admin') {
      setError('Access denied. Only administrators can view audit logs.');
      return;
    }
    
    if (!token) {
      setError('Authentication required. Please log in.');
      return;
    }
    
    fetchUsersAndLogs();
  }, []);

  useEffect(() => {
    checkAccessAndLoad();
  }, [checkAccessAndLoad]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchUsersAndLogs = async () => {
    try {
      await fetchUsers();
      await fetchAuditLogs();
    } catch (error) {
      console.error('Error during initialization:', error);
      setError(`Initialization failed: ${error.message}`);
    }
  };

  const fetchUsers = async () => {
    console.log('Fetching users...');
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
              role: user.role || 'user'
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

  const fetchAuditLogs = async () => {
    console.log('Fetching audit logs...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await auditAPI.getAuditLogs({ 
        page: pagination.current, 
        page_size: pagination.pageSize 
      });
      console.log('API Response:', response);
      
      let logs = [];
      if (response && response.items && response.items.length > 0) {
        logs = response.items;
      } else if (response && Array.isArray(response) && response.length > 0) {
        logs = response;
      }
      
      if (logs.length > 0) {
        const enhancedLogs = logs.map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role
          };
        });
        
        // Apply client-side filtering
        let filteredLogs = enhancedLogs;
        
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          filteredLogs = filteredLogs.filter(log => 
            log.action?.toLowerCase().includes(searchLower) ||
            log.resource_type?.toLowerCase().includes(searchLower) ||
            log.details?.toLowerCase().includes(searchLower) ||
            log.realUsername?.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.action) {
          filteredLogs = filteredLogs.filter(log => log.action === filters.action);
        }
        
        if (filters.resourceType) {
          filteredLogs = filteredLogs.filter(log => log.resource_type === filters.resourceType);
        }
        
        if (filters.showAdminKey) {
          filteredLogs = filteredLogs.filter(log => log.details?.includes('admin_key'));
        }
        
        setAuditLogs(filteredLogs);
        setPagination(prev => ({ ...prev, total: filteredLogs.length }));
        setLastRefresh(new Date());
        message.success(`Loaded ${filteredLogs.length} audit logs`);
      } else {
        setAuditLogs([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        message.info('No audit logs found');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Failed to load audit logs: ${error.message}`);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for professional UI
  const handleTableChange = (paginationInfo) => {
    setPagination(prev => ({
      ...prev,
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      searchText: '',
      showAdminKey: false
    });
  };

  const showLogDetails = (record) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': 'green',
      'READ': 'blue',
      'UPDATE': 'orange',
      'DELETE': 'red',
      'LOGIN': 'cyan',
      'LOGOUT': 'purple',
      'UPLOAD': 'geekblue',
      'DOWNLOAD': 'lime',
      'EXPORT': 'gold',
      'IMPORT': 'volcano'
    };
    return colors[action] || 'default';
  };

  const getSeverityColor = (action) => {
    const severity = {
      'DELETE': 'error',
      'LOGIN': 'warning',
      'LOGOUT': 'info',
      'CREATE': 'success',
      'UPDATE': 'warning'
    };
    return severity[action] || 'info';
  };

  const getResourceTypeIcon = (resourceType) => {
    const icons = {
      'USER': <UserOutlined />,
      'PATIENT': <UserOutlined />,
      'ECG': <ApiOutlined />,
      'AUDIT_LOG': <DatabaseOutlined />,
      'SYSTEM': <SettingOutlined />,
      'FILE': <ApiOutlined />,
      'REPORT': <ApiOutlined />,
      'CONFIGURATION': <SettingOutlined />
    };
    return icons[resourceType] || <ApiOutlined />;
  };

  const exportAuditLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Details', 'IP Address'],
      ...auditLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.realUsername || log.username || log.user_id,
        log.action,
        log.resource_type,
        log.details,
        log.ip_address || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Audit logs exported successfully');
  };

  const getSecurityScore = () => {
    const totalLogs = auditLogs.length;
    if (totalLogs === 0) return 100;
    
    const warningLogs = auditLogs.filter(log => 
      log.action === 'DELETE' || 
      log.action === 'LOGIN' || 
      log.details?.includes('admin_key')
    ).length;
    
    return Math.max(0, 100 - (warningLogs / totalLogs) * 50);
  };

  // Manual timezone override for testing (you can call this from browser console)
  const setTimezone = (timezone) => {
    try {
      const testTime = dayjs().tz(timezone);
      console.log(`Testing timezone ${timezone}:`, testTime.format('YYYY-MM-DD HH:mm:ss Z'));
      setUserTimezone(timezone);
      message.success(`Timezone set to ${timezone}`);
    } catch (error) {
      console.error('Invalid timezone:', timezone);
      message.error(`Invalid timezone: ${timezone}`);
    }
  };

  // Test timezone detection (you can call this from browser console)
  const testTimezone = () => {
    console.log('=== Timezone Test ===');
    console.log('Current timezone:', userTimezone);
    console.log('Current time:', dayjs(currentTime).tz(userTimezone).format('YYYY-MM-DD HH:mm:ss Z'));
    console.log('UTC time:', dayjs(currentTime).utc().format('YYYY-MM-DD HH:mm:ss Z'));
    console.log('Local time:', dayjs(currentTime).format('YYYY-MM-DD HH:mm:ss Z'));
    console.log('Browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('Browser local time:', new Date().toLocaleString());
    console.log('System timezone offset:', new Date().getTimezoneOffset());
  };

  // Quick timezone fixes for common locations
  const fixTimezone = () => {
    const offset = new Date().getTimezoneOffset();
    console.log('System timezone offset (minutes):', offset);
    
    // Common timezone offsets
    if (offset === 480) { // UTC-8 (Pacific)
      setTimezone('America/Los_Angeles');
    } else if (offset === 420) { // UTC-7 (Mountain)
      setTimezone('America/Denver');
    } else if (offset === 360) { // UTC-6 (Central)
      setTimezone('America/Chicago');
    } else if (offset === 300) { // UTC-5 (Eastern)
      setTimezone('America/New_York');
    } else if (offset === 0) { // UTC
      setTimezone('UTC');
    } else if (offset === -300) { // UTC+5
      setTimezone('Asia/Karachi');
    } else if (offset === -330) { // UTC+5:30
      setTimezone('Asia/Kolkata');
    } else if (offset === -480) { // UTC+8 (China, Perth)
      setTimezone('Australia/Perth');
    } else if (offset === -600) { // UTC+10 (Sydney)
      setTimezone('Australia/Sydney');
    } else {
      console.log('Unknown timezone offset, please set manually');
    }
  };

  // Test timestamp accuracy
  const testTimestampAccuracy = () => {
    console.log('=== Timestamp Accuracy Test ===');
    const now = new Date();
    console.log('Current time:', now.toISOString());
    console.log('Current local time:', now.toLocaleString());
    
    // Test with a sample timestamp
    const sampleTimestamp = '2024-12-15T14:30:00.000Z';
    console.log('Sample timestamp:', sampleTimestamp);
    
    try {
      const dayjsTime = dayjs(sampleTimestamp).tz(userTimezone);
      console.log('DayJS timezone conversion:', dayjsTime.format('YYYY-MM-DD HH:mm:ss Z'));
    } catch (error) {
      console.error('DayJS timezone error:', error);
    }
    
    try {
      const localTime = new Date(sampleTimestamp).toLocaleString('en-US', { timeZone: userTimezone });
      console.log('Browser timezone conversion:', localTime);
    } catch (error) {
      console.error('Browser timezone error:', error);
    }
    
    // Test with audit logs
    if (auditLogs.length > 0) {
      const firstLog = auditLogs[0];
      console.log('First audit log timestamp:', firstLog.timestamp);
      console.log('First log converted:', dayjs(firstLog.timestamp).tz(userTimezone).format('YYYY-MM-DD HH:mm:ss Z'));
    }
  };

  // Function to manually set timezone for testing
  const setCorrectTimezone = (timezone) => {
    console.log('Setting timezone to:', timezone);
    setUserTimezone(timezone);
    
    // Test the new timezone
    const now = new Date();
    const testTime = dayjs().tz(timezone);
    console.log('New timezone test:', testTime.format('YYYY-MM-DD HH:mm:ss A'));
    console.log('Browser test:', now.toLocaleString('en-US', { timeZone: timezone }));
  };

  // Function to get system timezone offset and suggest timezone
  const getSystemTimezone = () => {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? '+' : '-';
    
    console.log(`System timezone offset: ${sign}${hours}:${minutes.toString().padStart(2, '0')}`);
    
    // Common timezone mappings based on offset
    const timezoneMap = {
      '-480': 'Australia/Perth', // UTC+8
      '-420': 'Australia/Adelaide', // UTC+7
      '-600': 'Australia/Sydney', // UTC+10
      '-660': 'Australia/Lord_Howe', // UTC+11
      '0': 'UTC',
      '300': 'America/New_York', // UTC-5
      '360': 'America/Chicago', // UTC-6
      '420': 'America/Denver', // UTC-7
      '480': 'America/Los_Angeles', // UTC-8
    };
    
    const mappedTimezone = timezoneMap[offset.toString()];
    if (mappedTimezone) {
      console.log('Suggested timezone:', mappedTimezone);
      return mappedTimezone;
    }
    
    return null;
  };

  // Handle loading more logs for different time periods
  const handleLoadMore = async (period) => {
    setLoading(true);
    try {
      let params = { page: 1, page_size: 100 }; // Load more for time-based queries
      
      switch (period) {
        case 'today':
          const today = dayjs().tz(userTimezone).startOf('day');
          params.start_date = today.toISOString();
          message.info(`Loading today's logs (${userTimezone})...`);
          break;
          
        case 'week':
          const weekAgo = dayjs().tz(userTimezone).subtract(7, 'day');
          params.start_date = weekAgo.toISOString();
          message.info(`Loading this week's logs (${userTimezone})...`);
          break;
          
        case 'month':
          const monthAgo = dayjs().tz(userTimezone).subtract(1, 'month');
          params.start_date = monthAgo.toISOString();
          message.info(`Loading this month's logs (${userTimezone})...`);
          break;
          
        case 'all':
          params.page_size = 500; // Load more for comprehensive view
          message.info('Loading all available logs...');
          break;
          
        default:
          break;
      }
      
      const response = await auditAPI.getAuditLogs(params);
      
      if (response && (response.items || Array.isArray(response))) {
        const logs = response.items || response;
        const enhancedLogs = logs.map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role
          };
        });
        
        setAuditLogs(enhancedLogs);
        setPagination(prev => ({ ...prev, total: enhancedLogs.length }));
        message.success(`Loaded ${enhancedLogs.length} logs for ${period} period`);
      }
    } catch (error) {
      console.error('Error loading more logs:', error);
      message.error(`Failed to load ${period} logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
            render: (timestamp) => {
        if (!timestamp) return <div>N/A</div>;
        
        try {
          // Convert UTC timestamp to local timezone to show when event actually occurred
          const eventTime = new Date(timestamp).toLocaleString('en-US', { 
            timeZone: userTimezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          
          // Split into date and time parts
          const [datePart, timePart] = eventTime.split(', ');
          
          return (
            <div>
              <div style={{ fontWeight: '500' }}>
                {datePart}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {timePart}
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>
                {userTimezone}
              </div>
            </div>
          );
        } catch (error) {
          console.error('Timezone conversion error:', error);
          
          // Fallback to simple date formatting
          const fallbackDate = new Date(timestamp);
          return (
            <div>
              <div style={{ fontWeight: '500' }}>
                {fallbackDate.toLocaleDateString()}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {fallbackDate.toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '10px', color: '#ff4d4f' }}>
                Fallback (no tz)
              </div>
            </div>
          );
        }
      }
    },
    {
      title: '👤 User Information',
      dataIndex: 'realUsername',
      key: 'realUsername',
      width: 220,
      render: (realUsername, record) => {
        const displayName = realUsername || record.username || record.user_id || 'System';
        const userId = record.user_id;
        const userEmail = record.userEmail;
        const userRole = record.userRole;
        
        const isRealUsername = realUsername && realUsername !== userId;
        const isSystemUser = !userId || userId === 'system' || userId === 'System';
        const isAdmin = userRole === 'admin';
        const isDoctor = userRole === 'doctor';
        
        // Enhanced user avatar and status
        const getUserAvatar = () => {
          if (isSystemUser) return <SettingOutlined style={{ color: '#1890ff', fontSize: '16px' }} />;
          if (isAdmin) return <UserOutlined style={{ color: '#1890ff', fontSize: '16px' }} />;
          if (isDoctor) return <UserOutlined style={{ color: '#1890ff', fontSize: '16px' }} />;
          return <UserOutlined style={{ color: isRealUsername ? '#1890ff' : '#faad14', fontSize: '16px' }} />;
        };
        
        const getUserStatus = () => {
          if (isSystemUser) return { color: '#1890ff', text: 'SYSTEM' };
          if (isAdmin) return { color: '#1890ff', text: 'ADMIN' };
          if (isDoctor) return { color: '#1890ff', text: 'DOCTOR' };
          if (isRealUsername) return { color: '#1890ff', text: 'USER' };
          return { color: '#faad14', text: 'UNKNOWN' };
        };
        
        const status = getUserStatus();
        
        return (
          <div style={{ 
            padding: '8px 12px', 
            borderRadius: '8px', 
            backgroundColor: '#f8f9fa',
            border: `1px solid ${status.color === '#52c41a' ? '#1890ff20' : status.color}20`,
            position: 'relative'
          }}>
            {/* User Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: `${status.color}15`,
                border: `2px solid ${status.color}30`
              }}>
                {getUserAvatar()}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px',
                  color: '#262626',
                  marginBottom: 2
                }}>
                  {isRealUsername ? displayName : isSystemUser ? 'System Process' : `User_${userId?.slice(-6)}`}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                     <Badge 
                     status={status.color === '#1890ff' ? 'processing' : 'warning'} 
                     text={status.text} 
                     style={{ fontSize: '10px', fontWeight: '500' }}
                   />
                  
                                     {isRealUsername && (
                     <div style={{ 
                       width: '6px', 
                       height: '6px', 
                       borderRadius: '50%', 
                       backgroundColor: '#1890ff',
                       marginLeft: 4
                     }} />
                   )}
                </div>
              </div>
            </div>
            
            {/* User Details */}
            {userEmail && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: '10px' }}>📧</span>
                {userEmail}
              </div>
            )}
            
            {userRole && (
              <div style={{ 
                fontSize: '11px', 
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: '10px' }}>👨‍⚕️</span>
                {userRole === 'admin' ? 'Administrator' : 
                 userRole === 'doctor' ? 'Medical Doctor' : 
                 userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </div>
            )}
            
            {/* Unmapped User Warning */}
            {!isRealUsername && !isSystemUser && (
              <div style={{ 
                fontSize: '11px', 
                color: '#ff4d4f', 
                marginTop: 4,
                padding: '4px 8px',
                backgroundColor: '#fff2f0',
                borderRadius: '4px',
                border: '1px solid #ffccc7',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: '10px' }}>⚠️</span>
                ID: {userId?.slice(-8)} (unmapped)
              </div>
            )}
            
            {/* User ID (subtle) */}
            {userId && !isSystemUser && (
              <div style={{ 
                fontSize: '9px', 
                color: '#ccc', 
                marginTop: 4,
                fontFamily: 'monospace'
              }}>
                #{userId?.slice(-12)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action) => (
        <Tag color={getActionColor(action)} style={{ fontWeight: '500' }}>
          {action}
        </Tag>
      )
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 140,
      render: (resourceType) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {getResourceTypeIcon(resourceType)}
          <Tag color="purple" style={{ fontSize: '11px' }}>
            {resourceType}
          </Tag>
        </div>
      )
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      width: 250,
      render: (details, record) => (
        <div>
          <Text style={{ fontSize: '13px' }}>
            {details || 'No details provided'}
          </Text>
          {record.details?.includes('admin_key') && (
            <Badge 
              status="warning" 
              text="Admin Key Used" 
              style={{ marginTop: 4 }}
            />
          )}
        </div>
      )
    },
    {
      title: 'Security',
      key: 'security',
      width: 100,
      render: (_, record) => {
        const severity = getSeverityColor(record.action);
        const isAdminKey = record.details?.includes('admin_key');
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Badge 
              status={severity} 
              text={severity.toUpperCase()} 
              style={{ fontSize: '10px' }}
            />
            {isAdminKey && (
              <LockOutlined style={{ color: '#faad14', marginLeft: 4 }} />
            )}
          </div>
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

  if (userRole !== 'admin') {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Alert
            message="Access Denied"
            description="Only administrators can view audit logs."
            type="error"
            showIcon
            icon={<LockOutlined />}
          />
        </Card>
      </div>
    );
  }

  if (!tokenPresent) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Alert
            message="Authentication Required"
            description="Please log in with admin credentials."
            type="warning"
            showIcon
            icon={<SecurityScanOutlined />}
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
                Security Audit Dashboard
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 16 }}>
                Comprehensive system activity monitoring and security analysis
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="rgba(255, 255, 255, 0.3)" style={{ color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                  🌍 {userTimezone}
                </Tag>
                <div style={{ marginTop: 4 }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                    DayJS: {dayjs(currentTime).tz(userTimezone).format('HH:mm:ss')}
                  </Text>
                  <div style={{ marginTop: 2 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                    Local: {new Date().toLocaleTimeString('en-US', { timeZone: userTimezone })}
                  </Text>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                      {dayjs(currentTime).tz(userTimezone).format('MMM DD, YYYY')}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  size={60}
                  percent={getSecurityScore()}
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
                  onClick={fetchAuditLogs}
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
                  onClick={exportAuditLogs}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    color: '#1890ff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: '500'
                  }}
                >
                  Export CSV
                </Button>
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    getSystemTimezone();
                    testTimestampAccuracy();
                  }}
                  style={{ 
                    fontSize: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    color: '#666',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  Debug Time
                </Button>
              </Space>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#666' }}>📊 Total Events</span>}
                value={auditLogs.length}
                prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: '600' }}
              />
              <Progress 
                percent={Math.min(100, (auditLogs.length / 1000) * 100)} 
                showInfo={false} 
                strokeColor="#1890ff"
                trailColor="#e6f7ff"
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                Last 24 hours activity
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#666' }}>🔐 Admin Key Events</span>}
                value={auditLogs.filter(log => log.details?.includes('admin_key')).length}
                prefix={<LockOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: '600' }}
              />
              <Progress 
                percent={auditLogs.length > 0 ? (auditLogs.filter(log => log.details?.includes('admin_key')).length / auditLogs.length) * 100 : 0} 
                showInfo={false}
                strokeColor="#faad14"
                trailColor="#fff7e6"
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                High security events
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#666' }}>⚠️ Warnings</span>}
                value={auditLogs.filter(log => getSeverityColor(log.action) === 'warning').length}
                prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: '600' }}
              />
              <Progress 
                percent={auditLogs.length > 0 ? (auditLogs.filter(log => getSeverityColor(log.action) === 'warning').length / auditLogs.length) * 100 : 0} 
                showInfo={false}
                strokeColor="#faad14"
                trailColor="#fff7e6"
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                Requires attention
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#666' }}>🚨 Errors</span>}
                value={auditLogs.filter(log => getSeverityColor(log.action) === 'error').length}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: '24px', fontWeight: '600' }}
              />
              <Progress 
                percent={auditLogs.length > 0 ? (auditLogs.filter(log => getSeverityColor(log.action) === 'error').length / auditLogs.length) * 100 : 0} 
                showInfo={false}
                strokeColor="#ff4d4f"
                trailColor="#fff2f0"
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                Critical issues
              </div>
            </Card>
          </Col>
        </Row>

        {/* Enhanced Quick Filters */}
        <Card 
          title={
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              🔍 Quick Filters & Search
            </span>
          } 
          size="small" 
          style={{ 
            marginBottom: 24, 
            borderRadius: 8, 
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
          }}
        >
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input
                placeholder="🔎 Search logs, users, actions..."
                prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                allowClear
                style={{ borderRadius: 6 }}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="📝 Action Type"
                value={filters.action}
                onChange={(value) => handleFilterChange('action', value)}
                allowClear
                style={{ width: '100%', borderRadius: 6 }}
              >
                {actionTypes.map(action => (
                  <Select.Option key={action} value={action}>
                    {action}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="📁 Resource Type"
                value={filters.resourceType}
                onChange={(value) => handleFilterChange('resourceType', value)}
                allowClear
                style={{ width: '100%', borderRadius: 6 }}
              >
                {resourceTypes.map(resource => (
                  <Select.Option key={resource} value={resource}>
                    {resource}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={filters.showAdminKey}
                  onChange={(checked) => handleFilterChange('showAdminKey', checked)}
                  checkedChildren="🔐 Admin"
                  unCheckedChildren="📊 All"
                />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {filters.showAdminKey ? 'Admin Key Events' : 'All Events'}
                </span>
              </div>
            </Col>
            <Col span={4}>
              <Button 
                onClick={clearFilters} 
                icon={<FilterOutlined />}
                style={{ borderRadius: 6 }}
              >
                🧹 Clear All
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Professional Table */}
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
            pageSizeOptions: ['25', '50', '100', '200', '500'],
            defaultPageSize: 25,
            style: { borderRadius: '6px' }
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          style={{ borderRadius: '6px' }}
        />

        {/* Load More Options */}
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          background: '#fafafa', 
          borderRadius: 8,
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Quick Access Options:</Text>
              <br />
              <Text type="secondary">Load additional logs for different time periods</Text>
            </div>
            <Space>
              <Button 
                size="small" 
                onClick={() => handleLoadMore('today')}
                icon={<ClockCircleOutlined />}
              >
                Today's Logs
              </Button>
              <Button 
                size="small" 
                onClick={() => handleLoadMore('week')}
                icon={<ClockCircleOutlined />}
              >
                This Week
              </Button>
              <Button 
                size="small" 
                onClick={() => handleLoadMore('month')}
                icon={<ClockCircleOutlined />}
              >
                This Month
              </Button>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => handleLoadMore('all')}
                icon={<DatabaseOutlined />}
              >
                View All Logs
              </Button>
            </Space>
          </div>
        </div>

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
                <div>
                  <div style={{ fontWeight: '500', fontSize: '16px' }}>
                    {new Date(selectedLog.timestamp).toLocaleString('en-US', { 
                      timeZone: userTimezone,
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                    Timezone: {userTimezone}
                  </div>
                  <div style={{ fontSize: '10px', color: '#ccc', marginTop: 2 }}>
                    UTC: {dayjs(selectedLog.timestamp).utc().format('MMMM DD, YYYY hh:mm:ss A')} UTC
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="👤 User Information" span={2}>
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                         <div style={{ 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center',
                       width: '48px',
                       height: '48px',
                       borderRadius: '50%',
                       backgroundColor: '#1890ff15',
                       border: `2px solid #1890ff30`
                     }}>
                       <UserOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '16px',
                        color: '#262626',
                        marginBottom: 4
                      }}>
                        {selectedLog.realUsername || selectedLog.username || selectedLog.user_id || 'System'}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                 <Badge 
                           status="processing"
                           text={selectedLog.userRole?.toUpperCase() || 'USER'} 
                           style={{ fontSize: '11px', fontWeight: '500' }}
                         />
                        
                        {selectedLog.userEmail && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <span>📧</span>
                            {selectedLog.userEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedLog.user_id && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#999',
                      fontFamily: 'monospace',
                      backgroundColor: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}>
                      User ID: {selectedLog.user_id}
                    </div>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag color={getActionColor(selectedLog.action)}>
                  {selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Resource Type">
                <Space>
                  {getResourceTypeIcon(selectedLog.resource_type)}
                  <Text>{selectedLog.resource_type}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Details" span={2}>
                <Text>{selectedLog.details || 'No details provided'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="IP Address">
                <Text code>{selectedLog.ip_address || 'N/A'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Security Level">
                <Badge 
                  status={getSeverityColor(selectedLog.action)} 
                  text={getSeverityColor(selectedLog.action).toUpperCase()} 
                />
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
              </Card>
      </div>
    );
  };

export default AuditLogs; 