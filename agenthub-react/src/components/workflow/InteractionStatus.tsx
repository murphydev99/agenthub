import { useInteractionStore } from '../../store/interactionStore';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Users, X, FileText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../../store/workflowStore';
import { useVariableStore } from '../../store/variableStore';

export function InteractionStatus() {
  const navigate = useNavigate();
  const { endSession } = useWorkflowStore();
  const { clearAllVariables } = useVariableStore();
  const {
    currentInteractionGUID,
    interactionWorkflows,
    interactionStartTime,
    sharedNotes,
    endInteraction,
  } = useInteractionStore();

  if (!currentInteractionGUID) {
    return null;
  }

  const handleEndInteraction = () => {
    if (confirm('Are you sure you want to end this interaction? All workflow data will be cleared.')) {
      endInteraction();
      endSession();
      clearAllVariables();
      navigate('/');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const duration = interactionStartTime
    ? Math.floor((Date.now() - new Date(interactionStartTime).getTime()) / 1000 / 60)
    : 0;

  return (
    <Card className="p-4 mb-4 bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Users className="h-5 w-5 mt-0.5 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Active Interaction</p>
            <p className="text-xs text-muted-foreground font-mono">
              ID: {currentInteractionGUID.slice(0, 8)}...
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{interactionWorkflows.length} workflow{interactionWorkflows.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{duration} min</span>
              </div>
            </div>
            
            {/* Show executed workflows */}
            {interactionWorkflows.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-medium mb-1">Workflows in this interaction:</p>
                <div className="space-y-1">
                  {interactionWorkflows.map((w, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {idx + 1}. {w.workflowName} 
                      <span className={`ml-2 ${
                        w.status === 'completed' ? 'text-green-600' : 
                        w.status === 'running' ? 'text-blue-600' : 
                        'text-gray-600'
                      }`}>
                        ({w.status})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show shared notes if any */}
            {sharedNotes && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-medium mb-1">Shared Notes:</p>
                <div className="text-xs bg-background p-2 rounded max-h-20 overflow-y-auto whitespace-pre-wrap">
                  {sharedNotes}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndInteraction}
          >
            <X className="h-3 w-3 mr-1" />
            End Interaction
          </Button>
        </div>
      </div>
    </Card>
  );
}