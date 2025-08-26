import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Input,
  DatePicker,
  Select,
  Tag,
  Typography,
  Alert,
  Row,
  Col,
  Tooltip,
  Badge,
  Modal,
  Descriptions,
  message,
  Switch,
  Statistic,
  Avatar,
  Empty
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ApiOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  LockOutlined
} from '@ant-design/icons';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';

const { Title, Text } = Typography;
const { Option } = Select;

const AuditLogsEnhanced = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    searchText: '',
    action: '',
    resourceType: '',
    showAdminKey: false
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [users, setUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Enhanced mock data based on Confluence audit log categories
  const mockAuditLogs = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      user_id: 'user123',
      username: 'admin_user',
      action: 'user_created',
      resource_type: 'user',
      resource_id: 'user789',
      details: 'New user "doctor_jones" created with role: doctor',
      admin_key_used: false,
      severity: 'info'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user_id: 'user456',
      username: 'doctor_smith',
      action: 'login',
      resource_type: 'user',
      resource_id: 'user456',
      details: 'User logged in successfully from IP: 192.168.1.100',
      admin_key_used: false,
      severity: 'info'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user_id: 'user123',
      username: 'admin_user',
      action: 'permission_granted',
      resource_type: 'permission',
      resource_id: 'perm789',
      details: 'Admin permissions granted to user "senior_doctor"',
      admin_key_used: true,
      severity: 'warning'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      user_id: 'user789',
      username: 'doctor_jones',
      action: 'upload_success',
      resource_type: 'ecg_file',
      resource_id: 'ecg789',
      details: 'ECG file "patient_123_ecg.dcm" uploaded successfully (2.3MB)',
      admin_key_used: false,
      severity: 'info'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      user_id: 'user789',
      username: 'doctor_jones',
      action: 'get_diagnosis',
      resource_type: 'ai_diagnosis',
      resource_id: 'diag456',
      details: 'AI diagnosis requested for patient ID: P12345, confidence: 85%',
      admin_key_used: false,
      severity: 'info'
    }
  ];

  const actionTypes = [
    'user_created', 'user_deactivated', 'login', 'logout',
    'upload_success', 'upload_failed', 'get_diagnosis', 'submit_feedback',
    'permission_granted', 'permission_revoked', 'global_settings_changed'
  ];

  const resourceTypes = [
    'user', 'patient', 'ecg_file', 'ai_diagnosis', 'feedback', 'permission', 'settings'
  ];

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize
      };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.searchText) params.search_text = filters.searchText;

      const response = await auditAPI.getAuditLogs(params);

      let items = [];
      let total = 0;
      if (response && response.items) {
        items = response.items;
        total = response.pagination?.total || response.items.length;
      } else if (Array.isArray(response)) {
        items = response;
        total = response.length;
      } else {
        // Fallback to mock if API unavailable
        items = [...mockAuditLogs];
        total = items.length;
      }

      const normalized = items.map(log => {
        const u = users[log.user_id];
        return {
          ...log,
          admin_key_used: Boolean(log.admin_key_used),
          severity: log.status === 'failure' ? 'error' : (log.severity || 'info'),
          realUsername: u?.username || log.username,
          userEmail: u?.email,
          userRole: u?.role,
          userFullName: u?.fullName
        };
      });

      setAuditLogs(normalized);
      setPagination(prev => ({ ...prev, total }));
      message.success(`Loaded ${normalized.length} audit log entries`);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Graceful fallback
      setAuditLogs(mockAuditLogs);
      setPagination(prev => ({ ...prev, total: mockAuditLogs.length }));
      message.warning('Showing demo data (audit API unavailable)');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize, users]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const resp = await request.get('/api/users?page_size=200');
        const list = resp.items || resp || [];
        const map = {};
        (list || []).forEach(u => {
          if (u?.id) {
            map[u.id] = { username: u.username, email: u.email, role: u.role, fullName: u.full_name || u.fullName };
          }
        });
        setUsers(map);
      } catch (e) {
        // ignore, user enrichment is best-effort
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleTableChange = (paginationInfo) => {
    setPagination(prev => ({
      ...prev,
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      searchText: '',
      action: '',
      resourceType: '',
      showAdminKey: false
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const showLogDetails = (record) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  };

  const getActionColor = (action) => {
    const actionColors = {
      'user_created': 'green', 'user_deactivated': 'red', 'login': 'green', 'logout': 'blue',
      'upload_success': 'green', 'upload_failed': 'red', 'get_diagnosis': 'purple',
      'submit_feedback': 'cyan', 'permission_granted': 'green', 'permission_revoked': 'red',
      'global_settings_changed': 'volcano'
    };
    return actionColors[action] || 'default';
  };

  const getSeverityColor = (severity) => {
    const severityColors = {
      'info': 'blue',
      'warning': 'orange',
      'error': 'red'
    };
    return severityColors[severity] || 'default';
  };

  const getResourceTypeIcon = (resourceType) => {
    const icons = {
      'user': <UserOutlined />,
      'patient': <UserOutlined />,
      'ecg_file': <DatabaseOutlined />,
      'ai_diagnosis': <ApiOutlined />,
      'feedback': <ApiOutlined />,
      'permission': <LockOutlined />,
      'settings': <SettingOutlined />
    };
    return icons[resourceType] || <DatabaseOutlined />;
  };

  const exportAuditLogs = async () => {
    try {
      const params = { page: 1, page_size: 1000 };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.searchText) params.search_text = filters.searchText;

      const response = await auditAPI.getAuditLogs(params);
      const items = (response && response.items) ? response.items : auditLogs;

      const header = ['Timestamp','User','Action','Resource Type','Resource ID','Details','Admin Key Used','Severity'];
      const rows = items.map(log => [
        new Date(log.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Perth' }),
        log.username || '',
        log.action || '',
        log.resource_type || '',
        log.resource_id || '',
        (log.details || '').toString().replace(/\n/g, ' '),
        log.admin_key_used ? 'Yes' : 'No',
        (log.status === 'failure' ? 'error' : (log.severity || 'info')).toUpperCase()
      ]);
      const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Audit logs exported successfully');
    } catch (e) {
      console.error('Export failed, falling back to current view:', e);
      try {
        const header = ['Timestamp','User','Action','Resource Type','Resource ID','Details','Admin Key Used','Severity'];
        const rows = auditLogs.map(log => [
          new Date(log.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Perth' }),
          log.username || '',
          log.action || '',
          log.resource_type || '',
          log.resource_id || '',
          (log.details || '').toString().replace(/\n/g, ' '),
          log.admin_key_used ? 'Yes' : 'No',
          (log.status === 'failure' ? 'error' : (log.severity || 'info')).toUpperCase()
        ]);
        const csvContent = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        message.success('Exported current page');
      } catch (err) {
        message.error('Export failed');
      }
    }
  };

  const stats = {
    total: pagination.total,
    adminKey: auditLogs.filter(log => log.admin_key_used).length,
    warnings: auditLogs.filter(log => log.severity === 'warning').length,
    errors: auditLogs.filter(log => log.severity === 'error').length
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp) => {
        const perth = new Date(timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Perth' });
        return (
          <Text type="secondary">{perth}</Text>
        );
      }
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      width: 200,
      render: (username, record) => {
        const name = record.realUsername || username || 'System';
        const initial = name.charAt(0).toUpperCase();
        const avatarColor = name === 'System' ? '#595959' : '#1890ff';
        return (
          <Space>
            <Avatar size={24} style={{ backgroundColor: avatarColor }}>{initial}</Avatar>
            <div>
              <div>
                <Text strong>{name}</Text>
                {record.userRole && (
                  <Tag color={record.userRole === 'admin' ? 'red' : 'green'} style={{ marginLeft: 6 }}>
                    {record.userRole.toUpperCase()}
                  </Tag>
                )}
              </div>
              {record.userFullName && (
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{record.userFullName}</Text>
                </div>
              )}
              {record.userEmail && (
                <div>
                  <a href={`mailto:${record.userEmail}`}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.userEmail}</Text>
                  </a>
                </div>
              )}
              {record.user_id && (
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>ID: {record.user_id.length > 8 ? record.user_id.slice(-8) : record.user_id}</Text>
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
      width: 140,
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {action.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 120,
      render: (resourceType, record) => (
        <Space>
          {getResourceTypeIcon(resourceType)}
          <Text>{resourceType.replace('_', ' ').toUpperCase()}</Text>
          {record.resource_id && (
            <Badge count={record.resource_id.slice(-6)} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      )
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (details, record) => (
        <Space direction="vertical" size="small">
          <Tooltip title={details}>
            <Text ellipsis style={{ maxWidth: 280 }}>
              {details || 'No details'}
            </Text>
          </Tooltip>
          <Tag color={getSeverityColor(record.severity)} size="small">
            {record.severity.toUpperCase()}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const s = (status || '').toLowerCase();
        const color = s === 'success' ? 'green' : s === 'failure' ? 'red' : 'gold';
        return <Tag color={color}>{(status || 'success').toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Tooltip title="View Details">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showLogDetails(record)}
            size="small"
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Events"
              value={stats.total}
              prefix={<SecurityScanOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Admin Key Events"
              value={stats.adminKey}
              prefix={<LockOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Warnings"
              value={stats.warnings}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Errors"
              value={stats.errors}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2}>
              <SecurityScanOutlined style={{ marginRight: 8 }} />
              Audit Log
            </Title>
            <Text type="secondary">
              Monitor and manage activity in the AI Clinic system
            </Text>
            <div style={{ marginTop: 4 }}>
              <Tag color="geekblue">Australia/Perth</Tag>
            </div>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => message.info('Advanced filters coming soon!')}
              >
                Advanced Filters
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAuditLogs}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportAuditLogs}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Quick Filters */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Input
                placeholder="Search logs..."
                prefix={<SearchOutlined />}
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Action Type"
                value={filters.action}
                onChange={(value) => handleFilterChange('action', value)}
                allowClear
                style={{ width: '100%' }}
              >
                {actionTypes.map(action => (
                  <Option key={action} value={action}>
                    {action.replace('_', ' ').toUpperCase()}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Resource Type"
                value={filters.resourceType}
                onChange={(value) => handleFilterChange('resourceType', value)}
                allowClear
                style={{ width: '100%' }}
              >
                {resourceTypes.map(type => (
                  <Option key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Switch
                checked={filters.showAdminKey}
                onChange={(checked) => handleFilterChange('showAdminKey', checked)}
                checkedChildren="Admin Key"
                unCheckedChildren="All Events"
              />
            </Col>
            <Col span={4}>
              <Button onClick={clearFilters} size="small">
                Clear All
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Audit Logs Table */}
        <Table
          columns={columns}
          dataSource={auditLogs}
          rowKey="id"
          loading={loading}
          size="middle"
          bordered
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} events`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200, y: 480 }}
          onRow={(_, index) => ({
            style: { backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }
          })}
          locale={{
            emptyText: <Empty description="No audit events found" />
          }}
        />
      </Card>

      {/* Log Details Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>Audit Log Details</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Timestamp" span={2}>
              {new Date(selectedLog.timestamp).toLocaleString('en-AU', { timeZone: 'Australia/Perth' })}
            </Descriptions.Item>
            <Descriptions.Item label="User ID">
              {selectedLog.user_id}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              <Space>
                {selectedLog.username || 'System'}
                {selectedLog.admin_key_used && (
                  <Tag color="red" icon={<LockOutlined />}>
                    Admin Key Used
                  </Tag>
                )}
              </Space>
            </Descriptions.Item>
            {selectedLog.userFullName && (
              <Descriptions.Item label="Full Name">
                {selectedLog.userFullName}
              </Descriptions.Item>
            )}
            {selectedLog.userEmail && (
              <Descriptions.Item label="Email">
                {selectedLog.userEmail}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Action">
              <Tag color={getActionColor(selectedLog.action)}>
                {selectedLog.action.replace('_', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Severity">
              <Tag color={getSeverityColor(selectedLog.severity)}>
                {selectedLog.severity.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Resource Type">
              <Space>
                {getResourceTypeIcon(selectedLog.resource_type)}
                {selectedLog.resource_type.replace('_', ' ').toUpperCase()}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Resource ID" span={2}>
              {selectedLog.resource_id || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Details" span={2}>
              <Text>{selectedLog.details || 'No details available'}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsEnhanced; 