import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, PhoneCall, Loader2, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { useChatbotWorkflowStore } from '../stores/chatbotWorkflowStore';
import { useVariableStore, VariableType } from '../stores/variableStore';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { vectorStore } from '../services/vectorStore';
import { OpenAIService } from '../services/openai';

// Use environment variables for API configuration
const API_URL = import.meta.env.VITE_WORKFLOW_API_URL || 'http://localhost:4000/api';
const API_KEY = import.meta.env.VITE_WORKFLOW_API_KEY || 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  stepType?: string;
  answers?: any[];
  selectedAnswer?: any;
  isTyping?: boolean;
}

export function ChatSupport() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [searchingWorkflow, setSearchingWorkflow] = useState(false);
  const [allAliases, setAllAliases] = useState<any[]>([]);
  const [pendingWorkflowChoices, setPendingWorkflowChoices] = useState<any[]>([]);
  const [displayedStepIds, setDisplayedStepIds] = useState<Set<string>>(new Set());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [prefilledTicketData, setPrefilledTicketData] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    loadWorkflow, 
    currentWorkflow, 
    rows,
    answerQuestion,
    collectValue,
    startNewSession,
    processNextStep
  } = useChatbotWorkflowStore();
  
  const { setVariable, interpolateText } = useVariableStore();

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = dataLoaded 
        ? "Hello! I'm your AgentHub assistant. How can I help you today?"
        : "Hello! I'm your AgentHub assistant. Loading available workflows...";
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [dataLoaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load aliases on mount and initialize vector store
  useEffect(() => {
    fetchAliases();
  }, []);

  // Monitor workflow steps and display them
  useEffect(() => {
    if (rows && rows.length > 0) {
      const pendingRows = rows.filter(row => {
        if (!row.id) return false;
        const isDisplayed = displayedStepIds.has(row.id) || messages.some(m => m.id === row.id);
        return !row.answered && row.visible && !isDisplayed;
      });
      
      let cumulativeDelay = 0;
      pendingRows.forEach((row, index) => {
        const stepType = row.step?.StepType?.toLowerCase();
        const isFirstStep = displayedStepIds.size === 0 && index === 0;
        
        let delay = 0;
        if (!isFirstStep) {
          if (stepType === 'userinstruction' || stepType === 'notesblock') {
            delay = 800;
          } else {
            const messageLength = row.step.Prompt?.length || 0;
            delay = Math.min(800 + (messageLength * 5), 1500);
          }
        } else {
          delay = 100;
        }
        
        const totalDelay = cumulativeDelay + delay;
        
        setTimeout(() => {
          displayWorkflowStep(row);
        }, totalDelay);
        
        cumulativeDelay = totalDelay;
      });
    }
  }, [rows]);

  const fetchAliases = async () => {
    try {
      const response = await fetch(`${API_URL}/aliases`, {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const aliases = await response.json();
        const validAliases = aliases.filter((a: any) => a.WorkflowName && a.WorkflowName !== null);
        setAllAliases(validAliases);
        setDataLoaded(true);
        console.log(`Loaded ${validAliases.length} workflow aliases`);
        
        // Initialize vector store with aliases if OpenAI key is available
        if (OPENAI_API_KEY) {
          vectorStore.initialize(validAliases, OPENAI_API_KEY)
            .then(() => console.log('Vector store initialized'))
            .catch(err => console.error('Failed to initialize vector store:', err));
        }
      } else {
        throw new Error('Failed to fetch aliases');
      }
    } catch (error) {
      console.error('Failed to fetch aliases:', error);
      setInitialLoadError('Failed to load chatbot data. Please refresh the page.');
      setDataLoaded(true);
    }
  };

  const displayWorkflowStep = (row: any) => {
    console.log('displayWorkflowStep called for:', row?.id, row?.step?.StepType);
    if (!row) return;
    
    // Check if we've already displayed this step
    if (displayedStepIds.has(row.id)) {
      console.log('Step already in displayedStepIds, skipping:', row.id);
      return;
    }
    
    // Also check if a message with this ID already exists
    if (messages.some(m => m.id === row.id)) {
      console.log('Message with this ID already exists, skipping:', row.id);
      setDisplayedStepIds(prev => new Set([...prev, row.id]));
      return;
    }
    
    console.log('Marking step as displayed:', row.id);
    // Mark this step as displayed
    setDisplayedStepIds(prev => {
      const newSet = new Set([...prev, row.id]);
      console.log('Updated displayedStepIds:', Array.from(newSet));
      return newSet;
    });
    
    const { step } = row;
    const stepType = step.StepType?.toLowerCase();
    console.log('Step type:', stepType, 'Prompt:', step.Prompt?.substring(0, 50));
    
    // Display step based on type
    if (stepType === 'question' && step.Prompt) {
      const prompt = interpolateText(step.Prompt);
      const answers = step.Answers || [];
      
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: prompt,
        timestamp: new Date(),
        stepType: 'Question',
        answers: answers.map((a: any) => ({
          ...a,
          text: interpolateText(a.Prompt || a.AnswerText || '')
        }))
      }]);
      
      console.log('Question step displayed, waiting for user selection');
    } else if (stepType === 'userinstruction' && step.Prompt) {
      const instruction = interpolateText(step.Prompt);
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: instruction,
        timestamp: new Date(),
        stepType: 'UserInstruction'
      }]);
      
      console.log('UserInstruction displayed, workflow will handle next step');
    } else if (stepType === 'notesblock' && (step.NotesTemplate || step.Prompt)) {
      const notes = interpolateText(step.NotesTemplate || step.Prompt || '');
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: `📝 Notes:\n${notes}`,
        timestamp: new Date(),
        stepType: 'NotesBlock'
      }]);
      
      console.log('NotesBlock displayed, workflow will handle next step');
    } else if (stepType === 'collect' && step.Prompt) {
      const prompt = interpolateText(step.Prompt);
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: prompt,
        timestamp: new Date(),
        stepType: 'Collect'
      }]);
      
      console.log('Collect step displayed, waiting for user input');
    } else if (stepType === 'variableassignment') {
      // Variable assignments are processed silently
      console.log('Processing variable assignment');
    } else if (stepType === 'loadworkflow' && step.WorkflowName) {
      // Load sub-workflow
      console.log('Loading sub-workflow:', step.WorkflowName);
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'system',
        content: `Loading workflow: ${step.WorkflowName}`,
        timestamp: new Date(),
        stepType: 'LoadWorkflow'
      }]);
    } else {
      console.log('Unknown or empty step type:', stepType);
    }
  };

  const searchForWorkflow = async (query: string) => {
    setSearchingWorkflow(true);
    
    let matches = [];
    
    // Try AI-powered search first if OpenAI key is available
    if (OPENAI_API_KEY) {
      try {
        matches = await findMatchingWorkflowsUsingLLM(query);
      } catch (error) {
        console.error('AI search failed, falling back to keyword search:', error);
      }
    }
    
    // Fallback to simple keyword matching if AI search fails or returns nothing
    if (matches.length === 0) {
      const lowercaseInput = query.toLowerCase().trim();
      const commonWords = ['i', 'can', 'get', 'a', 'an', 'the', 'my', 'wonder', 'if', 'want', 'need', 'like', 'would', 'could', 'should', 'to', 'for', 'with', 'about', 'help', 'me'];
      const words = lowercaseInput.split(/[\s-]+/).filter(word => 
        word.length > 2 && !commonWords.includes(word)
      );
      
      if (words.length > 0) {
        const scoredAliases = [];
        
        for (const alias of allAliases) {
          const aliasText = (alias.AliasText || '').toLowerCase();
          const workflowName = (alias.WorkflowName || '').toLowerCase();
          
          let score = 0;
          for (const word of words) {
            if (aliasText.includes(word) || workflowName.includes(word)) {
              score++;
            }
          }
          
          if (score > 0) {
            scoredAliases.push({ alias, score });
          }
        }
        
        scoredAliases.sort((a, b) => b.score - a.score);
        matches = scoredAliases.slice(0, 3).map(item => item.alias);
      }
    }
    
    if (matches.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I couldn't find a specific workflow for that. Could you provide more details about what you need help with?",
        timestamp: new Date()
      }]);
    } else if (matches.length === 1) {
      // Single match - load it directly
      await loadWorkflowByAlias(matches[0]);
    } else {
      // Multiple matches - let user choose
      setPendingWorkflowChoices(matches);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I found ${matches.length} workflows that might help. Which one would you like to use?`,
        timestamp: new Date(),
        answers: matches.map((m: any) => ({
          GUID: m.WorkflowName,
          AnswerText: m.AliasText || m.WorkflowName,
          Description: m.Description
        }))
      }]);
    }
    
    setSearchingWorkflow(false);
  };

  const findMatchingWorkflowsUsingLLM = async (userInput: string) => {
    try {
      // Create indexed list of workflows for LLM
      const indexedAliases = allAliases.slice(0, 20); // Limit to first 20 for token limits
      
      const workflowList = indexedAliases.map((alias, index) => {
        const num = index + 1;
        const aliasText = alias.AliasText || alias.WorkflowName;
        return `${num}. ${aliasText}`;
      }).join('\n');
      
      const systemPrompt = `You are a workflow matching assistant. Your job is to identify which workflows best match the user's request.

IMPORTANT MATCHING GUIDELINES:
- Consider semantic meaning and intent, not just exact word matches
- A workflow about "SNAP Eligibility" should match queries about "food stamps" even if those exact words don't appear
- Similarly, "MRI Cost Estimation" should match "how much does an MRI cost"

User's request: "${userInput}"

Available workflows:
${workflowList}

TASK:
1. Review ALL workflows, not just the likely matches
2. Consider semantic meaning and user intent
3. Return the 1-3 most relevant workflow numbers

OUTPUT:
Return ONLY the numbers as comma-separated values (e.g., "1,3,5")
Return "none" if no workflows match
The numbers should be ordered by relevance with the best match first`;

      const response = await OpenAIService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        apiKey: OPENAI_API_KEY
      });
      
      const matchNumbers = response.content.trim().toLowerCase();
      
      if (matchNumbers === 'none') {
        console.log('LLM found no matching workflows for:', userInput);
        return [];
      }
      
      const matches = [];
      const numbers = matchNumbers.split(',').map(n => n.trim());
      
      for (const num of numbers) {
        const index = parseInt(num) - 1;
        if (!isNaN(index) && index >= 0 && index < indexedAliases.length) {
          matches.push(indexedAliases[index]);
        }
      }
      
      if (matches.length > 0) {
        console.log(`LLM found ${matches.length} matches for "${userInput}":`, matches.map(m => m.WorkflowName).join(', '));
      }
      
      return matches;
      
    } catch (error) {
      console.error('LLM workflow matching failed:', error);
      throw error;
    }
  };

  const loadWorkflowByAlias = async (matchedAlias: any) => {
    setIsLoading(true);
    try {
      if (!matchedAlias || !matchedAlias.WorkflowName) {
        throw new Error('Workflow not found');
      }
      
      console.log('Searching for workflow by name:', matchedAlias.WorkflowName);
      
      // Search for workflow using search endpoint
      const searchResponse = await fetch(`${API_URL}/workflows/search?query=${encodeURIComponent(matchedAlias.WorkflowName)}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!searchResponse.ok) {
        throw new Error('Failed to search workflows');
      }
      
      const workflows = await searchResponse.json();
      console.log('Search returned', workflows.length, 'workflows');
      
      // Find exact match
      const matchedWorkflow = workflows.find((w: any) => 
        w.WorkflowName === matchedAlias.WorkflowName
      );
      
      if (!matchedWorkflow) {
        console.error('Workflow not found in search results. Looking for:', matchedAlias.WorkflowName);
        console.error('Available workflows:', workflows.map((w: any) => w.WorkflowName));
        throw new Error(`Workflow "${matchedAlias.WorkflowName}" not found`);
      }
      
      // Load the full workflow
      const response = await fetch(`${API_URL}/workflows/${matchedWorkflow.WorkflowUID}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (response.ok) {
        const workflowData = await response.json();
        
        // Transform and load the workflow (matching ChatWidget structure)
        const workflow = {
          WorkflowName: workflowData.WorkflowName,
          WorkflowUID: workflowData.WorkflowUID,
          Steps: workflowData.Definition?.Steps || [],
          LastUpdated: workflowData.LastUpdated,
          LastUpdatedBy: workflowData.LastUpdatedBy
        };
        
        console.log('Loading workflow with steps:', workflow.Steps);
        
        // Clear all state before starting new workflow
        setDisplayedStepIds(new Set());
        
        // Add workflow-specific welcome message
        const welcomeId = `welcome-${Date.now()}-${Math.random()}`;
        setMessages(prev => [...prev, {
          id: welcomeId,
          role: 'assistant',
          content: `I'll help you with ${workflow.WorkflowName}. Let me guide you through the process.`,
          timestamp: new Date()
        }]);
        
        // Small delay to ensure welcome message is rendered first
        setTimeout(() => {
          console.log('Loading workflow after welcome message');
          loadWorkflow(workflow);
          setWorkflowStarted(true);
        }, 100);
      } else {
        throw new Error('Failed to load workflow');
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I couldn't load that workflow. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (inputValue.trim() && !isLoading) {
      const userMessage = inputValue.trim();
      setInputValue('');
      
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }]);
      
      // If workflow choices are pending, check if user selected one
      if (pendingWorkflowChoices.length > 0) {
        const selected = pendingWorkflowChoices.find(w => 
          w.AliasText?.toLowerCase() === userMessage.toLowerCase() ||
          w.WorkflowName?.toLowerCase() === userMessage.toLowerCase()
        );
        
        if (selected) {
          setPendingWorkflowChoices([]);
          await loadWorkflowByAlias(selected);
        } else {
          // Search again with new query
          setPendingWorkflowChoices([]);
          await searchForWorkflow(userMessage);
        }
      } else if (!workflowStarted) {
        // Search for matching workflow
        await searchForWorkflow(userMessage);
      } else {
        // Check if there's a pending collect step
        const pendingCollect = rows.find(r => 
          !r.answered && r.visible && r.step.StepType === 'Collect'
        );
        
        if (pendingCollect) {
          collectValue(pendingCollect.id, userMessage);
        } else {
          // General response
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I've noted your response. Is there anything else I can help you with?",
            timestamp: new Date()
          }]);
        }
      }
    }
  };

  const parseServiceNowCommand = (command: string) => {
    // Parse system.servicenow(Title:Description:Impact:Urgency)
    const match = command.match(/system\.servicenow\(([^:]+):([^:]+):(\d):(\d)\)/);
    if (match) {
      return {
        title: match[1],
        description: match[2],
        impact: match[3],
        urgency: match[4]
      };
    }
    return null;
  };

  const handleAnswerClick = (messageId: string, answerId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    const answer = message.answers?.find((a: any) => a.GUID === answerId);
    if (!answer) return;
    
    // Check if this answer has a ServiceNow execute command
    if (answer.Execute && typeof answer.Execute === 'string' && answer.Execute.startsWith('system.servicenow')) {
      const ticketData = parseServiceNowCommand(answer.Execute);
      if (ticketData) {
        // Interpolate any variables in the ticket data
        const interpolatedData = {
          title: interpolateText(ticketData.title),
          description: interpolateText(ticketData.description),
          impact: ticketData.impact,
          urgency: ticketData.urgency
        };
        
        setPrefilledTicketData(interpolatedData);
        setShowCreateTicketModal(true);
        
        // Add user's selection as a message
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'user',
          content: answer.AnswerText,
          timestamp: new Date()
        }]);
        
        // Mark answer as selected
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, selectedAnswer: answer } : m
        ));
        
        // Continue workflow processing
        answerQuestion(messageId, answerId);
        return;
      }
    }
    
    // Add user's selection as a message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: answer.AnswerText,
      timestamp: new Date()
    }]);
    
    // Mark answer as selected
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, selectedAnswer: answer } : m
    ));
    
    // If this is a workflow choice
    if (pendingWorkflowChoices.length > 0) {
      const workflow = pendingWorkflowChoices.find(w => w.WorkflowName === answerId);
      if (workflow) {
        setPendingWorkflowChoices([]);
        loadWorkflowByName(workflow.WorkflowName);
      }
    } else {
      // Process workflow answer
      answerQuestion(messageId, answerId);
    }
  };

  const handleRestart = () => {
    setWorkflowStarted(false);
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: "Chat has been reset. How can I help you today?",
      timestamp: new Date()
    }]);
    setDisplayedStepIds(new Set());
    startNewSession();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chat Support</h1>
            <p className="text-sm text-gray-600">
              {currentWorkflow ? `Workflow: ${currentWorkflow.WorkflowName}` : 'AI-powered assistance'}
            </p>
          </div>
          <div className="flex gap-2">
            {workflowStarted && (
              <button 
                onClick={handleRestart}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
              </button>
            )}
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
              <PhoneCall className="h-4 w-4 mr-2" />
              Request Agent
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 ${msg.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    ) : msg.role === 'system' ? (
                      <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : msg.role === 'system'
                        ? 'bg-gray-50 text-gray-700 italic'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.isTyping ? (
                        <div className="flex gap-1">
                          <span className="animate-bounce">•</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                    
                    {/* Answer buttons */}
                    {msg.answers && !msg.selectedAnswer && !msg.isTyping && (
                      <div className="mt-2 space-y-2">
                        {msg.answers.map((answer: any) => (
                          <button
                            key={answer.GUID}
                            onClick={() => handleAnswerClick(msg.id, answer.GUID)}
                            className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-indigo-500 transition-colors"
                          >
                            <div className="font-medium text-sm">{answer.AnswerText}</div>
                            {answer.Description && (
                              <div className="text-xs text-gray-600 mt-1">{answer.Description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Show selected answer */}
                    {msg.selectedAnswer && (
                      <div className="mt-2 flex items-center text-xs text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Selected: {msg.selectedAnswer.AnswerText}
                      </div>
                    )}
                    
                    <div className={`text-xs text-gray-500 mt-1 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Loading...</span>
                </div>
              </div>
            )}
            
            {searchingWorkflow && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">Searching for matching workflows...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-l p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button 
            onClick={() => searchForWorkflow('create ticket')}
            className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left"
          >
            📝 Create a ticket
          </button>
          <button 
            onClick={() => searchForWorkflow('check ticket status')}
            className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left"
          >
            📋 Check ticket status
          </button>
          <button 
            onClick={() => searchForWorkflow('reset password')}
            className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left"
          >
            🔧 Reset password
          </button>
          <button 
            onClick={() => searchForWorkflow('inventory help')}
            className="w-full px-4 py-2 bg-white rounded-lg border hover:bg-gray-50 text-left"
          >
            📦 Inventory help
          </button>
        </div>

        <div className="mt-8">
          <h2 className="font-semibold text-gray-900 mb-4">Workflow Info</h2>
          <div className="bg-white rounded-lg p-4">
            {dataLoaded ? (
              <>
                <div className="flex items-center mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">{allAliases.length} workflows available</span>
                </div>
                <p className="text-xs text-gray-500">
                  {workflowStarted ? 'Workflow in progress' : 'Type to search workflows'}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Loading workflows...</span>
              </div>
            )}
          </div>
        </div>

        {initialLoadError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-xs text-red-700">{initialLoadError}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateTicketModal}
        onClose={() => {
          setShowCreateTicketModal(false);
          setPrefilledTicketData(null);
        }}
        onSuccess={() => {
          setShowCreateTicketModal(false);
          setPrefilledTicketData(null);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: 'Ticket created successfully!',
            timestamp: new Date()
          }]);
        }}
        prefilledData={prefilledTicketData}
      />
    </div>
  );
}