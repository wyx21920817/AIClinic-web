import React from 'react';
import { Menu } from 'antd';
import { DashboardOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const role = userData.role;

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/patients',
      icon: <TeamOutlined />,
      label: 'Patients',
      onClick: () => navigate('/patients'),
    },
    ...(role === 'admin'
      ? [
          {
            key: '/doctors',
            icon: <TeamOutlined />,
            label: 'Doctors',
            onClick: () => navigate('/doctors'),
          },
        ]
      : []),
    {
      key: '/account',
      icon: <UserOutlined />,
      label: 'Account',
      onClick: () => navigate('/account'),
    },
  ];

  return (
    <Menu
      theme="dark"
      mode="inline"
      items={menuItems}
      style={{ height: '100vh', background: '#0052cc', border: 'none' }}
    />
  );
};

export default Sidebar; 