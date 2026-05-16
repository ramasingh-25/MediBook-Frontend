import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const location = useLocation();
  
  // Check authentication
  const token = localStorage.getItem('medibook_token');
  const userStr = localStorage.getItem('medibook_user');
  
  if (!token || !userStr) {
    toast.error('Please login to access this page');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check role if required
  if (requiredRole) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== requiredRole) {
        toast.error(`Access denied. ${requiredRole} role required.`);
        return <Navigate to="/dashboard" replace />;
      }
    } catch (error) {
      toast.error('Invalid user session');
      localStorage.removeItem('medibook_token');
      localStorage.removeItem('medibook_user');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }
  
  return children;
}
