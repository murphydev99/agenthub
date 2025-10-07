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
    
    // Find operation patterns (Empty, NotEmpty, Equals(), NotEquals(), Contains(), etc.) - case insensitive
    const operationMatch = condition.match(/\.(empty|notempty|equals|notequals|contains|notcontains|greaterthan|greaterthanequalto|lessthan|lessthanequalto|startswith|endswith)(\([^)]*\))?$/i);
    
    if (!operationMatch) {
      // No operation, just evaluate the variable itself
      const value = this.getVariableValue(condition);
      console.log(`    Evaluating variable: ${condition} = ${value}`);
      return value ? 'true' : 'false';
    }
    
    // Extract variable name and operation
    const variableName = condition.substring(0, operationMatch.index);
    const operation = condition.substring(operationMatch.index! + 1);
    
    // Get variable value
    let value = this.getVariableValue(variableName);
    
    // Log the variable being evaluated
    console.log(`    Evaluating: ${variableName} = ${value}, Operation: ${operation}`);
    
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
    
    // Handle customer variables (Customer.COFA -> check for customer_cofa variable)
    if (name.toLowerCase().startsWith('customer.')) {
      const customerVarName = name.substring(9); // Remove "Customer." prefix
      // Try with underscore prefix (customer_cofa) and without (cofa)
      let value = variableStore.getVariable('customer_' + customerVarName);
      if (value === undefined || value === null) {
        value = variableStore.getVariable(customerVarName);
      }
      return value;
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
        // Special handling for boolean comparisons
        if (strParam.toLowerCase() === 'true' || strParam.toLowerCase() === 'false') {
          const boolValue = value === true || value === 'true' || value === 'True' || value === 'TRUE' || value === 1 || value === '1';
          const compareBool = strParam.toLowerCase() === 'true';
          return boolValue === compareBool ? 'true' : 'false';
        }
        // Case-insensitive string comparison
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