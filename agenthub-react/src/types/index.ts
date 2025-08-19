// Barrel export for all types
// This helps with Vite module resolution issues

export interface Workflow {
  WorkflowName: string;
  WorkflowUID?: string;
  Steps: Step[];
  LastUpdated?: string;
  LastUpdatedBy?: string;
}

export type StepType = 
  | 'userinstruction'
  | 'userinstruction-light'
  | 'question'
  | 'collect'
  | 'loadworkflow'
  | 'variableassignment'
  | 'notesblock';

export interface Step {
  GUID: string;
  StepType: StepType;
  Prompt: string;
  SecondaryText?: string;
  Title?: string;
  
  // For Question steps
  Answers?: Answer[];
  
  // For Collect steps
  VariableName?: string;
  Format?: CollectFormat;
  Validation?: ValidationRule;
  
  // For LoadWorkflow steps
  WorkflowName?: string;
  ClearWindow?: boolean;
  
  // For VariableAssignment steps
  VariableAssignments?: VariableAssignment[];
  
  // For NotesBlock steps
  NotesTemplate?: string;
}

export interface Answer {
  GUID: string;
  Prompt: string;
  AnswerText?: string; // Deprecated, use Prompt
  SubSteps?: Step[];
  
  // Variable assignment
  VariableName?: string;
  VariableValue?: any;
  
  // Auto-evaluation
  Evaluate?: string;
  HideIfEvaluateTrue?: boolean;
  
  // Functions to execute
  FunctionName?: string;
  
  // Notes generation
  NotesTemplate?: string;
}

export type CollectFormat = 
  | 'text'
  | 'numeric'
  | 'alphanumeric'
  | 'email'
  | 'phone'
  | 'date'
  | 'datetime'
  | 'money';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minDate?: string;
  maxDate?: string;
}

export interface VariableAssignment {
  VariableName: string;
  VariableValue: any;
  Evaluate?: string;
}

// Re-export variable types
export { VariableType, SYSTEM_VARIABLES } from './variable';
export type { Variable, VariableContext, EvaluationContext, ComparisonOperator, LogicalOperator, MathOperator, DateOperator } from './variable';