# AgentHub - Customer Service Agent Workflow System Documentation
 
## 1. System Overview
 
### Primary Purpose
AgentHub is a comprehensive customer service agent workflow execution platform that guides agents through structured workflows for handling customer interactions. The system dynamically renders workflow steps, collects data, manages session state, and integrates with multiple backend systems including CRM, email, and telephony platforms.
 
### Target Users
- **Primary Users**: Customer service agents handling inbound/outbound calls
- **Client Organizations**: Various organizations including WellCare, TxDOT, NYC Service Center, and governmental agencies
- **Supervisors**: Access to agent performance data and email notifications
 
### Core Workflow Integration
The system loads JSON-based workflow configurations from a backend REST API and executes them step-by-step, providing:
- Dynamic UI generation based on workflow steps
- Variable collection and evaluation
- Conditional branching logic
- Sub-workflow loading and execution
- Integration with external systems (CRM, telephony, email)
 
## 2. Core Workflow Execution Logic
 
### Workflow Loading and Initialization
 
The workflow loading process follows this sequence:
 
1. **Authentication Check** (if required)
   - System checks for special "authenticate" workflow alias
   - Sets authentication variables based on login status
 
2. **Alias Loading**
   - Fetches all available workflow aliases from REST API
   - Categorizes into special aliases (authenticate, call closing, opening script, etc.)
   - Filters available workflows based on authentication status
 
3. **Initial Workflow Selection**
   - Automatic loading for specific clients (WellCare, CCACSAT)
   - Manual selection via typeahead search for other clients
   - Special handling for inbound calls
 
4. **Workflow Caching**
   - Workflows cached in localStorage for performance
   - Cache invalidation when workflows updated on server
 
### Step-by-Step Execution Flow
 
```typescript
// Simplified execution flow from qstack.component.ts
loadWorkflow(WorkflowName, initial: boolean) {
  // 1. Check cache for workflow
  // 2. If not cached, fetch from REST API
  // 3. Parse JSON configuration
  // 4. Process root steps sequentially
  // 5. Handle each step based on StepType
}
 
processRootSteps(WorkflowName: string) {
  // Iterate through workflow.Steps
  // For each step:
  //   - LoadWorkflow: Load sub-workflow
  //   - VariableAssignment: Process variables
  //   - Others: Create UI row
}
```
 
### Navigation Logic
 
**Next Step Determination**:
- After user interaction (button click, text input)
- System searches for next steps using `searchForNextStep()`
- Considers answer-specific substeps
- Evaluates conditions for auto-answering
- Handles multiple next steps (parallel execution)
 
### Session Management
 
**Session States**:
- `InteractionGUID`: Unique identifier for entire customer interaction
- `PersonGUID`: Identifier for the person being served
- `WorkflowGUID`: Current workflow instance
- Variables stored in sessionStorage with type classification
 
**Session Lifecycle**:
1. Start: New InteractionGUID generated
2. Active: Workflow execution, variable collection
3. Call Closing: Optional closing workflow
4. End: Clear workflow variables, maintain cache
 
## 3. Step Type Implementations
 
### UserInstruction
**Purpose**: Display informational text to agent
**UI Rendering**:
- Accordion layout if secondary text exists
- HTML content with variable interpolation
- Dark background with white text for emphasis
**Interactions**: Read-only, expandable/collapsible
**Data Flow**: No data collection, variables can be displayed
 
### Question
**Purpose**: Present choices to agent
**UI Rendering**:
- Button layout (1-2 buttons horizontal, 3+ vertical)
- Dynamic button coloring (green/red)
- Auto-sizing based on text length
**Answer Logic**:
- Evaluate conditions for auto-answering
- Execute functions on selection
- Generate notes from templates
- Set variables based on selection
 
### Collect
**Purpose**: Gather data from agent input
**UI Rendering**:
- Input types: text, date, datetime, phone, email, money
- Validation indicators
- Auto-focus on render
**Validation**:
- Format-specific validation (phone: 10 digits, email: regex)
- Min/max date constraints
- Character length limits
- Real-time validation feedback
 
