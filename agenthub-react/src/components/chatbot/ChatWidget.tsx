import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Send, Bot, User, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChatbotWorkflowStore } from '../../store/chatbotWorkflowStore';
import { useVariableStore, VariableType } from '../../store/variableStore';
import { OpenAIService } from '../../services/openai';

// Use the same API URL as the rest of the app (can be configured for Azure)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const API_KEY = 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  stepType?: string;
  answers?: any[];
  selectedAnswer?: any; // Track which answer was selected for questions
}

interface ChatWidgetProps {
  workflowId?: string;
  workflowAlias?: string;
  apiKey?: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  title?: string;
  placeholder?: string;
  welcomeMessage?: string;
  autoDetectWorkflow?: boolean; // Enable intelligent workflow detection
}

export function ChatWidget({
  workflowId,
  workflowAlias,
  apiKey,
  position = 'bottom-right',
  primaryColor = '#6366f1',
  title = 'AgentHub Assistant',
  placeholder = 'Type your message...',
  welcomeMessage = 'Hello! What can I help you with today?',
  autoDetectWorkflow = true
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [searchingWorkflow, setSearchingWorkflow] = useState(false);
  const [allAliases, setAllAliases] = useState<any[]>([]);
  const [pendingWorkflowChoices, setPendingWorkflowChoices] = useState<any[]>([]);
  const [displayedStepIds, setDisplayedStepIds] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingStepRef = useRef<string | null>(null);
  
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

  // Check if embedded
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbedded(params.get('embedded') === 'true');
  }, []);
  
  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0 && !workflowStarted) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, welcomeMessage, workflowStarted]);
  
  // Send minimize/maximize events to parent if embedded
  useEffect(() => {
    if (isEmbedded && window.parent !== window) {
      window.parent.postMessage({
        type: isMinimized ? 'minimize' : 'maximize'
      }, '*');
    }
  }, [isMinimized, isEmbedded]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load workflow when opened or fetch aliases for auto-detection
  useEffect(() => {
    if (isOpen && !workflowStarted) {
      if (workflowId || workflowAlias) {
        // Direct workflow specified - load it
        initializeWorkflow();
      } else if (autoDetectWorkflow && allAliases.length === 0) {
        // Auto-detect mode - fetch all aliases
        fetchAliases();
      }
    }
  }, [workflowId, workflowAlias, isOpen, autoDetectWorkflow]);

  // Monitor workflow steps and display them
  useEffect(() => {
    console.log('Rows updated:', rows.length, 'rows');
    console.log('DisplayedStepIds:', Array.from(displayedStepIds));
    console.log('Current processingStepRef:', processingStepRef.current);
    
    if (rows && rows.length > 0) {
      // Find the last unanswered visible row that hasn't been displayed yet
      const unansweredRows = rows.filter(row => {
        // Double-check the row has a unique ID
        if (!row.id) {
          console.warn('Row missing ID:', row);
          return false;
        }
        const isDisplayed = displayedStepIds.has(row.id);
        const isProcessing = processingStepRef.current === row.id;
        const isInMessages = messages.some(m => m.id === row.id);
        
        console.log(`Row ${row.id} - answered: ${row.answered}, visible: ${row.visible}, displayed: ${isDisplayed}, processing: ${isProcessing}, inMessages: ${isInMessages}`);
        
        return !row.answered && 
          row.visible && 
          !isDisplayed &&
          !isProcessing &&
          !isInMessages;
      });
      console.log('Unanswered rows not yet displayed:', unansweredRows.length);
      
      if (unansweredRows.length > 0) {
        // Display the first unanswered row (in order)
        const currentRow = unansweredRows[0];
        console.log('Will display row:', currentRow.id, 'Type:', currentRow.step.StepType, 'Prompt:', currentRow.step.Prompt?.substring(0, 50));
        processingStepRef.current = currentRow.id;
        
        // Add minimal delay for first step, longer for subsequent ones
        const isFirstStep = displayedStepIds.size === 0;
        const messageLength = currentRow.step.Prompt?.length || 0;
        const delay = isFirstStep ? 100 : Math.min(800 + (messageLength * 5), 2000);
        
        // Show typing indicator during the delay
        if (delay > 100) {
          setIsTyping(true);
        }
        
        console.log(`Setting timeout for ${delay}ms to display step`);
        setTimeout(() => {
          console.log('Timeout fired, displaying step:', currentRow.id);
          setIsTyping(false);
          displayWorkflowStep(currentRow);
        }, delay);
      }
    }
  }, [rows, displayedStepIds, messages]);

  const fetchAliases = async () => {
    try {
      const response = await fetch(`${API_URL}/aliases`, {
        headers: {
          'x-api-key': API_KEY
        }
      });
      
      if (response.ok) {
        const aliases = await response.json();
        // Filter out aliases without workflow names
        const validAliases = aliases.filter((a: any) => a.WorkflowName && a.WorkflowName !== null);
        setAllAliases(validAliases);
        console.log(`Loaded ${validAliases.length} valid workflow aliases (filtered from ${aliases.length} total)`);
      }
    } catch (error) {
      console.error('Failed to fetch aliases:', error);
    }
  };
  
  const searchForWorkflow = async (userInput: string) => {
    if (!allAliases || allAliases.length === 0) return [];
    
    try {
      // Prepare the list of available workflows for the LLM
      const workflowList = allAliases.map((alias, index) => 
        `${index + 1}. "${alias.AliasText}" - ${alias.WorkflowName}`
      ).join('\n');
      
      const systemPrompt = `You are a workflow matcher. Given a user's request and a list of available workflows with their aliases, identify which workflows might match their intent.

IMPORTANT: The ALIAS (first part in quotes) is what users typically type or ask about. Match primarily against the alias text, not just the workflow name.

Available workflows:
${workflowList}

Return up to 3 best matching workflows as comma-separated numbers (e.g., "1,3,5"), or "none" if no workflows match.
Order them by relevance, with the best match first.

Matching rules:
1. First check if the user's request matches any ALIAS text (the part in quotes)
2. Then check if it matches the workflow name
3. Look for semantic matches, not just exact word matches
4. Consider synonyms and related terms (price/cost/fee, how much/what's the price/cost of)

Examples:
- "I wonder if I can get an irish passport" → matches alias "irish passport"
- "Seans Customer Service" or "customer service" → matches alias "Seans Customer Service"
- "check snap eligibility" → matches alias "snap-eligibility"
- "food stamps", "food assistance", "EBT", "SNAP benefits" → matches alias "snap-eligibility"
- "am I eligible for food stamps" → matches alias "snap-eligibility" (semantic match)
- "how much is an MRI", "MRI price", "cost of MRI scan" → matches alias "MRI Cost Estimation"
- "what does an MRI cost", "MRI fees", "price for MRI" → matches alias "MRI Cost Estimation"
- Any request about passports from Ireland → matches alias "irish passport"

IMPORTANT CONTEXT:
- "SNAP" stands for Supplemental Nutrition Assistance Program (formerly food stamps)
- Match any queries about food assistance, food stamps, EBT, or nutritional aid to SNAP-related workflows
- For pricing questions, match variations like "how much is", "what's the price", "cost of", "fees for", etc.
- Be flexible with word order and phrasing - "how much is an MRI" = "MRI cost" = "price of MRI"`;

      const response = await OpenAIService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.1, // Low temperature for more deterministic matching
        apiKey: import.meta.env.VITE_OPENAI_API_KEY
      });
      
      const matchNumbers = response.content.trim().toLowerCase();
      
      if (matchNumbers === 'none') {
        console.log('LLM found no matching workflows for:', userInput);
        return [];
      }
      
      // Parse the comma-separated list of numbers
      const matches = [];
      const numbers = matchNumbers.split(',').map(n => n.trim());
      
      for (const num of numbers) {
        const index = parseInt(num) - 1;
        if (!isNaN(index) && index >= 0 && index < allAliases.length) {
          matches.push(allAliases[index]);
        }
      }
      
      if (matches.length > 0) {
        console.log(`LLM found ${matches.length} matches for "${userInput}":`, matches.map(m => m.WorkflowName).join(', '));
      }
      
      return matches;
      
    } catch (error) {
      console.error('LLM workflow matching failed, falling back to keyword search:', error);
      
      // Fallback to simple keyword matching if LLM fails
      const lowercaseInput = userInput.toLowerCase().trim();
      
      // Extract meaningful words from input (ignore common words)
      const commonWords = ['i', 'can', 'get', 'a', 'an', 'the', 'my', 'wonder', 'if', 'want', 'need', 'like', 'would', 'could', 'should', 'to', 'for', 'with', 'about', 'help', 'me'];
      const words = lowercaseInput.split(/[\s-]+/).filter(word => 
        word.length > 2 && !commonWords.includes(word)
      );
      
      if (words.length === 0) return [];
      
      // Score all aliases
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
      
      // Sort by score and return top 3
      scoredAliases.sort((a, b) => b.score - a.score);
      const topMatches = scoredAliases.slice(0, 3).map(item => item.alias);
      
      if (topMatches.length > 0) {
        console.log(`Fallback found ${topMatches.length} matches:`, topMatches.map(m => m.WorkflowName).join(', '));
      }
      
      return topMatches;
    }
  };
  
  const loadWorkflowByAlias = async (matchedAlias: any) => {
    setSearchingWorkflow(true);
    try {
      if (!matchedAlias || !matchedAlias.WorkflowName) {
        throw new Error('Workflow not found');
      }
      
      console.log('Searching for workflow by name:', matchedAlias.WorkflowName);
      
      // Use the search endpoint to find workflow by exact name
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
      
      // Load the workflow
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
      
      // Clear all state before starting new workflow
      setDisplayedStepIds(new Set());
      setCurrentStep(null);
      processingStepRef.current = null;
      
      // Add workflow-specific welcome with unique ID BEFORE loading workflow
      const welcomeId = `welcome-${Date.now()}-${Math.random()}`;
      setMessages(prev => [...prev, {
        id: welcomeId,
        role: 'assistant',
        content: `Great! I'll help you with ${workflow.WorkflowName}. Let me guide you through the process.`,
        timestamp: new Date()
      }]);
      
      // Small delay to ensure welcome message is rendered first
      setTimeout(() => {
        console.log('Loading workflow after welcome message');
        loadWorkflow(workflow);
        // Don't call startNewSession here - it clears the rows!
        // The loadWorkflow function already initializes everything we need
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
  
  const initializeWorkflow = async () => {
    if (!workflowId && !workflowAlias) return;
    
    setIsLoading(true);
    try {
      let workflowData;
      
      if (workflowAlias) {
        // First, fetch aliases to find the workflow name
        const aliasResponse = await fetch(`${API_URL}/aliases`, {
          headers: {
            'x-api-key': API_KEY
          }
        });
        
        if (!aliasResponse.ok) {
          throw new Error('Failed to fetch aliases');
        }
        
        const aliases = await aliasResponse.json();
        const matchedAlias = aliases.find((a: any) => 
          a.AliasText?.toLowerCase() === workflowAlias.toLowerCase()
        );
        
        if (!matchedAlias || !matchedAlias.WorkflowName) {
          throw new Error(`No workflow found with alias: ${workflowAlias}`);
        }
        
        // Now fetch all workflows and find the one with matching name
        const workflowsResponse = await fetch(`${API_URL}/workflows`, {
          headers: {
            'x-api-key': API_KEY
          }
        });
        
        if (!workflowsResponse.ok) {
          throw new Error('Failed to fetch workflows');
        }
        
        const workflows = await workflowsResponse.json();
        const matchedWorkflow = workflows.find((w: any) => 
          w.WorkflowName === matchedAlias.WorkflowName
        );
        
        if (!matchedWorkflow) {
          throw new Error(`No workflow found with name: ${matchedAlias.WorkflowName}`);
        }
        
        // Now fetch the full workflow data using the ID
        const response = await fetch(`http://localhost:4000/api/workflows/${matchedWorkflow.WorkflowUID}`, {
          headers: {
            'x-api-key': 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch workflow');
        }
        
        workflowData = await response.json();
      } else {
        // Fetch the workflow directly by ID
        const response = await fetch(`${API_URL}/workflows/${workflowId}`, {
          headers: {
            'x-api-key': API_KEY
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch workflow');
        }
        
        workflowData = await response.json();
      }
      
      // Transform the workflow data to match expected structure
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
      setCurrentStep(null);
      processingStepRef.current = null;
      
      // Load the workflow into the store
      loadWorkflow(workflow);
      // Don't call startNewSession here - it clears the rows that loadWorkflow just added!
      setWorkflowStarted(true);
      
      // Clear previous messages and add workflow-specific welcome with unique ID
      const welcomeId = `init-welcome-${Date.now()}-${Math.random()}`;
      setMessages([{
        id: welcomeId,
        role: 'assistant',
        content: `Let me help you with ${workflow.WorkflowName}. I'll guide you through the process step by step.`,
        timestamp: new Date()
      }]);
      
      // Don't call processNextStep here - let the workflow store handle it
      // The loadWorkflow function should trigger processing
    } catch (error) {
      console.error('Failed to load workflow:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I couldn\'t load the workflow. Please try again later.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
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
    processingStepRef.current = null;
    
    setCurrentStep(row);
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
      
      // Question steps wait for user selection - DO NOT auto-continue
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
      
      // UserInstruction steps don't need to auto-continue
      // The workflow store will handle the next step automatically
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
      
      // NotesBlock steps don't need to auto-continue
      // The workflow store will handle the next step automatically
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
      
      // Collect steps need user input - DO NOT auto-continue
      // The user will type their response in the input field
      // Mark that we're waiting for input
      console.log('Collect step displayed, waiting for user input');
    } else {
      // For any other step type
      console.log('Unknown step type or missing prompt:', stepType);
      // Don't auto-continue - let the workflow store handle it
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
    setInputValue('');
    
    // Handle Collect steps
    if (currentStep?.step?.StepType?.toLowerCase() === 'collect') {
      console.log('Processing collect step response:', inputValue.trim());
      // For collect steps, store the value and continue
      handleCollectValue(inputValue.trim());
      return;
    }
    
    // If we have a current question step, try to match the answer
    if (currentStep?.step?.StepType?.toLowerCase() === 'question') {
      const answers = currentStep.step.Answers || [];
      
      // Try to find matching answer (case-insensitive)
      const userInput = inputValue.trim().toLowerCase();
      let matchedAnswer = answers.find((a: any) => 
        (a.Prompt || a.AnswerText || '').toLowerCase() === userInput
      );
      
      // If no exact match, try partial match or use first answer as default
      if (!matchedAnswer) {
        matchedAnswer = answers.find((a: any) => 
          (a.Prompt || a.AnswerText || '').toLowerCase().includes(userInput) ||
          userInput.includes((a.Prompt || a.AnswerText || '').toLowerCase())
        );
      }
      
      if (matchedAnswer) {
        // Answer the question with matched answer
        handleAnswerSelection(matchedAnswer);
      } else if (answers.length > 0) {
        // No match found, ask user to select from available options
        const optionsList = answers.map((a: any, i: number) => 
          `${i + 1}. ${a.Prompt || a.AnswerText || ''}`
        ).join('\n');
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Please select one of the following options:\n${optionsList}`,
          timestamp: new Date()
        }]);
      }
    } else if (!workflowStarted) {
      if (workflowId || workflowAlias) {
        // Start specific workflow
        initializeWorkflow();
      } else if (autoDetectWorkflow) {
        // Try to find matching workflows
        setSearchingWorkflow(true);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Let me find the right workflow to help you with that...',
          timestamp: new Date()
        }]);
        
        const matchedAliases = await searchForWorkflow(inputValue.trim());
        
        if (matchedAliases.length === 1) {
          // Single match - load it directly
          const success = await loadWorkflowByAlias(matchedAliases[0]);
          if (!success) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "I'm sorry, I couldn't load that workflow. Please try describing what you need help with differently.",
              timestamp: new Date()
            }]);
          }
        } else if (matchedAliases.length > 1) {
          // Multiple matches - present as options
          setPendingWorkflowChoices(matchedAliases);
          
          const optionsList = matchedAliases.map((alias, index) => 
            `${index + 1}. ${alias.WorkflowName}`
          ).join('\n');
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `I found a few workflows that might help. Which one would you like to use?\n\n${optionsList}\n\nClick on the option that best matches what you need.`,
            timestamp: new Date(),
            stepType: 'WorkflowChoice',
            answers: matchedAliases
          }]);
        } else {
          // No matches found
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I'm sorry, I couldn't find a workflow that matches what you're looking for. Could you please be more specific about what you need help with?",
            timestamp: new Date()
          }]);
        }
        
        setSearchingWorkflow(false);
      }
    }
  };

  const handleWorkflowChoice = async (workflow: any) => {
    // Clear the pending choices and reset state
    setPendingWorkflowChoices([]);
    setCurrentStep(null);
    processingStepRef.current = null;
    setDisplayedStepIds(new Set()); // Clear displayed steps
    
    // Load the selected workflow
    const success = await loadWorkflowByAlias(workflow);
    if (!success) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't load that workflow. Please try again.",
        timestamp: new Date()
      }]);
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
    
    // Set variable if specified
    if (answer.VariableName && answer.VariableValue !== undefined) {
      console.log('Setting variable from answer:', answer.VariableName, '=', answer.VariableValue);
      setVariable(
        answer.VariableName,
        answer.VariableValue,
        VariableType.WorkflowVariable
      );
    }
    
    // Answer the question in workflow store
    answerQuestion(currentStep.id, answer.GUID);
    
    // Clear current step to prevent duplicate processing
    setCurrentStep(null);
    
    // Reset selected answer for next question
    setTimeout(() => {
      setSelectedAnswerId(null);
    }, 500);
    
    // The workflow store will automatically handle the next step
    console.log('Answer selected, workflow will handle next step');
  };
  
  const handleCollectValue = async (value: string) => {
    if (!currentStep) {
      console.error('No current step when handling collect value');
      return;
    }
    
    console.log('Handling collect value for step:', currentStep.id, 'Value:', value);
    
    // Use LLM to extract the actual value from conversational input
    let extractedValue = value;
    
    try {
      // Determine what we're asking for based on the prompt
      const prompt = currentStep.step.Prompt || '';
      
      console.log('=== LLM Extraction Request ===');
      console.log('Question asked:', prompt);
      console.log('User response:', value);
      
      const extractionPrompt = `You are a data extractor. The user was asked: "${prompt}"
      
The user responded with: "${value}"

Extract the requested information. If it's a simple direct answer (like just a name, number, or email), return it as-is.
Only return "INVALID_RESPONSE" if the user is clearly refusing, avoiding the question, or providing completely unrelated information.

Examples:
- Asked: "Please enter your first name" Response: "Sean" -> Extract: "Sean"
- Asked: "Please enter your first name" Response: "It's Sean" -> Extract: "Sean"
- Asked: "What is your name?" Response: "John" -> Extract: "John"
- Asked: "What is your email?" Response: "john@example.com" -> Extract: "john@example.com"
- Asked: "What is your email?" Response: "My email is john@example.com" -> Extract: "john@example.com"
- Asked: "Enter your age" Response: "25" -> Extract: "25"
- Asked: "Enter your age" Response: "I am 25 years old" -> Extract: "25"
- Asked: "Enter your phone number" Response: "555-1234" -> Extract: "555-1234"
- Asked: "Enter your name" Response: "I don't want to tell you" -> Extract: "INVALID_RESPONSE"
- Asked: "What is your email?" Response: "Why do you need that?" -> Extract: "INVALID_RESPONSE"
- Asked: "Enter your age" Response: "none of your business" -> Extract: "INVALID_RESPONSE"

Return ONLY the extracted value or "INVALID_RESPONSE", nothing else.`;

      console.log('Full prompt being sent to LLM:');
      console.log(extractionPrompt);
      console.log('==============================');

      const response = await OpenAIService.chat({
        messages: [
          { role: 'system', content: extractionPrompt }
        ],
        temperature: 0.1,
        apiKey: import.meta.env.VITE_OPENAI_API_KEY
      });
      
      extractedValue = response.content.trim();
      console.log('LLM extracted value:', extractedValue, 'from:', value);
      
      // Check if the LLM couldn't extract valid information
      if (extractedValue === 'INVALID_RESPONSE') {
        // Ask the user to provide the information again
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I couldn't find the information I need in your response. Could you please provide just the ${currentStep.step.Prompt?.toLowerCase().includes('name') ? 'name' : 
                   currentStep.step.Prompt?.toLowerCase().includes('email') ? 'email address' :
                   currentStep.step.Prompt?.toLowerCase().includes('phone') ? 'phone number' :
                   currentStep.step.Prompt?.toLowerCase().includes('age') ? 'age' :
                   'requested information'}?`,
          timestamp: new Date()
        }]);
        
        // Don't proceed - wait for another response
        return;
      }
    } catch (error) {
      console.error('Failed to extract value with LLM, using original:', error);
      // Fall back to using the original value if LLM fails
    }
    
    // Set variable if specified in the step
    if (currentStep.step.VariableName) {
      console.log('Setting variable:', currentStep.step.VariableName, '=', extractedValue);
      setVariable(
        currentStep.step.VariableName,
        extractedValue,
        VariableType.WorkflowVariable
      );
    }
    
    // Collect the value in workflow store
    collectValue(currentStep.id, extractedValue);
    
    // Clear current step
    setCurrentStep(null);
    
    // The workflow store will automatically handle the next step
    console.log('Collect value saved, workflow will handle next step');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 p-4 rounded-full shadow-lg",
          "bg-gradient-to-r from-indigo-600 to-purple-600",
          "hover:from-indigo-700 hover:to-purple-700",
          "transition-all hover:scale-110",
          positionClasses
        )}
        style={{ backgroundColor: primaryColor }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col rounded-lg shadow-2xl transition-all",
        isMinimized ? "bg-transparent" : "bg-white",
        "w-96",
        positionClasses,
        isMinimized ? "h-14" : "h-[600px]"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-4 border-b rounded-lg",
          isMinimized && "border-0"
        )}
        style={{ background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Reset conversation without closing
              setMessages([]);
              setInputValue('');
              setCurrentStep(null);
              setWorkflowStarted(false);
              setDisplayedStepIds(new Set());
              processingStepRef.current = null;
              setPendingWorkflowChoices([]);
              setIsTyping(false);
              setSelectedAnswerId(null);
              
              // Clear workflow by loading an empty workflow
              loadWorkflow({ WorkflowName: '', Steps: [] });
              
              // Re-add welcome message if auto-detect is enabled
              if (autoDetectWorkflow) {
                setMessages([{
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: welcomeMessage,
                  timestamp: new Date()
                }]);
              }
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Restart conversation"
          >
            <RefreshCw className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => {
              // Reset all chat state when closing
              setIsOpen(false);
              setIsMinimized(false);
              setMessages([]);
              setInputValue('');
              setCurrentStep(null);
              setWorkflowStarted(false);
              setDisplayedStepIds(new Set());
              processingStepRef.current = null;
              setPendingWorkflowChoices([]);
              setIsTyping(false);
              setSelectedAnswerId(null);
              
              // Clear workflow by loading an empty workflow
              loadWorkflow({ WorkflowName: '', Steps: [] });
              
              // Will re-initialize with welcome message when reopened
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.id}-${index}`}>
                <div
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] p-3 rounded-lg",
                      message.role === 'user'
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div 
                        className="text-sm prose prose-sm max-w-none prose-ul:ml-4 prose-li:ml-0"
                        dangerouslySetInnerHTML={{ __html: message.content }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Show answer buttons for questions */}
                {message.stepType === 'Question' && message.answers && message.answers.length > 0 && (
                  <div className="mt-3 ml-10 space-y-2">
                    {message.selectedAnswer ? (
                      // Show the selected answer as a label
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-100 border border-indigo-500 rounded-lg text-sm">
                        <span className="text-indigo-700 font-medium">Selected:</span>
                        <span className="text-gray-700">{message.selectedAnswer.text || message.selectedAnswer.Prompt}</span>
                      </div>
                    ) : (
                      // Show answer buttons if not yet selected
                      message.answers.map((answer: any, index: number) => (
                        <button
                          key={answer.GUID || index}
                          onClick={() => handleAnswerSelection(answer)}
                          disabled={selectedAnswerId !== null}
                          className={cn(
                            "block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                            selectedAnswerId === null
                              ? "bg-white border border-gray-300 hover:bg-gray-50 hover:border-indigo-500"
                              : selectedAnswerId === answer.GUID
                              ? "bg-indigo-100 border border-indigo-500 cursor-not-allowed"
                              : "bg-gray-100 border border-gray-200 cursor-not-allowed opacity-50"
                          )}
                        >
                          {answer.text}
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Show workflow choice buttons */}
                {message.stepType === 'WorkflowChoice' && message.answers && message.answers.length > 0 && (
                  <div className="mt-3 ml-10 space-y-2">
                    {message.answers.map((workflow: any, index: number) => (
                      <button
                        key={workflow.WorkflowUID || index}
                        onClick={() => handleWorkflowChoice(workflow)}
                        className="block w-full text-left px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 rounded-lg hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-500 transition-all"
                      >
                        <div className="font-medium text-gray-800">{workflow.WorkflowName}</div>
                        {workflow.AliasText && (
                          <div className="text-xs text-gray-600 mt-1">Alias: {workflow.AliasText}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={workflowStarted ? 'Type your response...' : 'What do you need help with?'}
                disabled={isLoading}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  "p-2 rounded-lg text-white transition-colors",
                  "bg-gradient-to-r from-indigo-600 to-purple-600",
                  "hover:from-indigo-700 hover:to-purple-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}