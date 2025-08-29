# AgentHub Migration Plan - React Vite Modern Architecture

## Project Overview
Migrating the legacy AgentHub workflow execution system from Angular to a modern React Vite application with enhanced features and improved architecture.

## Technology Stack

### Frontend
- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 5.x
- **State Management**: Zustand (lightweight, TypeScript-first)
- **Routing**: React Router v6
- **UI Components**: Shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Real-time**: Server-Sent Events for AI streaming

### Backend Integration
- **API**: REST API at `/murphsea/workflow-canvas/api`
- **Authentication**: Bearer token with hardcoded admin credentials
- **Database**: Azure SQL (via API)
- **AI**: OpenAI models for workflow generation and search

## OpenAI Models (API – August 2025)

### Core Reasoning & Chat Models

#### **o1 Series**
- **Purpose**: First dedicated reasoning models with deep chain-of-thought
- **Variants**: `o1-preview`, `o1-mini` (80% cheaper), `o1-pro` (most powerful)
- **Strengths**: Exceptional STEM performance (AIME 83% vs GPT-4o's 13%), complex multi-step reasoning

#### **o3 Series** 
- **Purpose**: Successor to o1 with stronger private reasoning
- **Variants**: `o3-mini` (Jan 2025), `o3-mini-high`, `o3` (Apr 2025), `o3-pro` (Jun 2025)
- **Strengths**: Top-tier coding, math, scientific reasoning; outperforms o1 on Codeforces, GPQA Diamond

#### **o4-mini**
- **Purpose**: Compact reasoning model for math, code, visual tasks
- **Capabilities**: Excels in math with Python interpreter, supports text + image input

#### **GPT-5 Series** (Recommended for Workflow Search)
- **Purpose**: Flagship general-purpose model family with dynamic routing
- **Variants**: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-chat`
- **Strengths**: 
  - Unified model adapts reasoning depth dynamically
  - Excels in coding, math, writing, health, vision
  - Context window: ~400k tokens (272k input / 128k output)
  - `gpt-5-chat`: text + image inputs

### Multimodal & Specialty Models

#### **GPT-4o ("omni")**
- **Variants**: `gpt-4o`, `gpt-4o-mini`
- **Strengths**: Native multimodal (text, image, audio), 128k context, natural responses

### Model Selection Guide for AgentHub
- **Workflow Search**: Use `gpt-5-mini` for best instruction-following and cost balance
- **Complex Reasoning**: Use `o3-mini` or `o4-mini` for logical workflow matching
- **Budget Option**: Use `gpt-4o-mini` for basic search functionality

## Architecture Design

### Component Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.tsx           # Main app layout
│   │   ├── Header.tsx           # Navigation & user info
│   │   └── Sidebar.tsx          # Workflow list/search
│   ├── workflow/
│   │   ├── WorkflowRenderer.tsx # Main workflow engine
│   │   ├── StepRenderer.tsx     # Dynamic step component
│   │   ├── steps/
│   │   │   ├── UserInstruction.tsx
│   │   │   ├── Question.tsx
│   │   │   ├── Collect.tsx
│   │   │   ├── LoadWorkflow.tsx
│   │   │   ├── VariableAssignment.tsx
│   │   │   └── NotesBlock.tsx
│   │   └── WorkflowSearch.tsx
│   ├── notes/
│   │   └── NotesPanel.tsx       # Persistent notes display
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── hooks/
│   ├── useWorkflow.ts           # Workflow management
│   ├── useVariables.ts          # Variable system
│   ├── useValidation.ts         # Input validation
│   └── useAuth.ts               # Authentication
├── services/
│   ├── api/
│   │   ├── client.ts            # Axios/fetch setup
│   │   ├── workflows.ts         # Workflow CRUD
│   │   ├── auth.ts              # Auth endpoints
│   │   └── ai.ts                # AI generation
│   ├── storage/
│   │   ├── session.ts           # Session storage
│   │   └── cache.ts             # Local storage cache
│   └── evaluation/
│       └── expression.ts        # Variable evaluation engine
├── store/
│   ├── workflowStore.ts        # Zustand workflow state
│   ├── variableStore.ts        # Variable management
│   └── authStore.ts            # Auth state
├── types/
│   ├── workflow.ts             # Workflow type definitions
│   ├── step.ts                 # Step interfaces
│   └── variable.ts             # Variable types
└── utils/
    ├── validation.ts           # Validation helpers
    ├── formatting.ts           # Format utilities
    └── constants.ts            # App constants
```

## State Management Strategy

### Zustand Stores

#### WorkflowStore
```typescript
interface WorkflowState {
  // Current workflow
  currentWorkflow: Workflow | null;
  workflowStack: Workflow[];  // Sub-workflow stack
  
  // UI state
  currentStepIndex: number;
  completedSteps: Set<string>;
  
  // Actions
  loadWorkflow: (name: string) => Promise<void>;
  loadSubWorkflow: (name: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  answerQuestion: (answerId: string) => void;
}
```

#### VariableStore
```typescript
interface VariableState {
  workflowVariables: Map<string, any>;
  customerVariables: Map<string, any>;
  
  setVariable: (name: string, value: any, type: VariableType) => void;
  getVariable: (name: string) => any;
  evaluateExpression: (expression: string) => boolean;
  interpolateText: (text: string) => string;
}
```

#### AuthStore
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
}
```

## API Integration Map

### Workflow Endpoints
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:uid` - Get single workflow
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:uid` - Update workflow
- `DELETE /api/workflows/:uid` - Soft delete workflow
- `GET /api/workflows/search?query=` - Search workflows
- `GET /api/workflows/alias/:aliasText` - Get by alias

### Authentication
- `POST /api/auth/login` - Login (admin/WorkflowCanvas2025)
- `GET /api/auth/verify` - Verify token

### AI Generation
- `POST /api/generate-workflow-stream` - Stream workflow generation
- `POST /api/ask-workflow-stream` - Stream Q&A about workflow
- `POST /api/generate-document` - Generate executive summary

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Initialize Vite React TypeScript project
- [ ] Setup Tailwind CSS and Shadcn/ui
- [ ] Implement authentication flow
- [ ] Create basic layout components
- [ ] Setup Zustand stores
- [ ] Configure React Query

### Phase 2: Core Workflow Engine (Week 2)
- [ ] Implement WorkflowRenderer component
- [ ] Create StepRenderer with type discrimination
- [ ] Build basic step components (UserInstruction, Question)
- [ ] Implement variable system
- [ ] Add navigation logic (next/previous)

### Phase 3: Advanced Steps (Week 3)
- [ ] Implement Collect step with validation
- [ ] Add LoadWorkflow for sub-workflows
- [ ] Build VariableAssignment processing
- [ ] Implement NotesBlock component
- [ ] Add answer evaluation logic

### Phase 4: Variable System (Week 4)
- [ ] Complete expression evaluation engine
- [ ] Implement variable interpolation
- [ ] Add date/math operations
- [ ] Build conditional logic (.and., .or.)
- [ ] Test complex evaluations

### Phase 5: Enhanced Features (Week 5)
- [ ] Add workflow search/filtering
- [ ] Implement notes generation
- [ ] Add copy to clipboard
- [ ] Build alias management
- [ ] Add workflow caching

### Phase 6: AI Integration (Week 6)
- [ ] Integrate workflow generation
- [ ] Add streaming progress UI
- [ ] Implement Q&A feature
- [ ] Build document generation
- [ ] Add PDF import capability

## Workflow Access & Session Management

### Direct Workflow Access
- **Encoded URL Support**: Users can access workflows directly via encoded URLs
  - Format: `/workflow/{encodedWorkflowId}` or `/w/{encodedAlias}`
  - Base64 or custom encoding for workflow identifiers
  - Bookmark-friendly URLs for frequent workflows
  
### Session Persistence
- **Login Once Per Day**: 
  - Auth token stored with 24-hour expiry
  - Automatic token refresh within same day
  - Only require re-login after 24 hours or explicit logout
  - Token persists across browser tabs/windows
  
### Access Flow
1. User clicks encoded workflow URL
2. If authenticated (within 24hrs): Direct to workflow
3. If not authenticated: 
   - Redirect to login
   - Store intended workflow in session
   - After login, auto-redirect to intended workflow
4. Workflow loads and executes immediately

## Key Improvements Over Legacy

### User Experience
1. **Navigation History**: Back/forward buttons with breadcrumbs
2. **Progress Indicator**: Visual workflow progress bar
3. **Save & Resume**: Ability to save workflow state
4. **Better Error Messages**: User-friendly error handling
5. **Responsive Design**: Mobile-friendly interface
6. **Dark Mode**: Theme switching support
7. **Keyboard Shortcuts**: Power user features

### Developer Experience
1. **TypeScript**: Full type safety
2. **Component Library**: Reusable UI components
3. **Hot Module Replacement**: Fast development
4. **Testing**: Unit and integration tests
5. **Storybook**: Component documentation
6. **Better Debugging**: React DevTools integration

### Performance
1. **Code Splitting**: Lazy load step components
2. **Virtual Scrolling**: For long workflows
3. **Optimistic Updates**: Instant UI feedback
4. **Smart Caching**: IndexedDB for large data
5. **Memoization**: Prevent unnecessary re-renders

### Architecture
1. **Separation of Concerns**: Clear component boundaries
2. **Reusable Hooks**: Shared business logic
3. **Type Safety**: Full TypeScript coverage
4. **Modern Patterns**: Hooks, context, composition
5. **Testability**: Isolated, testable components

## Migration Approach

### Data Migration
1. Export existing workflows from Angular app
2. Transform to new JSON structure if needed
3. Import via API endpoints
4. Validate all workflows work correctly

### Gradual Rollout
1. Deploy new app alongside legacy
2. Feature flag for switching between apps
3. A/B testing with select users
4. Monitor performance and errors
5. Full cutover after validation

## Critical Features to Preserve

### Must Have (Phase 1-3)
- Workflow loading and execution
- Variable collection and evaluation
- Question answering with branching
- Basic validation
- Notes generation
- Session management
- **Direct workflow access via encoded URLs**
- **Session persistence (login once per day)**

### Should Have (Phase 4-5)
- Sub-workflow loading
- Complex expressions
- Auto-answering
- Alias management
- Workflow caching
- Event logging

### Nice to Have (Phase 6+)
- AI workflow generation
- PDF import
- Executive summaries
- Advanced analytics
- Multi-language support
- Offline mode

## Technical Decisions

### Why Zustand over Redux?
- Simpler API with less boilerplate
- TypeScript-first design
- Better performance for our use case
- Easier to learn for team

### Why Shadcn/ui?
- Accessible by default (Radix UI)
- Fully customizable with Tailwind
- Tree-shakeable components
- TypeScript support
- Modern design system

### Why TanStack Query?
- Powerful caching
- Background refetching
- Optimistic updates
- SSE support for streaming
- Error/loading states

## Security Considerations

### CRITICAL: Data Privacy Requirements

**⚠️ NO CUSTOMER DATA TO SERVER**: 
- **All data collected through Collect steps MUST remain client-side only**
- **Customer information entered in workflows MUST NEVER be sent to any API**
- **All workflow execution and variable processing happens in the browser**
- **Only workflow definitions and metadata can be fetched from server**
- **Session data stored in browser localStorage/sessionStorage only**

### Implementation Requirements
1. **Client-Side Only Processing**:
   - All variable evaluation happens in browser
   - All expression parsing done client-side
   - No collected data in API calls
   - No logging of customer information

2. **Authentication**: Bearer token in headers (for workflow access only)
3. **Session Timeout**: 4-hour expiry
4. **Input Validation**: Zod schemas (client-side)
5. **XSS Prevention**: React escaping
6. **HTTPS Only**: Enforce SSL
7. **API Rate Limiting**: Prevent abuse

## Testing Strategy

### Unit Tests
- Component rendering
- Hook logic
- Utility functions
- Expression evaluation

### Integration Tests
- Workflow execution
- API interactions
- State management
- Variable system

### E2E Tests
- Complete workflows
- Authentication flow
- Error scenarios
- Performance metrics

## Performance Metrics

### Target Metrics
- Initial Load: < 3s
- Workflow Load: < 500ms
- Step Transition: < 100ms
- Variable Evaluation: < 50ms
- API Response: < 200ms

### Monitoring
- Sentry for error tracking
- Analytics for user behavior
- Performance monitoring
- API response times
- Cache hit rates

## Next Steps

1. **Setup Development Environment** ✅ COMPLETED
   ```bash
   # Project already created at: /Users/murphsea/agenthub/agenthub-react
   cd /Users/murphsea/agenthub/agenthub-react
   npm install
   npm run dev
   ```

2. **Configure API Client**
   - Setup axios with auth interceptor
   - Configure base URL
   - Add error handling

3. **Create Basic Components**
   - Layout structure
   - Authentication flow
   - Workflow list

4. **Implement Core Engine**
   - Step renderer
   - Variable system
   - Navigation logic

## Success Criteria

- [ ] All legacy workflows execute correctly
- [ ] Performance improvements measurable
- [ ] User satisfaction increased
- [ ] Developer productivity improved
- [ ] Zero data loss during migration
- [ ] Reduced support tickets
- [ ] Faster feature development

## Risk Mitigation

### Technical Risks
- **Complex Evaluation Logic**: Extensive testing, gradual rollout
- **Data Migration**: Backup strategy, validation scripts
- **Performance Regression**: Monitoring, optimization plan

### Business Risks
- **User Training**: Documentation, video tutorials
- **Feature Parity**: Phased approach, feature flags
- **Downtime**: Blue-green deployment

## Documentation Requirements

1. **User Documentation**
   - Getting started guide
   - Feature tutorials
   - FAQ section
   - Video walkthroughs

2. **Developer Documentation**
   - Architecture overview
   - Component API docs
   - State management guide
   - Contributing guidelines

3. **API Documentation**
   - OpenAPI/Swagger spec
   - Authentication guide
   - Rate limits
   - Error codes

## Project Structure Notes

### AgentHub Support Application
- **Frontend**: `/agenthub-support` - React Vite application for support ticket management
- **API**: `/agenthub-support/api-dotnet` - .NET 9 API for ServiceNow integration
  - The API runs on port 5006
  - Frontend runs on port 5174

### AgentHub Support API (Separate Project)
- **Location**: `/agenthub-support-api` - Separate .NET API project (different from the one in agenthub-support)

## Azure Deployment Guide for React Apps (GitHub Actions)

### Prerequisites
1. **Azure Resources**:
   - Resource Group: `DEV-InternalProject`
   - App Service Plan: Linux-based (e.g., `AgentHubDevPlan`)
   - Create Web App: `az webapp create --resource-group DEV-InternalProject --plan YourPlan --name your-app-name --runtime "NODE:18-lts"`

2. **GitHub Secrets**:
   - Create service principal: `az ad sp create-for-rbac --name "your-app-github-action" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/DEV-InternalProject --sdk-auth`
   - Add to GitHub: `gh secret set AZURE_CREDENTIALS --body '{...json output...}'`
   - Add any API keys as secrets (e.g., `OPENAI_API_KEY`)

### GitHub Action Workflow Template

**CRITICAL**: The workflow MUST create a ZIP file before deployment. Azure WebApp deploy action requires a ZIP file, not a folder path!

```yaml
name: Deploy to Azure Web App