### LoadWorkflow
**Purpose**: Load and execute sub-workflows
**Execution**:
- Can clear current window if specified
- Maintains parent workflow context
- Variables shared across workflows
- Return to parent after completion
 
### VariableAssignment
**Purpose**: Set variables programmatically
**Processing**:
- No UI rendering
- Evaluates expressions
- Sets workflow or customer variables
- Triggers dependent evaluations
 
### NotesBlock
**Purpose**: Display copyable text blocks
**UI Rendering**:
- Black background for emphasis
- Copy to clipboard button
- Variable interpolation in text
 
### UserInstruction-Light
**Purpose**: Less prominent instructional text
**UI Rendering**:
- Light background
- Expandable if secondary content
- Used for supplementary information
 
## 4. Variable System
 
### Variable Types
 
```typescript
enum TrajectoryVariableType {
  WorkFlowCache,    // Cached workflows (localStorage)
  Credentials,      // Auth tokens (sessionStorage)
  WorkflowVariable, // Workflow-specific (sessionStorage)
  CustomerVariable  // Customer data (sessionStorage)
}
```
 
### Variable Collection Flow
 
1. **Input Collection**:
   - User enters data in Collect step
   - Format-specific handlers process input
   - Variable stored with specified name
 
2. **Storage**:
   ```typescript
   TrajectoryVariable.setVariable(name, value, type)
   // Serializes to JSON and stores in appropriate storage
   ```
 
3. **Variable Evaluation**:
   - Supports complex expressions: `variable.add(5).equals(10)`
   - Date operations: `today.addDays(5)`
   - Conditional logic: `.and.`, `.or.`
   - Mathematical operations: add, subtract, multiply, divide, percent
 
4. **Auto-Evaluation**:
   - Answers can have evaluation conditions
   - Auto-select if condition evaluates to true
   - Skip manual selection when conditions met
 
### Variable Interpolation
 
**Syntax**: `~variableName~` or `#variableName#`
**Contexts**:
- Notes generation
- UI text display
- Email templates
- Conditional evaluations
 
**Special Variables**:
- `today`: Current date
- `now`: Current datetime
- `customer.X`: Customer-specific data
- System variables: InteractionGUID, LoggedInUsername
 
## 5. Answer Selection Logic
 
### Answer Presentation
 
```typescript
// Answer button generation logic
for each answer in step.Answers:
  if (answer.Evaluate):
    if (evaluateFormula(answer.Evaluate) == "true"):
      // Auto-answer this option
      processAutoAnswer(answer)
    else if (answer.HideIfEvaluateTrue):
      // Hide this answer option
      continue
  else:
    // Create button for manual selection
    createAnswerButton(answer)
```
 
### Auto-Selection Logic
 
**Conditions for Auto-Selection**:
- Evaluate expression returns "true"
- No HideIfEvaluateTrue flag
- First matching answer selected
- Subsequent steps processed automatically
 
### Manual Selection
 
**Process**:
1. Agent clicks answer button
2. Button state updated (visual feedback)
3. Execute associated function
4. Set variables if specified
5. Generate notes from template
6. Load next steps
 
### Path Determination
 
**Next Step Resolution**:
- Check answer-specific substeps
- Evaluate conditions for each potential path
- Multiple paths can be triggered
- LoadWorkflow steps branch execution
 
## 6. Data Collection (Collect Steps)
 
### Data Types and Validation
 
**Text**:
- Basic text input
- Character length limits
- No specific validation
 
**Phone**:
- Format: (XXX) XXX-XXXX
- Validation: 10 digits, numeric only
- Auto-formatting on input
 
**Email**:
- Regex validation
- Real-time validation feedback
- Clear error states
 
**Date/DateTime**:
- HTML5 date pickers
- Min/max date constraints
- Format: MM-DD-YYYY or MM-DD-YYYY h:mm a
 
**Money**:
- Currency formatting
- Removes $ and , for storage
- Decimal validation
 
