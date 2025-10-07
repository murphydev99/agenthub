import { useState } from 'react';
import { Button } from '../ui/button';
import { Menu, X, ArrowLeft, RotateCcw, Shield, FileText, Clock, Activity, Copy, Home } from 'lucide-react';
import { showConfirmDialog } from '../ui/confirm-dialog';

interface MobileWorkflowMenuProps {
  onBack: () => void | Promise<boolean | void>;
  onRestart: () => void;
  onEndInteraction?: () => void;
  isInteractionMode?: boolean;
  currentInteractionGUID?: string | null;
  interactionWorkflows?: any[];
  duration?: number;
  notes?: string;
  sharedNotes?: string;
}

export function MobileWorkflowMenu({
  onBack,
  onRestart,
  onEndInteraction,
  isInteractionMode,
  currentInteractionGUID,
  interactionWorkflows = [],
  duration = 0,
  notes,
  sharedNotes
}: MobileWorkflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu panel */}
          <aside className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex items-center"
              >
                <X className="h-5 w-5 mr-2" />
                Close Menu
              </Button>
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            
            {/* Navigation */}
            <div className="p-4 space-y-2 border-b">
              {/* Go to Dashboard button hidden as requested */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const result = await onBack(); // onBack handles the confirmation
                  // Only close if navigation actually happened (user confirmed)
                  if (result !== false) {
                    setIsOpen(false);
                  }
                }}
                className="w-full justify-start"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button> */}
              
              {isInteractionMode && currentInteractionGUID && onEndInteraction && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    onEndInteraction();
                  }}
                  className="w-full justify-start"
                >
                  <X className="h-4 w-4 mr-2" />
                  End Interaction
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  onRestart();
                }}
                className="w-full justify-start"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart Workflow
              </Button>
            </div>
            
            {/* Interaction Status */}
            {isInteractionMode && currentInteractionGUID && (
              <div className="p-4 border-b">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold">Active Interaction</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Session ID</p>
                    <p className="font-mono text-xs">{currentInteractionGUID.slice(0, 8)}...</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{interactionWorkflows.length} workflows</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs">{duration} min</span>
                    </div>
                  </div>
                  
                  {/* Workflows list hidden as requested */}
                  {/* {interactionWorkflows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1">Workflows:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {interactionWorkflows.map((w, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="font-medium">
                              {idx + 1}. {w.workflowName}
                            </div>
                            <div className="text-gray-500 flex items-center gap-1">
                              {w.status === 'running' && <Activity className="h-3 w-3 animate-pulse" />}
                              Status: {w.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}
                </div>
              </div>
            )}
            
            {/* Notes */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Notes</h3>
                {notes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(notes);
                    }}
                    className="h-7"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
              <div className="bg-gray-50 rounded p-3 h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {notes || <span className="text-gray-400 italic">No notes yet...</span>}
                </pre>
              </div>
              
              {sharedNotes && (
                <div className="mt-3">
                  <p className="text-xs font-medium mb-1">Shared Notes:</p>
                  <div className="text-xs bg-gray-50 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {sharedNotes}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}