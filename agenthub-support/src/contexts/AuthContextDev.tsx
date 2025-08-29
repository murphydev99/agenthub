import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockUser } from '../config/authConfigSimple';

interface AuthContextType {
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('agenthub_user');
    const storedToken = localStorage.getItem('agenthub_token');
    
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      const tokenExpiry = localStorage.getItem('agenthub_token_expiry');
      
      // Check if token is still valid (24 hour expiry)
      if (tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        // Token expired, clear storage
        localStorage.removeItem('agenthub_user');
        localStorage.removeItem('agenthub_token');
        localStorage.removeItem('agenthub_token_expiry');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string = 'franchise.owner@example.com', password: string = 'demo') => {
    // Mock login - in production this will use MSAL
    if (email === 'franchise.owner@example.com' && password === 'demo') {
      const mockToken = 'mock-jwt-token-' + Date.now();
      const expiry = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
      
      localStorage.setItem('agenthub_user', JSON.stringify(mockUser));
      localStorage.setItem('agenthub_token', mockToken);
      localStorage.setItem('agenthub_token_expiry', expiry.toString());
      
      setUser(mockUser);
      setIsAuthenticated(true);
      
      // Handle intended path redirect
      const intendedPath = sessionStorage.getItem('intendedPath');
      if (intendedPath) {
        sessionStorage.removeItem('intendedPath');
        window.location.href = intendedPath;
      }
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    localStorage.removeItem('agenthub_user');
    localStorage.removeItem('agenthub_token');
    localStorage.removeItem('agenthub_token_expiry');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const getAccessToken = async (): Promise<string | null> => {
    return localStorage.getItem('agenthub_token');
  };

  const contextValue: AuthContextType = {
    login,
    logout,
    getAccessToken,
    user,
    isLoading,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}