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
      
      if (response && response.items) {
        const userMap = {};
        response.items.forEach(user => {
          userMap[user.id] = {
            username: user.username,
            email: user.email,
            role: user.role
          };
        });
        setUsers(userMap);
        console.log('User map created with', Object.keys(userMap).length, 'users');
        message.success(`Loaded ${Object.keys(userMap).length} users`);
      } else {
        console.log('No users found or invalid response format');
        message.warning('No users found');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
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
        
        return (
          <div>
            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
              {displayName}
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
            {userId && userId !== displayName && (
              <div>
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  🆔 {userId.length > 8 ? userId.slice(-8) : userId}
                </Text>
              </div>
            )}
            {!realUsername && !record.username && userId && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px', color: '#faad14' }}>
                  ⚠️ No username found
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