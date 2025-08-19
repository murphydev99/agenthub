import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useVariableStore } from '../../store/variableStore';
import { StepRenderer } from './StepRenderer';
import { NotesPanel } from '../notes/NotesPanel';
import { InteractionStatus } from './InteractionStatus';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface WorkflowRendererProps {
  onBack?: () => void;
  isInteractionMode?: boolean;
}

export function WorkflowRenderer({ onBack, isInteractionMode }: WorkflowRendererProps) {
  const { 
    currentWorkflow, 
    rows, 
    notes,
    endSession,
    startNewSession,
    workflowStack 
  } = useWorkflowStore();
  
  console.log('WorkflowRenderer - currentWorkflow:', currentWorkflow);
  console.log('WorkflowRenderer - rows:', rows);
  
  const { initSystemVariables, clearAllVariables } = useVariableStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastRowCountRef = useRef(0);

  // Initialize session when component mounts (only for initial workflow, not sub-workflows)
  useEffect(() => {
    if (currentWorkflow && workflowStack.length === 0 && rows.length === 0) {
      const interactionGUID = crypto.randomUUID();
      const workflowGUID = crypto.randomUUID();
      const username = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : undefined;
      
      startNewSession();
      initSystemVariables(interactionGUID, workflowGUID, username);
    }
  }, []); // Remove currentWorkflow from dependencies to prevent re-running on sub-workflow load

  // Auto-scroll when new rows are added
  useEffect(() => {
    if (rows.length > lastRowCountRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
    lastRowCountRef.current = rows.length;
  }, [rows.length]);

  if (!currentWorkflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No workflow loaded</p>
          {onBack && (
            <Button onClick={onBack} className="mt-4">
              Back to Workflows
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const handleRestart = () => {
    endSession();
    window.location.reload(); // Simple restart for now
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                endSession();
                clearAllVariables();
                onBack();
              }}
              className="flex items-center hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{currentWorkflow.WorkflowName}</h2>
            <p className="text-sm text-gray-600">
              {isInteractionMode ? '🔗 Interaction Mode • ' : ''}
              {workflowStack && workflowStack.length > 0 
                ? `Sub-workflow (${workflowStack.length} level${workflowStack.length > 1 ? 's' : ''} deep)`
                : 'Workflow Execution'}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
          className="flex items-center"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restart
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow steps */}
        <div className="flex-1 flex flex-col">
          {/* Interaction status if in interaction mode */}
          {isInteractionMode && <InteractionStatus />}
          
          {/* Notes panel */}
          {notes && <NotesPanel notes={notes} />}
          
          {/* Steps container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {rows.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Processing workflow...
                </p>
              </Card>
            ) : (
              rows.map((row) => (
                <StepRenderer
                  key={row.id}
                  row={row}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}