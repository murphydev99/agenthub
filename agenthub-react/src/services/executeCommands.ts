import { useWorkflowStore } from '../store/workflowStore';
import { useInteractionStore } from '../store/interactionStore';
import { useVariableStore } from '../store/variableStore';

/**
 * Processes Execute commands from workflow steps
 * Execute commands are separated by semicolon (;) or comma (,)
 */
export class ExecuteCommandProcessor {
  
  /**
   * Process an execute string which may contain multiple commands
   */
  static processExecute(executeString: string | undefined) {
    if (!executeString) return;
    
    // Split by semicolon first, then by comma if no semicolon found
    const commands = executeString.includes(';') 
      ? executeString.split(';')
      : executeString.split(',');
    
    commands.forEach(command => {
      this.executeCommand(command.trim());
    });
  }
  
  /**
   * Execute a single command
   */
  static executeCommand(command: string) {
    console.log('Executing command:', command);
    
    // Parse command and parameters
    const lowerCommand = command.toLowerCase();
    
    // System commands
    if (lowerCommand === 'system.endworkflow') {
      this.endWorkflow();
    } else if (lowerCommand === 'system.endinteraction') {
      this.endInteraction();
    } else {
      console.log('Unknown or unimplemented command:', command);
    }
  }
  
  /**
   * End the current workflow
   */
  static endWorkflow() {
    console.log('Executing system.endworkflow');
    const workflowState = useWorkflowStore.getState();
    const interactionState = useInteractionStore.getState();
    
    // Mark current workflow as completed in interaction if in interaction mode
    if (interactionState.isInInteraction() && workflowState.currentWorkflow?.WorkflowUID) {
      interactionState.completeWorkflow(workflowState.currentWorkflow.WorkflowUID);
    }
    
    // Check if we're in a sub-workflow
    if (workflowState.workflowStack.length > 0) {
      // Return to parent workflow
      workflowState.returnFromSubWorkflow();
    } else {
      // End the workflow session
      workflowState.endSession();
      
      // If not in interaction mode, clear variables
      if (!interactionState.isInInteraction()) {
        const variableState = useVariableStore.getState();
        variableState.clearAllVariables();
      }
    }
  }
  
  /**
   * End the entire interaction
   */
  static endInteraction() {
    console.log('Executing system.endinteraction');
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to end this interaction? All workflow data will be cleared.'
    );
    
    if (confirmed) {
      const workflowState = useWorkflowStore.getState();
      const interactionState = useInteractionStore.getState();
      const variableState = useVariableStore.getState();
      
      // End interaction
      interactionState.endInteraction();
      
      // End workflow session
      workflowState.endSession();
      
      // Clear all variables
      variableState.clearAllVariables();
      
      // Navigate to dashboard
      window.location.href = '/';
    }
  }
}