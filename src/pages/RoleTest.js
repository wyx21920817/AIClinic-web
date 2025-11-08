import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Select, Space, Alert, Divider } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';
import useRole from '../utils/useRole';
import { USER_ROLES, ROLE_PERMISSIONS, ROLE_DISPLAY_NAMES } from '../constants/Constants';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PageContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;
`;

const RoleTest = () => {
  const { 
    role, 
    permissions, 
    isAdmin, 
    isDoctor, 
    hasPermission, 
    getUserDisplayName, 
    getRoleDisplayName 
  } = useRole();
  
  const [selectedRole, setSelectedRole] = useState(role);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    // Update localStorage for testing
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.role = newRole;
    localStorage.setItem('userData', JSON.stringify(userData));
    // Reload page to see changes
    window.location.reload();
  };

  const getCurrentPermissions = () => {
    return ROLE_PERMISSIONS[selectedRole] || [];
  };

  return (
    <PageContainer>
      <Title level={2}>Role-Based Dashboard Test</Title>
      <Paragraph>
        This page demonstrates the role-based dashboard functionality. You can switch roles to see different dashboards.
      </Paragraph>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <StyledCard>
            <Title level={3}>Current User Information</Title>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Text strong>Name:</Text> {getUserDisplayName()}
              </Col>
              <Col span={8}>
                <Text strong>Current Role:</Text> {getRoleDisplayName()}
              </Col>
              <Col span={8}>
                <Text strong>Role ID:</Text> {role}
              </Col>
            </Row>
          </StyledCard>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <StyledCard>
            <Title level={3}>Role Testing</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Switch Role:</Text>
                <Select
                  value={selectedRole}
                  onChange={handleRoleChange}
                  style={{ width: 200, marginLeft: 16 }}
                >
                  <Option value={USER_ROLES.DOCTOR}>Doctor</Option>
                  <Option value={USER_ROLES.ADMIN}>Administrator</Option>
                </Select>
              </div>
              <Alert
                message="Role Switch Instructions"
                description="After changing the role, the page will reload and you'll see the appropriate dashboard when you navigate to /dashboard"
                type="info"
                showIcon
              />
            </Space>
          </StyledCard>
        </Col>

        <Col span={12}>
          <StyledCard>
            <Title level={3}>Role Functions</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Is Admin:</Text> {isAdmin() ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <Text strong>Is Doctor:</Text> {isDoctor() ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <Text strong>Has Permission (view_patients):</Text> {hasPermission('view_patients') ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <Text strong>Has Permission (manage_doctors):</Text> {hasPermission('manage_doctors') ? '✅ Yes' : '❌ No'}
              </div>
            </Space>
          </StyledCard>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <StyledCard>
            <Title level={3}>Current Role Permissions</Title>
            <Row gutter={[16, 16]}>
              {getCurrentPermissions().map((permission, index) => (
                <Col span={8} key={index}>
                  <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                    <Text>{permission}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </StyledCard>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <StyledCard>
            <Title level={3}>Dashboard Navigation</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Test the Role-Based Dashboard"
                description={
                  <div>
                    <p>Click the button below to navigate to the dashboard and see the role-based interface:</p>
                    <Button 
                      type="primary" 
                      onClick={() => window.location.href = '/dashboard'}
                      icon={<UserOutlined />}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                }
                type="success"
                showIcon
              />
            </Space>
          </StyledCard>
        </Col>
      </Row>

      {/* Content below Go to Dashboard removed as requested */}
    </PageContainer>
  );
};

export default RoleTest;
