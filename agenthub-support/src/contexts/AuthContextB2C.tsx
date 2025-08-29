import React, { createContext, useContext, useEffect, useState } from 'react';
import { InteractionStatus, EventType } from '@azure/msal-browser';
import type { AccountInfo, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest, b2cPolicies, apiConfig } from '../config/authConfigB2C';

interface AuthContextType {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  user: AccountInfo | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if authentication is in progress
    if (inProgress === InteractionStatus.None) {
      setIsLoading(false);
    }
  }, [inProgress]);

  const login = async () => {
    try {
      const result = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(result.account);
      
      // Store intended path if user was trying to access a specific page
      const intendedPath = sessionStorage.getItem('intendedPath');
      if (intendedPath) {
        sessionStorage.removeItem('intendedPath');
        window.location.href = intendedPath;
      }
    } catch (error: any) {
      // Handle password reset flow
      if (error.errorMessage?.includes('AADB2C90118')) {
        try {
          await instance.loginPopup({
            scopes: loginRequest.scopes,
            authority: b2cPolicies.authorities.forgotPassword.authority
          });
        } catch (passwordResetError) {
          console.error('Password reset error:', passwordResetError);
        }
      } else {
        console.error('Login error:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    const account = instance.getActiveAccount();
    if (!account) return null;

    try {
      const response = await instance.acquireTokenSilent({
        scopes: apiConfig.scopes,
        account: account
      });
      return response.accessToken;
    } catch (error) {
      try {
        const response = await instance.acquireTokenPopup({
          scopes: apiConfig.scopes,
          account: account
        });
        return response.accessToken;
      } catch (popupError) {
        console.error('Failed to acquire token:', popupError);
        return null;
      }
    }
  };

  const contextValue: AuthContextType = {
    login,
    logout,
    getAccessToken,
    user: accounts[0] || null,
    isLoading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Main App wrapper - MSAL is already wrapped in App.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}