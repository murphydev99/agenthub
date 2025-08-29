// Workflow service for loading sub-workflows
const API_URL = import.meta.env.VITE_WORKFLOW_API_URL || 'http://localhost:4000/api';
const API_KEY = import.meta.env.VITE_WORKFLOW_API_KEY || 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';

export const workflowService = {
  async getWorkflowByName(workflowName: string) {
    console.log('[WorkflowService] Fetching workflow by name:', workflowName);
    
    // First search for the workflow
    const searchResponse = await fetch(`${API_URL}/workflows/search?query=${encodeURIComponent(workflowName)}`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to search for workflow: ${workflowName}`);
    }
    
    const searchResults = await searchResponse.json();
    const matchedWorkflow = searchResults.find((w: any) => 
      w.WorkflowName.toLowerCase() === workflowName.toLowerCase()
    );
    
    if (!matchedWorkflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }
    
    // Now fetch the full workflow details
    const response = await fetch(`${API_URL}/workflows/${matchedWorkflow.WorkflowUID}`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch workflow details: ${workflowName}`);
    }
    
    const workflowData = await response.json();
    
    // Transform the workflow to the expected format
    return {
      WorkflowName: workflowData.WorkflowName,
      WorkflowUID: workflowData.WorkflowUID,
      Steps: workflowData.Definition?.Steps || [],
      LastUpdated: workflowData.LastUpdated,
      LastUpdatedBy: workflowData.LastUpdatedBy
    };
  }
};