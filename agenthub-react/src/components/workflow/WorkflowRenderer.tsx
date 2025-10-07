import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../../store/workflowStore';
import { useVariableStore } from '../../store/variableStore';
import { useInteractionStore } from '../../store/interactionStore';
import { StepRenderer } from './StepRenderer';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { RotateCcw, Users, X, FileText, Clock, Home, Copy, Shield, Zap, Activity, Sparkles, ArrowLeft } from 'lucide-react';
import { showConfirmDialog } from '../ui/confirm-dialog';
import { MobileWorkflowMenu } from './MobileWorkflowMenu';

interface WorkflowRendererProps {
  onBack?: () => void;
  isInteractionMode?: boolean;
}

export function WorkflowRenderer({ onBack, isInteractionMode }: WorkflowRendererProps) {
  const navigate = useNavigate();
  const { 
    currentWorkflow, 
    rows, 
    notes,
    endSession,
    startNewSession,
    workflowStack 
  } = useWorkflowStore();
  
  const {
    currentInteractionGUID,
    interactionWorkflows,
    interactionStartTime,
    sharedNotes,
    endInteraction,
  } = useInteractionStore();
  
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
        const container = scrollContainerRef.current;
        if (!container) return;
        
        // Check if user is near the bottom (within 300px)
        // Only auto-scroll if they're already following along
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
        
        // Always scroll on first row or if user is near bottom
        if (rows.length === 1 || isNearBottom) {
          // Get the last row element
          const rowElements = container.querySelectorAll('[data-workflow-row]');
          const lastRow = rowElements[rowElements.length - 1] as HTMLElement;
          
          if (lastRow) {
            // Simply scroll the last row into view at the top of the viewport
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 150); // Slight delay to ensure DOM is updated
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
    clearAllVariables();
    window.location.reload(); // Simple restart for now
  };

  const handleEndInteraction = async () => {
    const confirmed = await showConfirmDialog(
      'Are you sure you want to end this interaction? All workflow data will be cleared.',
      {
        title: 'End Interaction',
        confirmText: 'End Interaction',
        cancelText: 'Continue Working',
        type: 'warning'
      }
    );
    
    if (confirmed) {
      endInteraction();
      endSession();
      clearAllVariables();
      navigate('/');
    }
  };

  const handleBackToDashboard = async () => {
    const confirmed = await showConfirmDialog(
      'Are you sure you want to return to the dashboard? This will end the current workflow.',
      {
        title: 'End Workflow',
        confirmText: 'Go to Dashboard',
        cancelText: 'Stay Here',
        type: 'warning'
      }
    );
    
    if (confirmed) {
      navigate('/');
    }
    
    return confirmed; // Return whether navigation happened
  };

  const duration = interactionStartTime
    ? Math.floor((Date.now() - new Date(interactionStartTime).getTime()) / 1000 / 60)
    : 0;

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
      {/* Left Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex-col shadow-xl">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50">
          <h3 className="font-semibold text-[#0B2545] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#E94B4B]" />
            Navigation
          </h3>
        </div>
        
        {/* Navigation Buttons */}
        <div className="p-4 space-y-2">
          {/* Back to Dashboard button hidden as requested */}
          
          {isInteractionMode && currentInteractionGUID && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndInteraction}
              className="w-full justify-start bg-[#E94B4B] hover:bg-[#E94B4B]/90 border-0 text-white shadow-md"
            >
              <X className="h-4 w-4 mr-2" />
              End Interaction
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            className="w-full justify-start hover:bg-blue-50 hover:border-[#0B2545] transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart Workflow
          </Button>
        </div>
        
        {/* Interaction Status in Sidebar */}
        {isInteractionMode && currentInteractionGUID && (
          <div className="flex-1 flex flex-col border-t border-gray-200/50">
            <div className="p-4 bg-gradient-to-br from-gray-50/50 to-blue-50/50">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-2 rounded-lg bg-[#0B2545] text-white shadow-md">
                  <Shield className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-[#0B2545]">Active Interaction</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 backdrop-blur rounded-lg p-2">
                  <p className="text-xs text-gray-500 font-medium">Session ID</p>
                  <p className="font-mono text-xs bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">{currentInteractionGUID.slice(0, 8)}...</p>
                </div>
                
                <div className="flex items-center space-x-4 bg-white/70 backdrop-blur rounded-lg p-2">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3 text-blue-500" />
                    <span className="text-xs font-medium">{interactionWorkflows.length} workflow{interactionWorkflows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-purple-500" />
                    <span className="text-xs font-medium">{duration} min</span>
                  </div>
                </div>
                
                {/* Workflow List - Hidden as requested */}
                
                {/* Shared Notes */}
                {sharedNotes && (
                  <div>
                    <p className="text-xs font-medium mb-2 text-gray-600">Shared Notes:</p>
                    <div className="text-xs bg-white/70 backdrop-blur p-2 rounded-lg border border-gray-200/50 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {sharedNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Notes Panel - Always visible in sidebar */}
        <div className="flex-1 flex flex-col border-t border-gray-200/50 overflow-hidden">
          <div className="p-4 bg-gradient-to-br from-gray-50/50 to-blue-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-[#0B2545] text-white shadow-md">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-[#0B2545]">Notes</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(notes || '');
                    // Optional: Add a toast notification here
                  } catch (error) {
                    console.error('Failed to copy notes:', error);
                  }
                }}
                disabled={!notes}
                className="h-7 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <textarea
              value={notes || ''}
              onChange={(e) => {
                // Update notes in the workflow store
                const { updateNotes } = useWorkflowStore.getState();
                updateNotes(e.target.value);
              }}
              placeholder="No notes yet..."
              className="bg-white/70 backdrop-blur border border-gray-200/50 rounded-lg p-3 h-64 shadow-inner text-xs whitespace-pre-wrap font-mono text-gray-700 w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200/50 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 px-4 sm:px-6 py-3 sm:py-4 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Menu */}
            <MobileWorkflowMenu
              onBack={handleBackToDashboard}
              onRestart={handleRestart}
              onEndInteraction={isInteractionMode ? handleEndInteraction : undefined}
              isInteractionMode={isInteractionMode}
              currentInteractionGUID={currentInteractionGUID}
              interactionWorkflows={interactionWorkflows}
              duration={duration}
              notes={notes}
              sharedNotes={sharedNotes}
            />
            
            <div className="hidden sm:block p-2 rounded-lg bg-[#0B2545] text-white shadow-md flex-shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Workflow name hidden as requested */}
              <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                {workflowStack && workflowStack.length > 0 ? (
                  <>
                    <Activity className="h-3 w-3" />
                    Sub-workflow ({workflowStack.length} level{workflowStack.length > 1 ? 's' : ''} deep)
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3" />
                    Workflow Execution
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Steps container */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6"
          >
            <div className="space-y-4 pb-96">
              {rows.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Processing workflow...
                  </p>
                </Card>
              ) : (
                rows.map((row) => (
                  <div key={row.id} data-workflow-row>
                    <StepRenderer
                      row={row}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}