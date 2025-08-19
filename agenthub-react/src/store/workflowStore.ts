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
  clearedWindow?: boolean; // Track if window was cleared
  fromLoadWorkflow?: boolean; // Track if loaded from loadworkflow step
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
  loadSubWorkflow: (workflow: Workflow, parentButtonGUID: string | undefined, clearWindow?: boolean) => void;
  returnFromSubWorkflow: () => void;
  preloadReferencedWorkflows: (workflow: Workflow) => void;
  
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
    const currentState = get();
    
    // Prevent reloading the same workflow if it's already loaded
    if (currentState.currentWorkflow?.WorkflowName === workflow.WorkflowName && 
        currentState.rows.length > 0) {
      console.log('[loadWorkflow] Workflow already loaded, skipping reload:', workflow.WorkflowName);
      return;
    }
    
    const workflowGUID = uuidv4();
    
    console.log('[loadWorkflow] Loading new workflow:', workflow.WorkflowName);
    
    // Check if we're in an interaction to preserve notes
    const interactionStore = useInteractionStore.getState();
    const shouldPreserveNotes = interactionStore.isInInteraction();
    
    set({
      currentWorkflow: workflow,
      workflowStack: [],
      rows: [],
      currentRowIndex: 0,
      workflowGUID,
      pendingSteps: [],
      currentStepIndex: 0,
      // Only clear notes if NOT in an interaction
      ...(shouldPreserveNotes ? {} : { notes: '' }),
    });
    
    // Preload any workflows referenced in loadworkflow steps
    get().preloadReferencedWorkflows(workflow);
    
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
    // If loading from a loadworkflow step (no parentButtonGUID), we need to move past it
    // If loading from answer substeps (has parentButtonGUID), don't increment
    const parentState = {
      workflow: currentState.currentWorkflow!,
      pendingSteps: currentState.pendingSteps,
      currentStepIndex: parentButtonGUID ? currentState.currentStepIndex : currentState.currentStepIndex + 1,
      rows: clearWindow ? [] : currentState.rows, // Only save rows if not clearing window
      clearedWindow: clearWindow, // Track if we cleared the window
      fromLoadWorkflow: !parentButtonGUID, // Track if this was from a loadworkflow step
    };
    
    set((state) => ({
      workflowStack: [...state.workflowStack, parentState],
      currentWorkflow: workflow,
      pendingSteps: [],
      currentStepIndex: 0,
      // Clear rows if ClearWindow is true, otherwise keep them
      ...(clearWindow ? { rows: [] } : {}),
      // IMPORTANT: Never clear notes when loading sub-workflow
      // Notes persist for the entire interaction
    }));
    
    // Process the sub-workflow steps
    get().processSteps(workflow.Steps, workflow.WorkflowName, parentButtonGUID);
  },

  returnFromSubWorkflow: () => {
    const state = get();
    const stack = [...state.workflowStack];
    const parentState = stack.pop();
    
    console.log('[returnFromSubWorkflow] Called:', {
      hasParentState: !!parentState,
      stackDepth: stack.length,
      parentWorkflow: parentState?.workflow?.WorkflowName,
      fromLoadWorkflow: parentState?.fromLoadWorkflow
    });
    
    if (parentState) {
      const currentRows = state.rows;
      
      set({
        currentWorkflow: parentState.workflow,
        workflowStack: stack,
        pendingSteps: parentState.pendingSteps,
        currentStepIndex: parentState.currentStepIndex,
        // If ClearWindow was used, don't keep sub-workflow rows
        // Otherwise, combine parent and sub-workflow rows
        rows: parentState.clearedWindow 
          ? parentState.rows // Return to parent's (empty) rows, discarding sub-workflow rows
          : [...parentState.rows, ...currentRows], // Combine parent and sub-workflow rows
      });
      
      console.log('[returnFromSubWorkflow] Restored parent state, continuing at step index:', parentState.currentStepIndex);
      
      // Only continue processing if the parent has more steps
      // This prevents cascading returns through all parent workflows
      if (parentState.currentStepIndex < parentState.pendingSteps.length) {
        setTimeout(() => get().processNextStep(), 100);
      } else {
        console.log('[returnFromSubWorkflow] Parent workflow is also complete - stopping');
      }
    } else {
      console.log('[returnFromSubWorkflow] No parent workflow - workflow complete');
      // No parent workflow, workflow is complete - do NOT clear the currentWorkflow
      // Just mark that we're done processing by clearing the pending steps
      // This prevents the workflow from restarting
      set({
        pendingSteps: [],
        currentStepIndex: 0,
        // Keep currentWorkflow set to prevent reload
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
    const { pendingSteps, currentStepIndex, currentWorkflow, rows, workflowStack, currentParentButtonGUID } = state;
    
    console.log('[processNextStep] Called:', {
      currentStepIndex,
      pendingStepsLength: pendingSteps?.length || 0,
      currentWorkflow: currentWorkflow?.WorkflowName,
      workflowStackDepth: workflowStack.length,
      currentParentButtonGUID
    });
    
    if (!pendingSteps || currentStepIndex >= pendingSteps.length) {
      console.log('[processNextStep] No more steps to process in', currentWorkflow?.WorkflowName);
      
      // Clear parent button GUID when done with substeps
      set({ currentParentButtonGUID: undefined });
      
      // Only return to parent if we have substeps to return from (indicated by parentButtonGUID)
      // If we loaded a sub-workflow (not substeps), we should NOT automatically return
      if (currentParentButtonGUID && workflowStack.length > 0) {
        console.log('[processNextStep] Returning from substeps to parent workflow');
        state.returnFromSubWorkflow();
      } else if (workflowStack.length > 0) {
        // We're in a sub-workflow but it's complete - don't automatically return
        console.log('[processNextStep] Sub-workflow complete - workflow chain ended');
      } else {
        console.log('[processNextStep] Main workflow complete');
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
      if (step.VariableAssignments && Array.isArray(step.VariableAssignments)) {
        // Import variable store to set variables
        import('./variableStore').then(({ useVariableStore, VariableType }) => {
          const variableState = useVariableStore.getState();
          
          step.VariableAssignments.forEach((assignment: any) => {
            if (assignment.VariableName && assignment.VariableValue !== undefined) {
              console.log(`Setting variable from VariableAssignment: ${assignment.VariableName} = ${assignment.VariableValue}`);
              variableState.setVariable(
                assignment.VariableName,
                assignment.VariableValue,
                VariableType.WorkflowVariable
              );
            }
          });
        });
      }
      
      // Move to next step immediately
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
      state.processNextStep();
      return;
    }
    
    if (step.StepType.toLowerCase() === 'loadworkflow') {
      // Handle sub-workflow loading
      console.log('Processing loadworkflow step for workflow name:', step.WorkflowName);
      
      // Check if we should clear the window (case-insensitive)
      const shouldClearWindow = 
        step.ClearWindow === true || 
        (typeof step.ClearWindow === 'string' && step.ClearWindow.toLowerCase() === 'true');
      console.log('ClearWindow:', step.ClearWindow, 'shouldClearWindow:', shouldClearWindow);
      
      // Load the sub-workflow asynchronously
      if (step.WorkflowName) {
        // Import the workflow service
        import('../services/api/workflows').then(({ workflowService }) => {
          workflowService.getWorkflowByName(step.WorkflowName)
            .then(subWorkflow => {
              console.log('Successfully loaded sub-workflow:', subWorkflow.WorkflowName);
              
              // Load the sub-workflow and continue processing
              // Don't pass parentButtonGUID for loadworkflow steps - only for answer substeps
              const state = get();
              state.loadSubWorkflow(subWorkflow, undefined, shouldClearWindow);
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
    
    console.log('[answerQuestion] Answering:', {
      stepPrompt: row.step.Prompt?.substring(0, 50),
      answerText: answer.Prompt,
      hasSubSteps: !!(answer.SubSteps && answer.SubSteps.length > 0),
      currentStepIndex: state.currentStepIndex,
      pendingStepsLength: state.pendingSteps.length,
      workflowStackDepth: state.workflowStack.length
    });
    
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
    
    // Generate notes if template exists (check both NotesTemplate and NoteGeneration)
    const noteTemplate = answer.NotesTemplate || answer.NoteGeneration;
    if (noteTemplate) {
      // Import variable store to interpolate variables in notes
      import('./variableStore').then(({ useVariableStore }) => {
        const variableState = useVariableStore.getState();
        const interpolatedNote = variableState.interpolateText(noteTemplate);
        
        // If changing answer, we might want to replace the previous note
        // For now, we'll append it
        const notes = state.notes + (state.notes ? '\n' : '') + interpolatedNote;
        set({ notes });
        console.log('Generated notes from answer:', interpolatedNote);
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
      console.log('[answerQuestion] No substeps, moving to next step');
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 }));
      setTimeout(() => get().processNextStep(), 100);
    } else {
      console.log('[answerQuestion] Answer changed but no substeps to process');
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
    // Check if we're in an interaction before clearing notes
    const interactionStore = useInteractionStore.getState();
    const shouldPreserveNotes = interactionStore.isInInteraction();
    
    set({
      currentWorkflow: null,
      workflowStack: [],
      rows: [],
      // Only clear notes if NOT in an interaction
      ...(shouldPreserveNotes ? {} : { notes: '' }),
      currentRowIndex: 0,
      pendingSteps: [],
      currentStepIndex: 0,
      interactionGUID: '',
      workflowGUID: '',
    });
  },

  preloadReferencedWorkflows: (workflow) => {
    if (!workflow || !workflow.Steps) return;
    
    // Find all loadworkflow steps and their referenced workflows
    const workflowsToPreload = new Set<string>();
    
    const findLoadWorkflowSteps = (steps: any[]) => {
      steps.forEach(step => {
        // Check if this is a loadworkflow step
        if (step.StepType?.toLowerCase() === 'loadworkflow' && step.WorkflowName) {
          workflowsToPreload.add(step.WorkflowName);
        }
        
        // Check answers for substeps
        if (step.Answers && Array.isArray(step.Answers)) {
          step.Answers.forEach((answer: any) => {
            if (answer.SubSteps && Array.isArray(answer.SubSteps)) {
              findLoadWorkflowSteps(answer.SubSteps);
            }
          });
        }
      });
    };
    
    findLoadWorkflowSteps(workflow.Steps);
    
    // Preload each workflow into cache
    if (workflowsToPreload.size > 0) {
      console.log('[preloadReferencedWorkflows] Preloading workflows:', Array.from(workflowsToPreload));
      
      import('../services/api/workflows').then(({ workflowService }) => {
        workflowsToPreload.forEach(workflowName => {
          // Check if already cached
          const cached = workflowService.getCachedWorkflowByName(workflowName);
          if (!cached) {
            // Fetch and cache it
            workflowService.getWorkflowByName(workflowName)
              .then(subWorkflow => {
                console.log('[preloadReferencedWorkflows] Cached workflow:', workflowName);
                // The getWorkflowByName already caches it
              })
              .catch(error => {
                console.error('[preloadReferencedWorkflows] Failed to preload workflow:', workflowName, error);
              });
          } else {
            console.log('[preloadReferencedWorkflows] Workflow already cached:', workflowName);
          }
        });
      });
    }
  },
}));