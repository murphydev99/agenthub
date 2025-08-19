import { useState, useEffect, useRef } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { useWorkflowStore } from '../../../store/workflowStore';
import { useVariableStore, VariableType } from '../../../store/variableStore';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CollectProps {
  row: any;
}

export function Collect({ row }: CollectProps) {
  const { collectValue, addToNotes } = useWorkflowStore();
  const { interpolateText, setVariable, getVariable } = useVariableStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { step, answered } = row;
  const format = step.Format || 'text';
  const variableName = step.VariableName;
  const validation = step.Validation || {};
  
  // Formats that require validation before saving
  const requiresValidation = ['email', 'phone', 'money'].includes(format);
  
  // Interpolate prompt
  const prompt = interpolateText(step.Prompt || '');
  
  // Load existing value from variable store
  useEffect(() => {
    if (variableName && !answered) {
      const existingValue = getVariable(variableName);
      console.log(`Collect: Checking for existing value for ${variableName}:`, existingValue);
      if (existingValue) {
        setValue(String(existingValue));
        // Don't mark as saved - this would trigger auto-advance
        // setIsSaved(true);
      }
    }
  }, [variableName, answered]);
  
  // Auto-focus input when mounted
  useEffect(() => {
    if (!answered && !isSaved && inputRef.current) {
      inputRef.current.focus();
    }
  }, [answered, isSaved]);
  
  // Validate input based on format
  const validateInput = (inputValue: string): boolean => {
    if (!inputValue && validation.required) {
      setError('This field is required');
      return false;
    }
    
    if (!inputValue) {
      setError('');
      return true;
    }
    
    switch (format) {
      case 'phone':
        const phoneDigits = inputValue.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          setError('Phone number must be 10 digits');
          return false;
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputValue)) {
          setError('Invalid email address');
          return false;
        }
        break;
        
      case 'numeric':
        if (!/^\d+$/.test(inputValue)) {
          setError('Only numbers are allowed');
          return false;
        }
        break;
        
      case 'money':
        const moneyValue = inputValue.replace(/[$,]/g, '');
        if (!/^\d+(\.\d{0,2})?$/.test(moneyValue)) {
          setError('Invalid currency format');
          return false;
        }
        break;
        
      case 'date':
        if (!inputValue) {
          setError('Please select a date');
          return false;
        }
        break;
    }
    
    // Check length constraints
    if (validation.minLength && inputValue.length < validation.minLength) {
      setError(`Minimum ${validation.minLength} characters required`);
      return false;
    }
    
    if (validation.maxLength && inputValue.length > validation.maxLength) {
      setError(`Maximum ${validation.maxLength} characters allowed`);
      return false;
    }
    
    setError('');
    return true;
  };
  
  // Format phone number as user types
  const formatPhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };
  
  // Auto-save logic for non-validation formats with debounce
  useEffect(() => {
    if (!requiresValidation && value && variableName && !answered) {
      // Don't auto-save until user has typed a reasonable amount
      const minLength = format === 'date' ? 1 : 2; // Dates save immediately, text needs 2+ chars
      
      if (value.length < minLength) {
        return; // Don't save yet
      }
      
      // Debounce the save - wait for user to stop typing
      const timeoutId = setTimeout(() => {
        let storedValue = value;
        
        // Clean up value for storage
        if (format === 'numeric') {
          storedValue = value.replace(/\D/g, '');
        }
        
        // Set variable in store (client-side only)
        setVariable(variableName, storedValue, VariableType.WorkflowVariable);
        setIsSaved(true);
        
        // Mark as collected in workflow store - this will trigger next step
        collectValue(row.id, storedValue);
        
        // Generate notes if template exists
        if (step.NotesTemplate) {
          const noteText = interpolateText(step.NotesTemplate.replace(/~#?value#?~/gi, storedValue));
          addToNotes(noteText);
        }
      }, 1000); // Wait 1 second after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, requiresValidation, variableName, answered]);

  // For validation-required formats, save when valid with debounce
  useEffect(() => {
    if (requiresValidation && isValid && value && variableName && !answered) {
      // Debounce to avoid saving while user is still typing
      const timeoutId = setTimeout(() => {
        let storedValue = value;
        
        // Clean up value for storage
        if (format === 'phone') {
          storedValue = value.replace(/\D/g, '');
        } else if (format === 'money') {
          storedValue = value.replace(/[$,]/g, '');
        }
        
        // Set variable in store (client-side only)
        setVariable(variableName, storedValue, VariableType.WorkflowVariable);
        setIsSaved(true);
        
        // Mark as collected - this will trigger next step
        collectValue(row.id, storedValue);
        
        // Generate notes if template exists
        if (step.NotesTemplate) {
          const noteText = interpolateText(step.NotesTemplate.replace(/~#?value#?~/gi, storedValue));
          addToNotes(noteText);
        }
      }, 500); // Shorter delay for validation-required fields
      
      return () => clearTimeout(timeoutId);
    } else if (requiresValidation && !isValid && variableName) {
      // Clear variable if it becomes invalid
      setVariable(variableName, '', VariableType.WorkflowVariable);
      setIsSaved(false);
    }
  }, [isValid, value, requiresValidation, variableName, answered]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Apply formatting based on type
    if (format === 'phone') {
      newValue = formatPhoneNumber(newValue);
    } else if (format === 'money' && newValue && !newValue.startsWith('$')) {
      newValue = '$' + newValue;
    }
    
    setValue(newValue);
    const valid = validateInput(newValue);
    setIsValid(valid);
    
    // Reset saved state when user modifies the value
    if (isSaved) {
      setIsSaved(false);
    }
  };
  
  // Determine input type based on format
  const getInputType = () => {
    switch (format) {
      case 'email': return 'text'; // Use text type to avoid email-specific autofill
      case 'date': return 'date';
      case 'datetime': return 'datetime-local';
      case 'numeric': return 'number';
      default: return 'text';
    }
  };
  
  return (
    <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-200">
      {prompt && (
        <div className="text-sm font-medium text-emerald-800">
          <div dangerouslySetInnerHTML={{ __html: prompt }} />
        </div>
      )}
      
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type={getInputType()}
            name={`workflow_field_${row.id}`} // Unique name that password managers won't recognize
            value={value}
            onChange={handleChange}
            disabled={false}
            autoComplete="new-password" // Most aggressive anti-autofill
            data-lpignore="true"
            data-form-type="other"
            data-1p-ignore="true" // For 1Password
            data-bwignore="true" // For Bitwarden
            placeholder={
              format === 'phone' ? '(555) 123-4567' : 
              format === 'email' ? 'email@example.com' :
              format === 'money' ? '$0.00' :
              ''
            }
            className={cn(
              error ? 'border-red-500 pr-10' : ''
            )}
            min={validation.minDate}
            max={validation.maxDate}
          />
          
          {/* Status indicator in input field */}
          {!requiresValidation && isSaved && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600">
              <Check className="h-4 w-4" />
            </div>
          )}
          
          {requiresValidation && value && (
            <div className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2",
              isValid ? "text-green-600" : "text-amber-500"
            )}>
              {isValid ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
          )}
          
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
      
      {/* Help text for validation formats */}
      {requiresValidation && !isSaved && (
        <p className="text-xs text-muted-foreground">
          {format === 'email' && 'Enter a valid email address'}
          {format === 'phone' && 'Enter a 10-digit phone number'}
          {format === 'money' && 'Enter a valid dollar amount'}
        </p>
      )}
    </div>
  );
}