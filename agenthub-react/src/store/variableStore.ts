import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define types inline to avoid import issues
export enum VariableType {
  WorkflowVariable = 'workflow',
  CustomerVariable = 'customer',
  SystemVariable = 'system',
}

export const SYSTEM_VARIABLES = {
  TODAY: 'today',
  NOW: 'now',
  INTERACTION_GUID: 'InteractionGUID',
  WORKFLOW_GUID: 'WorkflowGUID',
  PERSON_GUID: 'PersonGUID',
  LOGGED_IN_USERNAME: 'LoggedInUsername',
} as const;

// CRITICAL: All variables are stored CLIENT-SIDE ONLY
// No customer data is ever sent to the server

interface VariableState {
  // Client-side only storage
  workflowVariables: Map<string, any>;
  customerVariables: Map<string, any>;
  systemVariables: Map<string, any>;
  
  // Actions
  setVariable: (name: string, value: any, type: VariableType) => void;
  getVariable: (name: string) => any;
  clearVariables: (type?: VariableType) => void;
  clearAllVariables: () => void;
  
  // Variable interpolation (replaces ~#varName#~ or ~varName~ with values)
  interpolateText: (text: string) => string;
  
  // Expression evaluation (client-side only)
  evaluateExpression: (expression: string) => string;
  
  // System variables
  initSystemVariables: (interactionGUID: string, workflowGUID: string, username?: string) => void;
}

// Helper function for testing - allows setting customer variables from console
// Usage: window.setCustomerVariable('COFA', true)
if (typeof window !== 'undefined') {
  (window as any).setCustomerVariable = (name: string, value: any) => {
    const store = useVariableStore.getState();
    store.setVariable(`customer_${name.toLowerCase()}`, value, VariableType.CustomerVariable);
    console.log(`Set Customer.${name} = ${value}`);
  };
  
  (window as any).getCustomerVariable = (name: string) => {
    const store = useVariableStore.getState();
    const value = store.getVariable(`customer_${name.toLowerCase()}`);
    console.log(`Customer.${name} = ${value}`);
    return value;
  };
  
  (window as any).listAllVariables = () => {
    const store = useVariableStore.getState();
    console.log('=== Customer Variables ===');
    store.customerVariables.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('=== Workflow Variables ===');
    store.workflowVariables.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('=== System Variables ===');
    store.systemVariables.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
  };
}

