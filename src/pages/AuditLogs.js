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
import {
  ReloadOutlined,
  SecurityScanOutlined,
  EyeOutlined,
  FilterOutlined,
  DownloadOutlined,
  UserOutlined,
  ApiOutlined,
  DatabaseOutlined,
  SettingOutlined,
  LockOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { auditAPI } from '../services/api/audit';
import request from '../services/api/request';
import { usersApi } from '../services/api/users';

const { Title, Text } = Typography;

dayjs.extend(utc);
dayjs.extend(timezone);
const PERTH_TZ = 'Australia/Perth';

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
  const [users, setUsers] = useState({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ action: undefined, resourceType: undefined, dateRange: [] });
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [hideVerify, setHideVerify] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await fetchUsers();
      await fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
    } catch (e) {
      setError(`Initialization failed: ${e.message}`);
    }
  };

  const fetchUsers = async () => {
    try {
      const resp = await request.get('/api/users?page_size=1000');
      const list = resp.items || resp || [];
      const map = {};
      (list || []).forEach((u) => {
        if (u?.id) {
          map[u.id] = {
            username: u.username,
            email: u.email,
            role: u.role,
            fullName: u.full_name || u.fullName,
            createdAt: u.created_at || u.createdAt
          };
        }
      });
      setUsers(map);
    } catch (e) {
      setUsers({});
    }
  };

  const fetchAuditLogs = async ({ page, pageSize, append = false }) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pageSize };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      if (filters.dateRange && filters.dateRange.length === 2) {
        const startUtcIso = dayjs(filters.dateRange[0]).tz(PERTH_TZ).startOf('day').utc().toISOString();
        const endUtcIso = dayjs(filters.dateRange[1]).tz(PERTH_TZ).endOf('day').utc().toISOString();
        params.start_date = startUtcIso;
        params.end_date = endUtcIso;
      }

      const response = await auditAPI.getAuditLogs(params);
      const items = response?.items || (Array.isArray(response) ? response : []);

      const enhanced = (items || []).map((log) => {
        const userInfo = users[log.user_id] || {};
        return {
          ...log,
          realUsername: userInfo.username || log.username,
          userEmail: userInfo.email || log.user_email || log.email,
          userRole: userInfo.role || log.user_role || log.role,
          userFullName: userInfo.fullName || log.full_name || log.fullName,
          userCreatedAt: userInfo.createdAt || log.user_created_at || log.created_at
        };
      });

      const filtered = hideVerify
        ? enhanced.filter((l) => !String(l.action || '').toLowerCase().includes('verify'))
        : enhanced;

      setAuditLogs((prev) => {
        const merged = append ? [...prev, ...filtered] : filtered;
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

      const total = response?.pagination?.total;
      setPagination((prev) => ({ ...prev, current: page, pageSize, total: typeof total === 'number' ? total : (append ? auditLogs.length + filtered.length : filtered.length) }));
    } catch (e) {
      setError(`Failed to load audit logs: ${e.message}`);
      if (!append) setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const total = pagination.total || 0;
    if (pagination.current * pagination.pageSize < total) {
      const next = pagination.current + 1;
      setPagination((prev) => ({ ...prev, current: next }));
      fetchAuditLogs({ page: next, pageSize: pagination.pageSize, append: true });
    }
  };

  const handleExport = async () => {
    const tz = PERTH_TZ;
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
        params.start_date = filters.dateRange[0].toISOString();
        params.end_date = filters.dateRange[1].toISOString();
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
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Export started');
    } catch (e) {
      if (e?.response?.status === 404) {
        try {
          await exportClientCSV();
        } catch (ee) {
          message.error(`Client export failed: ${ee?.message || 'Unknown error'}`);
        }
      } else {
        message.error(`Export failed: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  const exportClientCSV = async () => {
    message.loading('Preparing CSV…', 0);
    try {
      const pageSize = 100;
      let page = 1;
      let all = [];
      const buildParams = (p) => {
        const params = { page: p, page_size: pageSize };
        if (filters.action) params.action = filters.action;
        if (filters.resourceType) params.resource_type = filters.resourceType;
        if (filters.dateRange && filters.dateRange.length === 2) {
          const startUtcIso = dayjs(filters.dateRange[0]).tz(PERTH_TZ).startOf('day').utc().toISOString();
          const endUtcIso = dayjs(filters.dateRange[1]).tz(PERTH_TZ).endOf('day').utc().toISOString();
          params.start_date = startUtcIso;
          params.end_date = endUtcIso;
        }
        return params;
      };

      const MAX_PAGES = 200;
      for (; page <= MAX_PAGES; page += 1) {
        const resp = await auditAPI.getAuditLogs(buildParams(page));
        const items = resp?.items || (Array.isArray(resp) ? resp : []);
        if (!items.length) break;
        all = all.concat(items);
        if (items.length < pageSize) break;
      }

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

      const headers = ['id', 'timestamp', 'username', 'email', 'action', 'resource_type', 'resource_id', 'details'];
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

  const prefetchUserForLog = async (userId) => {
    if (!userId || userId === 'system' || userId === 'System') return;
    try {
      const user = await usersApi.getUserDetail(userId);
      setSelectedUser(user);
    } catch {}
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => {
        if (!timestamp) return <Text>N/A</Text>;
        const iso = normalizeIsoToUtc(timestamp);
        const d = dayjs(iso).tz(PERTH_TZ);
        const localStr = d.format('ddd, MMM D, YYYY h:mm:ss A');
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{localStr}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{PERTH_TZ}</Text>
          </div>
        );
      }
    },
    {
      title: 'User',
      dataIndex: 'realUsername',
      key: 'realUsername',
      render: (username, record) => {
        const name = record.realUsername || record.username || (record.user_id ? `User_${String(record.user_id).slice(-6)}` : 'System');
        const role = (record.userRole || '').toLowerCase();
        const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
        const email = record.userEmail || '';
        const userId = record.user_id || '';
        const initial = name.charAt(0).toUpperCase();
        const avatarColor = role === 'admin' ? '#f5222d' : role === 'doctor' ? '#52c41a' : (name === 'System' ? '#595959' : '#1890ff');
        const shortId = userId ? (String(userId).length > 12 ? `${String(userId).slice(0, 6)}…${String(userId).slice(-6)}` : String(userId)) : '';
        return (
          <Space>
            <Avatar size={24} style={{ backgroundColor: avatarColor }}>{initial}</Avatar>
            <div>
              <div><Text strong style={{ fontSize: 14 }}>{name}</Text></div>
              {email && (
                <div>
                  <a href={`mailto:${email}`}><Text type="secondary" style={{ fontSize: 12 }}>{email}</Text></a>
                </div>
              )}
              {roleLabel && (<div><Text type="secondary" style={{ fontSize: 12 }}>{roleLabel}</Text></div>)}
              {shortId && (<div><Text type="secondary" style={{ fontSize: 11 }}>ID: <Text code style={{ fontSize: 11 }}>{shortId}</Text></Text></div>)}
            </div>
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
            <Tag color={color}>{String(action || '').replace(/_/g, ' ').toUpperCase()}</Tag>
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
        const label = String(resource || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const shortId = record.resource_id && record.resource_id.length > 8 ? record.resource_id.slice(-8) : record.resource_id;
        return (
          <Space size={8}>
            {getResourceIcon(resource)}
            <span style={{ fontWeight: 500 }}>{label}</span>
            {shortId && (<span style={{ color: '#8c8c8c', fontSize: 11 }}>#{shortId}</span>)}
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
        const truncated = text.length > 100 ? `${text.slice(0, 100)}…` : text;
        return (
          <Tooltip placement="top" title={text}>
            <Text>{truncated}</Text>
          </Tooltip>
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
        </Space>
      )
    }
  ];

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

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={2}>
            <SecurityScanOutlined style={{ marginRight: 8 }} />
            Audit Logs
          </Title>
        </div>

        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false })} loading={loading}>
            Refresh
          </Button>
          <Space>
            <Space>
              <Button size="small" onClick={() => setFilters((prev) => { const end = dayjs().tz(PERTH_TZ).endOf('day').toDate(); const start = dayjs().tz(PERTH_TZ).endOf('day').subtract(6, 'day').startOf('day').toDate(); setPagination((p)=>({ ...p, current: 1 })); fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false }); return { ...prev, dateRange: [start, end] }; })}>Last 7 days</Button>
              <Button size="small" onClick={() => setFilters((prev) => { const end = dayjs().tz(PERTH_TZ).endOf('day').toDate(); const start = dayjs().tz(PERTH_TZ).endOf('day').subtract(29, 'day').startOf('day').toDate(); setPagination((p)=>({ ...p, current: 1 })); fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false }); return { ...prev, dateRange: [start, end] }; })}>Last 30 days</Button>
              <Button size="small" onClick={() => { setFilters((prev) => ({ ...prev, dateRange: [] })); setPagination((p)=>({ ...p, current: 1 })); fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false }); }}>All time</Button>
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
              value={filters.dateRange && filters.dateRange.length === 2 ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : []}
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
              onChange={(v) => {
                setHideVerify(v);
                setPagination((prev) => ({ ...prev, current: 1 }));
                setAuditLogs([]);
                fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false });
              }}
              checkedChildren="Hide verify"
              unCheckedChildren="Show verify"
            />
            <Button icon={<FilterOutlined />} onClick={() => fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false })}>Apply</Button>
            <Button onClick={() => { setFilters({ action: undefined, resourceType: undefined, dateRange: [] }); setPagination((prev) => ({ ...prev, current: 1 })); setAuditLogs([]); fetchAuditLogs({ page: 1, pageSize: pagination.pageSize, append: false }); }}>Reset</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
          </Space>
        </Space>

        {error && (
          <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
            <p>Loading...</p>
          </div>
        ) : (
          <Table columns={columns} dataSource={auditLogs} rowKey="id" pagination={false} scroll={{ x: 900 }} />
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

      <Modal title="Audit Log Details" open={detailModalVisible} onCancel={() => setDetailModalVisible(false)} footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>Close</Button>]} width={720}>
        {selectedLog && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {selectedLog.timestamp ? (() => {
                const iso = normalizeIsoToUtc(selectedLog.timestamp);
                return `${dayjs(iso).tz(PERTH_TZ).format('ddd, MMM D, YYYY h:mm:ss A')} (${PERTH_TZ})`;
              })() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="User" span={2}>
              <Space>
                {(() => {
                  const name = selectedLog.realUsername || selectedLog.username || 'System';
                  const role = (selectedLog.userRole || '').toLowerCase();
                  const userId = selectedLog.user_id || 'System';
                  const initial = name.charAt(0).toUpperCase();
                  const avatarColor = role === 'admin' ? '#f5222d' : role === 'doctor' ? '#52c41a' : (name === 'System' ? '#595959' : '#1890ff');
                  const emailText = selectedLog.userEmail || '';
                  return (
                    <Space>
                      <Avatar size={24} style={{ backgroundColor: avatarColor }}>{initial}</Avatar>
                      <div>
                        <div><Text>Username: <Text strong>{name}</Text></Text></div>
                        {emailText && (<div><a href={`mailto:${emailText}`}><Text type="secondary" style={{ fontSize: 12 }}>Email: {emailText}</Text></a></div>)}
                        {userId && (<div><Text type="secondary" style={{ fontSize: 11 }}>ID: <Text code style={{ fontSize: 11 }}>{userId}</Text></Text></div>)}
                      </div>
                    </Space>
                  );
                })()}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Username">{selectedLog.realUsername || selectedLog.username || 'Unknown'}</Descriptions.Item>
            <Descriptions.Item label="Action">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="Resource Type">{selectedLog.resource_type}</Descriptions.Item>
            {selectedLog.resource_id && (<Descriptions.Item label="Resource ID">{selectedLog.resource_id}</Descriptions.Item>)}
            <Descriptions.Item label="Details"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(selectedLog.details || '')}</pre></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal title="User Information" open={userModalVisible} onCancel={() => setUserModalVisible(false)} footer={[<Button key="close" onClick={() => setUserModalVisible(false)}>Close</Button>]} width={640}>
        {loadingUser ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : selectedUser ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="User ID" span={2}>{selectedUser.id}</Descriptions.Item>
            <Descriptions.Item label="Username">{selectedUser.username}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            {selectedUser.role && (<Descriptions.Item label="Role">{selectedUser.role}</Descriptions.Item>)}
            {selectedUser.created_at && (<Descriptions.Item label="Created At" span={2}>{new Date(selectedUser.created_at).toLocaleString()}</Descriptions.Item>)}
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">No user selected</Typography.Text>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;
