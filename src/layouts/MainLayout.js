import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';
import UserInfo from '../components/UserInfo';
import Sidebar from '../components/Sidebar';

const { Header, Sider, Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: #fff;
`;

const StyledHeader = styled(Header)`
  padding: 0 24px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const Logo = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: #fff;
  font-size: 20px;
  font-weight: 500;
  background: #0052cc;
  letter-spacing: 0.5px;
`;

const MainLayout = () => {
  const [collapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
    },
  ];

  const handleMenuClick = (key) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <StyledLayout>
      <Sider 
        collapsible={false}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          background: '#0052cc',
        }}
      >
        <Logo>
          <span>ECG Diagnostic</span>
        </Logo>
        <Sidebar />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <StyledHeader>
          <div />
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick,
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              {!collapsed && <UserInfo />}
            </Space>
          </Dropdown>
        </StyledHeader>
        <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
          <Outlet />
        </Content>
      </Layout>
    </StyledLayout>
  );
};

export default MainLayout;
