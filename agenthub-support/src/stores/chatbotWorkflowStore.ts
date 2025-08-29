import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useVariableStore, VariableType } from './variableStore';

// Define types
interface Workflow {
  WorkflowName: string;
  WorkflowUID?: string;
  Steps: Step[];
  LastUpdated?: string;
  LastUpdatedBy?: string;
}

interface Step {
  GUID: string;
  StepType: string;
  Prompt: string;
  SecondaryText?: string;
  Title?: string;
  Answers?: any[];
  VariableName?: string;
  Format?: string;
  Validation?: any;
  WorkflowName?: string;
  ClearWindow?: boolean;
  VariableAssignments?: any[];
  NotesTemplate?: string;
}

interface WorkflowRow {
  id: string;
  step: Step;
  parentButtonGUID?: string;
  workflowName: string;
  answered?: boolean;
  selectedAnswerGUID?: string;
  visible: boolean;
}

interface ChatbotWorkflowState {
  currentWorkflow: Workflow | null;
  rows: WorkflowRow[];
  currentStepIndex: number;
  pendingSteps: Step[];
  
  // Actions
  loadWorkflow: (workflow: Workflow) => void;
  startNewSession: () => void;
  processNextStep: () => void;
  answerQuestion: (rowId: string, answerId: string) => void;
  collectValue: (rowId: string, value: any) => void;
}

