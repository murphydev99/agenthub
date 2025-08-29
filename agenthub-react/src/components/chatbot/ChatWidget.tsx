import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Send, Bot, User, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useChatbotWorkflowStore } from '../../store/chatbotWorkflowStore';
import { useVariableStore, VariableType } from '../../store/variableStore';
import { OpenAIService } from '../../services/openai';
import { vectorStore } from '../../services/vectorStore';

// Use environment variables for API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa';

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
  domainToken?: string; // Domain-restricted token for embedded use
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
  domainToken,
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
  const [dataLoaded, setDataLoaded] = useState(false); // Track if initial data is loaded
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  
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

  // Check if embedded
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbedded(params.get('embedded') === 'true');
  }, []);
  
  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0 && !workflowStarted) {
      // Show loading message if auto-detect is enabled and data isn't loaded yet
      const message = autoDetectWorkflow && !dataLoaded 
        ? `${welcomeMessage}\n\n⏳ Loading available workflows...`
        : welcomeMessage;
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: message,
        timestamp: new Date()
      }]);
    } else if (isOpen && autoDetectWorkflow && dataLoaded && !workflowStarted && messages.length === 1) {
      // Update the initial message once data has loaded
      const firstMessage = messages[0];
      if (firstMessage && firstMessage.content.includes('⏳ Loading available workflows...')) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }]);
      }
    }
  }, [isOpen, welcomeMessage, workflowStarted, autoDetectWorkflow, dataLoaded, messages]);
  
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

  // Preload aliases immediately on mount for auto-detection mode
  useEffect(() => {
    if (autoDetectWorkflow && allAliases.length === 0 && !dataLoaded) {
      fetchAliases();
    }
  }, [autoDetectWorkflow]);

  // Load workflow when opened
  useEffect(() => {
    if (isOpen && !workflowStarted && dataLoaded) {
      if (workflowId || workflowAlias) {
        // Direct workflow specified - load it
        initializeWorkflow();
      }
    }
  }, [workflowId, workflowAlias, isOpen, dataLoaded]);

  // Monitor workflow steps and display them
  useEffect(() => {
    console.log('Rows updated:', rows.length, 'rows');
    console.log('DisplayedStepIds:', Array.from(displayedStepIds));
    
    if (rows && rows.length > 0) {
      // Find ALL unanswered visible rows that haven't been displayed yet
      const pendingRows = rows.filter(row => {
        if (!row.id) {
          console.warn('Row missing ID:', row);
          return false;
        }
        const isDisplayed = displayedStepIds.has(row.id) || messages.some(m => m.id === row.id);
        
        console.log(`Row ${row.id} - answered: ${row.answered}, visible: ${row.visible}, displayed: ${isDisplayed}`);
        
        return !row.answered && row.visible && !isDisplayed;
      });
      
      console.log('Pending rows to display:', pendingRows.length);
      
      // Process all pending rows sequentially with appropriate delays
      let cumulativeDelay = 0;
      pendingRows.forEach((row, index) => {
        const stepType = row.step?.StepType?.toLowerCase();
        const isFirstStep = displayedStepIds.size === 0 && index === 0;
        
        // Calculate delay based on step type
        let delay = 0;
        if (!isFirstStep) {
          if (stepType === 'userinstruction' || stepType === 'notesblock') {
            // Non-interactive steps get a shorter delay
            delay = 800;
          } else {
            // Interactive steps (question, collect) get normal delay
            const messageLength = row.step.Prompt?.length || 0;
            delay = Math.min(800 + (messageLength * 5), 1500);
          }
        } else {
          delay = 100; // First step shows quickly
        }
        
        const totalDelay = cumulativeDelay + delay;
        
        console.log(`Scheduling ${stepType} step ${row.id} with delay ${totalDelay}ms`);
        
        setTimeout(() => {
          console.log('Displaying step:', row.id, 'Type:', stepType);
          displayWorkflowStep(row);
        }, totalDelay);
        
        cumulativeDelay = totalDelay;
      });
    }
  }, [rows]); // Only depend on rows changing, not displayedStepIds or messages

  // Helper function to get API headers with domain token if provided
  const getApiHeaders = () => {
    const headers: any = {
      'x-api-key': API_KEY,  // Always use the API_KEY for authentication
      'Content-Type': 'application/json'
    };
    
    // Add domain token if provided (for embedded use with chatbot endpoints)
    if (domainToken) {
      headers['x-domain-token'] = domainToken;
    }
    
    console.log('Request headers:', headers);  // Debug logging
    return headers;
  };

  const fetchAliases = async () => {
    try {
      // Always fetch fresh data - no caching
      const endpoint = domainToken ? `${API_URL}/chatbot/aliases` : `${API_URL}/aliases`;
      const response = await fetch(endpoint, {
        headers: getApiHeaders()
      });
      
      if (response.ok) {
        const aliases = await response.json();
        // Filter out aliases without workflow names
        const validAliases = aliases.filter((a: any) => a.WorkflowName && a.WorkflowName !== null);
        
        setAllAliases(validAliases);
        setDataLoaded(true);
        console.log(`Loaded ${validAliases.length} valid workflow aliases (filtered from ${aliases.length} total)`);
        
        // Initialize vector store with aliases
        if (import.meta.env.VITE_OPENAI_API_KEY) {
          vectorStore.initialize(validAliases, import.meta.env.VITE_OPENAI_API_KEY)
            .then(() => console.log('Vector store initialized'))
            .catch(err => console.error('Failed to initialize vector store:', err));
        }
      } else {
        throw new Error('Failed to fetch aliases');
      }
    } catch (error) {
      console.error('Failed to fetch aliases:', error);
      setInitialLoadError('Failed to load chatbot data. Please refresh the page.');
      setDataLoaded(true); // Mark as loaded even on error to prevent infinite loading
    }
  };
  
  const searchForWorkflow = async (userInput: string) => {
    if (!allAliases || allAliases.length === 0) return [];
    
    try {
      // Filter to only valid workflows first
      const validAliases = allAliases.filter(a => a.WorkflowName && a.WorkflowName !== 'null');
      console.log(`Searching among ${validAliases.length} valid workflows for: "${userInput}"`);
      
      // Extract key terms from user input
      const lowerInput = userInput.toLowerCase();
      const inputWords = lowerInput.split(/\s+/).filter(w => w.length > 2);
      
      // Score each workflow based on relevance
      const scoredAliases = validAliases.map(alias => {
        const aliasLower = (alias.AliasText || '').toLowerCase();
        const workflowLower = (alias.WorkflowName || '').toLowerCase();
        const combined = aliasLower + ' ' + workflowLower;
        let score = 0;
        
        // Exact alias match gets highest score
        if (aliasLower === lowerInput) {
          score += 1000;
        }
        
        // Extract meaningful words (not common words)
        const commonWords = new Set(['the', 'a', 'an', 'how', 'what', 'does', 'much', 'help', 'with', 'need', 'get', 'can', 'i', 'my', 'for', 'is']);
        const meaningfulInputWords = inputWords.filter(w => !commonWords.has(w));
        
        // Count how many meaningful words match
        let matchedWords = new Set<string>();
        for (const word of meaningfulInputWords) {
          if (combined.includes(word)) {
            matchedWords.add(word);
          }
        }
        
        // Calculate match percentage
        const matchPercentage = meaningfulInputWords.length > 0 
          ? matchedWords.size / meaningfulInputWords.length 
          : 0;
        
        // Base score on match percentage
        score += matchPercentage * 100;
        
        // Extra points for each matched word (longer = more specific)
        matchedWords.forEach(word => {
          // More points if word appears in alias vs just workflow name
          if (aliasLower.includes(word)) {
            score += word.length * 5;
          } else if (workflowLower.includes(word)) {
            score += word.length * 2;
          }
        });
        
        // Check for bigram/phrase matches (two words together)
        for (let i = 0; i < meaningfulInputWords.length - 1; i++) {
          const bigram = meaningfulInputWords[i] + ' ' + meaningfulInputWords[i + 1];
          if (combined.includes(bigram)) {
            score += 50; // Matching phrases is very important
          }
        }
        
        // Penalize partial matches that might be misleading
        // e.g., "cost" matching "Cost Estimation" when looking for "MRI cost"
        if (matchedWords.size === 1 && meaningfulInputWords.length >= 2) {
          score = score * 0.5;
        }
        
        return { ...alias, score };
      });
      
      // Sort by score and get top matches
      scoredAliases.sort((a, b) => b.score - a.score);
      
      // Always use LLM for final decision, but provide scoring hints
      console.log(`Scored ${scoredAliases.filter(a => a.score > 0).length} workflows, sending to LLM for final selection`);
      
      // Prepare workflow list with scoring hints for the LLM
      // Include ALL workflows but organize by score
      const highScored = scoredAliases.filter(a => a.score >= 50).slice(0, 15);
      const mediumScored = scoredAliases.filter(a => a.score > 0 && a.score < 50).slice(0, 15);
      const zeroScored = scoredAliases.filter(a => a.score === 0);
      
      // For zero-scored items, prioritize those with relevant keywords
      const relevantKeywords = ['snap', 'food', 'stamp', 'ebt', 'nutrition', 'mri', 'irish', 'passport', 'customer', 'service'];
      const possiblyRelevant = [];
      const others = [];
      
      for (const alias of zeroScored) {
        const aliasLower = (alias.AliasText || '').toLowerCase();
        const hasRelevantKeyword = relevantKeywords.some(keyword => aliasLower.includes(keyword));
        if (hasRelevantKeyword) {
          possiblyRelevant.push(alias);
        } else {
          others.push(alias);
        }
      }
      
      let workflowList = '';
      let currentIndex = 1;
      const indexedAliases: any[] = [];
      
      if (highScored.length > 0) {
        workflowList += 'LIKELY MATCHES (high keyword score):\n';
        highScored.forEach(alias => {
          workflowList += `${currentIndex}. "${alias.AliasText}" - ${alias.WorkflowName}\n`;
          indexedAliases.push(alias);
          currentIndex++;
        });
      }
      
      if (mediumScored.length > 0) {
        workflowList += '\nPOSSIBLE MATCHES (some keywords matched):\n';
        mediumScored.forEach(alias => {
          workflowList += `${currentIndex}. "${alias.AliasText}" - ${alias.WorkflowName}\n`;
          indexedAliases.push(alias);
          currentIndex++;
        });
      }
      
      // Always include possibly relevant zero-scored items
      if (possiblyRelevant.length > 0) {
        workflowList += '\nCHECK THESE (no keyword match but might be semantically relevant):\n';
        possiblyRelevant.slice(0, 30).forEach(alias => {
          workflowList += `${currentIndex}. "${alias.AliasText}" - ${alias.WorkflowName}\n`;
          indexedAliases.push(alias);
          currentIndex++;
        });
      }
      
      // Include a sample of other workflows
      if (others.length > 0 && currentIndex < 50) {
        workflowList += '\nOTHER WORKFLOWS:\n';
        others.slice(0, Math.min(10, 50 - currentIndex)).forEach(alias => {
          workflowList += `${currentIndex}. "${alias.AliasText}" - ${alias.WorkflowName}\n`;
          indexedAliases.push(alias);
          currentIndex++;
        });
      }
      
      const systemPrompt = `You are an intelligent workflow matcher. The user needs help finding the right workflow for their request.

The workflows are organized in sections based on keyword matching scores:
- LIKELY MATCHES: These workflows had strong keyword matches
- POSSIBLE MATCHES: These had some keyword matches
- OTHER AVAILABLE WORKFLOWS: These had no keyword matches but might still be semantically relevant

IMPORTANT CONTEXT:
- "SNAP" = Supplemental Nutrition Assistance Program = food stamps = EBT = food assistance
- Consider semantic meaning, not just keywords
- A workflow about "SNAP Eligibility" should match queries about "food stamps" even if those exact words don't appear
- Similarly, "MRI Cost Estimation" should match "how much does an MRI cost"

User's request: "${userInput}"

Available workflows:
${workflowList}

TASK:
1. Review ALL sections, not just the likely matches
2. Consider semantic meaning and user intent
3. Check if any workflows in the "OTHER" section might actually be the best match
4. Return the 1-3 most relevant workflow numbers

OUTPUT:
Return ONLY the numbers as comma-separated values (e.g., "1,3,5")
Return "none" if no workflows match
The numbers should be ordered by relevance with the best match first`;

      const response = await OpenAIService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        // temperature: 1 is the default and only supported value for this model
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
      
      // Note: We're now using indexedAliases which contains the exact items shown to the LLM
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
      
      // Use chatbot-specific search endpoint if domain token is provided
      const searchEndpoint = domainToken 
        ? `${API_URL}/chatbot/workflows/search?query=${encodeURIComponent(matchedAlias.WorkflowName)}`
        : `${API_URL}/workflows/search?query=${encodeURIComponent(matchedAlias.WorkflowName)}`;
      
      const searchResponse = await fetch(searchEndpoint, {
        headers: getApiHeaders()
      });
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 401 || searchResponse.status === 403) {
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            role: 'system',
            content: '🔒 Authorization Error: The chatbot token is invalid or expired. Please check your configuration or contact support for a new token.',
            timestamp: new Date()
          }]);
          throw new Error('Authorization failed');
        }
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
      
      // Use chatbot-specific endpoint if domain token is provided
      const workflowEndpoint = domainToken 
        ? `${API_URL}/chatbot/workflows/${matchedWorkflow.WorkflowUID}`
        : `${API_URL}/workflows/${matchedWorkflow.WorkflowUID}`;
      
      const response = await fetch(workflowEndpoint, {
        headers: getApiHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Show authorization error in chat
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            role: 'system',
            content: '🔒 Authorization Error: The chatbot token is invalid or expired. Please check your configuration or contact support for a new token.',
            timestamp: new Date()
          }]);
          throw new Error('Authorization failed');
        }
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
      
      // Add workflow-specific welcome with unique ID BEFORE loading workflow
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
        // Use chatbot-specific endpoint if domain token is provided
        const aliasEndpoint = domainToken ? `${API_URL}/chatbot/aliases` : `${API_URL}/aliases`;
        const aliasResponse = await fetch(aliasEndpoint, {
          headers: getApiHeaders()
        });
        
        if (!aliasResponse.ok) {
          if (aliasResponse.status === 401 || aliasResponse.status === 403) {
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              role: 'system',
              content: '🔒 Authorization Error: The chatbot token is invalid, expired, or not authorized for this domain. Please check your configuration.',
              timestamp: new Date()
            }]);
            throw new Error('Authorization failed');
          }
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
        // Use chatbot-specific endpoint if domain token is provided
        const workflowsEndpoint = domainToken ? `${API_URL}/chatbot/workflows` : `${API_URL}/workflows`;
        const workflowsResponse = await fetch(workflowsEndpoint, {
          headers: getApiHeaders()
        });
        
        if (!workflowsResponse.ok) {
          if (workflowsResponse.status === 401 || workflowsResponse.status === 403) {
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              role: 'system',
              content: '🔒 Authorization Error: The chatbot token is invalid, expired, or not authorized for this domain. Please check your configuration.',
              timestamp: new Date()
            }]);
            throw new Error('Authorization failed');
          }
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
        // Use chatbot-specific endpoint if domain token is provided
        const workflowDetailEndpoint = domainToken
          ? `${API_URL}/chatbot/workflows/${matchedWorkflow.WorkflowUID}`
          : `${API_URL}/workflows/${matchedWorkflow.WorkflowUID}`;
        const response = await fetch(workflowDetailEndpoint, {
          headers: getApiHeaders()
        });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              role: 'system',
              content: '🔒 Authorization Error: The chatbot token is invalid, expired, or not authorized for this domain. Please check your configuration.',
              timestamp: new Date()
            }]);
            throw new Error('Authorization failed');
          }
          throw new Error('Failed to fetch workflow');
        }
        
        workflowData = await response.json();
      } else {
        // Fetch the workflow directly by ID
        // Use chatbot-specific endpoint if domain token is provided
        const workflowEndpoint = domainToken
          ? `${API_URL}/chatbot/workflows/${workflowId}`
          : `${API_URL}/workflows/${workflowId}`;
        const response = await fetch(workflowEndpoint, {
          headers: getApiHeaders()
        });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              role: 'system',
              content: '🔒 Authorization Error: The chatbot token is invalid, expired, or not authorized for this domain. Please check your configuration.',
              timestamp: new Date()
            }]);
            throw new Error('Authorization failed');
          }
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
    
    // Wait for data to load if using auto-detect
    if (autoDetectWorkflow && !dataLoaded) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please wait while I load the available workflows...',
        timestamp: new Date()
      }]);
      return;
    }
    
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
        setIsLoading(true); // Show typing indicator while searching
        
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
        setIsLoading(false); // Turn off loading indicator
      }
    }
  };

  const handleWorkflowChoice = async (workflow: any) => {
    // Clear the pending choices and reset state
    setPendingWorkflowChoices([]);
    setCurrentStep(null);
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
        // temperature: 1 is the default and only supported value  
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
          "transition-all hover:scale-110",
          positionClasses
        )}
        style={{ 
          background: primaryColor || '#6366f1',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col rounded-lg transition-all bg-white",
        "w-96",
        positionClasses,
        isMinimized ? "h-14" : "h-[600px]"
      )}
      style={{
        boxShadow: 'none'
      }}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-6 border-b",
          isMinimized ? "rounded-lg border-0 py-4" : "rounded-t-lg"
        )}
        style={{ 
          background: primaryColor || '#6366f1'
        }}
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
              setPendingWorkflowChoices([]);
              setIsTyping(false);
              setSelectedAnswerId(null);
              
              // Clear workflow by loading an empty workflow
              loadWorkflow({ WorkflowName: '', Steps: [] });
              
              // Clear any cached data to force fresh fetch
              sessionStorage.removeItem('chatbot_aliases');
              sessionStorage.removeItem('chatbot_aliases_timestamp');
              
              // Re-fetch aliases for fresh data
              setAllAliases([]);
              setDataLoaded(false);
              fetchAliases();
              
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
              setPendingWorkflowChoices([]);
              setIsTyping(false);
              setSelectedAnswerId(null);
              
              // Clear workflow by loading an empty workflow
              loadWorkflow({ WorkflowName: '', Steps: [] });
              
              // Clear any cached data to ensure fresh data on next open
              sessionStorage.removeItem('chatbot_aliases');
              sessionStorage.removeItem('chatbot_aliases_timestamp');
              
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
                placeholder={
                  !dataLoaded && autoDetectWorkflow 
                    ? 'Loading...' 
                    : workflowStarted 
                      ? 'Type your response...' 
                      : 'What do you need help with?'
                }
                disabled={isLoading || (!dataLoaded && autoDetectWorkflow)}
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