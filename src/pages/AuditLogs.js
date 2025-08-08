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
  Spin
} from 'antd';
import { ReloadOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';

const { Title, Text } = Typography;

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [users, setUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

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
      await fetchAuditLogs();
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
              username: user.username,
              email: user.email || '',
              role: user.role || 'user'
            };
          }
        });
        
        // Add manual mappings for known user IDs
        const manualMappings = getManualUserMappings();
        Object.assign(userMap, manualMappings);
        
        setUsers(userMap);
        console.log('User map created with', Object.keys(userMap).length, 'users');
        console.log('User map sample:', Object.keys(userMap).slice(0, 3).map(id => ({ id, ...userMap[id] })));
        message.success(`Loaded ${Object.keys(userMap).length} users`);
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
      // Map the specific user ID you mentioned
      '688749ee32c624e0251cc83d': {
        username: 'admin_user',
        email: 'admin@example.com',
        role: 'admin'
      },
      // Add more mappings here as you discover them
      // 'another_user_id_here': {
      //   username: 'another_username',
      //   email: 'another@example.com',
      //   role: 'doctor'
      // }
    };
  };

  // Quick function to map the specific user ID you mentioned
  const mapSpecificUser = () => {
    // You can change these values to match the actual user
    addUserMapping('688749ee32c624e0251cc83d', 'admin_user', 'admin@example.com', 'admin');
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

  const fetchAuditLogs = async () => {
    console.log('Fetching audit logs...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await auditAPI.getAuditLogs({ page: 1, page_size: 50 });
      console.log('API Response:', response);
      
      if (response && response.items && response.items.length > 0) {
        const enhancedLogs = response.items.map(log => {
          const userInfo = users[log.user_id];
          return {
            ...log,
            realUsername: userInfo?.username || log.username,
            userEmail: userInfo?.email,
            userRole: userInfo?.role
          };
        });
        
        setAuditLogs(enhancedLogs);
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
            userRole: userInfo?.role
          };
        });
        
        setAuditLogs(enhancedLogs);
        message.success(`Loaded ${enhancedLogs.length} audit logs`);
        
      } else {
        setAuditLogs([]);
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

  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => (
        <Text>{timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</Text>
      )
    },
    {
      title: 'Real Username',
      dataIndex: 'realUsername',
      key: 'realUsername',
      render: (realUsername, record) => {
        const displayName = realUsername || record.username || record.user_id || 'System';
        const userId = record.user_id;
        const userEmail = record.userEmail;
        const userRole = record.userRole;
        
        // Check if we have a real username or if we're showing an ID
        const isRealUsername = realUsername && realUsername !== userId;
        const isSystemUser = !userId || userId === 'system' || userId === 'System';
        
        return (
          <div>
            <Text strong style={{ 
              fontSize: '14px', 
              color: isRealUsername ? '#1890ff' : isSystemUser ? '#52c41a' : '#faad14'
            }}>
              {isRealUsername ? displayName : isSystemUser ? 'System' : `User_${userId.slice(-6)}`}
            </Text>
            {userEmail && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  📧 {userEmail}
                </Text>
              </div>
            )}
            {userRole && (
              <div style={{ marginTop: 2 }}>
                <Tag size="small" color={userRole === 'admin' ? 'red' : 'blue'}>
                  👤 {userRole.toUpperCase()}
                </Tag>
              </div>
            )}
            {userId && userId !== displayName && !isSystemUser && (
              <div>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  🆔 {userId.length > 8 ? userId.slice(-8) : userId}
                </Text>
              </div>
            )}
            {!realUsername && !record.username && userId && !isSystemUser && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px', color: '#faad14' }}>
                  ⚠️ Username not found - showing ID
                </Text>
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
      render: (action) => (
        <Tag color="blue">{action || 'Unknown'}</Tag>
      )
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (resource) => <Text>{resource || 'N/A'}</Text>
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (details) => <Text>{details || 'No details'}</Text>
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
                  </div>
                </div>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchAuditLogs}
            loading={loading}
          >
            Refresh
          </Button>
          <Button onClick={testAPI}>
            Test API
          </Button>
          <Button onClick={mapSpecificUser}>
            Map Specific User
          </Button>
          <Button onClick={showUnmappedUsers}>
            Show Unmapped Users
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
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} items`
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
};

export default AuditLogs; 