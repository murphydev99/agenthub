import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, Loader2 } from 'lucide-react';
import { useChatbotWorkflowStore } from '../stores/chatbotWorkflowStore';
import { useVariableStore, VariableType } from '../stores/variableStore';
import { CreateTicketModal } from '../components/CreateTicketModal';
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
}

export function ChatSupportNew() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [searchingWorkflow, setSearchingWorkflow] = useState(false);
  const [allAliases, setAllAliases] = useState<any[]>([]);
  const [pendingWorkflowChoices, setPendingWorkflowChoices] = useState<any[]>([]);
  const [displayedStepIds, setDisplayedStepIds] = useState<Set<string>>(new Set());
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
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

  // Load aliases on mount
  useEffect(() => {
    fetchAliases();
  }, []);

  // Monitor workflow steps and display them
  useEffect(() => {
    console.log('Rows updated:', rows.length, 'rows');
    console.log('All rows:', rows.map(r => ({ id: r.id, answered: r.answered, visible: r.visible, stepType: r.step?.StepType })));
    console.log('DisplayedStepIds:', Array.from(displayedStepIds));
    
    if (rows && rows.length > 0) {
      const pendingRows = rows.filter(row => {
        if (!row.id) return false;
        const isDisplayed = displayedStepIds.has(row.id) || messages.some(m => m.id === row.id);
        const shouldDisplay = !row.answered && row.visible && !isDisplayed;
        console.log(`Row ${row.id} - answered: ${row.answered}, visible: ${row.visible}, displayed: ${isDisplayed}, shouldDisplay: ${shouldDisplay}`);
        return shouldDisplay;
      });
      
      console.log('Pending rows to display:', pendingRows.length);
      
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
          console.log('Displaying step:', row.id, 'Type:', stepType);
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
    
    if (displayedStepIds.has(row.id)) {
      console.log('Step already displayed, skipping:', row.id);
      return;
    }
    
    if (messages.some(m => m.id === row.id)) {
      console.log('Message already exists, skipping:', row.id);
      setDisplayedStepIds(prev => new Set([...prev, row.id]));
      return;
    }
    
    setDisplayedStepIds(prev => new Set([...prev, row.id]));
    setCurrentStep(row);
    
    const { step } = row;
    const stepType = step.StepType?.toLowerCase();
    
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
    } else if (stepType === 'userinstruction' && step.Prompt) {
      const instruction = interpolateText(step.Prompt);
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: instruction,
        timestamp: new Date(),
        stepType: 'UserInstruction'
      }]);
    } else if (stepType === 'notesblock' && (step.NotesTemplate || step.Prompt)) {
      const notes = interpolateText(step.NotesTemplate || step.Prompt || '');
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: `📝 Notes:\n${notes}`,
        timestamp: new Date(),
        stepType: 'NotesBlock'
      }]);
    } else if (stepType === 'collect' && step.Prompt) {
      const prompt = interpolateText(step.Prompt);
      setMessages(prev => [...prev, {
        id: row.id,
        role: 'assistant',
        content: prompt,
        timestamp: new Date(),
        stepType: 'Collect'
      }]);
    }
  };

  const searchForWorkflow = async (userInput: string) => {
    if (!allAliases || allAliases.length === 0) return [];
    
    try {
      // Use OpenAI to find matching workflows
      const validAliases = allAliases.filter(a => a.WorkflowName && a.WorkflowName !== 'null');
      
      // Create indexed list for LLM
      const indexedAliases = validAliases.slice(0, 30);
      const workflowList = indexedAliases.map((alias, index) => {
        const num = index + 1;
        const aliasText = alias.AliasText || alias.WorkflowName;
        return `${num}. ${aliasText}`;
      }).join('\n');
      
      const systemPrompt = `You are a workflow matching assistant. Find the best workflow for the user's request.

User's request: "${userInput}"

Available workflows:
${workflowList}

Return ONLY the numbers as comma-separated values (e.g., "1,3,5")
Return "none" if no workflows match
Order by relevance with best match first`;

      const response = await OpenAIService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        apiKey: OPENAI_API_KEY
      });
      
      const matchNumbers = response.content.trim().toLowerCase();
      
      if (matchNumbers === 'none') {
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
      
      return matches;
      
    } catch (error) {
      console.error('LLM workflow matching failed:', error);
      
      // Fallback to keyword search
      const lowercaseInput = userInput.toLowerCase().trim();
      const words = lowercaseInput.split(/\s+/).filter(w => w.length > 2);
      
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
      return scoredAliases.slice(0, 3).map(item => item.alias);
    }
  };

  const loadWorkflowByAlias = async (matchedAlias: any) => {
    setSearchingWorkflow(true);
    try {
      if (!matchedAlias || !matchedAlias.WorkflowName) {
        throw new Error('Workflow not found');
      }
      
      console.log('Searching for workflow:', matchedAlias.WorkflowName);
      
      const searchResponse = await fetch(`${API_URL}/workflows/search?query=${encodeURIComponent(matchedAlias.WorkflowName)}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!searchResponse.ok) {
        throw new Error('Failed to search workflows');
      }
      
      const workflows = await searchResponse.json();
      const matchedWorkflow = workflows.find((w: any) => 
        w.WorkflowName === matchedAlias.WorkflowName
      );
      
      if (!matchedWorkflow) {
        throw new Error(`Workflow "${matchedAlias.WorkflowName}" not found`);
      }
      
      const response = await fetch(`${API_URL}/workflows/${matchedWorkflow.WorkflowUID}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }
      
      const workflowData = await response.json();
      
      // Transform and load the workflow
      const workflow = {
        WorkflowName: workflowData.WorkflowName,
        WorkflowUID: workflowData.WorkflowUID,
        Steps: workflowData.Definition?.Steps || [],
        LastUpdated: workflowData.LastUpdated,
        LastUpdatedBy: workflowData.LastUpdatedBy
      };
      
      console.log('Loading workflow with steps:', workflow.Steps);
      
      setDisplayedStepIds(new Set());
      setCurrentStep(null);
      
      setMessages(prev => [...prev, {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `I'll help you with ${workflow.WorkflowName}. Let me guide you through the process.`,
        timestamp: new Date()
      }]);
      
      setTimeout(() => {
        loadWorkflow(workflow);
        setWorkflowStarted(true);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return false;
    } finally {
      setSearchingWorkflow(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue.trim();
    setInputValue('');
    
    // Handle Collect steps
    if (currentStep?.step?.StepType?.toLowerCase() === 'collect') {
      collectValue(currentStep.id, userInput);
      setCurrentStep(null);
      return;
    }
    
    // Handle Question steps
    if (currentStep?.step?.StepType?.toLowerCase() === 'question') {
      const answers = currentStep.step.Answers || [];
      const matchedAnswer = answers.find((a: any) => 
        (a.Prompt || a.AnswerText || '').toLowerCase() === userInput.toLowerCase()
      );
      
      if (matchedAnswer) {
        handleAnswerSelection(matchedAnswer);
      }
      return;
    }
    
    // Handle workflow search
    if (!workflowStarted) {
      setSearchingWorkflow(true);
      setIsLoading(true);
      
      const matchedAliases = await searchForWorkflow(userInput);
      
      if (matchedAliases.length === 1) {
        await loadWorkflowByAlias(matchedAliases[0]);
      } else if (matchedAliases.length > 1) {
        setPendingWorkflowChoices(matchedAliases);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I found ${matchedAliases.length} workflows that might help. Which one would you like to use?`,
          timestamp: new Date(),
          stepType: 'WorkflowChoice',
          answers: matchedAliases
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I couldn't find a workflow for that. Could you be more specific?",
          timestamp: new Date()
        }]);
      }
      
      setSearchingWorkflow(false);
      setIsLoading(false);
    }
  };

  const handleAnswerSelection = (answer: any) => {
    if (!currentStep) {
      console.warn('No current step when handling answer selection');
      return;
    }
    
    // Prevent double-clicking
    if (selectedAnswerId) {
      console.log('Answer already selected, ignoring');
      return;
    }
    
    console.log('Answer selected:', answer.text || answer.Prompt || answer.AnswerText);
    setSelectedAnswerId(answer.GUID);
    
    // Update the question message to show the selected answer
    setMessages(prev => prev.map(msg => {
      if (msg.id === currentStep.id) {
        return { ...msg, selectedAnswer: answer };
      }
      return msg;
    }));
    
    // Check for ServiceNow command in Execute property
    // Format: system.servicenow(Title,Description,Impact,Urgency)
    // where Impact and Urgency are 1-3 (low to high)
    if (answer.Execute && typeof answer.Execute === 'string' && answer.Execute.startsWith('system.servicenow')) {
      console.log('ServiceNow execute command found:', answer.Execute);
      
      // Parse the command - format: system.servicenow(Title,Description,Impact,Urgency)
      const match = answer.Execute.match(/system\.servicenow\(([^,]+),([^,]+),(\d),(\d)\)/);
      if (match) {
        const [, title, description, impact, urgency] = match;
        console.log('Parsed ServiceNow params:', { title, description, impact, urgency });
        
        // Interpolate variables in title and description
        const interpolatedTitle = interpolateText(title.trim());
        const interpolatedDescription = interpolateText(description.trim());
        
        setPrefilledTicketData({
          title: interpolatedTitle,
          description: interpolatedDescription,
          impact: impact,
          urgency: urgency
        });
        
        // Open the create ticket modal
        setShowCreateTicketModal(true);
      } else {
        console.warn('Failed to parse ServiceNow command:', answer.Execute);
      }
    }
    
    // Answer the question in workflow store
    answerQuestion(currentStep.id, answer.GUID);
    
    // DO NOT set currentStep to null here - let the workflow continue naturally
    // Only reset selectedAnswerId after a delay to prepare for next question
    setTimeout(() => {
      setSelectedAnswerId(null);
    }, 500);
  };

  const handleWorkflowChoice = async (workflow: any) => {
    setPendingWorkflowChoices([]);
    setCurrentStep(null);
    setDisplayedStepIds(new Set());
    
    const success = await loadWorkflowByAlias(workflow);
    if (!success) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I couldn't load that workflow. Please try again.",
        timestamp: new Date()
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E94B4B] rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Chat Support</h1>
                <p className="text-sm text-gray-500">Get instant help with your questions</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMessages([]);
                setInputValue('');
                setCurrentStep(null);
                setWorkflowStarted(false);
                setDisplayedStepIds(new Set());
                setPendingWorkflowChoices([]);
                setSelectedAnswerId(null);
                loadWorkflow({ WorkflowName: '', Steps: [] });
                fetchAliases();
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm text-gray-700"
              title="Start new conversation"
            >
              <RefreshCw className="h-4 w-4" />
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div key={`${message.id}-${index}`}>
            <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#E94B4B] flex items-center justify-center shadow-sm">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              <div className={`max-w-[75%] ${
                message.role === 'user' 
                  ? 'px-4 py-3 bg-[#0B2545] text-white rounded-2xl rounded-tr-sm shadow-sm' 
                  : message.role === 'system'
                  ? 'px-4 py-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200'
                  : 'px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
              }`}>
                <div 
                  className="text-sm leading-relaxed chat-message"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0B2545] to-[#1a3a5c] flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Answer buttons */}
            {message.stepType === 'Question' && message.answers && !message.selectedAnswer && (
              <div className="mt-3 ml-12 space-y-2">
                {message.answers.map((answer: any, idx: number) => (
                  <button
                    key={answer.GUID || idx}
                    onClick={() => handleAnswerSelection(answer)}
                    disabled={selectedAnswerId !== null}
                    className="block w-full text-left px-4 py-3 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#E94B4B] hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span dangerouslySetInnerHTML={{ __html: answer.text }} />
                  </button>
                ))}
              </div>
            )}
            
            {/* Selected answer */}
            {message.selectedAnswer && (
              <div className="mt-3 ml-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E94B4B]/10 border border-[#E94B4B]/30 rounded-lg text-sm">
                  <span className="text-[#E94B4B] font-medium">Selected:</span>
                  <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: message.selectedAnswer.text }} />
                </div>
              </div>
            )}
            
            {/* Workflow choices */}
            {message.stepType === 'WorkflowChoice' && message.answers && (
              <div className="mt-3 ml-12 space-y-2">
                {message.answers.map((workflow: any, idx: number) => (
                  <button
                    key={workflow.WorkflowUID || idx}
                    onClick={() => handleWorkflowChoice(workflow)}
                    className="block w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-[#E94B4B] hover:shadow-sm transition-all group"
                  >
                    <div className="font-medium text-gray-800 group-hover:text-[#E94B4B]">{workflow.WorkflowName}</div>
                    {workflow.AliasText && (
                      <div className="text-xs text-gray-500 mt-1">Alias: {workflow.AliasText}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#E94B4B] flex items-center justify-center shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="px-4 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={workflowStarted ? 'Type your response...' : 'What do you need help with?'}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E94B4B] focus:border-transparent text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-5 py-3 bg-[#E94B4B] text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {showCreateTicketModal && (
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
              content: '✅ Ticket created successfully!',
              timestamp: new Date()
            }]);
          }}
          prefilledData={prefilledTicketData}
        />
      )}
    </div>
  );
}