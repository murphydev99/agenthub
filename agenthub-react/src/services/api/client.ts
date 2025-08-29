import axios, { AxiosError } from 'axios';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token or API key
apiClient.interceptors.request.use(
  (config) => {
    // First check for Bearer token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Also add x-api-key for API authentication (used by chatbot)
    // This is the same key used in ChatWidget
    config.headers['x-api-key'] = 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token but don't redirect if we're already on login page
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Type-safe API error
export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

export const handleApiError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.error || error.message || 'An error occurred',
      status: error.response?.status,
      details: error.response?.data,
    };
  }
  return {
    message: error.message || 'An unexpected error occurred',
  };
};