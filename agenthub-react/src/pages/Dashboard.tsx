import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Play, FileText, Clock, CheckCircle, Search, Loader2, Users, ArrowRight } from 'lucide-react';
import { workflowService } from '../services/api/workflows';
import { useVariableStore } from '../store/variableStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useInteractionStore } from '../store/interactionStore';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowAlias, setWorkflowAlias] = useState('');
  const { clearAllVariables } = useVariableStore();
  const { endSession } = useWorkflowStore();
  const { 
    interactionMode, 
    toggleInteractionMode, 
    currentInteractionGUID,
    interactionWorkflows,
    startInteraction,
    endInteraction,
    isInInteraction,
    addWorkflowToInteraction 
  } = useInteractionStore();

  // Fetch workflows list
  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.listWorkflows(20),
  });

  const handleStartWorkflow = (workflowId: string, workflowName?: string) => {
    if (interactionMode) {
      // In interaction mode, don't clear variables
      if (!currentInteractionGUID) {
        // Start a new interaction if not already in one
        startInteraction();
      }
      // Add workflow to interaction tracking
      if (workflowName) {
        addWorkflowToInteraction(workflowId, workflowName);
      }
      const encoded = btoa(workflowId);
      navigate(`/w/${encoded}?interaction=true`);
    } else {
      // Normal mode: clear everything
      endSession();
      clearAllVariables();
      const encoded = btoa(workflowId);
      navigate(`/w/${encoded}`);
    }
  };

  const handleStartByAlias = async () => {
    if (workflowAlias) {
      try {
        // Try to validate the alias exists first (only if API is running)
        let searchResults: any[] = [];
        try {
          searchResults = await workflowService.searchWorkflows(workflowAlias, 1);
        } catch (searchError) {
          // API might not be running, continue anyway
          console.log('Could not validate alias, continuing anyway');
        }
        
        if (searchResults.length === 0) {
          // No exact match found, but still try to navigate - the WorkflowExecution page will handle the error
          console.warn(`No workflow found with alias: ${workflowAlias}`);
        }
        
        if (interactionMode) {
          // In interaction mode, don't clear variables
          if (!currentInteractionGUID) {
            startInteraction();
          }
          const encoded = btoa(workflowAlias);
          navigate(`/w/${encoded}?interaction=true`);
        } else {
          // Normal mode: clear everything
          endSession();
          clearAllVariables();
          const encoded = btoa(workflowAlias);
          navigate(`/w/${encoded}`);
        }
      } catch (error) {
        console.error('Error starting workflow by alias:', error);
        // Still navigate - let the WorkflowExecution page show the error
        const encoded = btoa(workflowAlias);
        navigate(`/w/${encoded}${interactionMode ? '?interaction=true' : ''}`);
      }
    }
  };

  const handleEndInteraction = () => {
    if (confirm('Are you sure you want to end this interaction? All workflow data will be cleared.')) {
      endInteraction();
      endSession();
      clearAllVariables();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Welcome to AgentHub Workflow System</p>
          </div>
          
          {/* Interaction Mode Toggle */}
          <Card className="p-4 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div className="flex items-center space-x-2">
                <Switch
                  id="interaction-mode"
                  checked={interactionMode}
                  onCheckedChange={toggleInteractionMode}
                />
                <Label htmlFor="interaction-mode" className="font-medium">
                  Interaction Mode
                </Label>
              </div>
            </div>
            {interactionMode && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                {currentInteractionGUID ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-700">
                      Active Interaction
                    </p>
                    <p className="text-xs font-mono bg-blue-50 px-2 py-1 rounded">
                      {currentInteractionGUID.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-blue-600">
                      {interactionWorkflows.length} workflow{interactionWorkflows.length !== 1 ? 's' : ''} executed
                    </p>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={handleEndInteraction}
                      className="w-full"
                    >
                      End Interaction
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-blue-600 italic">
                    Ready to start new interaction
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{workflows?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Ready to execute</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{currentInteractionGUID ? interactionWorkflows.length : 0}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">0</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">0m</div>
            <p className="text-xs text-muted-foreground">Per workflow</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {/* Quick Start by Alias */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Enter a workflow alias or select from the list below</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter workflow alias (e.g., 'customer-intake')"
                value={workflowAlias}
                onChange={(e) => setWorkflowAlias(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartByAlias()}
              />
              <Button onClick={handleStartByAlias} disabled={!workflowAlias}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>Available Workflows</CardTitle>
            <CardDescription>Select a workflow to start</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                Failed to load workflows. Please check your API connection.
              </div>
            ) : workflows && workflows.length > 0 ? (
              <div className="space-y-2">
                {workflows.map((workflow: any, index: number) => {
                  const colors = ['border-purple-200', 'border-blue-200', 'border-green-200', 'border-orange-200'];
                  const iconColors = ['text-purple-500', 'text-blue-500', 'text-green-500', 'text-orange-500'];
                  const bgHovers = ['hover:bg-purple-50', 'hover:bg-blue-50', 'hover:bg-green-50', 'hover:bg-orange-50'];
                  const colorIndex = index % 4;
                  
                  return (
                    <div
                      key={workflow.WorkflowUID}
                      className={`flex items-center justify-between p-3 border-2 ${colors[colorIndex]} rounded-lg ${bgHovers[colorIndex]} cursor-pointer transition-all hover:shadow-sm`}
                      onClick={() => handleStartWorkflow(workflow.WorkflowUID, workflow.WorkflowName)}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className={`h-5 w-5 ${iconColors[colorIndex]}`} />
                        <div>
                          <p className="font-medium">{workflow.WorkflowName}</p>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(workflow.LastUpdated).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className={iconColors[colorIndex]}>
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No workflows available. Create one using the API or import from PDF.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Test Workflow</CardTitle>
            <CardDescription>Try a sample workflow to test the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                // End any existing session and clear all variables before starting a new workflow
                endSession();
                clearAllVariables();
                // Create a test workflow and navigate to it
                const testWorkflow = {
                  WorkflowName: "Test Workflow",
                  Steps: [
                    {
                      GUID: "step1",
                      StepType: "userinstruction",
                      Prompt: "<h3>Welcome to the Test Workflow</h3><p>This is a sample workflow to demonstrate the system capabilities.</p>"
                    },
                    {
                      GUID: "step2",
                      StepType: "question",
                      Prompt: "Are you ready to begin?",
                      Answers: [
                        {
                          GUID: "ans1",
                          Prompt: "Yes",
                          NotesTemplate: "User selected: Yes - starting intake process",
                          SubSteps: [
                            {
                              GUID: "step3",
                              StepType: "collect",
                              Prompt: "Please enter your name:",
                              VariableName: "UserName",
                              Format: "text",
                              NotesTemplate: "User Name: ~#value#~"
                            },
                            {
                              GUID: "step4",
                              StepType: "userinstruction",
                              Prompt: "Thank you, ~#UserName#~! Now we'll load another workflow."
                            },
                            {
                              GUID: "step5",
                              StepType: "loadworkflow",
                              WorkflowName: "Sub-Workflow Test"
                            },
                            {
                              GUID: "step6",
                              StepType: "userinstruction",
                              Prompt: "Welcome back from the sub-workflow! Test complete."
                            },
                            {
                              GUID: "step7",
                              StepType: "notesblock",
                              NotesTemplate: "=== WORKFLOW SUMMARY ===\nUser Name: ~#UserName#~\nFavorite Color: ~#FavoriteColor#~\nWorkflow completed successfully."
                            }
                          ]
                        },
                        {
                          GUID: "ans2",
                          Prompt: "No",
                          NotesTemplate: "User selected: No - workflow ended",
                          SubSteps: [
                            {
                              GUID: "step7",
                              StepType: "userinstruction",
                              Prompt: "No problem! Come back when you're ready."
                            }
                          ]
                        }
                      ]
                    }
                  ]
                };
                
                // Also create a simple sub-workflow for testing
                const subTestWorkflow = {
                  WorkflowName: "Sub-Workflow Test",
                  WorkflowUID: "subtest-123",
                  Steps: [
                    {
                      GUID: "sub1",
                      StepType: "userinstruction",
                      Prompt: "<h3>Sub-Workflow</h3><p>You are now in a sub-workflow!</p>"
                    },
                    {
                      GUID: "sub2",
                      StepType: "collect",
                      Prompt: "Enter your favorite color:",
                      VariableName: "FavoriteColor",
                      Format: "text",
                      NotesTemplate: "Favorite Color: ~#value#~"
                    },
                    {
                      GUID: "sub3",
                      StepType: "userinstruction",
                      Prompt: "Great! Your favorite color is ~#FavoriteColor#~. Sub-workflow complete."
                    }
                  ]
                };
                
                // Store both workflows - cache by workflow name
                localStorage.setItem('workflow_cache_Sub-Workflow Test', JSON.stringify(subTestWorkflow));
                localStorage.setItem('workflow_cache_Sub-Workflow Test_timestamp', Date.now().toString());
                
                // Store test workflow in localStorage
                localStorage.setItem('test_workflow', JSON.stringify(testWorkflow));
                navigate('/w/test');
              }}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              Run Test Workflow
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}