export const useVariableStore = create<VariableState>()(
  persist(
    (set, get) => ({
      workflowVariables: new Map(),
      customerVariables: new Map(),
      systemVariables: new Map(),

      setVariable: (name, value, type) => {
        const normalizedName = name.toLowerCase();
        
        set((state) => {
          const newState = { ...state };
          
          switch (type) {
            case VariableType.WorkflowVariable:
              newState.workflowVariables = new Map(state.workflowVariables);
              newState.workflowVariables.set(normalizedName, value);
              break;
            case VariableType.CustomerVariable:
              newState.customerVariables = new Map(state.customerVariables);
              newState.customerVariables.set(normalizedName, value);
              break;
            case VariableType.SystemVariable:
              newState.systemVariables = new Map(state.systemVariables);
              newState.systemVariables.set(normalizedName, value);
              break;
          }
          
          return newState;
        });
      },

      getVariable: (name) => {
        const normalizedName = name.toLowerCase();
        const state = get();
        
        // Check system variables first
        if (state.systemVariables.has(normalizedName)) {
          return state.systemVariables.get(normalizedName);
        }
        
        // Check workflow variables
        if (state.workflowVariables.has(normalizedName)) {
          return state.workflowVariables.get(normalizedName);
        }
        
        // Check customer variables
        if (state.customerVariables.has(normalizedName)) {
          return state.customerVariables.get(normalizedName);
        }
        
        // Handle special system variables
        if (normalizedName === 'today') {
          return new Date().toISOString().split('T')[0];
        }
        
        if (normalizedName === 'now') {
          return new Date().toISOString();
        }
        
        return null;
      },

      clearVariables: (type) => {
        set((state) => {
          if (!type) {
            return {
              workflowVariables: new Map(),
              customerVariables: new Map(),
            };
          }
          
          switch (type) {
            case VariableType.WorkflowVariable:
              return { workflowVariables: new Map() };
            case VariableType.CustomerVariable:
              return { customerVariables: new Map() };
            case VariableType.SystemVariable:
              return { systemVariables: new Map() };
            default:
              return state;
          }
        });
      },

      clearAllVariables: () => {
        console.log('Clearing all variables');
        set({
          workflowVariables: new Map(),
          customerVariables: new Map(),
          systemVariables: new Map(),
        });
        // Force localStorage clear as well
        localStorage.removeItem('agenthub-variables');
      },

      interpolateText: (text) => {
        if (!text) return text;
        
        // Replace ~#varName#~ or ~varName~ patterns
        return text.replace(/~#?([^~#]+)#?~/g, (match, varName) => {
          const cleanVarName = varName.trim();
          const value = get().getVariable(cleanVarName);
          
          if (value !== null && value !== undefined) {
            console.log(`Variable interpolation: ${match} -> ${value}`);
            return String(value);
          } else {
            console.log(`Variable not found: ${cleanVarName} (keeping ${match})`);
            // Return empty string for missing variables instead of the placeholder
            return '';
          }
        });
      },

      evaluateExpression: (expression) => {
        if (!expression) return 'false';
        
        // This is a simplified evaluation - full implementation would handle:
        // - Complex expressions: variable.add(5).equals(10)
        // - Date operations: today.addDays(5)
        // - Logical operations: condition1.and.condition2
        // - Comparisons: variable==value, variable!=value, etc.
        
        let expr = expression.toLowerCase().trim();
        
        // Handle simple variable==value comparisons
        if (expr.includes('==')) {
          const [varPart, valuePart] = expr.split('==').map(s => s.trim());
          const varValue = get().getVariable(varPart);
          const compareValue = valuePart.replace(/['"]/g, '');
          
          return String(varValue).toLowerCase() === compareValue.toLowerCase() ? 'true' : 'false';
        }
        
        // Handle simple variable!=value comparisons
        if (expr.includes('!=')) {
          const [varPart, valuePart] = expr.split('!=').map(s => s.trim());
          const varValue = get().getVariable(varPart);
          const compareValue = valuePart.replace(/['"]/g, '');
          
          return String(varValue).toLowerCase() !== compareValue.toLowerCase() ? 'true' : 'false';
        }
        
        // Handle isEmpty/isNotEmpty
        if (expr.includes('.isempty')) {
          const varName = expr.replace('.isempty', '').trim();
          const value = get().getVariable(varName);
          return !value || value === '' ? 'true' : 'false';
        }
        
        if (expr.includes('.isnotempty')) {
          const varName = expr.replace('.isnotempty', '').trim();
          const value = get().getVariable(varName);
          return value && value !== '' ? 'true' : 'false';
        }
        
        // Check if it's just a variable name - return its value
        const simpleValue = get().getVariable(expr);
        if (simpleValue !== null) {
          // Convert boolean-like values
          if (simpleValue === true || simpleValue === 'true' || simpleValue === '1') return 'true';
          if (simpleValue === false || simpleValue === 'false' || simpleValue === '0') return 'false';
          return String(simpleValue);
        }
        
        return 'false';
      },

      initSystemVariables: (interactionGUID, workflowGUID, username) => {
        set((state) => {
          const systemVars = new Map(state.systemVariables);
          const customerVars = new Map(state.customerVariables);
          
          systemVars.set('interactionguid', interactionGUID);
          systemVars.set('workflowguid', workflowGUID);
          
          if (username) {
            systemVars.set('loggedinusername', username);
          }
          
          systemVars.set('today', new Date().toISOString().split('T')[0]);
          systemVars.set('now', new Date().toISOString());
          
          // For testing: Set some sample customer variables
          // In production, these would come from the integration
          // TODO: Remove these test values when integrating with real customer data
          customerVars.set('customer_cofa', false);
          customerVars.set('customer_tribal', false);
          customerVars.set('customer_arid', '');
          customerVars.set('customer_spousename', '');
          
          // Set LEPAuthNote for testing
          // This would normally be set based on workflow logic
          systemVars.set('lepauthnote', '');
          
          return { 
            systemVariables: systemVars,
            customerVariables: customerVars
          };
        });
      },
    }),
    {
      name: 'agenthub-variables',
      // Only persist workflow and customer variables, not system
      partialize: (state) => ({
        workflowVariables: Array.from(state.workflowVariables.entries()),
        customerVariables: Array.from(state.customerVariables.entries()),
      }),
      // Restore from persisted format
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.workflowVariables = new Map(state.workflowVariables as any);
          state.customerVariables = new Map(state.customerVariables as any);
        }
      },
    }
  )
);