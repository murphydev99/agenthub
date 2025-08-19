import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWorkflowStore } from '../store/workflowStore';
import { useVariableStore } from '../store/variableStore';
import { useInteractionStore } from '../store/interactionStore';
import { workflowService } from '../services/api/workflows';
import { WorkflowRenderer } from '../components/workflow/WorkflowRenderer';
import { Card } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export function WorkflowExecution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loadWorkflow, endSession } = useWorkflowStore();
  const { clearAllVariables } = useVariableStore();
  const { isInInteraction, addWorkflowToInteraction } = useInteractionStore();
  const [error, setError] = useState<string | null>(null);
  const loadedWorkflowRef = useRef<string | null>(null);
  const trackedInInteractionRef = useRef<string | null>(null);
  
  // Check if we're in interaction mode from URL query
  const searchParams = new URLSearchParams(location.search);
  const isInteractionMode = searchParams.get('interaction') === 'true';

  // Fetch workflow by encoded ID
  const { data: workflow, isLoading, isError } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) throw new Error('No workflow ID provided');
      
      // Check if it's a test workflow
      if (id === 'test') {
        const testWorkflow = localStorage.getItem('test_workflow');
        if (testWorkflow) {
          return JSON.parse(testWorkflow);
        }
        throw new Error('Test workflow not found');
      }
      
      // First check cache
      const cached = workflowService.getCachedWorkflow(id);
      if (cached) return cached;
      
      // Otherwise fetch from API
      const workflow = await workflowService.getWorkflowByEncodedId(id);
      
      // Cache for future use
      workflowService.cacheWorkflow(workflow);
      
      return workflow;
    },
    enabled: !!id,
    retry: 1,
  });

  // Clear everything when component mounts or ID changes (unless in interaction mode)
  useEffect(() => {
    if (!isInteractionMode) {
      console.log('WorkflowExecution: Clearing state for id:', id);
      endSession();
      clearAllVariables();
    } else {
      console.log('WorkflowExecution: In interaction mode, preserving state');
    }
    loadedWorkflowRef.current = null; // Reset the loaded workflow tracker
    trackedInInteractionRef.current = null; // Reset the interaction tracker
  }, [id, isInteractionMode]);

  // Load workflow into store when fetched
  useEffect(() => {
    if (workflow) {
      // Prevent double loading in StrictMode
      const workflowKey = `${workflow.WorkflowUID}-${id}`;
      if (loadedWorkflowRef.current === workflowKey) {
        console.log('WorkflowExecution: Workflow already loaded, skipping');
        return;
      }
      
      console.log('WorkflowExecution: Loading workflow:', workflow.WorkflowName);
      loadedWorkflowRef.current = workflowKey;
      
      // Track in interaction if in interaction mode (prevent duplicate tracking)
      if (isInteractionMode && workflow.WorkflowUID && workflow.WorkflowName) {
        const interactionKey = `${workflow.WorkflowUID}-interaction`;
        if (trackedInInteractionRef.current !== interactionKey) {
          trackedInInteractionRef.current = interactionKey;
          addWorkflowToInteraction(workflow.WorkflowUID, workflow.WorkflowName);
        }
      }
      
      loadWorkflow(workflow);
    }
  }, [workflow, id, isInteractionMode]);

  // Handle errors
  useEffect(() => {
    if (isError) {
      setError('Failed to load workflow. Please check the URL and try again.');
    }
  }, [isError]);

  const handleBack = () => {
    // Don't clear variables if in interaction mode
    if (!isInteractionMode) {
      endSession();
      clearAllVariables();
    }
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading workflow...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-red-600">Error</h3>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={handleBack}
              className="text-primary hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return <WorkflowRenderer onBack={handleBack} isInteractionMode={isInteractionMode} />;
}