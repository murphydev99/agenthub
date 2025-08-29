import axios from 'axios';
import { AuthResponse, LoginCredentials } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class AuthService {
  private axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  constructor() {
    // Add auth token to requests
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/login', credentials);
      
      if (response.data.token && !response.data.mfaRequired) {
        this.setStoredToken(response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async verifyMFA(challengeId: string, code: string): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>('/auth/mfa/verify', {
        challengeId,
        code
      });
      
      if (response.data.token) {
        this.setStoredToken(response.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'MFA verification failed');
    }
  }

  async resendMFA(challengeId: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/mfa/resend', { challengeId });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend MFA code');
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/auth/verify');
      return response.data.valid === true;
    } catch {
      return false;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/reset-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  private getStoredToken(): string | null {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const auth = JSON.parse(authStorage);
        return auth.state?.token || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private setStoredToken(token: string): void {
    // Token is stored via Zustand persist middleware
    // This is just for immediate availability
    sessionStorage.setItem('tempToken', token);
  }

  private clearAuth(): void {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('authExpiry');
    sessionStorage.removeItem('tempToken');
  }
}

export const authService = new AuthService();