### Validation Rules
 
```typescript
// Phone validation example
isPhoneNumber(search: string): boolean {
  if (search.length != 10) return false;
  if (!isNumberValid(search)) return false;
  return true;
}
 
// Email validation
isEmail(search: string): boolean {
  const regexp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexp.test(search);
}
```
 
### Data Storage
 
- All collected data stored as workflow variables
- Available for interpolation in subsequent steps
- Can trigger note generation
- Used in conditional evaluations
 
## 7. Sub-workflow Handling (LoadWorkflow)
 
### Loading Process
 
1. **Trigger**: LoadWorkflow step encountered
2. **Cache Check**: Look for cached workflow
3. **Fetch**: Get from API if not cached
4. **Context Preservation**: Maintain parent workflow reference
5. **Execution**: Process sub-workflow steps
 
### Context Management
 
```typescript
subWorkflows: IWorkflow[] = []  // Stack of loaded sub-workflows
 
loadSubWorkflow(workflowName, parentButtonGUID, stepGUID) {
  // Fetch workflow
  // Add to subWorkflows array
  // Process steps maintaining context
}
```
 
### Variable Passing
 
- All variables global to interaction
- No explicit parameter passing needed
- Sub-workflows can read/write all variables
- Changes persist to parent workflow
 
### Return Logic
 
- No explicit return mechanism
- Sub-workflow completes when all steps processed
- Parent workflow continues from next step
- Can clear window before loading if specified
 
## 8. UI/UX Patterns
 
### Layout Structure
 
```
┌─────────────────────────────────────┐
│         Notes Box (top)             │
│    [Copy to Clipboard Button]       │
├─────────────────────────────────────┤
│     Workflow Search/Selection       │
├─────────────────────────────────────┤
│                                     │
│        Workflow Steps               │
│         (Scrollable)                │
│                                     │
│  - UserInstruction (accordion)      │
│  - Question with buttons            │
│  - Collect input fields             │
│  - Notes blocks                     │
│                                     │
└─────────────────────────────────────┘
```
 
### Key UI Components
 
**Notes Box**:
- Persistent across workflow
- Auto-scroll to bottom
- Copy to clipboard functionality
- Template-based generation
 
**Workflow Search**:
- Typeahead with filtering
- Alias-based selection
- Hidden during workflow execution
 
**Step Rendering**:
- Sequential display
- Auto-scroll to new content
- Focus management for inputs
- Responsive button layouts
 
### Agent Interaction Patterns
 
**Keyboard Navigation**:
- Auto-focus on new input fields
- Tab navigation through buttons
- Enter to submit collect fields
 
**Visual Feedback**:
- Button state changes on selection
- Validation error indicators
- Loading states for async operations
- "Thinking" indicator for AI operations
 
**Progress Indicators**:
- Current workflow name displayed
- End Workflow button when appropriate
- Visual distinction between step types
 
## 9. API Integration
 
### REST Endpoints
 
**Authentication**:
- `/Authenticate/Create` - Basic auth
- `/MSAL` - Microsoft auth
- `/Osvc` - Oracle Service Cloud auth
- NYCSC auth with OAuth2
 
**Workflow Management**:
- `/Workflow/GetByName/{name}` - Fetch workflow
- `/Alias/` - Get all aliases
- `/Events/Create/` - Log events
 
**Data Operations**:
- `/Email` - Send emails
- `/WellCareData/` - Provider data
- `/PersonalizerRank` - AI recommendations
- `/SupervisorEmail/GetByName/` - Supervisor lookup
 
### Request/Response Patterns
 
```typescript
// Standard authenticated request pattern
const httpOptions = {
  headers: new HttpHeaders({
    'authorization': authToken,
    'user': username,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  })
};
 
return this.http.post<T>(url, body, httpOptions)
  .pipe(catchError(this.handleError));
```
 
### Authentication Flow
 
1. **Initial Login**:
   - Collect credentials
   - Authenticate with appropriate service
   - Receive tokens and user details
 
