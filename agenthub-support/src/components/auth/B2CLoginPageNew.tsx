import React from 'react';
import { useAuth } from '../../contexts/AuthContextB2C';
import { Loader2, Shield, Lock } from 'lucide-react';

export function B2CLoginPage() {
  const { login, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    setError('');
    setIsSigningIn(true);
    try {
      await login();
    } catch (error: any) {
      setError('Failed to sign in. Please try again.');
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#E94B4B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0B2545] p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">AgentHub Support Portal</h1>
            <p className="text-white/80 mt-2 text-sm">Franchise Support System</p>
          </div>
          
          {/* Body */}
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-sm text-gray-600">
                Sign in with your franchise account to access support resources
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="w-full bg-[#E94B4B] hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Sign In with Microsoft
                </>
              )}
            </button>

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-gray-500">
                Powered by Microsoft Azure AD B2C
              </p>
              <p className="text-xs text-gray-500">
                Need help? Contact support at 1-800-SUPPORT
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}