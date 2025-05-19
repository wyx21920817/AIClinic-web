import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles, redirectPath = '/login' }) => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const role = userData.role;
  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    return <Navigate to={redirectPath} replace />;
  }
  return <Outlet />;
};

export default PrivateRoute; 