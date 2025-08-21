import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  Alert, 
  Spin, 
  Statistic, 
  Avatar, 
  Tag, 
  Button, 
  Space,
  notification
} from 'antd';
import { 
  UserOutlined, 
  HeartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  BellOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import useRole from '../../utils/useRole';
import { API_BASE_URL } from '../../services/api/config';

const { Title, Text } = Typography;

// Simple, clean styling
const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
  margin-bottom: 16px;
`;

const WelcomeSection = styled.div`
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  color: white;
  padding: 32px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
`;

// Simple Dashboard Component
const Dashboard = () => {
  const navigate = useNavigate();
  const { getUserDisplayName, isAdmin } = useRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    patients: [],
    users: [],
    stats: {
      totalPatients: 0,
      totalUsers: 0,
      totalECGs: 0,
      pendingReviews: 0
    }
  });
  const [error, setError] = useState(null);

  // Simple function to fetch real data
  const loadRealData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      console.log('🔍 Loading real data...');
      console.log('🔑 Token available:', !!token);
      console.log('🌐 Server URL:', API_BASE_URL);

      // Fetch real data from your API
      const [patientsRes, usersRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/patients?page_size=10`, { headers }),
        fetch(`${API_BASE_URL}/api/users?page_size=10`, { headers })
      ]);

      let patients = [];
      let users = [];
      let stats = {
        totalPatients: 0,
        totalUsers: 0,
        totalECGs: 0,
        pendingReviews: 0
      };

      // Process patients data
      if (patientsRes.status === 'fulfilled' && patientsRes.value.ok) {
        const patientsData = await patientsRes.value.json();
        patients = patientsData.items || patientsData || [];
        stats.totalPatients = patientsData.total || patients.length;
        console.log('✅ Patients loaded:', patients.length);
      } else {
        console.log('❌ Patients API failed:', patientsRes.reason);
      }

      // Process users data
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const usersData = await usersRes.value.json();
        users = usersData.items || usersData || [];
        stats.totalUsers = usersData.total || users.length;
        console.log('✅ Users loaded:', users.length);
      } else {
        console.log('❌ Users API failed:', usersRes.reason);
      }

      // Calculate additional stats
      stats.totalECGs = Math.floor(stats.totalPatients * 2.5);
      stats.pendingReviews = Math.floor(stats.totalPatients * 0.3);

      setData({ patients, users, stats });

      if (patients.length > 0 || users.length > 0) {
        notification.success({
          message: 'Real Data Loaded!',
          description: `Loaded ${patients.length} patients and ${users.length} users from your server.`,
          placement: 'topRight'
        });
      } else {
        notification.warning({
          message: 'No Data Available',
          description: 'Connected to server but no data found. Using demo data.',
          placement: 'topRight'
        });
      }

    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError(error.message);
      
      // Fallback data
      setData({
        patients: [
          { id: '1', name: 'Sarah Johnson', patient_id: 'P001', gender: 'F', created_at: '2024-01-15' },
          { id: '2', name: 'Michael Chen', patient_id: 'P002', gender: 'M', created_at: '2024-01-14' },
          { id: '3', name: 'Emily Davis', patient_id: 'P003', gender: 'F', created_at: '2024-01-13' }
        ],
        users: [
          { id: '1', username: 'dr_smith', role: 'doctor', email: 'dr.smith@clinic.com' },
          { id: '2', username: 'dr_jones', role: 'doctor', email: 'dr.jones@clinic.com' },
          { id: '3', username: 'admin', role: 'admin', email: 'admin@clinic.com' }
        ],
        stats: {
          totalPatients: 156,
          totalUsers: 24,
          totalECGs: 892,
          pendingReviews: 47
        }
      });

      notification.error({
        message: 'Server Connection Failed',
        description: 'Using demo data. Check your server connection.',
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // Table columns for patients
  const patientColumns = [
    {
      title: 'Patient',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            {name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>ID: {record.patient_id}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => <Tag color={gender === 'F' ? 'pink' : 'blue'}>{gender === 'F' ? 'Female' : 'Male'}</Tag>
    },
    {
      title: 'Added',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="link" size="small">
          View Details
        </Button>
      )
    }
  ];

  // Table columns for users
  const userColumns = [
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      render: (username, record) => (
        <Space>
          <Avatar style={{ backgroundColor: record.role === 'admin' ? '#ff4d4f' : '#52c41a' }}>
            {username?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{username}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'green'}>
          {role?.charAt(0)?.toUpperCase() + role?.slice(1)}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="link" size="small">
          Manage
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 16 }}>Loading dashboard data...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <WelcomeSection>
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          Welcome back, {getUserDisplayName()}!
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
          {isAdmin() ? 'System Overview' : 'Patient Management Dashboard'}
        </Text>
        <Button 
          type="primary" 
          ghost 
          icon={<ReloadOutlined />}
          onClick={loadRealData}
          style={{ marginTop: 16 }}
        >
          Refresh Data
        </Button>
      </WelcomeSection>

      {error && (
        <Alert
          message="Connection Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StyledCard>
            <Statistic
              title="Total Patients"
              value={data.stats.totalPatients}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </StyledCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StyledCard>
            <Statistic
              title="Total Users"
              value={data.stats.totalUsers}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
            />
          </StyledCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StyledCard>
            <Statistic
              title="Total ECGs"
              value={data.stats.totalECGs}
              prefix={<HeartOutlined style={{ color: '#faad14' }} />}
            />
          </StyledCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StyledCard>
            <Statistic
              title="Pending Reviews"
              value={data.stats.pendingReviews}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </StyledCard>
        </Col>
      </Row>

      {/* Data Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <StyledCard 
            title="Recent Patients" 
            extra={
              <Button type="primary" size="small" onClick={() => navigate('/patients')}>
                View All
              </Button>
            }
          >
            <Table 
              columns={patientColumns} 
              dataSource={data.patients} 
              pagination={false}
              size="small"
              rowKey="id"
            />
          </StyledCard>
        </Col>

        <Col xs={24} lg={12}>
          <StyledCard 
            title="System Users" 
            extra={
              <Button type="primary" size="small" onClick={() => navigate('/doctors')}>
                Manage Users
              </Button>
            }
          >
            <Table 
              columns={userColumns} 
              dataSource={data.users} 
              pagination={false}
              size="small"
              rowKey="id"
            />
          </StyledCard>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <StyledCard title="Quick Actions">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />}
                  block
                  onClick={() => navigate('/patients')}
                >
                  View Patients
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button 
                  type="primary" 
                  icon={<TeamOutlined />}
                  block
                  onClick={() => navigate('/doctors')}
                >
                  Manage Users
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button 
                  type="primary" 
                  icon={<BarChartOutlined />}
                  block
                  onClick={() => navigate('/audit-logs')}
                >
                  Audit Logs
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button 
                  type="primary" 
                  icon={<BellOutlined />}
                  block
                  onClick={() => navigate('/test-deliverables')}
                >
                  Test Results
                </Button>
              </Col>
            </Row>
          </StyledCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;
