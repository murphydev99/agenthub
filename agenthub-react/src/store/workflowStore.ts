import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useInteractionStore } from './interactionStore';

// Define types inline to avoid import issues
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

// Install uuid: npm install uuid @types/uuid

interface WorkflowRow {
  id: string;
  step: Step;
  parentButtonGUID?: string;
  workflowName: string;
  answered?: boolean;
  selectedAnswerGUID?: string;
  visible: boolean;
}

interface ParentWorkflowState {
  workflow: Workflow;
  pendingSteps: Step[];
  currentStepIndex: number;
  rows: WorkflowRow[];
}

interface WorkflowState {
  // Current workflow data (fetched from server, no customer data)
  currentWorkflow: Workflow | null;
  workflowStack: ParentWorkflowState[]; // For sub-workflows
  
  // UI state (client-side only)
  rows: WorkflowRow[];
  currentRowIndex: number;
  notes: string;
  
  // Session identifiers (no PII)
  interactionGUID: string;
  workflowGUID: string;
  
  // Step queue for sequential processing
  pendingSteps: Step[];
  currentStepIndex: number;
  currentParentButtonGUID?: string;
  
  // Actions
  loadWorkflow: (workflow: Workflow) => void;
  loadSubWorkflow: (workflow: Workflow, parentButtonGUID: string, clearWindow?: boolean) => void;
  returnFromSubWorkflow: () => void;
  
  // Step processing
  processSteps: (steps: Step[], workflowName: string, parentButtonGUID?: string) => void;
  addRow: (step: Step, workflowName: string, parentButtonGUID?: string) => void;
  processNextStep: () => void;
  
  // User interactions
  answerQuestion: (rowId: string, answerId: string) => void;
  collectValue: (rowId: string, value: any) => void;
  
  // Notes management
  addToNotes: (text: string) => void;
  clearNotes: () => void;
  
  // Session management
  startNewSession: () => void;
  endSession: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentWorkflow: null,
  workflowStack: [],
  rows: [],
  currentRowIndex: 0,
  notes: '',
  interactionGUID: '',
  workflowGUID: '',
  pendingSteps: [],
  currentStepIndex: 0,

  loadWorkflow: (workflow) => {
    const workflowGUID = uuidv4();
    
    set({
      currentWorkflow: workflow,
      workflowStack: [],
      rows: [],
      currentRowIndex: 0,
      workflowGUID,
      pendingSteps: [],
      currentStepIndex: 0,
    });
    
    // Process root steps after state is set
    setTimeout(() => {
      const state = get();
      if (workflow.Steps && workflow.Steps.length > 0) {
        state.processSteps(workflow.Steps, workflow.WorkflowName);
      }
    }, 0);
  },

  loadSubWorkflow: (workflow, parentButtonGUID, clearWindow = false) => {
    const currentState = get();
    
    // Save the current workflow state including remaining steps and rows
    const parentState = {
      workflow: currentState.currentWorkflow!,
      pendingSteps: currentState.pendingSteps,
      currentStepIndex: currentState.currentStepIndex + 1, // Move past the loadworkflow step
      rows: clearWindow ? [] : currentState.rows, // Only save rows if not clearing window
    };
    
    set((state) => ({
      workflowStack: [...state.workflowStack, parentState],
      currentWorkflow: workflow,
      pendingSteps: [],
      currentStepIndex: 0,
      // Clear rows if ClearWindow is true, otherwise keep them
      ...(clearWindow ? { rows: [] } : {}),
    }));
    
    // Process the sub-workflow steps
    get().processSteps(workflow.Steps, workflow.WorkflowName, parentButtonGUID);
  },