2. **Token Management**:
   - Store in sessionStorage
   - Include in all API requests
   - Handle expiration (4-hour typical)
 
3. **Multi-System Auth**:
   - MSAL for Microsoft environments
   - Oracle Service Cloud integration
   - Custom auth for specific clients
 
### Error Handling
 
```typescript
handleError(err: HttpErrorResponse) {
  if (err.status === 401) {
    // Show login expired modal
    // Force re-authentication
  } else {
    // Log and display error
    console.error(err);
  }
}
```
 
## 10. State Management
 
### Application State
 
**Session Storage**:
- Authentication tokens
- User information
- Workflow variables
- Customer data
- Interaction identifiers
 
**Local Storage**:
- Workflow cache
- Alias lists
- User preferences
 
### State Persistence
 
```typescript
// Variable storage pattern
class TrajectoryVariable {
  static setVariable(name, value, type) {
    const variable = { value, type };
    const storage = type === WorkFlowCache
      ? localStorage
      : sessionStorage;
    storage.setItem(name.toLowerCase(), JSON.stringify(variable));
  }
}
```
 
### Navigation State
 
- No router-based navigation
- Single-page application
- Workflow stack for sub-workflow tracking
- Scroll position management
 
### Error Recovery
 
**Mechanisms**:
- Workflow cache prevents data loss
- Auto-save of variables
- Event logging for audit trail
- Graceful degradation on API failures
 
## 11. Business Rules and Validation
 
### Complex Business Logic
 
**WellCare Provider Outreach**:
```typescript
// Auto-dial and disposition logic
if (location.includes('wellcare')) {
  showDialer = true;
  autoLoadWorkflow = true;
  phoneNumber = '91' + providerPhone;
  // Disposition updates on call completion
}
```
 
**Authentication Requirements**:
- Some workflows require authentication
- Alias filtering based on auth status
- Special handling for anonymous callers
 
**Call Closing Requirements**:
- Mandatory call closing workflow for some clients
- Prevents interaction end without completion
- Sets `callclosingcompleted` flag
 
### Validation Patterns
 
**Multi-Field Dependencies**:
```typescript
// TxDOT validation example
if (BPAccountId || ContractAccount) && PIN) {
  if (PIN.length > 4 || !isNumeric(PIN)) {
    showError("PIN must be 4 digits");
  } else {
    validateAccount();
  }
}
```
 
**Conditional Requirements**:
- Fields required based on previous answers
- Dynamic validation rules from workflow config
- Client-specific validation logic
 
### Compliance Requirements
 
**Audit Logging**:
- Every user action logged
- Timestamps and user IDs
- Interaction tracking
- Event trail for compliance
 
**Data Security**:
- No sensitive data in localStorage
- Session timeout handling
- Encrypted credential storage
- Secure API communication
 
## 12. Edge Cases and Error Handling
 
### Missing Data Handling
 
**Variable Not Found**:
```typescript
getVariable(name, type) {
  const stored = storage.getItem(name);
  if (!stored) {
    return { value: null, type: null };
  }
  return JSON.parse(stored);
}
```
 
**Graceful Defaults**:
- Empty string for missing text variables
- Skip interpolation if variable missing
- Continue workflow despite missing data
 
### Network Failures
 
**Retry Logic**:
- Exponential backoff for API calls
- Cache fallback for workflows
- Queue events for later submission
- User notification of connection issues
 
### Invalid Configurations
 
**Workflow Validation**:
- Handle missing step types
- Skip invalid answers
- Default to safe UI rendering
- Log configuration errors
 
### Session Management
 
**Timeout Handling**:
- 4-hour session timeout
- Login expiration modal
- Preserve workflow state
- Resume after re-authentication
 
**Multiple Tabs**:
- Session storage shared across tabs
- Prevent concurrent modifications
- Warning on multiple active sessions
 
## 13. Performance Considerations
 
### Caching Strategy
 
**Workflow Caching**:
```typescript
// Cache in localStorage for persistence
if (!cached) {
  fetchFromAPI().then(workflow => {
    localStorage.setItem(name, JSON.stringify(workflow));
  });
}
```
 
