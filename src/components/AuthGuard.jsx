import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthGuard = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  let storedUser = null;
  if (userStr) {
    try {
      storedUser = JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing stored user:', e);
    }
  }
  
  const currentUser = user || storedUser;
  const isUserAuthenticated = isAuthenticated || (!!token && !!storedUser);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            margin: '0 auto 20px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isUserAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = (currentUser.role || '').toUpperCase();
    const allowedRoles = roles.map(role => role.toUpperCase());
    
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default AuthGuard;