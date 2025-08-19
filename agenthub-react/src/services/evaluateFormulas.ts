import { useVariableStore } from '../store/variableStore';

/**
 * Evaluates formulas for auto-answering and conditional logic
 * Returns "true", "false", or "unknown"
 */
export class EvaluateFormulaProcessor {
  
  /**
   * Main evaluation function
   */
  static evaluateFormula(formula: string | undefined): string {
    if (!formula) return 'unknown';
    
    try {
      console.log('Evaluating formula:', formula);
      
      // Handle OR conditions
      if (formula.toLowerCase().includes('.or.')) {
        const parts = formula.split(/\.or\./i);
        for (const part of parts) {
          if (this.evaluateFormula(part.trim()) === 'true') {
            return 'true';
          }
        }
        return 'false';
      }
      
      // Handle AND conditions
      if (formula.toLowerCase().includes('.and.')) {
        const parts = formula.split(/\.and\./i);
        for (const part of parts) {
          if (this.evaluateFormula(part.trim()) !== 'true') {
            return 'false';
          }
        }
        return 'true';
      }
      
      // Parse single condition
      return this.evaluateCondition(formula);
      
    } catch (error) {
      console.error('Error evaluating formula:', error);
      return 'unknown';
    }
  }
  
  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(condition: string): string {
    const variableStore = useVariableStore.getState();
    
    // Parse the condition - format: variable.operation(value) or variable.property
    const parts = condition.split('.');
    if (parts.length < 2) {
      // Simple variable check
      const value = this.getVariableValue(condition);
      return value ? 'true' : 'false';
    }
    
    const variableName = parts[0];
    const operation = parts.slice(1).join('.');
    
    // Get variable value
    let value = this.getVariableValue(variableName);
    
    // Special variables
    if (variableName.toLowerCase() === 'today') {
      value = new Date().toISOString().split('T')[0];
    } else if (variableName.toLowerCase() === 'now') {
      value = new Date().toISOString();
    }
    
    // Apply transformations and operations
    if (operation.toLowerCase() === 'empty') {
      return (!value || value.toString().trim() === '') ? 'true' : 'false';
    }
    
    if (operation.toLowerCase() === 'notempty') {
      return (value && value.toString().trim() !== '') ? 'true' : 'false';
    }
    
    // Parse operation with parameter
    const opMatch = operation.match(/^(\w+)\((.*)\)$/);
    if (opMatch) {
      const op = opMatch[1].toLowerCase();
      let param = opMatch[2];
      
      // Handle variable interpolation in parameter
      if (param.includes('~')) {
        param = this.interpolateVariables(param);
      }
      
      return this.evaluateOperation(value, op, param);
    }
    
    return 'unknown';
  }
  
  /**
   * Get variable value from store
   */
  private static getVariableValue(name: string): any {
    const variableStore = useVariableStore.getState();
    
    // Handle customer variables
    if (name.toLowerCase().startsWith('customer.')) {
      const customerVarName = name.substring(9);
      return variableStore.getVariable('customer_' + customerVarName);
    }
    
    return variableStore.getVariable(name);
  }
  
  /**
   * Interpolate variables in a string
   */
  private static interpolateVariables(text: string): string {
    const variableStore = useVariableStore.getState();
    
    // Replace ~variableName~ with actual values
    return text.replace(/~([^~]+)~/g, (match, varName) => {
      const value = this.getVariableValue(varName);
      return value !== null && value !== undefined ? value.toString() : '';
    });
  }
  
  /**
   * Evaluate an operation with a parameter
   */
  private static evaluateOperation(value: any, operation: string, parameter: string): string {
    // Convert values for comparison
    const strValue = value?.toString() || '';
    const strParam = parameter || '';
    
    switch (operation) {
      case 'equals':
        return strValue.toLowerCase() === strParam.toLowerCase() ? 'true' : 'false';
        
      case 'notequals':
        return strValue.toLowerCase() !== strParam.toLowerCase() ? 'true' : 'false';
        
      case 'contains':
        // For array variables
        if (Array.isArray(value)) {
          return value.some(v => v.toString().toLowerCase() === strParam.toLowerCase()) ? 'true' : 'false';
        }
        return strValue.toLowerCase().includes(strParam.toLowerCase()) ? 'true' : 'false';
        
      case 'notcontains':
        if (Array.isArray(value)) {
          return !value.some(v => v.toString().toLowerCase() === strParam.toLowerCase()) ? 'true' : 'false';
        }
        return !strValue.toLowerCase().includes(strParam.toLowerCase()) ? 'true' : 'false';
        
      case 'greaterthan':
        return this.compareValues(value, parameter, '>') ? 'true' : 'false';
        
      case 'greaterthanequalto':
        return this.compareValues(value, parameter, '>=') ? 'true' : 'false';
        
      case 'lessthan':
        return this.compareValues(value, parameter, '<') ? 'true' : 'false';
        
      case 'lessthanequalto':
        return this.compareValues(value, parameter, '<=') ? 'true' : 'false';
        
      default:
        console.warn('Unknown operation:', operation);
        return 'unknown';
    }
  }
  
  /**
   * Compare values (numeric or date)
   */
  private static compareValues(value: any, parameter: string, operator: string): boolean {
    // Try numeric comparison first
    const numValue = parseFloat(value);
    const numParam = parseFloat(parameter);
    
    if (!isNaN(numValue) && !isNaN(numParam)) {
      switch (operator) {
        case '>': return numValue > numParam;
        case '>=': return numValue >= numParam;
        case '<': return numValue < numParam;
        case '<=': return numValue <= numParam;
        default: return false;
      }
    }
    
    // Try date comparison
    const dateValue = new Date(value);
    const dateParam = new Date(parameter);
    
    if (!isNaN(dateValue.getTime()) && !isNaN(dateParam.getTime())) {
      switch (operator) {
        case '>': return dateValue > dateParam;
        case '>=': return dateValue >= dateParam;
        case '<': return dateValue < dateParam;
        case '<=': return dateValue <= dateParam;
        default: return false;
      }
    }
    
    // String comparison
    switch (operator) {
      case '>': return value > parameter;
      case '>=': return value >= parameter;
      case '<': return value < parameter;
      case '<=': return value <= parameter;
      default: return false;
    }
  }
}