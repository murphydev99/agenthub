# AgentHub React - Modern Workflow Execution System

A modern React-based rebuild of the AgentHub workflow execution system, featuring enhanced UI/UX, better performance, and improved maintainability.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- The workflow-canvas API running on port 4000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment (optional):
```bash
cp .env.example .env
# Edit .env to point to your API server
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5174 (or another port if 5174 is in use)

### Default Login Credentials
- Username: `admin`
- Password: `WorkflowCanvas2025`

## Features Implemented

✅ **Foundation**
- React 18.3 with TypeScript
- Vite for fast development
- Tailwind CSS v4 for styling
- Shadcn/ui component library

✅ **Authentication**
- Login page with form validation
- Bearer token authentication
- Protected routes
- Auto-logout on 401 errors
- Session persistence

✅ **Core Structure**
- Zustand for state management
- React Query for data fetching
- React Router for navigation
- Modular component architecture

✅ **UI Components**
- Responsive layout with header and sidebar
- Dashboard with statistics cards
- Reusable UI components (Button, Input, Card, Label)

## Project Structure

```
src/
├── components/         # React components
│   ├── layout/        # Layout components (Header, Sidebar)
│   ├── ui/            # Reusable UI components
│   └── workflow/      # Workflow-specific components (coming soon)
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── pages/             # Page components
├── services/          # API and external services
│   └── api/          # API client and services
├── store/             # Zustand state stores
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Next Steps

The foundation is ready. The next phases include:

### Phase 2: Core Workflow Engine
- [ ] WorkflowRenderer component
- [ ] StepRenderer with type discrimination
- [ ] Basic step components (UserInstruction, Question)
- [ ] Variable system implementation
- [ ] Navigation logic (next/previous)

### Phase 3: Advanced Steps
- [ ] Collect step with validation
- [ ] LoadWorkflow for sub-workflows
- [ ] VariableAssignment processing
- [ ] NotesBlock component
- [ ] Answer evaluation logic

### Phase 4: Variable System
- [ ] Expression evaluation engine
- [ ] Variable interpolation
- [ ] Date/math operations
- [ ] Conditional logic (.and., .or.)

## API Integration

The app is configured to connect to the workflow-canvas API at `http://localhost:4000/api`. 

Key endpoints used:
- `/auth/login` - Authentication
- `/auth/verify` - Token verification
- `/workflows` - List workflows (coming soon)
- `/workflows/:uid` - Get/update workflow (coming soon)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:4000/api
```

## Tech Stack

- **Frontend Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.x
- **State Management**: Zustand
- **Routing**: React Router v6
- **UI Components**: Custom components with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod (coming soon)
- **HTTP Client**: Axios

## License

Proprietary - All rights reserved
