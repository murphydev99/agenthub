import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse, LoginCredentials, MFAChallenge } from '../types/auth';
import { authService } from '../services/auth';

interface AuthState {
  // State
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  mfaChallenge: MFAChallenge | null;
  loading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse | undefined>;
  verifyMFA: (code: string) => Promise<void>;
  logout: () => void;
  checkSession: () => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      mfaChallenge: null,
      loading: false,
      error: null,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ loading: true, error: null });
        try {
          const response = await authService.login(credentials);
          
          if (response.mfaRequired && response.mfaChallenge) {
            set({ 
              mfaChallenge: response.mfaChallenge,
              loading: false 
            });
            return response;
          }

          // Set authentication state
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            loading: false,
            error: null
          });

          // Store token with 24-hour expiry
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          localStorage.setItem('authExpiry', expiresAt.toISOString());

          return response;
        } catch (error: any) {
          set({ 
            loading: false, 
            error: error.message || 'Login failed' 
          });
          throw error;
        }
      },

      // Verify MFA code
      verifyMFA: async (code: string) => {
        const { mfaChallenge } = get();
        if (!mfaChallenge) {
          throw new Error('No MFA challenge present');
        }

        set({ loading: true, error: null });
        try {
          const response = await authService.verifyMFA(mfaChallenge.challengeId, code);
          
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            mfaChallenge: null,
            loading: false,
            error: null
          });

          // Store token with 24-hour expiry
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          localStorage.setItem('authExpiry', expiresAt.toISOString());
        } catch (error: any) {
          set({ 
            loading: false, 
            error: error.message || 'MFA verification failed' 
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          mfaChallenge: null,
          error: null
        });
        localStorage.removeItem('authExpiry');
        localStorage.removeItem('auth-storage');
      },

      // Check if session is valid (within 24 hours)
      checkSession: () => {
        const { token } = get();
        const expiry = localStorage.getItem('authExpiry');
        
        if (!token || !expiry) {
          get().logout();
          return false;
        }

        const expiryDate = new Date(expiry);
        const now = new Date();

        if (now > expiryDate) {
          get().logout();
          return false;
        }

        return true;
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token
      })
    }
  )
);