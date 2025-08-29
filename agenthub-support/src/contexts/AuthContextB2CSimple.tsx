import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal, useMsalAuthentication } from '@azure/msal-react';
import type { AccountInfo, InteractionType } from '@azure/msal-browser';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProviderB2C({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // MSAL is already initialized in AppB2C, just check for accounts
    const currentAccounts = instance.getAllAccounts();
    if (currentAccounts.length > 0 && !instance.getActiveAccount()) {
      instance.setActiveAccount(currentAccounts[0]);
    }
    setIsLoading(false);
  }, [instance]);

  const login = async () => {
    try {
      await instance.loginRedirect({
        scopes: ['openid', 'profile']
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };


  const value: AuthContextType = {
    isAuthenticated: accounts.length > 0,
    user: accounts[0] || null,
    isLoading: isLoading || inProgress === 'login',
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthB2C() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthB2C must be used within AuthProviderB2C');
  }
  return context;
}