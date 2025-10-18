import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, message, Spin, Avatar, Typography, Row, Col, Space } from 'antd';
import { UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import { usersApi } from '../../services/api/users';

const { Title } = Typography;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;

  .back-button {
    margin-right: 16px;
  }
`;

const DoctorDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getUserDetail(userId);
      setUser(data);
    } catch (error) {
      message.error('Failed to fetch user details');
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <PageContainer>
        <StyledCard>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        </StyledCard>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <StyledCard>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Typography.Text type="secondary">User not found</Typography.Text>
          </div>
        </StyledCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <StyledCard>
        <HeaderSection>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="back-button"
          >
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>User Details</Title>
        </HeaderSection>

        <Row gutter={[24, 24]}>
          <Col xs={24} sm={8} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Avatar size={120} icon={<UserOutlined />} />
              <Title level={4} style={{ marginTop: '16px', marginBottom: '4px' }}>
                {user.username}
              </Title>
              <Typography.Text type="secondary">
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} sm={16} md={18}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="User ID">{user.id}</Descriptions.Item>
              <Descriptions.Item label="Username">{user.username}</Descriptions.Item>
              <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
              <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
              <Descriptions.Item label="Created At">
                {new Date(user.created_at).toLocaleString()}
              </Descriptions.Item>
              {user.last_login && (
                <Descriptions.Item label="Last Login">
                  {new Date(user.last_login).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Space style={{ marginTop: '24px' }}>
              <Button
                type="primary"
                onClick={() => navigate(`/doctors/edit/${user.id}`)}
              >
                Edit User
              </Button>
            </Space>
          </Col>
        </Row>
      </StyledCard>
    </PageContainer>
  );
};

export default DoctorDetail;