  returnFromSubWorkflow: () => {
    const state = get();
    const stack = [...state.workflowStack];
    const parentState = stack.pop();
    
    if (parentState) {
      const currentRows = state.rows;
      
      set({
        currentWorkflow: parentState.workflow,
        workflowStack: stack,
        pendingSteps: parentState.pendingSteps,
        currentStepIndex: parentState.currentStepIndex,
        // If parent had saved rows (ClearWindow was used), restore them and append current rows
        // Otherwise keep all current rows
        rows: parentState.rows.length === 0 && currentRows.length > 0 
          ? currentRows // Keep sub-workflow rows if parent had none saved
          : [...parentState.rows, ...currentRows], // Combine parent and sub-workflow rows
      });
      
      // Continue processing parent workflow steps
      setTimeout(() => get().processNextStep(), 100);
    } else {
      // No parent workflow, end session
      set({
        currentWorkflow: null,
        workflowStack: [],
      });
    }
  },

  processSteps: (steps, workflowName, parentButtonGUID) => {
    console.log('Processing steps:', steps);
    if (!steps || !Array.isArray(steps)) {
      console.warn('No steps to process');
      return;
    }
    
    // Check if we're already processing steps
    const currentState = get();
    if (currentState.pendingSteps.length > 0 && currentState.currentStepIndex < currentState.pendingSteps.length) {
      console.log('Already processing steps, skipping duplicate processSteps call');
      return;
    }
    
    // Store steps in pending queue
    set((state) => ({
      pendingSteps: steps,
      currentStepIndex: 0,
    }));
    
    // Process first step immediately
    get().processNextStep();
  },
  
  processNextStep: () => {
    const state = get();
    const { pendingSteps, currentStepIndex, currentWorkflow, rows, workflowStack } = state;
    
    if (!pendingSteps || currentStepIndex >= pendingSteps.length) {
      console.log('No more steps to process');
      
      // Clear parent button GUID when done with substeps
      set({ currentParentButtonGUID: undefined });
      
      // Check if we're in a sub-workflow and should return to parent
      if (workflowStack.length > 0) {
        console.log('Sub-workflow complete, returning to parent workflow');
        state.returnFromSubWorkflow();
      }
      
      return;
    }
    
    const step = pendingSteps[currentStepIndex];
    console.log('Processing step:', step.StepType, step);
    
    // Check if this step was already added (prevent duplicates) - check by step GUID and workflow name
    const isDuplicate = rows.some(row => 
      row.step.GUID === step.GUID && 
      row.workflowName === currentWorkflow?.WorkflowName
    );
    
    if (isDuplicate) {
      console.log('Skipping duplicate step:', step.GUID, 'from workflow:', currentWorkflow?.WorkflowName);
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
      setTimeout(() => state.processNextStep(), 0);
      return;
    }
    
    if (step.StepType.toLowerCase() === 'variableassignment') {
      // Process variable assignments without creating UI rows
      // Move to next step immediately
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
      state.processNextStep();
      return;
    }
    
    if (step.StepType.toLowerCase() === 'loadworkflow') {
      // Handle sub-workflow loading
      console.log('Processing loadworkflow step for workflow name:', step.WorkflowName);
      
      // Check if we should clear the window
      const shouldClearWindow = step.ClearWindow === 'true' || step.ClearWindow === true;
      console.log('ClearWindow:', step.ClearWindow, 'shouldClearWindow:', shouldClearWindow);
      
      // Load the sub-workflow asynchronously
      if (step.WorkflowName) {
        // Import the workflow service
        import('../services/api/workflows').then(({ workflowService }) => {
          workflowService.getWorkflowByName(step.WorkflowName)
            .then(subWorkflow => {
              console.log('Successfully loaded sub-workflow:', subWorkflow.WorkflowName);
              
              // Load the sub-workflow and continue processing
              const state = get();
              state.loadSubWorkflow(subWorkflow, step.GUID, shouldClearWindow);
            })
            .catch(error => {
              console.error('Failed to load sub-workflow:', step.WorkflowName, error);
              // Move to next step even if loading fails
              set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
              get().processNextStep();
            });
        });
      } else {
        // No workflow name specified, skip
        console.warn('loadworkflow step has no WorkflowName specified');
        set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
        state.processNextStep();
      }
      return;
    }
    
    // Add UI row for other step types with parent tracking
    const workflowName = currentWorkflow?.WorkflowName || '';
    const parentGUID = state.currentParentButtonGUID; // Use the stored parent button GUID
    state.addRow(step, workflowName, parentGUID);
    
    // Check if there's a previous unanswered blocking step
    const hasUnansweredBlockingStep = rows.some(row => 
      !row.answered && 
      ['question', 'collect'].includes(row.step.StepType.toLowerCase())
    );
    
    // For non-blocking steps (userinstruction, notesblock), only process next if no blocking steps pending
    if (['userinstruction', 'notesblock'].includes(step.StepType.toLowerCase())) {
      if (!hasUnansweredBlockingStep) {
        set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
        setTimeout(() => state.processNextStep(), 100);
      }
      // Otherwise, stop processing until blocking step is answered
    }
    // For blocking steps (question, collect), wait for user interaction
  },

