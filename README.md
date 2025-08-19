# AgentHub - Workflow Execution System

This repository contains the modern rebuild of the AgentHub workflow execution system.

## Project Structure

- **`agenthub-react/`** - The main React application (this is where the code is)
- **`CLAUDE.md`** - Migration plan and architecture documentation
- **`CLAUDE-AGENTHUB.md`** - Legacy system documentation

## Quick Start

```bash
cd agenthub-react
npm install
npm run dev
```

See [agenthub-react/README.md](./agenthub-react/README.md) for detailed instructions.

## API

The application connects to the workflow-canvas API located at:
`/Users/murphsea/workflow-canvas/api`

Make sure the API is running on port 4000 before starting the React app.