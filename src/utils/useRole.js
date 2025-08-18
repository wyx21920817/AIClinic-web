import { useState, useEffect } from 'react';
import { USER_ROLES, ROLE_PERMISSIONS, ROLE_DISPLAY_NAMES, DASHBOARD_CONFIG } from '../constants/Constants';

export const useRole = () => {
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [dashboardConfig, setDashboardConfig] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('userData') || '{}');
    setUserData(user);
    setRole(user.role);
    setPermissions(ROLE_PERMISSIONS[user.role] || []);
    setDashboardConfig(DASHBOARD_CONFIG[user.role] || null);
  }, []);

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => permissions.includes(permission));
  };

  const isRole = (roleToCheck) => {
    return role === roleToCheck;
  };

  const isAdmin = () => {
    return role === USER_ROLES.ADMIN;
  };

  const isDoctor = () => {
    return role === USER_ROLES.DOCTOR;
  };

  const getUserDisplayName = () => {
    return userData?.name || userData?.username || 'User';
  };

  const getRoleDisplayName = () => {
    return ROLE_DISPLAY_NAMES[role] || 'User';
  };

  const getDashboardConfig = () => {
    return dashboardConfig;
  };

  const refreshUserData = () => {
    const user = JSON.parse(localStorage.getItem('userData') || '{}');
    setUserData(user);
    setRole(user.role);
    setPermissions(ROLE_PERMISSIONS[user.role] || []);
    setDashboardConfig(DASHBOARD_CONFIG[user.role] || null);
  };

  return {
    userData,
    role,
    permissions,
    dashboardConfig,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAdmin,
    isDoctor,
    getUserDisplayName,
    getRoleDisplayName,
    getDashboardConfig,
    refreshUserData
  };
};

export default useRole;