**Benefits**:
- Instant workflow loading
- Reduced API calls
- Offline capability (partial)
- Better user experience
 
### Lazy Loading
 
**On-Demand Loading**:
- Sub-workflows loaded when needed
- Aliases fetched on first use
- Customer data retrieved as required
 
### Large Data Handling
 
**Pagination**:
- Contact search results paginated
- Incident history loaded on demand
- Scrollable UI for long workflows
 
**Memory Management**:
- Clear variables after interaction
- Limit cache size
- Remove old event logs
 
## 14. Known Issues and Pain Points
 
### Current Limitations
 
1. **Browser Dependency**:
   - Some features require specific browsers
   - Chrome/Edge recommended
   - Safari compatibility issues
 
2. **Session Management**:
   - No session recovery after browser crash
   - Lost work if timeout during interaction
   - No draft/save functionality
 
3. **Performance**:
   - Large workflows slow to render
   - Memory usage with many variables
   - API latency affects responsiveness
 
### User Complaints
 
1. **Navigation**:
   - No back button functionality
   - Cannot edit previous answers
   - Workflow restart required for changes
 
2. **Error Messages**:
   - Technical errors shown to users
   - Insufficient guidance on failures
   - No retry options for failed operations
 
3. **UI/UX**:
   - Small buttons on high-resolution screens
   - Scrolling issues with long workflows
   - Modal dialogs block interaction
 
### Technical Debt
 
1. **Code Organization**:
   - Monolithic component (qstack)
   - Mixed concerns (UI + business logic)
   - Limited code reuse
 
2. **Testing**:
   - Minimal unit test coverage
   - No integration tests
   - Manual testing required
 
3. **Documentation**:
   - Limited inline comments
   - No API documentation
   - Workflow creation undocumented
 
## 15. Migration Recommendations for React
 
### Architecture Improvements
 
**Component Structure**:
```jsx
// Suggested React component hierarchy
<App>
  <AuthProvider>
    <WorkflowProvider>
      <Layout>
        <NotesPanel />
        <WorkflowSearch />
        <WorkflowRenderer>
          <StepRenderer step={currentStep} />
        </WorkflowRenderer>
      </Layout>
    </WorkflowProvider>
  </AuthProvider>
</App>
```
 
**State Management**:
- Use Redux or Zustand for global state
- React Context for workflow context
- Local state for component-specific data
- Custom hooks for reusable logic
 
### Feature Enhancements
 
**Missing Features to Add**:
 
1. **Workflow Navigation**:
   - Back/forward navigation
   - Step breadcrumbs
   - Progress indicator
   - Save and resume
 
2. **Enhanced Validation**:
   - Real-time validation feedback
   - Custom validation messages
   - Field dependencies visualization
   - Validation summary
 
3. **Better Error Handling**:
   - User-friendly error messages
   - Retry mechanisms
   - Offline mode
   - Error recovery workflows
 
4. **Improved UI/UX**:
   - Responsive design
   - Accessibility (ARIA)
   - Keyboard shortcuts
   - Dark mode support
   - Customizable themes
 
5. **Developer Experience**:
   - TypeScript throughout
   - Component library (Storybook)
   - Automated testing
   - Hot module replacement
   - Better debugging tools
 
### Performance Optimizations
 
1. **Code Splitting**:
   - Lazy load step components
   - Dynamic imports for workflows
   - Bundle optimization
 
2. **Rendering**:
   - Virtual scrolling for long lists
   - Memoization of expensive computations
   - Optimistic UI updates
 
3. **Caching**:
   - Service worker for offline
   - IndexedDB for large data
   - Smart cache invalidation
 
## 16. Code Examples
 
### Workflow Execution Core
 
