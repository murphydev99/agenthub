import { create } from 'zustand';
import { authService } from '../services/api/auth';

interface User {
  username: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: authService.isAuthenticated(),
  user: authService.getUser(),
  token: authService.getToken(),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ username, password });
      set({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: error.response?.data?.error || 'Login failed',
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null,
    });
  },

  verifyAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await authService.verify();
      set({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));