import { create } from 'zustand';

export enum VariableType {
  WORKFLOW = 'workflow',
  CUSTOMER = 'customer'
}

interface Variable {
  name: string;
  value: any;
  type: VariableType;
}

interface VariableState {
  variables: Variable[];
  setVariable: (name: string, value: any, type: VariableType) => void;
  getVariable: (name: string) => any;
  clearVariables: () => void;
  interpolateText: (text: string) => string;
  evaluateExpression: (expression: string) => boolean;
}

export const useVariableStore = create<VariableState>((set, get) => ({
  variables: [],

  setVariable: (name, value, type) => {
    set((state) => {
      const existing = state.variables.findIndex(v => v.name === name);
      const newVariables = [...state.variables];
      
      if (existing >= 0) {
        newVariables[existing] = { name, value, type };
      } else {
        newVariables.push({ name, value, type });
      }
      
      console.log(`[Variable] Set ${name} = ${value} (${type})`);
      return { variables: newVariables };
    });
  },

  getVariable: (name) => {
    const variable = get().variables.find(v => v.name === name);
    return variable?.value;
  },

  clearVariables: () => {
    set({ variables: [] });
  },

  interpolateText: (text) => {
    if (!text) return '';
    
    let result = text;
    const variables = get().variables;
    
    // Replace {{variable}} patterns
    variables.forEach(variable => {
      const pattern = new RegExp(`{{${variable.name}}}`, 'g');
      result = result.replace(pattern, String(variable.value || ''));
    });
    
    return result;
  },

  evaluateExpression: (expression) => {
    if (!expression) return true;
    
    let expr = expression;
    const variables = get().variables;
    
    // Replace variable references
    variables.forEach(variable => {
      const pattern = new RegExp(`{{${variable.name}}}`, 'g');
      const value = typeof variable.value === 'string' 
        ? `"${variable.value}"` 
        : String(variable.value || '');
      expr = expr.replace(pattern, value);
    });
    
    // Simple evaluation (be careful with this in production!)
    try {
      // Replace .and. and .or. with && and ||
      expr = expr.replace(/\.and\./g, '&&').replace(/\.or\./g, '||');
      
      // Basic safety check - only allow certain characters
      if (!/^[a-zA-Z0-9\s\(\)\&\|\!\=\<\>\"\'\-\+\*\/\.]+$/.test(expr)) {
        console.warn('Expression contains invalid characters:', expr);
        return false;
      }
      
      // Evaluate the expression
      return Function('"use strict"; return (' + expr + ')')();
    } catch (error) {
      console.error('Failed to evaluate expression:', expression, error);
      return false;
    }
  }
}));