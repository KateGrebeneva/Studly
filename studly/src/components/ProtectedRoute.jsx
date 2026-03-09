import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Защищённый маршрут — редирект на /login, если пользователь не авторизован
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('studly_token') : null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
