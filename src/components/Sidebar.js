import React from 'react';
import { Menu } from 'antd';
import { DashboardOutlined, TeamOutlined, UserOutlined, ExperimentOutlined, FileTextOutlined, SecurityScanOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const role = userData.role;

  // Debug: Log user role
  console.log('Sidebar - User role:', role);
  console.log('Sidebar - User data:', userData);

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
        {
          key: '/audit-logs',
          icon: <SecurityScanOutlined />,
          label: 'Audit Logs',
          onClick: () => navigate('/audit-logs'),
        },
      ]
      : []),
    // Test Deliverables menu removed
    // XAI Demo menu removed
    // ECG AI Results Demo menu removed
    {
      key: '/role-test',
      icon: <UserOutlined />,
      label: 'Role Test',
      onClick: () => navigate('/role-test'),
    },
    {
      key: '/account',
      icon: <UserOutlined />,
      label: 'Account',
      onClick: () => navigate('/account'),
    },
  ];

  // Debug: Log menu items
  console.log('Sidebar - Menu items:', menuItems);

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