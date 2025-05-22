import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Row, Col, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons';


const { Title } = Typography;

const Account = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('userData');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserData(user);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  console.log('Current userData:', userData);
  console.log('LocalStorage user:', localStorage.getItem('user'));

  if (!userData) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Typography.Text>No user data available</Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={8} md={6} style={{ textAlign: 'center' }}>
            <Avatar size={120} icon={<UserOutlined />} />
            <Title level={3} style={{ marginTop: '16px', marginBottom: '0' }}>
              {userData.username}
            </Title>
            <Typography.Text type="secondary">
              {userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1)}
            </Typography.Text>
          </Col>
          <Col xs={24} sm={16} md={18}>
            <Descriptions title="Personal Information" bordered column={1}>
              <Descriptions.Item label="Username">{userData.username}</Descriptions.Item>
              <Descriptions.Item label="Role">{userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1)}</Descriptions.Item>
              <Descriptions.Item label="User ID">{userData.user_id}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Account;
