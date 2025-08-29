import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';

export function ProtectedRoute() {
  const { isAuthenticated, verifyAuth } = useAuthStore();
  const location = useLocation();
  
  useEffect(() => {
    // Verify auth status on mount if we have a token
    const token = localStorage.getItem('auth_token');
    if (token && !isAuthenticated) {
      verifyAuth().catch(() => {
        // Token is invalid, will be cleared by the interceptor
      });
    }
  }, []);
  
  // Check if we have a token in localStorage
  const hasToken = !!localStorage.getItem('auth_token');
  
  if (!hasToken && !isAuthenticated) {
    // No token at all, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <Outlet />;
}