import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowExecution {
  workflowUID: string;
  workflowName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'cancelled';
}

interface InteractionState {
  // Interaction mode state
  interactionMode: boolean;
  
  // Current interaction
  currentInteractionGUID: string | null;
  interactionStartTime: Date | null;
  interactionWorkflows: WorkflowExecution[];
  
  // Shared state across workflows in an interaction
  sharedNotes: string;
  
  // Actions
  toggleInteractionMode: () => void;
  setInteractionMode: (enabled: boolean) => void;
  startInteraction: () => string;
  endInteraction: () => void;
  addWorkflowToInteraction: (workflowUID: string, workflowName: string) => void;
  completeWorkflow: (workflowUID: string) => void;
  appendToSharedNotes: (text: string) => void;
  clearSharedNotes: () => void;
  isInInteraction: () => boolean;
}

export const useInteractionStore = create<InteractionState>()((set, get) => ({
      // Initial state - load interactionMode from localStorage
      interactionMode: localStorage.getItem('interactionMode') === 'true',
      currentInteractionGUID: null,
      interactionStartTime: null,
      interactionWorkflows: [],
      sharedNotes: '',
      
      // Toggle interaction mode on/off
      toggleInteractionMode: () => {
        set((state) => {
          const newMode = !state.interactionMode;
          // If turning off interaction mode, end any active interaction
          if (!newMode && state.currentInteractionGUID) {
            return {
              interactionMode: newMode,
              currentInteractionGUID: null,
              interactionStartTime: null,
              interactionWorkflows: [],
              sharedNotes: '',
            };
          }
          return { interactionMode: newMode };
        });
      },
      
      // Set interaction mode to specific value
      setInteractionMode: (enabled: boolean) => {
        // Persist to localStorage
        localStorage.setItem('interactionMode', enabled.toString());
        
        set((state) => {
          // If turning off interaction mode, end any active interaction
          if (!enabled && state.currentInteractionGUID) {
            return {
              interactionMode: enabled,
              currentInteractionGUID: null,
              interactionStartTime: null,
              interactionWorkflows: [],
              sharedNotes: '',
            };
          }
          return { interactionMode: enabled };
        });
      },
      
      // Start a new interaction
      startInteraction: () => {
        const interactionGUID = uuidv4();
        set({
          currentInteractionGUID: interactionGUID,
          interactionStartTime: new Date(),
          interactionWorkflows: [],
          sharedNotes: '',
        });
        return interactionGUID;
      },
      
      // End the current interaction
      endInteraction: () => {
        set({
          currentInteractionGUID: null,
          interactionStartTime: null,
          interactionWorkflows: [],
          sharedNotes: '',
        });
      },
      
      // Add a workflow to the current interaction
      addWorkflowToInteraction: (workflowUID: string, workflowName: string) => {
        const state = get();
        if (!state.currentInteractionGUID) {
          console.warn('No active interaction to add workflow to');
          return;
        }
        
        // Check if this workflow is already being tracked (prevent duplicates)
        const alreadyTracked = state.interactionWorkflows.some(
          w => w.workflowUID === workflowUID && w.status === 'running'
        );
        
        if (alreadyTracked) {
          console.log('Workflow already being tracked:', workflowName);
          return;
        }
        
        const execution: WorkflowExecution = {
          workflowUID,
          workflowName,
          startTime: new Date(),
          status: 'running',
        };
        
        set((state) => ({
          interactionWorkflows: [...state.interactionWorkflows, execution],
        }));
      },
      
      // Mark a workflow as completed
      completeWorkflow: (workflowUID: string) => {
        set((state) => ({
          interactionWorkflows: state.interactionWorkflows.map((w) =>
            w.workflowUID === workflowUID
              ? { ...w, endTime: new Date(), status: 'completed' as const }
              : w
          ),
        }));
      },
      
      // Append to shared notes
      appendToSharedNotes: (text: string) => {
        set((state) => ({
          sharedNotes: state.sharedNotes + (state.sharedNotes ? '\n' : '') + text,
        }));
      },
      
      // Clear shared notes
      clearSharedNotes: () => {
        set({ sharedNotes: '' });
      },
      
      // Check if currently in an interaction
      isInInteraction: () => {
        const state = get();
        return state.interactionMode && state.currentInteractionGUID !== null;
      },
    }));