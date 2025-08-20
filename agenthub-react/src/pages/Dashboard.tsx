import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Play, FileText, Clock, CheckCircle, Search, Loader2, Users, ArrowRight, Sparkles, Shield, Zap, Activity, AlertCircle } from 'lucide-react';
import { workflowService, type WorkflowAlias } from '../services/api/workflows';
import { useVariableStore } from '../store/variableStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useInteractionStore } from '../store/interactionStore';
import { showConfirmDialog } from '../components/ui/confirm-dialog';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowAlias, setWorkflowAlias] = useState('');
  const [filteredAliases, setFilteredAliases] = useState<WorkflowAlias[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { clearAllVariables } = useVariableStore();
  const { endSession } = useWorkflowStore();
  const { 
    interactionMode, 
    setInteractionMode, 
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

  // Fetch aliases from the database
  const { data: aliases = [] } = useQuery({
    queryKey: ['aliases'],
    queryFn: () => workflowService.getAliases(),
  });

  // Search for aliases
  useEffect(() => {
    if (workflowAlias && workflowAlias.length > 0 && aliases && aliases.length > 0) {
      const query = workflowAlias.toLowerCase();
      // Filter aliases from database by the search query
      const filtered = aliases.filter((item: WorkflowAlias) => 
        item.AliasText && item.AliasText.toLowerCase().includes(query)
      );
      setFilteredAliases(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setFilteredAliases([]);
      setShowSuggestions(false);
    }
  }, [workflowAlias, aliases]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleStartByAlias = async (aliasItem?: WorkflowAlias) => {
    const selected = aliasItem || filteredAliases[selectedIndex];
    
    if (selected) {
      // Use the alias to navigate (the WorkflowExecution will resolve it)
      if (interactionMode) {
        // In interaction mode, don't clear variables
        if (!currentInteractionGUID) {
          startInteraction();
        }
        const encoded = btoa(selected.AliasText);
        navigate(`/w/${encoded}?interaction=true`);
      } else {
        // Normal mode: clear everything
        endSession();
        clearAllVariables();
        const encoded = btoa(selected.AliasText);
        navigate(`/w/${encoded}`);
      }
      setWorkflowAlias('');
      setShowSuggestions(false);
    } else if (workflowAlias) {
      // Try with the typed alias as a fallback
      try {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredAliases.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredAliases.length > 0) {
          handleStartByAlias();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleEndInteraction = async () => {
    const confirmed = await showConfirmDialog(
      'Are you sure you want to end this interaction? All workflow data will be cleared.',
      {
        title: 'End Interaction',
        confirmText: 'End Interaction',
        cancelText: 'Keep Working',
        type: 'warning'
      }
    );
    
    if (confirmed) {
      endInteraction();
      endSession();
      clearAllVariables();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Animated Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AgentHub Dashboard
              </h2>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Welcome to the next-generation workflow system
              </p>
            </div>
          
            {/* Interaction Mode Toggle */}
            <Card className={`relative overflow-hidden transition-all duration-300 w-full lg:w-auto ${
              interactionMode 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl lg:scale-105' 
                : 'bg-white hover:shadow-xl'
            }`}>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg hidden sm:block ${interactionMode ? 'bg-white/20' : 'bg-gray-100'}`}>
                    <Shield className={`h-5 w-5 sm:h-6 sm:w-6 ${interactionMode ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-xs uppercase tracking-wider ${interactionMode ? 'text-white/80' : 'text-gray-500'}`}>
                          Interaction Mode
                        </p>
                        <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${interactionMode ? 'text-white' : 'text-gray-900'}`}>
                          {interactionMode ? 'ACTIVE' : 'INACTIVE'}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={interactionMode}
                        onClick={() => setInteractionMode(!interactionMode)}
                        className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 items-center rounded-full transition-all duration-300 flex-shrink-0 ${
                          interactionMode ? 'bg-white/30' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 sm:h-6 sm:w-6 transform rounded-full transition-all duration-300 ${
                            interactionMode 
                              ? 'translate-x-6 sm:translate-x-7 bg-white shadow-lg' 
                              : 'translate-x-1 bg-white shadow'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
                {interactionMode && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    {currentInteractionGUID ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 animate-pulse" />
                            <p className="text-sm font-semibold">
                              Session Active
                            </p>
                          </div>
                          <p className="text-xs font-mono bg-white/20 px-2 py-1 rounded hidden sm:block">
                            {currentInteractionGUID.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {interactionWorkflows.length} workflows
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Active
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={handleEndInteraction}
                          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                        >
                          End Interaction
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4" />
                        <p>Ready to start new interaction</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {/* Show Start Interaction button when in interaction mode */}
          {interactionMode ? (
            <>
              {/* Start Interaction Card - Only show if no interaction is active */}
              {!currentInteractionGUID ? (
                <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="relative">
                    <CardHeader className="text-white">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Shield className="h-7 w-7" />
                        Start New Interaction
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        Begin a secure customer interaction with authentication
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={async () => {
                          // Start a new interaction
                          startInteraction();
                          
                          // Load the authenticate workflow
                          try {
                            // TODO: Make this configurable
                            const authenticateAlias = 'authenticate';
                            const encoded = btoa(authenticateAlias);
                            navigate(`/w/${encoded}?interaction=true`);
                          } catch (error) {
                            console.error('Error starting interaction:', error);
                          }
                        }}
                        className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold shadow-lg"
                        size="lg"
                      >
                        <Zap className="mr-2 h-5 w-5" />
                        Start Secure Interaction
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              ) : (
                /* Alias Search for Active Interaction */
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-600 animate-pulse" />
                      Launch Workflow
                    </CardTitle>
                    <CardDescription>
                      Search and launch workflows within the active interaction
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-700">Active Session</span>
                        </div>
                        <span className="text-xs font-mono bg-white/70 px-2 py-1 rounded text-purple-600">
                          {currentInteractionGUID.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        {interactionWorkflows.length} workflow{interactionWorkflows.length !== 1 ? 's' : ''} executed
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div className="flex space-x-2">
                        <div className="flex-1 relative">
                          <Input
                            ref={searchInputRef}
                            placeholder="Enter workflow alias..."
                            value={workflowAlias}
                            onChange={(e) => setWorkflowAlias(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                              if (filteredAliases.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            className="pr-10"
                          />
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                        <Button 
                          onClick={() => handleStartByAlias()} 
                          disabled={!workflowAlias && filteredAliases.length === 0}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Launch
                        </Button>
                      </div>
                      
                      {/* Search Suggestions Dropdown */}
                      {showSuggestions && filteredAliases.length > 0 && (
                        <div 
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
                        >
                          {filteredAliases.map((item, index) => (
                            <div
                              key={item.AliasText}
                              className={`px-4 py-3 cursor-pointer transition-colors ${
                                index === selectedIndex 
                                  ? 'bg-purple-50 border-l-2 border-purple-500' 
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleStartByAlias(item)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm font-mono text-purple-600">
                                    {item.AliasText}
                                  </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
                              </div>
                            </div>
                          ))}
                          {filteredAliases.length > 0 && (
                            <div className="px-4 py-2 text-xs text-gray-500 border-t">
                              {filteredAliases.length} alias{filteredAliases.length !== 1 ? 'es' : ''} found
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* No results message */}
                      {showSuggestions && workflowAlias && filteredAliases.length === 0 && (
                        <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg p-4">
                          <p className="text-sm text-gray-500">No workflows found with alias "{workflowAlias}"</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
            {/* Quick Start by Alias - Hidden in interaction mode */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Quick Start
                </CardTitle>
                <CardDescription>Search and launch workflows instantly by alias</CardDescription>
              </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    ref={searchInputRef}
                    placeholder="Enter workflow alias..."
                    value={workflowAlias}
                    onChange={(e) => setWorkflowAlias(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (filteredAliases.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Button 
                  onClick={() => handleStartByAlias()} 
                  disabled={!workflowAlias && filteredAliases.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Launch
                </Button>
              </div>
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && filteredAliases.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                  {filteredAliases.map((item, index) => (
                    <div
                      key={item.AliasText}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        index === selectedIndex 
                          ? 'bg-blue-50 border-l-2 border-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleStartByAlias(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm font-mono text-blue-600">
                            {item.AliasText}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
                      </div>
                    </div>
                  ))}
                  {filteredAliases.length > 0 && (
                    <div className="px-4 py-2 text-xs text-gray-500 border-t">
                      {filteredAliases.length} alias{filteredAliases.length !== 1 ? 'es' : ''} found
                    </div>
                  )}
                </div>
              )}
              
              {/* No results message */}
              {showSuggestions && workflowAlias && filteredAliases.length === 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg p-4">
                  <p className="text-sm text-gray-500">No workflows found with alias "{workflowAlias}"</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

            {/* Available Workflows - Only show when NOT in interaction mode */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Available Workflows
                </CardTitle>
                <CardDescription>Select from your workflow library</CardDescription>
              </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-3" />
                <p className="text-sm text-gray-500">Loading workflows...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to load workflows. Please check your API connection.</span>
                </div>
              </div>
            ) : workflows && workflows.length > 0 ? (
              <div className="space-y-2">
                {workflows.map((workflow: any, index: number) => {
                  const gradients = [
                    'from-purple-500 to-pink-500',
                    'from-blue-500 to-cyan-500',
                    'from-green-500 to-emerald-500',
                    'from-orange-500 to-red-500'
                  ];
                  const colorIndex = index % 4;
                  
                  return (
                    <div
                      key={workflow.WorkflowUID}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-transparent"
                      onClick={() => handleStartWorkflow(workflow.WorkflowUID, workflow.WorkflowName)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${gradients[colorIndex]} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${gradients[colorIndex]} text-white shadow-md`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 group-hover:text-gray-900">
                              {workflow.WorkflowName}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(workflow.LastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-block">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No workflows available</p>
                  <p className="text-sm text-gray-400 mt-1">Create one using the API or import from PDF</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}