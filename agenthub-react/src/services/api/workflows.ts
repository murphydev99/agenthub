import { apiClient } from './client';

// Define Workflow type inline to avoid import issues
export interface Workflow {
  WorkflowName: string;
  WorkflowUID?: string;
  Steps: any[];
  LastUpdated?: string;
  LastUpdatedBy?: string;
}

// CRITICAL: These API calls fetch workflow definitions only
// No customer data is ever sent to or received from the server

export interface WorkflowListItem {
  WorkflowName: string;
  WorkflowUID: string;
  LastUpdated: string;
  LastUpdatedBy?: string;
  BeingEditedBy?: string;
}

export interface WorkflowAlias {
  AliasText: string;
  WorkflowName: string;
}

export interface WorkflowResponse {
  WorkflowName: string;
  WorkflowUID: string;
  Definition: any; // This is the workflow JSON
  LastUpdated: string;
}

export const workflowService = {
  // List all workflows (metadata only, no customer data)
  async listWorkflows(top: number = 50): Promise<WorkflowListItem[]> {
    const { data } = await apiClient.get<WorkflowListItem[]>('/workflows', {
      params: { top },
    });
    return data;
  },

  // Get all aliases from the database
  async getAliases(): Promise<WorkflowAlias[]> {
    try {
      const { data } = await apiClient.get<WorkflowAlias[]>('/aliases');
      return data;
    } catch (error) {
      console.error('Error fetching aliases:', error);
      return [];
    }
  },

  // Search workflows by name or alias (metadata only)
  async searchWorkflows(query: string, top: number = 50): Promise<WorkflowListItem[]> {
    const { data } = await apiClient.get<WorkflowListItem[]>('/workflows/search', {
      params: { query, top },
    });
    return data;
  },

  // Get workflow by UID (definition only, no customer data)
  async getWorkflowByUID(uid: string): Promise<Workflow> {
    const { data } = await apiClient.get<WorkflowResponse>(`/workflows/${uid}`);
    return {
      WorkflowName: data.WorkflowName,
      WorkflowUID: data.WorkflowUID,
      ...data.Definition,
    };
  },

  // Get workflow by alias (definition only, no customer data)
  async getWorkflowByAlias(alias: string): Promise<Workflow> {
    // Check cache first
    const cached = this.getCachedWorkflow(alias);
    if (cached) {
      console.log('Loading workflow from cache:', alias);
      return cached;
    }
    
    try {
      // Try to fetch by alias endpoint
      const { data } = await apiClient.get<WorkflowResponse>(`/workflows/alias/${alias}`);
      const workflow = {
        WorkflowName: data.WorkflowName,
        WorkflowUID: data.WorkflowUID,
        ...data.Definition,
      };
      
      // Cache the result
      this.cacheWorkflow(workflow);
      
      return workflow;
    } catch (error: any) {
      // If alias endpoint fails with 404, try searching
      if (error.response?.status === 404) {
        const workflows = await this.searchWorkflows(alias, 1);
        if (workflows.length > 0) {
          return this.getWorkflowByUID(workflows[0].WorkflowUID);
        }
      }
      throw error;
    }
  },

  // Get workflow by name (for loadworkflow step)
  async getWorkflowByName(name: string): Promise<Workflow> {
    // Check cache first
    const cached = this.getCachedWorkflowByName(name);
    if (cached) {
      console.log('Loading workflow from cache:', name);
      return cached;
    }
    
    // Search for workflow by name and get the first match
    const workflows = await this.searchWorkflows(name, 1);
    if (workflows.length === 0) {
      throw new Error(`Workflow not found: ${name}`);
    }
    
    // Get the full workflow by UID
    const workflow = await this.getWorkflowByUID(workflows[0].WorkflowUID);
    
    // Cache by both UID and name for faster lookup
    this.cacheWorkflow(workflow);
    this.cacheWorkflowByName(workflow);
    
    return workflow;
  },

  // Get workflow by encoded identifier (for URL access)
  async getWorkflowByEncodedId(encodedId: string): Promise<Workflow> {
    // Decode the identifier
    try {
      const decoded = atob(encodedId);
      
      // Check if it's a UUID format (8-4-4-4-12 pattern)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(decoded)) {
        // It's a UID
        return this.getWorkflowByUID(decoded);
      } else {
        // It's an alias - try to fetch by alias
        try {
          return await this.getWorkflowByAlias(decoded);
        } catch (aliasError) {
          // If alias fails, try searching by name as fallback
          const workflows = await this.searchWorkflows(decoded, 1);
          if (workflows.length > 0) {
            return this.getWorkflowByUID(workflows[0].WorkflowUID);
          }
          throw new Error(`Workflow not found: ${decoded}`);
        }
      }
    } catch (error) {
      // If decoding fails, try as plain text alias
      return this.getWorkflowByAlias(encodedId);
    }
  },

  // Cache workflow locally (client-side only)
  cacheWorkflow(workflow: Workflow): void {
    const cacheKey = `workflow_cache_${workflow.WorkflowUID || workflow.WorkflowName}`;
    localStorage.setItem(cacheKey, JSON.stringify(workflow));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
  },

  // Cache workflow by name specifically
  cacheWorkflowByName(workflow: Workflow): void {
    if (workflow.WorkflowName) {
      const cacheKey = `workflow_cache_name_${workflow.WorkflowName}`;
      localStorage.setItem(cacheKey, JSON.stringify(workflow));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    }
  },

  // Get cached workflow (client-side only)
  getCachedWorkflow(identifier: string): Workflow | null {
    const cacheKey = `workflow_cache_${identifier}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (!cached || !timestamp) return null;
    
    // Check if cache is still valid (1 hour)
    const age = Date.now() - parseInt(timestamp);
    if (age > 3600000) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
      return null;
    }
    
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  },

  // Get cached workflow by name specifically
  getCachedWorkflowByName(name: string): Workflow | null {
    const cacheKey = `workflow_cache_name_${name}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    if (!cached || !timestamp) return null;
    
    // Check if cache is still valid (1 hour)
    const age = Date.now() - parseInt(timestamp);
    if (age > 3600000) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
      return null;
    }
    
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  },

  // Clear workflow cache
  clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('workflow_cache_')) {
        localStorage.removeItem(key);
      }
    });
  },
};

// Helper to encode workflow identifier for URLs
export function encodeWorkflowId(id: string): string {
  return btoa(id);
}

// Helper to generate shareable workflow URL
export function generateWorkflowUrl(id: string): string {
  const encoded = encodeWorkflowId(id);
  return `${window.location.origin}/w/${encoded}`;
}