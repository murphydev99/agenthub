# VistioWeb Execute Commands and Evaluate Formulas Documentation
 
## Execute Commands
 
The Execute property on workflow steps triggers system functions when an answer is selected or auto-selected. Multiple functions can be executed using separators.
 
### Command Separators
- **Semicolon (`;`)**: Primary separator for multiple commands
- **Comma (`,`)**: Alternative separator (WellCare environments and when not used within parameters)
 
### System Execute Commands
 
#### 1. `system.endworkflow`
**Purpose**: Ends the current workflow
**Parameters**: None
**Behavior**:
- Clears workflow state
- Emits workflow completion event
- Resets selected workflow
- Refreshes alias list
 
**Example**:
```
system.endworkflow
```
 
#### 2. `system.endinteraction`
**Purpose**: Ends the entire customer interaction
**Parameters**: None
**Behavior**:
- Shows end interaction window
- Checks if call closing workflow required
- Clears interaction GUID
 
**Example**:
```
system.endinteraction
```


### Multiple Command Execution
 
Commands can be chained:
```
system.sendemail(...);system.endworkflow
```
 
Or with comma separation (WellCare):
```
system.dispositioncall(Complete),system.endworkflow
```
 
## Evaluate Formulas
 
The Evaluate property on answers determines auto-answer conditions and visibility. Formulas return "true", "false", or "unknown".
 
### Basic Syntax
 
**Variable Reference**:
- `variableName` - Workflow variable
- `customer.variableName` - Customer variable
 
**Special Variables**:
- `today` - Current date
- `now` - Current datetime
 
### Logical Operators
 
#### AND Operator
**Syntax**: `condition1.and.condition2`
**Returns**: true if all conditions are true
 
**Example**:
```
authenticated.equals(true).and.accounttype.equals(Premium)
```
 
#### OR Operator
**Syntax**: `condition1.or.condition2`
**Returns**: true if any condition is true
 
**Example**:
```
state.equals(TX).or.state.equals(NY)
```
 
### Comparison Operations
 
#### String Comparisons
- `equals(value)` - Exact match (case-insensitive)
- `notequals(value)` - Not equal
- `contains(value)` - For array variables
- `notcontains(value)` - For array variables
- `empty` - Is null or whitespace
- `notempty` - Has value
 
**Examples**:
```
username.equals(admin)
status.notequals(closed)
selectedoptions.contains(option1)
email.notempty
```
 
#### Numeric Comparisons
- `equals(number)` - Equal to
- `notequals(number)` - Not equal to
- `lessthan(number)` - Less than
- `lessthanequalto(number)` - Less than or equal
- `greaterthan(number)` - Greater than
- `greaterthanequalto(number)` - Greater than or equal
 
**Examples**:
```
age.greaterthanequalto(18)
score.lessthan(100)
quantity.equals(0)
```
 
#### Date Comparisons
- `equals(date)` - Same date
- `notequals(date)` - Different date
- `lessthan(date)` - Before date
- `lessthanequalto(date)` - On or before
- `greaterthan(date)` - After date
- `greaterthanequalto(date)` - On or after
 
**Examples**:
```
duedate.lessthan(today.addDays(7))
birthdate.lessthanequalto(today.addDays(-6570))
startdate.greaterthan(2024-01-01)
```
 
### Date/Time Functions
 
#### Date Manipulation
- `today.addDays(n)` - Add days to today
- `today.addBusinessDaysEOD(n)` - Add business days, end of day
- `today.time(HH:mm:ss)` - Today at specific time
- `variableName.addDays(n)` - Add days to date variable
 
**Examples**:
```
today.addDays(30)
today.addBusinessDaysEOD(5)
today.time(17:00:00)
appointmentdate.addDays(7)
```
 
#### Time Functions
- `now.addHours(n)` - Add hours to current time
- `variable.time` - Extract time from datetime
 
**Examples**:
```
now.addHours(24)
lastupdated.time.greaterthan(09:00:00)
```
 
### Mathematical Operations
 
#### Basic Math
- `add(n)` - Addition
- `subtract(n)` - Subtraction
- `multiply(n)` - Multiplication
- `divide(n)` - Division
- `percent(n)` - Percentage calculation
 
**Examples**:
```
total.add(10).greaterthan(100)
price.multiply(1.08)
amount.percent(15)
balance.subtract(payment).equals(0)
```
 
#### Rounding
- `roundUpInt` - Round up to integer
- `roundDownInt` - Round down to integer
 
**Examples**:
```
calculation.roundUpInt.equals(5)
average.roundDownInt.lessthan(10)
```
 
### Variable Interpolation in Formulas
 
Variables can be referenced within formula parameters using `~variable~`:
 
```
amount.greaterthan(~minimumthreshold~)
duedate.equals(~customer.preferreddate~)
```
 
