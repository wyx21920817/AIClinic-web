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
  Select,
  Switch
} from 'antd';
import { ReloadOutlined, SecurityScanOutlined, EyeOutlined, FilterOutlined, DownloadOutlined, UserOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';
import { usersApi } from '../services/api/users';

const { Title, Text } = Typography;

dayjs.extend(utc);
dayjs.extend(timezone);

// Treat backend timestamps without timezone as UTC to prevent offset drift
const normalizeIsoToUtc = (ts) => {
  if (!ts) return ts;
  if (typeof ts !== 'string') return ts;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(ts)) return ts; // already has timezone
  return ts + 'Z';
};


const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [users, setUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ action: undefined, resourceType: undefined, dateRange: [] });
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [hideVerify, setHideVerify] = useState(true);
  

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
      await fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
    } catch (error) {
      console.error('Error during initialization:', error);
      setError(`Initialization failed: ${error.message}`);
    }
  };

  const fetchUsers = async () => {
    console.log('Fetching users...');
    setLoadingUsers(true);
    try {
      const resp = await request.get('/api/users?page_size=1000');
      const list = resp.items || resp || [];
      const map = {};
      (list || []).forEach(u => {
        if (u?.id) {
          map[u.id] = { username: u.username, email: u.email, role: u.role, fullName: u.full_name || u.fullName, createdAt: u.created_at || u.createdAt };
        }
      });
      setUsers(map);
      console.log('Users API response:', resp);
      
      if (resp && resp.items && Array.isArray(resp.items)) {
        const userMap = {};
        resp.items.forEach(user => {
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
        console.log('Response structure:', resp);
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

  const fetchAuditLogs = async ({ page, pageSize, append = false } = { page: pagination.current, pageSize: pagination.pageSize, append: false }) => {
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
        // Ensure the API sees full-day Perth-local boundaries
        const tz = 'Australia/Perth';
        const startUtcIso = dayjs(filters.dateRange[0]).tz(tz).startOf('day').utc().toISOString();
        const endUtcIso = dayjs(filters.dateRange[1]).tz(tz).endOf('day').utc().toISOString();
        params.start_date = startUtcIso;
        params.end_date = endUtcIso;
      }

      const response = await auditAPI.getAuditLogs(params);
      console.log('API Response:', response);
      
      if (response && response.items && response.items.length >= 0) {
        const enhancedLogs = (response.items || []).map(log => {
          const userInfo = users[log.user_id] || {};
          const email = userInfo.email || log.user_email || log.email || '';
          const username = userInfo.username || log.username;
          const role = userInfo.role || log.user_role || log.role;
          const fullName = userInfo.fullName || log.full_name || log.fullName;
          const createdAt = userInfo.createdAt || log.user_created_at || log.created_at;
          return {
            ...log,
            realUsername: username,
            userEmail: email,
            userRole: role,
            userFullName: fullName,
            userCreatedAt: createdAt
          };
        });
        const filteredLogs = hideVerify
          ? enhancedLogs.filter(l => !String(l.action || '').toLowerCase().includes('verify'))
          : enhancedLogs;

        setAuditLogs((prev) => {
          const merged = append ? [...prev, ...filteredLogs] : filteredLogs;
          const seen = new Set();
          const signatureOf = (it) => {
            const ts = it.timestamp ? String(it.timestamp) : '';
            const uid = it.user_id ? String(it.user_id) : '';
            const act = it.action ? String(it.action) : '';
            const rtype = it.resource_type ? String(it.resource_type) : '';
            const rid = it.resource_id ? String(it.resource_id) : '';
            const det = it.details ? String(it.details).slice(0, 256) : '';
            return `${ts}|${uid}|${act}|${rtype}|${rid}|${det}`;
          };
          return merged.filter((it) => {
            const key = signatureOf(it);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
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
          const userInfo = users[log.user_id] || {};
          const email = userInfo.email || log.user_email || log.email || '';
          const username = userInfo.username || log.username;
          const role = userInfo.role || log.user_role || log.role;
          const fullName = userInfo.fullName || log.full_name || log.fullName;
          const createdAt = userInfo.createdAt || log.user_created_at || log.created_at;
          return {
            ...log,
            realUsername: username,
            userEmail: email,
            userRole: role,
            userFullName: fullName,
            userCreatedAt: createdAt
          };
        });
        const filteredLogs = hideVerify
          ? enhancedLogs.filter(l => !String(l.action || '').toLowerCase().includes('verify'))
          : enhancedLogs;

        setAuditLogs((prev) => {
          const merged = append ? [...prev, ...filteredLogs] : filteredLogs;
          const seen = new Set();
          const signatureOf = (it) => {
            const ts = it.timestamp ? String(it.timestamp) : '';
            const uid = it.user_id ? String(it.user_id) : '';
            const act = it.action ? String(it.action) : '';
            const rtype = it.resource_type ? String(it.resource_type) : '';
            const rid = it.resource_id ? String(it.resource_id) : '';
            const det = it.details ? String(it.details).slice(0, 256) : '';
            return `${ts}|${uid}|${act}|${rtype}|${rid}|${det}`;
          };
          return merged.filter((it) => {
            const key = signatureOf(it);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
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

  const handleTableChange = () => {};

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setAuditLogs([]);
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
  };

  const resetFilters = () => {
    setFilters({ action: undefined, resourceType: undefined, dateRange: [] });
    setPagination((prev) => ({ ...prev, current: 1 }));
    setAuditLogs([]);
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
  };

  const handleExport = async () => {
    // Require a bounded window (<= 7 Perth-local days) to prevent huge exports
    const tz = 'Australia/Perth';
    if (!filters.dateRange || filters.dateRange.length !== 2) {
      message.warning('Please select a date range (e.g., Last 7 days) before exporting.');
      return;
    }
    const startPerth = dayjs(filters.dateRange[0]).tz(tz).startOf('day');
    const endPerth = dayjs(filters.dateRange[1]).tz(tz).endOf('day');
    const inclusiveDays = endPerth.diff(startPerth, 'day') + 1;
    if (inclusiveDays > 7) {
      message.error('Please select Last 7 Days (or a range of 7 days or less) to export.');
      return;
    }

    try {
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = new Date(filters.dateRange[0]).toISOString();
        params.end_date = new Date(filters.dateRange[1]).toISOString();
      }

      const blob = await auditAPI.exportAuditLogs({ ...params, format: 'csv' });
      const dataBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'text/csv' });
      const url = window.URL.createObjectURL(dataBlob);
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
      // Fallback to client-side export when server route is missing (404)
      const status = e?.response?.status;
      if (status === 404) {
        try {
          await exportClientCSV();
        } catch (ee) {
          console.error(ee);
          message.error(`Client export failed: ${ee?.message || 'Unknown error'}`);
        }
      } else {
        message.error(`Export failed: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  // Client-side CSV export: paginate, de-dup, and generate CSV in the browser
  const exportClientCSV = async () => {
    message.loading('Preparing CSV…', 0);
    try {
      const pageSize = 100; // fetch larger chunks for speed
      let page = 1;
      let all = [];
      // Build params similarly to fetchAuditLogs, with Perth-local full-day bounds
      const buildParams = (p) => {
        const params = { page: p, page_size: pageSize };
        if (filters.action) params.action = filters.action;
        if (filters.resourceType) params.resource_type = filters.resourceType;
        if (filters.dateRange && filters.dateRange.length === 2) {
          const tz = 'Australia/Perth';
          const startUtcIso = dayjs(filters.dateRange[0]).tz(tz).startOf('day').utc().toISOString();
          const endUtcIso = dayjs(filters.dateRange[1]).tz(tz).endOf('day').utc().toISOString();
          params.start_date = startUtcIso;
          params.end_date = endUtcIso;
        }
        return params;
      };

      // paginate until fewer than pageSize
      // fail-safe max pages to avoid infinite loops
      const MAX_PAGES = 200;
      for (; page <= MAX_PAGES; page += 1) {
        const resp = await auditAPI.getAuditLogs(buildParams(page));
        const items = resp?.items || (Array.isArray(resp) ? resp : []);
        if (!items.length) break;
        all = all.concat(items);
        if (items.length < pageSize) break;
      }

      // de-dup similar to the table
      const seen = new Set();
      const signatureOf = (it) => {
        const ts = it.timestamp ? String(it.timestamp) : '';
        const uid = it.user_id ? String(it.user_id) : '';
        const act = it.action ? String(it.action) : '';
        const rtype = it.resource_type ? String(it.resource_type) : '';
        const rid = it.resource_id ? String(it.resource_id) : '';
        const det = it.details ? String(it.details).slice(0, 256) : '';
        return `${ts}|${uid}|${act}|${rtype}|${rid}|${det}`;
      };
      const unique = all.filter((it) => {
        const key = signatureOf(it);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // map users
      const toRow = (log) => {
        const userInfo = users[log.user_id] || {};
        const username = userInfo.username || log.username || '';
        const email = userInfo.email || log.user_email || '';
        return [
          log.id || '',
          log.timestamp || '',
          username,
          email,
          log.action || '',
          log.resource_type || '',
          log.resource_id || '',
          (typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '')).replace(/\n/g, ' ')
        ];
      };

      const headers = ['id','timestamp','username','email','action','resource_type','resource_id','details'];
      const escapeCsv = (v) => {
        const s = String(v ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };
      const lines = [headers.map(escapeCsv).join(',')].concat(unique.map((log) => toRow(log).map(escapeCsv).join(',')));
      const csvBlob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `audit-logs-client-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.destroy();
      message.success(`Exported ${unique.length} logs`);
    } catch (err) {
      message.destroy();
      throw err;
    }
  };

  // Quick date presets
  const setLastNDays = (n) => {
    // Compute Perth-local day boundaries, then convert to UTC for the API
    const tz = 'Australia/Perth';
    const endPerth = dayjs().tz(tz).endOf('day');
    const startPerth = endPerth.subtract(Math.max(1, n) - 1, 'day').startOf('day');
    const startUtc = startPerth.utc().toDate();
    const endUtc = endPerth.utc().toDate();
    setFilters((prev) => ({ ...prev, dateRange: [startUtc, endUtc] }));
    setPagination((prev) => ({ ...prev, current: 1 }));
    setAuditLogs([]);
    fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
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
      fetchAuditLogs({ page: next, pageSize: pagination.pageSize, append: true });
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

  const showUserDetails = async (userId) => {
    if (!userId || userId === 'system' || userId === 'System') {
      message.info('No user details for system events');
      return;
    }
    try {
      setLoadingUser(true);
      const user = await usersApi.getUserDetail(userId);
      setSelectedUser(user);
      setUserModalVisible(true);
    } catch (e) {
      message.error('Failed to load user details');
    } finally {
      setLoadingUser(false);
    }
  };

  // Prefetch user details for detail modal (no modal open)
  const prefetchUserForLog = async (userId) => {
    if (!userId || userId === 'system' || userId === 'System') return;
    try {
      const user = await usersApi.getUserDetail(userId);
      setSelectedUser(user);
    } catch (e) {
      // ignore prefetch failures
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
        const tz = 'Australia/Perth';
        const iso = normalizeIsoToUtc(timestamp);
        const d = dayjs(iso).tz(tz);
        const localStr = d.format('ddd, MMM D, YYYY h:mm:ss A');
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{localStr}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{tz}</Text>
          </div>
        );
      }
    },
    {
      title: 'User',
      dataIndex: 'realUsername',
      key: 'realUsername',
      render: (username, record) => {
        const name = record.displayUsername || record.realUsername || username || 'System';
        const role = (record.userRole || '').toLowerCase();
        const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
        const email = record.userEmail || '-';
        const userId = record.displayUserId || record.user_id || 'System';
        const initial = name.charAt(0).toUpperCase();
        const avatarColor = role === 'admin' ? '#f5222d' : role === 'doctor' ? '#52c41a' : (name === 'System' ? '#595959' : '#1890ff');
        const shortId = userId ? (String(userId).length > 12 ? `${String(userId).slice(0,6)}…${String(userId).slice(-6)}` : String(userId)) : '';

        return (
          <Space>
            <Avatar size={24} style={{ backgroundColor: avatarColor }}>{initial}</Avatar>
            <div>
              <div>
                <Text strong style={{ fontSize: 14 }}>{name}</Text>
              </div>
              {email && email !== '-' && (
                <div>
                  <a href={`mailto:${email}`}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
                  </a>
                </div>
              )}
              {roleLabel && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{roleLabel}</Text>
                </div>
              )}
              {shortId && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>ID: <Text code style={{ fontSize: 11 }}>{shortId}</Text></Text>
                </div>
              )}
            </div>
            {record.admin_key_used && (
              <Tooltip title="Admin key used">
                <LockOutlined style={{ color: '#ff4d4f' }} />
              </Tooltip>
            )}
          </Space>
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
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={async () => {
              setSelectedLog(record);
              await prefetchUserForLog(record.user_id);
              setDetailModalVisible(true);
            }}
          >
            View
          </Button>
          <Button
            size="small"
            onClick={async () => {
              setSelectedLog(record);
              await prefetchUserForLog(record.user_id);
              setDetailModalVisible(true);
            }}
          >
            User
          </Button>
        </Space>
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
              onChange={(val) => {
                setFilters((prev) => ({ ...prev, action: val }));
                setPagination((prev) => ({ ...prev, current: 1 }));
                setAuditLogs([]);
                fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
              }}
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
              onChange={(val) => {
                setFilters((prev) => ({ ...prev, resourceType: val }));
                setPagination((prev) => ({ ...prev, current: 1 }));
                setAuditLogs([]);
                fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
              }}
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
                  setPagination((prev) => ({ ...prev, current: 1 }));
                  setAuditLogs([]);
                  fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
                } else {
                  setFilters((prev) => ({ ...prev, dateRange: [vals[0].toDate(), vals[1].toDate()] }));
                  setPagination((prev) => ({ ...prev, current: 1 }));
                  setAuditLogs([]);
                  fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
                }
              }}
              style={{ width: 280 }}
            />
            <Switch
              checked={hideVerify}
              onChange={(v) => { setHideVerify(v); setPagination((prev) => ({ ...prev, current: 1 })); setAuditLogs([]); fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false }); }}
              checkedChildren="Hide verify"
              unCheckedChildren="Show verify"
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
            pagination={false}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
          />
        )}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary">Showing {auditLogs.length} of {pagination.total || auditLogs.length}</Text>
          </div>
          {pagination.current * pagination.pageSize < (pagination.total || 0) && (
            <Button onClick={loadMore} loading={loading}>See more</Button>
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
              {selectedLog.timestamp ? (() => {
                const tz = 'Australia/Perth';
                const iso = normalizeIsoToUtc(selectedLog.timestamp);
                return `${dayjs(iso).tz(tz).format('ddd, MMM D, YYYY h:mm:ss A')} (${tz})`;
              })() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="User" span={2}>
              <Space>
                {(() => {
                  const name = selectedLog.displayUsername || selectedLog.realUsername || selectedLog.username || 'System';
                  const inferredRole = (selectedLog.userRole || '').toLowerCase();
                  const userId = selectedLog.user_id || 'System';
                  const initial = name.charAt(0).toUpperCase();
                  const avatarColor = inferredRole === 'admin' ? '#f5222d' : inferredRole === 'doctor' ? '#52c41a' : (name === 'System' ? '#595959' : '#1890ff');
                  const fullName = selectedUser?.id === userId ? (selectedUser.full_name || selectedUser.fullName) : selectedLog.userFullName;
                  const created = selectedUser?.id === userId ? selectedUser.created_at : selectedLog.userCreatedAt;
                  const roleText = (selectedUser?.id === userId ? selectedUser.role : inferredRole) || inferredRole;
                  const emailText = (selectedUser?.id === userId ? selectedUser.email : selectedLog.userEmail) || '';

                  return (
                    <Space>
                      <Avatar size={24} style={{ backgroundColor: avatarColor }}>{initial}</Avatar>
                      <div>
                        <div><Text>Username: <Text strong>{name}</Text></Text></div>
                        {fullName && (
                          <div><Text type="secondary" style={{ fontSize: 12 }}>{fullName}</Text></div>
                        )}
                        {emailText && (
                          <div>
                            <a href={`mailto:${emailText}`}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Email: {emailText}</Text>
                            </a>
                          </div>
                        )}
                        {roleText && (
                          <div><Text type="secondary" style={{ fontSize: 12 }}>Role: {String(roleText).charAt(0).toUpperCase() + String(roleText).slice(1)}</Text></div>
                        )}
                        {userId && (
                          <div><Text type="secondary" style={{ fontSize: 11 }}>ID: <Text code style={{ fontSize: 11 }}>{userId}</Text></Text></div>
                        )}
                        {created && (
                          <div><Text type="secondary" style={{ fontSize: 11 }}>Created: {new Date(created).toLocaleString()}</Text></div>
                        )}
                      </div>
                    </Space>
                  );
                })()}
              </Space>
            </Descriptions.Item>
            {selectedLog.userCreatedAt && (
              <Descriptions.Item label="User Created" span={2}>
                {new Date(selectedLog.userCreatedAt).toLocaleString()}
              </Descriptions.Item>
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

      {/* User Details Modal */}
      <Modal
        title="User Information"
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setUserModalVisible(false)}>Close</Button>
        ]}
        width={640}
      >
        {loadingUser ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : selectedUser ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="User ID" span={2}>{selectedUser.id}</Descriptions.Item>
            <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            {selectedUser.role && (
              <Descriptions.Item label="Role">{selectedUser.role}</Descriptions.Item>
            )}
            {selectedUser.created_at && (
              <Descriptions.Item label="Created At" span={2}>
                {new Date(selectedUser.created_at).toLocaleString()}
              </Descriptions.Item>
            )}
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">No user selected</Typography.Text>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs; 