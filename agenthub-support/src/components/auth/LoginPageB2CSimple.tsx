import React, { useEffect, useRef } from 'react';
import { useAuthB2C } from '../../contexts/AuthContextB2CSimple';
import { InteractionStatus } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { Navigate } from 'react-router-dom';

export function LoginPageB2C() {
  const { login, isAuthenticated } = useAuthB2C();
  const { inProgress } = useMsal();
  const loginAttempted = useRef(false);

  useEffect(() => {
    // Skip if already authenticated
    if (isAuthenticated) {
      return;
    }

    // Check if we're coming back from B2C (URL will have code or error parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthResponse = urlParams.has('code') || urlParams.has('error') || urlParams.has('state');
    
    // Check if URL contains B2C redirect fragments
    const hash = window.location.hash;
    const hasHashResponse = hash.includes('id_token') || hash.includes('error');
    
    // Only attempt login if:
    // 1. Not already in progress
    // 2. Haven't attempted yet
    // 3. Not coming back from B2C redirect
    if (inProgress === InteractionStatus.None && 
        !loginAttempted.current && 
        !hasAuthResponse && 
        !hasHashResponse) {
      loginAttempted.current = true;
      login();
    }
  }, [inProgress, login, isAuthenticated]);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login...</p>
        <button 
          onClick={() => login()}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Click here if not redirected
        </button>
      </div>
    </div>
  );
}