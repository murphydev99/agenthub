// Variable type definitions
// CRITICAL: All variables are stored CLIENT-SIDE ONLY
// No variable data should ever be sent to the server

export enum VariableType {
  WorkflowVariable = 'workflow',
  CustomerVariable = 'customer',
  SystemVariable = 'system',
}

export interface Variable {
  name: string;
  value: any;
  type: VariableType;
  timestamp?: number;
}

export interface VariableContext {
  // Client-side only storage
  workflowVariables: Map<string, any>;
  customerVariables: Map<string, any>;
  systemVariables: Map<string, any>;
  
  // Session identifiers (no PII)
  interactionGUID: string;
  workflowGUID: string;
  personGUID?: string;
}

// Expression evaluation types
export interface EvaluationContext {
  variables: VariableContext;
  currentDate: Date;
}

export type ComparisonOperator = 
  | 'equals' | 'notEquals'
  | 'greaterThan' | 'lessThan'
  | 'greaterThanOrEquals' | 'lessThanOrEquals'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'isEmpty' | 'isNotEmpty';

export type LogicalOperator = 'and' | 'or';

export type MathOperator = 
  | 'add' | 'subtract' | 'multiply' | 'divide' | 'percent';

export type DateOperator = 
  | 'addDays' | 'subtractDays' 
  | 'addMonths' | 'subtractMonths'
  | 'addYears' | 'subtractYears';

// Special system variables
export const SYSTEM_VARIABLES = {
  TODAY: 'today',
  NOW: 'now',
  INTERACTION_GUID: 'InteractionGUID',
  WORKFLOW_GUID: 'WorkflowGUID',
  PERSON_GUID: 'PersonGUID',
  LOGGED_IN_USERNAME: 'LoggedInUsername',
} as const;