  addRow: (step, workflowName, parentButtonGUID) => {
    const newRow: WorkflowRow = {
      id: uuidv4(),
      step,
      workflowName,
      parentButtonGUID,
      answered: false,
      visible: true,
    };
    
    console.log('Adding row:', newRow);
    
    set((state) => {
      const newRows = [...state.rows, newRow];
      console.log('Total rows after add:', newRows.length);
      return { rows: newRows };
    });
  },

  answerQuestion: (rowId, answerId) => {
    const state = get();
    let rows = [...state.rows];
    const rowIndex = rows.findIndex((r) => r.id === rowId);
    
    if (rowIndex === -1) return;
    
    const row = rows[rowIndex];
    const answer = row.step.Answers?.find((a) => a.GUID === answerId);
    
    if (!answer) return;
    
    // Check if this is a change of answer
    const isChangingAnswer = row.answered && row.selectedAnswerGUID !== answerId;
    const previousAnswerId = row.selectedAnswerGUID;
    
    // If changing answer, remove substeps from previous answer
    if (isChangingAnswer && previousAnswerId) {
      console.log('Changing answer from', previousAnswerId, 'to', answerId);
      
      // Get the previous answer object to check if it had substeps
      const previousAnswer = row.step.Answers?.find((a) => a.GUID === previousAnswerId);
      
      if (previousAnswer?.SubSteps && previousAnswer.SubSteps.length > 0) {
        // Build a set of all step GUIDs that should be removed
        const stepsToRemove = new Set<string>();
        
        // Add all substep GUIDs from the previous answer
        const collectStepGuids = (steps: any[]) => {
          steps.forEach(step => {
            stepsToRemove.add(step.GUID);
            // Recursively collect substeps if they exist
            if (step.SubSteps && step.SubSteps.length > 0) {
              collectStepGuids(step.SubSteps);
            }
            // Also check answers for their substeps
            if (step.Answers) {
              step.Answers.forEach((ans: any) => {
                if (ans.SubSteps && ans.SubSteps.length > 0) {
                  collectStepGuids(ans.SubSteps);
                }
              });
            }
          });
        };
        
        collectStepGuids(previousAnswer.SubSteps);
        
        console.log('Steps to remove:', Array.from(stepsToRemove));
        
        // Now filter rows, keeping only those that:
        // 1. Come before the current question, OR
        // 2. Are the current question itself, OR
        // 3. Are not in the removal set and not children of the previous answer
        const rowsToKeep: typeof rows = [];
        let foundCurrentRow = false;
        
        for (let i = 0; i < rows.length; i++) {
          const currentRow = rows[i];
          
          if (currentRow.id === rowId) {
            // Found the current question row - keep it
            foundCurrentRow = true;
            rowsToKeep.push(currentRow);
          } else if (!foundCurrentRow) {
            // Keep all rows before the current question
            rowsToKeep.push(currentRow);
          } else {
            // After the current question, check if this row should be removed
            const shouldRemove = 
              stepsToRemove.has(currentRow.step.GUID) || // Direct substep
              currentRow.parentButtonGUID === previousAnswerId || // Child of previous answer
              (currentRow.parentButtonGUID && stepsToRemove.has(currentRow.parentButtonGUID)); // Child of a substep
            
            if (!shouldRemove) {
              // Also check if this is a descendant through multiple levels
              let isDescendant = false;
              let parentGUID = currentRow.parentButtonGUID;
              
              while (parentGUID) {
                if (parentGUID === previousAnswerId || stepsToRemove.has(parentGUID)) {
                  isDescendant = true;
                  break;
                }
                // Find the parent row to continue tracing
                const parentRow = rows.find(r => r.step.GUID === parentGUID);
                parentGUID = parentRow?.parentButtonGUID;
              }
              
              if (!isDescendant) {
                rowsToKeep.push(currentRow);
              } else {
                console.log('Removing descendant row:', currentRow.step.StepType, currentRow.step.Prompt?.substring(0, 50));
              }
            } else {
              console.log('Removing row:', currentRow.step.StepType, currentRow.step.Prompt?.substring(0, 50));
            }
          }
        }
        
        rows = rowsToKeep;
      }
    }
    
    // Mark as answered with new selection
    row.answered = true;
    row.selectedAnswerGUID = answerId;
    
    // Update rows first
    set({ rows });
    
    // Generate notes if template exists
    if (answer.NotesTemplate) {
      // Import variable store to interpolate variables in notes
      import('./variableStore').then(({ useVariableStore }) => {
        const variableState = useVariableStore.getState();
        const interpolatedNote = variableState.interpolateText(answer.NotesTemplate);
        
        // If changing answer, we might want to replace the previous note
        // For now, we'll append it
        const notes = state.notes + (state.notes ? '\n' : '') + interpolatedNote;
        set({ notes });
        console.log('Generated notes:', interpolatedNote);
      });
    }
    
    // Process substeps if they exist
    if (answer.SubSteps && answer.SubSteps.length > 0) {
      // Get remaining steps from the current queue after this one
      const remainingSteps = state.pendingSteps.slice(state.currentStepIndex + 1);
      // Combine substeps with remaining steps
      const newPendingSteps = [...answer.SubSteps, ...remainingSteps];
      
      // Update pending steps and process next, storing the parent button GUID
      set({
        pendingSteps: newPendingSteps,
        currentStepIndex: 0,
        currentParentButtonGUID: answerId, // Track which answer button these substeps belong to
      });
      
      setTimeout(() => get().processNextStep(), 100);
    } else if (!isChangingAnswer) {
      // No substeps - move to next step in queue
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
      setTimeout(() => get().processNextStep(), 100);
    }
  },

