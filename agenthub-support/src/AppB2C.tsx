import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { AuthProviderB2C } from './contexts/AuthContextB2CSimple';
import { ProtectedRouteB2C } from './components/auth/ProtectedRouteB2CSimple';
import { LoginPageB2C } from './components/auth/LoginPageB2CSimple';
import { Dashboard } from './pages/Dashboard';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Tickets } from './pages/Tickets';
import { ChatSupportNew as ChatSupport } from './pages/ChatSupportNew';
import { Training } from './pages/Training';
import { Layout } from './components/layout/Layout';

// Create MSAL instance outside of component
const msalInstance = new PublicClientApplication(msalConfig);

// Make it available globally for API interceptor
(window as any).msalInstance = msalInstance;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1
    }
  }
});

function AppB2C() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize MSAL
        await msalInstance.initialize();
        
        // Handle redirect promise after initialization
        const response = await msalInstance.handleRedirectPromise();
        if (response && response.account) {
          console.log('Redirect handled successfully, setting account');
          msalInstance.setActiveAccount(response.account);
          // Clear the URL to prevent re-processing
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // Check if we already have an account
          const currentAccounts = msalInstance.getAllAccounts();
          if (currentAccounts.length > 0) {
            msalInstance.setActiveAccount(currentAccounts[0]);
          }
        }
        
        // Set up event callbacks
        msalInstance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const account = (event.payload as any).account;
            msalInstance.setActiveAccount(account);
          }
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setIsInitialized(true); // Still set to true to avoid infinite loading
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <AuthProviderB2C>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPageB2C />} />
              
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRouteB2C>
                    <Layout />
                  </ProtectedRouteB2C>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="knowledge" element={<KnowledgeBase />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="chat" element={<ChatSupport />} />
                <Route path="training" element={<Training />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProviderB2C>
      </QueryClientProvider>
    </MsalProvider>
  );
}

export default AppB2C;