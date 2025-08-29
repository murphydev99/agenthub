import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../config/authConfigB2C';
import { Coffee, Shield, Users } from 'lucide-react';

export function LoginPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => {
      console.error(e);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-brand-red/10 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex justify-center mb-6">
            <div className="bg-brand-red/90 p-4 rounded-full">
              <Coffee className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            AgentHub Support Portal
          </h1>
          <p className="text-white/80 text-center mb-8">
            For Dunkin' & Baskin-Robbins Franchisees
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-white/90">
              <Shield className="h-5 w-5 text-brand-red" />
              <span className="text-sm">Secure Azure AD B2C Authentication</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Users className="h-5 w-5 text-brand-red" />
              <span className="text-sm">10,000+ Franchise Partners</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-brand-red hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 21 21" className="h-5 w-5" fill="currentColor">
              <path d="M10 0H0V10H10V0Z"/>
              <path d="M21 0H11V10H21V0Z"/>
              <path d="M10 11H0V21H10V11Z"/>
              <path d="M21 11H11V21H21V11Z"/>
            </svg>
            Login with Microsoft
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            © 2025 AgentHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}