  collectValue: (rowId, value) => {
    set((state) => {
      const rows = [...state.rows];
      const row = rows.find((r) => r.id === rowId);
      
      if (!row) return state;
      
      // Mark as answered only if value is provided
      if (value && value.toString().trim()) {
        row.answered = true;
        
        // Move to next step in queue
        const newState = {
          rows,
          currentStepIndex: state.currentStepIndex + 1,
        };
        
        // Process next step after a brief delay
        setTimeout(() => get().processNextStep(), 100);
        
        return newState;
      }
      
      return { rows };
    });
  },

  addToNotes: (text) => {
    set((state) => ({
      notes: state.notes + (state.notes ? '\n' : '') + text,
    }));
    
    // Also add to shared notes if in interaction mode
    const interactionState = useInteractionStore.getState();
    if (interactionState.isInInteraction()) {
      interactionState.appendToSharedNotes(text);
    }
  },

  clearNotes: () => {
    set({ notes: '' });
  },

  startNewSession: () => {
    const interactionGUID = uuidv4();
    set({
      interactionGUID,
      workflowGUID: '',
      rows: [],
      notes: '',
      currentRowIndex: 0,
    });
  },

  endSession: () => {
    set({
      currentWorkflow: null,
      workflowStack: [],
      rows: [],
      notes: '',
      currentRowIndex: 0,
      pendingSteps: [],
      currentStepIndex: 0,
      interactionGUID: '',
      workflowGUID: '',
    });
  },
}));