on:
  push:
    branches:
      - main
    paths:
      - 'your-app-folder/**'  # Optional: only trigger on changes to your app
      - '.github/workflows/your-workflow.yml'
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: your-app-name
  AZURE_WEBAPP_PACKAGE_PATH: './dist'  # or './your-app-folder/dist' for monorepo
  NODE_VERSION: '18.x'
  WORKING_DIRECTORY: '.'  # or './your-app-folder' for monorepo

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: ${{ env.WORKING_DIRECTORY }}/package-lock.json

    - name: Install dependencies
      run: npm ci
      working-directory: ${{ env.WORKING_DIRECTORY }}

    - name: Build for production
      run: npm run build
      working-directory: ${{ env.WORKING_DIRECTORY }}
      env:
        # Add your environment variables here
        VITE_API_URL: https://your-api.azurewebsites.net/api
        VITE_APP_ENV: production

    # CRITICAL: Must create ZIP file!
    - name: Create deployment package
      run: |
        cd ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}
        zip -r ../deploy.zip .
        cd ..

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ env.AZURE_WEBAPP_NAME }}
        package: deploy.zip  # MUST be a ZIP file!

    - name: Configure startup command
      uses: azure/CLI@v1
      with:
        inlineScript: |
          az webapp config set \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --resource-group DEV-InternalProject \
            --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa"

    - name: Logout from Azure
      run: az logout
