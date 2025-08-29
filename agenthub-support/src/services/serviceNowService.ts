import axios from 'axios';
import type { AxiosInstance } from 'axios';
// import { B2CIdTokenClaims } from '../config/authConfig';

// Temporary interface until B2C is configured
interface B2CIdTokenClaims {
  sub: string;
  name?: string;
  email?: string;
  storeNumbers?: string[];
  pcNumbers?: string[];
  franchiseeName?: string;
}

interface ServiceNowTicket {
  sys_id: string;
  number: string;
  short_description: string;
  description?: string;
  state: string;
  priority: string;
  u_store_number?: string;
  u_pc_number?: string;
  u_franchisee_id?: string;
  u_client_code?: string;
  caller_id?: string;
  sys_created_on: string;
  sys_updated_on: string;
}

interface CreateTicketRequest {
  title: string;
  description: string;
  storeNumber: string;
  pcNumber?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface UserContext {
  userId: string;
  email: string;
  storeNumbers: string[];
  pcNumbers?: string[];
  franchiseeId?: string;
  clientCode?: string;
  serviceNowId?: string;
}

class ServiceNowService {
  private api: AxiosInstance;
  private backendApi: AxiosInstance;

  constructor() {
    // Direct ServiceNow API (if needed)
    this.api = axios.create({
      baseURL: import.meta.env.VITE_SERVICENOW_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      auth: {
        username: import.meta.env.VITE_SERVICENOW_USERNAME || '',
        password: import.meta.env.VITE_SERVICENOW_PASSWORD || ''
      }
    });

    // Your backend API that handles ServiceNow integration
    this.backendApi = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Extract user context from B2C token claims
  private getUserContext(claims: B2CIdTokenClaims): UserContext {
    return {
      userId: claims.sub,
      email: claims.email || claims.emails?.[0] || '',
      storeNumbers: claims.storeNumbers || [],
      pcNumbers: claims.pcNumbers || [],
      franchiseeId: claims.franchiseeName,
      clientCode: claims.role, // Or however client code is stored
      serviceNowId: undefined // Will be mapped server-side
    };
  }

  // Get tickets for current user's stores
  async getUserTickets(token: string, claims: B2CIdTokenClaims): Promise<ServiceNowTicket[]> {
    const userContext = this.getUserContext(claims);
    
    try {
      // Call your backend API which handles ServiceNow integration
      const response = await this.backendApi.get('/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          stores: userContext.storeNumbers.join(','),
          clientCode: userContext.clientCode
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  // Get tickets for a specific store (if user has access)
  async getStoreTickets(token: string, storeNumber: string, claims: B2CIdTokenClaims): Promise<ServiceNowTicket[]> {
    const userContext = this.getUserContext(claims);
    
    // Check if user has access to this store
    if (!userContext.storeNumbers.includes(storeNumber)) {
      throw new Error('Access denied: You do not have permission to view tickets for this store');
    }

    try {
      const response = await this.backendApi.get(`/tickets/store/${storeNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching store tickets:', error);
      throw error;
    }
  }

  // Create a new ticket
  async createTicket(
    token: string, 
    request: CreateTicketRequest, 
    claims: B2CIdTokenClaims
  ): Promise<ServiceNowTicket> {
    const userContext = this.getUserContext(claims);
    
    // Validate store access
    if (!userContext.storeNumbers.includes(request.storeNumber)) {
      throw new Error('Access denied: You cannot create tickets for this store');
    }

    try {
      const ticketData = {
        short_description: request.title,
        description: request.description,
        u_store_number: request.storeNumber,
        u_pc_number: request.pcNumber || userContext.pcNumbers?.[0],
        u_franchisee_id: userContext.franchiseeId,
        u_client_code: userContext.clientCode,
        category: request.category || 'General',
        priority: this.mapPriority(request.priority),
        caller_email: userContext.email
      };

      const response = await this.backendApi.post('/tickets', ticketData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  // Get all tickets for the franchisee/client
  async getClientTickets(token: string, claims: B2CIdTokenClaims): Promise<ServiceNowTicket[]> {
    const userContext = this.getUserContext(claims);
    
    // Only franchisee owners or admins should see all client tickets
    if (!userContext.franchiseeId) {
      throw new Error('Access denied: Franchisee access required');
    }

    try {
      const response = await this.backendApi.get('/tickets/client', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          franchiseeId: userContext.franchiseeId,
          clientCode: userContext.clientCode
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching client tickets:', error);
      throw error;
    }
  }

  // Update ticket (with store validation)
  async updateTicket(
    token: string,
    ticketId: string,
    updates: Partial<ServiceNowTicket>,
    claims: B2CIdTokenClaims
  ): Promise<ServiceNowTicket> {
    const userContext = this.getUserContext(claims);
    
    // First, get the ticket to check store access
    const ticket = await this.getTicket(token, ticketId);
    
    if (ticket.u_store_number && !userContext.storeNumbers.includes(ticket.u_store_number)) {
      throw new Error('Access denied: You cannot update tickets for this store');
    }

    try {
      const response = await this.backendApi.patch(`/tickets/${ticketId}`, updates, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }

  // Get single ticket with access validation
  private async getTicket(token: string, ticketId: string): Promise<ServiceNowTicket> {
    try {
      const response = await this.backendApi.get(`/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  // Map priority levels
  private mapPriority(priority?: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }

  // Build ServiceNow query for store filtering
  buildStoreQuery(stores: string[], clientCode?: string): string {
    const storeQuery = stores.map(s => `u_store_number=${s}`).join('^OR');
    let query = `(${storeQuery})`;
    
    if (clientCode) {
      query += `^u_client_code=${clientCode}`;
    }
    
    query += '^state!=7'; // Exclude closed tickets
    
    return query;
  }
}

export const serviceNowService = new ServiceNowService();