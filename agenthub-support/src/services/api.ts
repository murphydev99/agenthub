import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use(async (config) => {
  // Try to get B2C token from MSAL
  try {
    const msalInstance = (window as any).msalInstance;
    if (msalInstance) {
      const accounts = msalInstance.getAllAccounts();
      console.log('MSAL Accounts found:', accounts.length);
      if (accounts.length > 0) {
        try {
          // Try with just openid and profile first
          const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: ['openid', 'profile'],
            account: accounts[0],
            forceRefresh: false
          });
          console.log('Token response:', tokenResponse);
          console.log('Token acquired:', tokenResponse.accessToken ? 'Yes' : 'No');
          console.log('ID Token:', tokenResponse.idToken ? 'Yes' : 'No');
          
          // Try using ID token if access token is not available
          const token = tokenResponse.accessToken || tokenResponse.idToken;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Authorization header set with:', tokenResponse.accessToken ? 'access token' : 'ID token');
          }
        } catch (silentError: any) {
          console.log('Silent token acquisition failed:', silentError);
          console.log('Error name:', silentError.name);
          console.log('Error message:', silentError.message);
          // If silent fails, try interactive
          if (silentError.name === 'InteractionRequiredAuthError' || silentError.name === 'BrowserAuthError') {
            const tokenResponse = await msalInstance.acquireTokenPopup({
              scopes: ['https://VistioSelfServiceDEV.onmicrosoft.com/9bac66e0-6d6c-494e-b5a1-15e04d343110/access_as_user']
            });
            if (tokenResponse.accessToken) {
              config.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
              console.log('Token acquired via popup');
            }
          } else {
            throw silentError;
          }
        }
      } else {
        console.log('No MSAL accounts found');
      }
    } else {
      console.log('MSAL instance not found');
    }
  } catch (error) {
    console.error('Failed to get B2C token:', error);
    // Fall back to local storage token if B2C fails
    const token = localStorage.getItem('agenthub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Using fallback token from localStorage');
    }
  }
  return config;
});

export interface Ticket {
  id: string;
  number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  storeNumber?: string;
  franchiseeId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  comments?: string;
  workNotes?: string;
  auditHistory?: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  updatedBy: string;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  priority?: string;
  impact?: string;
  urgency?: string;
  storeNumber?: string;
  franchiseeId?: string;
}

export interface UpdateTicketDto {
  description?: string;
  priority?: string;
  state?: string;
  impact?: string;
  urgency?: string;
  customerComment?: string;
}

// API service functions
export const ticketService = {
  // Get all tickets (with optional filters)
  async getTickets(filters?: { store?: string; status?: string; priority?: string }): Promise<Ticket[]> {
    const response = await api.get('/tickets', { params: filters });
    return response.data;
  },

  // Get a specific ticket
  async getTicket(id: string): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // Create a new ticket
  async createTicket(data: CreateTicketDto): Promise<{ id: string; number: string; message: string }> {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  // Update a ticket
  async updateTicket(id: string, data: UpdateTicketDto): Promise<{ id: string; message: string }> {
    const response = await api.patch(`/tickets/${id}`, data);
    return response.data;
  },

  // Test ServiceNow connection
  async testConnection(): Promise<{ status: string; instance: string; message: string }> {
    const response = await api.get('/test-servicenow');
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;