```

### Key Configuration Points

1. **ZIP File Creation** (CRITICAL):
   - The deployment MUST use a ZIP file
   - Create ZIP from dist folder: `cd dist && zip -r ../deploy.zip .`
   - Deploy the ZIP: `package: deploy.zip`
   - **Common mistake**: Using `package: ./dist` or `package: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}` directly won't work!

2. **Startup Command**:
   - Use PM2 to serve the SPA: `pm2 serve /home/site/wwwroot --no-daemon --spa`
   - The `--spa` flag ensures proper routing for single-page applications
   - Set this after deployment to ensure it persists

3. **App Service Configuration**:
   ```bash
   # Set Node version
   az webapp config appsettings set --resource-group DEV-InternalProject --name your-app --settings WEBSITE_NODE_DEFAULT_VERSION="~18"
   
   # Enable build during deployment if needed
   az webapp config appsettings set --resource-group DEV-InternalProject --name your-app --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
   ```

4. **Monorepo Setup**:
   - Set `WORKING_DIRECTORY` to your app's folder
   - Adjust paths in the workflow accordingly
   - Use path filters to trigger only on relevant changes

5. **Troubleshooting**:
   - Check logs: `az webapp log tail --resource-group DEV-InternalProject --name your-app`
   - Verify files deployed: Use Kudu console at `https://your-app.scm.azurewebsites.net`
   - Common issue: Files not in `/home/site/wwwroot` means ZIP wasn't created/deployed correctly

