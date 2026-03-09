import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Маршрут с проверкой роли — редирект, если роль пользователя не в списке разрешённых
 */
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('studly_user') : null;
  if (!userStr) return <Navigate to="/login" replace />;
  let user;
  try {
    user = JSON.parse(userStr);
  } catch {
    return <Navigate to="/login" replace />;
  }
  const role = user?.role || 'student';
  if (!allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default RoleProtectedRoute;
