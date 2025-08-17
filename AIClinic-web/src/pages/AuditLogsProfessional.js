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
      await Promise.all([
        fetchUsers(),
        fetchAuditLogs(),
        fetchAnalytics(),
        fetchSummary(),
        fetchSecurityAlerts()
      ]);
    } catch (error) {
      const errorInfo = handleAuditAPIError(error);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?page_size=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await auditAPI.getAuditLogs({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters
      });
      
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
        
        setAuditLogs(enhancedLogs);
        setPagination(prev => ({ ...prev, total: response.pagination.total }));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
      await auditAPI.exportAuditLogs({ format: 'csv' });
      message.success('Audit logs exported successfully');
    } catch (error) {
      message.error('Failed to export audit logs');
    }
  };

  const showLogDetails = (record) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => (
        <div>
          <div style={{ fontWeight: '500', fontSize: '12px' }}>
            {auditAPI.utils.formatTimestamp(timestamp)}
          </div>
        </div>
      )
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
      title: 'Event',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action) => (
        <Tag color="blue" style={{ fontSize: '11px', fontWeight: '500' }}>
          {action}
        </Tag>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color="purple" style={{ fontSize: '10px' }}>
          {category || 'N/A'}
        </Tag>
      )
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
                Professional Audit Dashboard
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
                  onClick={loadAllData}
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
