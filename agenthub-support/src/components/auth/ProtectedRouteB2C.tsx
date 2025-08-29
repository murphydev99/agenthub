import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { useAuth } from '../../contexts/AuthContextB2C';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const { isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E94B4B]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the intended path
    sessionStorage.setItem('intendedPath', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}