### Working Examples
- **agenthub-react**: Deploys to `AgentHubDev` - see `.github/workflows/azure-deploy.yml`
- **agenthub-support**: Deploys to `agenthub-support` - see `agenthub-support/.github/workflows/azure-deploy.yml`

## Current Project Status (As of August 29, 2025)

### ✅ Completed Features

1. **ServiceNow Integration**
   - Fixed ticket creation with proper impact/urgency levels
   - Implemented ticket viewing and updating
   - Added audit history and comments tracking
   - Proper separation of work notes vs customer comments
   - Customer can add comments and update impact/urgency

2. **Chat Support with Workflow Integration**
   - Fully integrated chat system from agenthub-react project
   - AI-powered workflow search using OpenAI (GPT-5-mini model)
   - Workflow execution with SubSteps support
   - Variable interpolation and collection
   - ServiceNow ticket creation from workflow answers (system.servicenow command format: `system.servicenow(Title,Description,Impact,Urgency)`)

3. **UI/UX Updates**
   - Fixed timestamp display issues
   - Updated styling to match site design (red #E94B4B/dark blue #0B2545 theme)
   - HTML rendering in workflow prompts
   - App title changed to "AgentHub Support"
   - Professional dashboard with real-time stats

4. **State Management**
   - Using shared chatbotWorkflowStore from agenthub-react (exact copy to avoid duplication)
   - Proper handling of workflow SubSteps
   - Variable store integration

### 🔧 In Progress: B2C User Identification

**Current Issue**: User identification in ServiceNow showing as "Customer ()" with no name/email.

**Root Cause**: 
- B2C sign-in flow not returning user profile claims (name, email)
- ID token being used instead of access token
- ID token only contains basic claims (sub, aud, iss) but no user profile data
- Account object shows `username: ''` is empty

**What's Been Done**:
- API updated to extract B2C claims properly (checking multiple claim types)
- Added comprehensive claim logging
- Prepared user identification format: "[Submitted by {name} ({email})]"
- Both CreateTicket and UpdateTicket methods ready to use B2C claims

**Next Steps**:
1. **B2C Configuration** - Update B2C sign-in flow to include user profile claims
2. **Token Scopes** - May need to request additional scopes during login
3. **User Attributes** - Ensure B2C user attributes include display name and email

**Files Ready for B2C Integration**:
- `/api-dotnet/Controllers/TicketsController.cs` - Ready to extract claims once available
- `/src/services/api.ts` - Sending ID token in Authorization header
- User identification will show in ServiceNow as: "[Submitted by John Doe (john.doe@example.com)]"

### 🚀 Quick Start

1. Start the API: 
   ```bash
   cd /Users/murphsea/agenthub/agenthub-support/api-dotnet
   dotnet run
   ```

2. Start the frontend:
   ```bash
   cd /Users/murphsea/agenthub/agenthub-support
   npm run dev
   ```

3. Access the application: http://localhost:5174

### 📋 Environment Variables (.env)
```
VITE_API_URL=http://localhost:5006/api
VITE_WORKFLOW_API_URL=http://localhost:4000/api
VITE_WORKFLOW_API_KEY=e1ac5aea76405ab02e6220a5308d5ddc9cc6561853e0fb3c6a861c2c6414b8fa
VITE_OPENAI_API_KEY=sk-svcacct-[...]
```

### 📝 Important Implementation Notes

1. **Shared Code**: Using exact chatbotWorkflowStore from agenthub-react project
2. **ServiceNow Execute**: Format is `system.servicenow(Title,Description,Impact,Urgency)` where Impact/Urgency are 1-3
3. **Chat Workflow Processing**: Handles SubSteps within answers
4. **Authentication**: Currently using B2C ID tokens (need profile claims enabled)

## Conclusion

This migration plan provides a comprehensive roadmap for modernizing the AgentHub application. By leveraging React, Vite, and modern tooling, we'll create a more maintainable, performant, and user-friendly system while preserving all critical functionality from the legacy application.

The phased approach ensures we can deliver value incrementally while minimizing risk. The new architecture will enable faster feature development and better user experiences going forward.