```typescript
// Core workflow processing logic
processRootSteps(WorkflowName: string): void {
  this.root.Steps.forEach((step) => {
    if (step.StepType.toLowerCase() == "loadworkflow") {
      if (step.ClearWindow?.toLowerCase() == 'true') {
        this.qrows = [];
      }
      this.loadSubWorkflow(step.WorkflowName, "", step.GUID);
      this.createEvent('LoadWorkflow', step.WorkflowName, step.GUID, '', '');
    }
    else if (step.StepType.toLowerCase() == "variableassignment") {
      const newRow = this.processVariableAssignments(step, WorkflowName);
      if (newRow != null) {
        this.qrows.push(newRow);
      }
    }
    else {
      const newRow = this.getRowFromStep(step, "", WorkflowName);
      if (newRow != null) {
        this.qrows.push(newRow);
      }
    }
  });
}
```
 
### Variable Evaluation Engine
 
```typescript
// Complex expression evaluation
evaluateFormula(formula: string): string {
  if (formula.toLowerCase().indexOf('.or.') > -1) {
    const evaluations = this.splitBasedOnString(formula, '.or.');
    let evaluateTrue = false;
    evaluations.forEach(e => {
      if (this.evaluateFormula(e).toLowerCase() == "true") {
        evaluateTrue = true;
      }
    });
    return String(evaluateTrue).toLowerCase();
  }
 
  // Process components
  const components = this.splitComponents(formula, ['.']);
  let value1 = this.getVariableValue(components[0]);
 
  // Apply transformations
  for (let i = 1; i < components.length; i++) {
    if (this.isAlterFunction(components[i])) {
      value1 = this.alterValue(value1, components[i]);
    } else {
      break;
    }
  }
 
  // Evaluate final condition
  return this.evaluateRule(value1, remainingComponents);
}
```
 
### React Migration Pattern
 
```jsx
// Suggested React implementation for step renderer
const StepRenderer: React.FC<{step: IStep}> = ({step}) => {
  const {variables, setVariable} = useWorkflowContext();
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
 
  const components = {
    'userinstruction': UserInstructionStep,
    'question': QuestionStep,
    'collect': CollectStep,
    'loadworkflow': LoadWorkflowStep,
    'variableassignment': VariableAssignmentStep,
  };
 
  const StepComponent = components[step.StepType.toLowerCase()];
 
  if (!StepComponent) {
    console.error(`Unknown step type: ${step.StepType}`);
    return null;
  }
 
  return (
    <StepComponent
      step={step}
      value={value}
      onChange={setValue}
      errors={errors}
      onValidate={setErrors}
      variables={variables}
      onVariableSet={setVariable}
    />
  );
};
```
 
### Custom Hooks Example
 
```jsx
// Reusable validation hook
const useValidation = (type: string, value: string) => {
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
 
  useEffect(() => {
    switch(type) {
      case 'phone':
        const phoneValid = /^\d{10}$/.test(value.replace(/\D/g, ''));
        setIsValid(phoneValid);
        setError(phoneValid ? '' : 'Phone must be 10 digits');
        break;
      case 'email':
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        setIsValid(emailValid);
        setError(emailValid ? '' : 'Invalid email format');
        break;
      default:
        setIsValid(true);
        setError('');
    }
  }, [type, value]);
 
  return {isValid, error};
};
```
 
## Implementation Priority
 
### Phase 1 - Core Functionality
1. Workflow loading and caching
2. Basic step rendering (UserInstruction, Question, Collect)
3. Variable system
4. Simple validation
 
### Phase 2 - Advanced Features
1. Sub-workflow handling
2. Complex evaluations
3. Auto-answering logic
4. Note generation
 
### Phase 3 - Integrations
1. API authentication
2. Email sending
3. CRM integration
4. Event logging
 
### Phase 4 - Enhancements
1. Improved error handling
2. Performance optimizations
3. Accessibility
4. Advanced UI features
 
## Conclusion
 
This document provides a comprehensive overview of the VistioWeb application architecture and functionality. The system is a sophisticated workflow execution platform with complex business logic, extensive integration points, and room for improvement in a React migration. The key to successful migration will be maintaining functional parity while improving code organization, performance, and user experience.
