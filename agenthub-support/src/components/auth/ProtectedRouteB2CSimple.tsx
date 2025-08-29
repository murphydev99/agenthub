import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthB2C } from '../../contexts/AuthContextB2CSimple';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRouteB2C({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthB2C();
  const { inProgress } = useMsal();
  const location = useLocation();

  // Check if we're in the middle of authentication
  const isAuthInProgress = inProgress !== InteractionStatus.None && inProgress !== 'acquireToken';

  // Wait for auth to stabilize
  if (isLoading || isAuthInProgress || inProgress === 'startup') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Only redirect to login if we're truly not authenticated and not in progress
    if (inProgress === InteractionStatus.None) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    // Still loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}