export const useChatbotWorkflowStore = create<ChatbotWorkflowState>((set, get) => ({
  currentWorkflow: null,
  rows: [],
  currentStepIndex: 0,
  pendingSteps: [],
  
  loadWorkflow: (workflow) => {
    console.log('[ChatbotWorkflow] Loading workflow:', workflow.WorkflowName);
    
    set({
      currentWorkflow: workflow,
      rows: [],
      currentStepIndex: 0,
      pendingSteps: [...workflow.Steps],
    });
    
    // Process the first step only
    get().processNextStep();
  },
  
  startNewSession: () => {
    console.log('[ChatbotWorkflow] Starting new session');
    set({
      rows: [],
      currentStepIndex: 0,
      pendingSteps: get().currentWorkflow?.Steps || [],
    });
  },
  
  processNextStep: () => {
    const state = get();
    const { currentStepIndex, pendingSteps, currentWorkflow, rows } = state;
    
    console.log('[ChatbotWorkflow] processNextStep called:', {
      currentStepIndex,
      pendingStepsLength: pendingSteps.length,
      currentWorkflow: currentWorkflow?.WorkflowName,
    });
    
    // Check if we have more steps to process
    if (currentStepIndex >= pendingSteps.length) {
      console.log('[ChatbotWorkflow] No more steps to process');
      return;
    }
    
    // Check if there's an unanswered interactive step - if so, don't process more
    const hasUnansweredInteractive = rows.some(row => 
      !row.answered && 
      ['question', 'collect'].includes(row.step.StepType.toLowerCase())
    );
    
    if (hasUnansweredInteractive) {
      console.log('[ChatbotWorkflow] Waiting for user to answer interactive step before continuing');
      return;
    }
    
    const step = pendingSteps[currentStepIndex];
    console.log('[ChatbotWorkflow] Processing step:', step.StepType, step.Prompt?.substring(0, 50));
    
    // Check for duplicate
    const isDuplicate = rows.some(row => 
      row.step.GUID === step.GUID && 
      row.workflowName === currentWorkflow?.WorkflowName
    );
    
    if (isDuplicate) {
      console.log('[ChatbotWorkflow] Skipping duplicate step:', step.GUID);
      set({ currentStepIndex: currentStepIndex + 1 });
      // Try next step
      setTimeout(() => get().processNextStep(), 100);
      return;
    }
    
    // Handle variable assignments without UI
    if (step.StepType.toLowerCase() === 'variableassignment') {
      if (step.VariableAssignments && Array.isArray(step.VariableAssignments)) {
        const variableStore = useVariableStore.getState();
        step.VariableAssignments.forEach((assignment: any) => {
          if (assignment.VariableName && assignment.VariableValue !== undefined) {
            variableStore.setVariable(
              assignment.VariableName,
              assignment.VariableValue,
              VariableType.WorkflowVariable
            );
          }
        });
      }
      
      // Move to next step and process it
      set({ currentStepIndex: currentStepIndex + 1 });
      get().processNextStep();
      return;
    }
    
    // Handle loadworkflow step - load a sub-workflow
    if (step.StepType.toLowerCase() === 'loadworkflow') {
      console.log('[ChatbotWorkflow] Processing loadworkflow step for:', step.WorkflowName);
      
      if (step.WorkflowName) {
        // Import the workflow service dynamically
        import('../services/api/workflows').then(({ workflowService }) => {
          workflowService.getWorkflowByName(step.WorkflowName!)
            .then(subWorkflow => {
              console.log('[ChatbotWorkflow] Successfully loaded sub-workflow:', subWorkflow.WorkflowName);
              
              // Replace current workflow with the loaded one
              // This is different from the main workflowStore which uses a stack
              // For the chatbot, we'll simply replace the current workflow
              get().loadWorkflow(subWorkflow);
            })
            .catch(error => {
              console.error('[ChatbotWorkflow] Failed to load sub-workflow:', step.WorkflowName, error);
              // Move to next step even if loading fails
              set({ currentStepIndex: currentStepIndex + 1 });
              get().processNextStep();
            });
        });
      } else {
        console.warn('[ChatbotWorkflow] loadworkflow step has no WorkflowName specified');
        set({ currentStepIndex: currentStepIndex + 1 });
        get().processNextStep();
      }
      return;
    }
    
    // Add the step as a row to display
    const newRow: WorkflowRow = {
      id: uuidv4(),
      step: step,
      workflowName: currentWorkflow?.WorkflowName || '',
      answered: false,
      visible: true,
    };
    
    console.log('[ChatbotWorkflow] Adding row:', newRow.id, 'Type:', step.StepType);
    
    set((state) => ({
      rows: [...state.rows, newRow],
      currentStepIndex: state.currentStepIndex + 1,
    }));
    
    // For non-interactive steps (userinstruction, notesblock), automatically process next
    // BUT with a delay to allow the UI to display the message first
    const stepType = step.StepType.toLowerCase();
    if (['userinstruction', 'notesblock'].includes(stepType)) {
      console.log('[ChatbotWorkflow] Non-interactive step, will process next after delay');
      setTimeout(() => {
        // Double-check no unanswered interactive steps before continuing
        const currentRows = get().rows;
        const stillHasUnanswered = currentRows.some(row => 
          !row.answered && 
          ['question', 'collect'].includes(row.step.StepType.toLowerCase())
        );
        
        if (!stillHasUnanswered) {
          console.log('[ChatbotWorkflow] No unanswered interactive steps, processing next');
          get().processNextStep();
        } else {
          console.log('[ChatbotWorkflow] Found unanswered interactive step, stopping auto-advance');
        }
      }, 2000); // Increased delay to ensure UI has time to display
    }
    // For interactive steps (question, collect), wait for user input
    else if (['question', 'collect'].includes(stepType)) {
      console.log('[ChatbotWorkflow] Interactive step added, waiting for user input');
      // Don't auto-process next step - wait for answerQuestion or collectValue
    }
  },
  
  answerQuestion: (rowId, answerId) => {
    console.log('[ChatbotWorkflow] Answer question:', rowId, answerId);
    
    const state = get();
    const rows = [...state.rows];
    const row = rows.find((r) => r.id === rowId);
    
    if (!row) return;
    
    // Find the selected answer to check for SubSteps
    const answer = row.step.Answers?.find((a: any) => a.GUID === answerId);
    
    if (!answer) {
      console.log('[ChatbotWorkflow] Answer not found:', answerId);
      return;
    }
    
    // Mark the question as answered
    row.answered = true;
    row.selectedAnswerGUID = answerId;
    
    set({ rows });
    
    console.log('[ChatbotWorkflow] Answer has SubSteps:', !!(answer.SubSteps && answer.SubSteps.length > 0));
    
    // Check if the answer has SubSteps
    if (answer.SubSteps && answer.SubSteps.length > 0) {
      console.log('[ChatbotWorkflow] Processing', answer.SubSteps.length, 'substeps from answer');
      
      // Get remaining steps from the current queue after this question
      const remainingSteps = state.pendingSteps.slice(state.currentStepIndex);
      
      // Combine substeps with remaining steps
      const newPendingSteps = [...answer.SubSteps, ...remainingSteps];
      
      // Update pending steps and reset index to process substeps
      set({
        pendingSteps: newPendingSteps,
        currentStepIndex: 0,
      });
      
      // Process the first substep
      setTimeout(() => get().processNextStep(), 500);
    } else {
      // No substeps - continue with next step in the main flow
      console.log('[ChatbotWorkflow] No substeps, continuing main flow');
      setTimeout(() => get().processNextStep(), 500);
    }
  },
  
  collectValue: (rowId, value) => {
    console.log('[ChatbotWorkflow] Collect value:', rowId, value);
    
    set((state) => {
      const rows = [...state.rows];
      const row = rows.find((r) => r.id === rowId);
      
      if (!row) return state;
      
      // Mark as answered only if value is provided
      if (value && value.toString().trim()) {
        row.answered = true;
        
        return { rows };
      }
      
      return { rows };
    });
    
    // Process next step after collecting value
    if (value && value.toString().trim()) {
      setTimeout(() => get().processNextStep(), 500);
    }
  },
}));