### Complex Formula Examples
 
#### Multi-Condition Authentication Check
```
authenticated.equals(true).and.accountstatus.notequals(suspended).and.lastlogin.greaterthan(today.addDays(-30))
```
 
#### Business Hours Check
```
now.time.greaterthanequalto(09:00:00).and.now.time.lessthanequalto(17:00:00)
```
 
#### Eligibility with Age and Status
```
customer.age.greaterthanequalto(18).and.customer.accounttype.equals(Premium).or.customer.vipstatus.equals(true)
```
 
#### Date Range Validation
```
selecteddate.greaterthanequalto(today).and.selecteddate.lessthanequalto(today.addDays(90))
```
 
#### Financial Calculation
```
subtotal.multiply(1.08).add(shippingcost).subtract(discount).lessthan(creditlimit)
```
 
### Auto-Answer Logic
 
When an answer has an Evaluate formula:
 
1. **Formula evaluates to "true"**:
   - Answer is automatically selected
   - Execute function runs
   - Variables are set
   - Notes generated
   - Next steps processed
 
2. **Formula evaluates to "false"**:
   - If `HideIfEvaluateTrue` is set, answer is hidden
   - Otherwise, answer shown as normal button
 
3. **Formula evaluates to "unknown"**:
   - Answer shown as normal button
   - Usually due to missing variables
 
### Special Evaluation Contexts
 
#### Array Handling
Arrays (JSON arrays) support special operations:
- `contains(value)` - Check if array includes value
- `notcontains(value)` - Check if array doesn't include value
 
**Example**:
```
selectedroles.contains(Admin)
permissions.notcontains(Delete)
```
 
#### Null/Empty Checking
- `empty` - True if null, undefined, or whitespace
- `notempty` - True if has any value
 
**Example**:
```
email.empty
phonenumber.notempty
```
 
#### Case Sensitivity
- All string comparisons are **case-insensitive**
- Variable names are **case-insensitive** when retrieved
 
### Error Handling in Formulas
 
**Missing Variables**:
- Return null value
- Comparisons with null typically return "unknown"
- Empty/notempty work with null values
 
**Invalid Operations**:
- Invalid date formats return "unknown"
- Non-numeric values in math operations return "unknown"
- Division by zero returns empty string
 
### Performance Considerations
 
1. **Evaluation Order**:
   - AND operations stop at first false
   - OR operations stop at first true
   - Complex formulas evaluated left to right
 
2. **Caching**:
   - Variable values cached during evaluation
   - Date calculations computed once per evaluation
 
3. **Best Practices**:
   - Put most likely to fail conditions first in AND chains
   - Put most likely to succeed conditions first in OR chains
   - Use simple conditions when possible
 
## Implementation Notes
 
### Execute Function Processing Flow
 
```typescript
// Simplified flow from qstack.component.ts
processAnswer(buttonId) {
  // 1. Find answer with buttonId
  // 2. Check if Execute property exists
  // 3. Split by separator (; or ,)
  // 4. Call executeFunction for each
  // 5. Process next steps
}
 
executeFunction(functionToExecute: string) {
  // Parse function name and parameters
  // Route to appropriate handler
  // Update variables/state
  // Make API calls if needed
}
```
 
### Evaluate Formula Processing Flow
 
```typescript
// Simplified flow from evaluate.ts
evaluateFormula(formula: string): string {
  // 1. Check for logical operators (.and. / .or.)
  // 2. Split and recurse if found
  // 3. Parse variable reference
  // 4. Apply transformation functions
  // 5. Evaluate comparison
  // 6. Return "true", "false", or "unknown"
}
```
 
## Migration Recommendations for React
 
### Execute Commands
- Implement as action dispatchers in Redux/Context
- Create command registry for extensibility
- Add command validation before execution
- Implement undo/redo for certain commands
 
### Evaluate Formulas
- Build expression parser/evaluator library
- Cache compiled expressions for performance
- Add formula builder UI for workflow creators
- Implement real-time formula validation
 
### Enhancements to Consider
1. **New Execute Commands**:
   - `system.saveProgress` - Save current state
   - `system.showModal(content)` - Display modal
   - `system.callAPI(endpoint,method,body)` - Generic API call
   - `system.setMultipleVariables(json)` - Batch variable update
 
2. **New Evaluate Functions**:
   - Regular expression matching: `matches(pattern)`
   - String operations: `length`, `substring(start,end)`, `indexOf(str)`
   - Array operations: `count`, `first`, `last`, `any`, `all`
   - Type checking: `isNumber`, `isDate`, `isEmail`
 
3. **Formula Improvements**:
   - Support for parentheses in logical expressions
   - Ternary operator: `condition ? trueValue : falseValue`
   - Null coalescing: `variable ?? defaultValue`
   - Formula comments: `/* comment */`
 