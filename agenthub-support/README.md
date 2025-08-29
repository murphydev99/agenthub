# AgentHub Support Portal

A comprehensive self-service portal for Dunkin/Baskin Robbins franchisees with AI-powered support and human agent escalation.

## 🎯 Project Goals
- Replace the current ServiceNow portal (only 200 active users out of 10,000+)
- Provide a user-friendly, modern interface
- Integrate AgentHub AI chatbot with human agent escalation
- Improve self-service capabilities and reduce support ticket volume

## ✨ Key Features

### Authentication & Security
- **10,000+ users** with unique credentials
- Multi-factor authentication (MFA)
- Store-based access control
- Session management with timeout

### Knowledge Base (AI-Powered)
- AgentHub workflow integration for intelligent search
- Categorized franchisee documentation
- Smart suggestions based on queries
- Article ratings and feedback

### Ticket Management
- View tickets filtered by store/PC number
- Create new support tickets
- ServiceNow bi-directional integration
- Real-time status updates
- File attachments

### Intelligent Chat Support
- **AgentHub chatbot** for instant answers
- Workflow-based responses
- **Human agent escalation** when bot can't resolve
- Chat history preservation
- Agent queue management

### Training & Resources
- Video tutorials
- Documentation library
- Quick links to common tools
- Progress tracking
- Announcements

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Routing**: React Router v6

## 📁 Project Structure

```
agenthub-support/
├── src/
│   ├── components/
│   │   ├── auth/         # Login, MFA components
│   │   ├── chat/         # Chat interface with bot/agent
│   │   ├── knowledge/    # Knowledge base components
│   │   ├── tickets/      # Ticket management
│   │   └── common/       # Shared components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── store/           # Zustand stores
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── public/              # Static assets
└── PROJECT_PLAN.md      # Detailed project plan
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SERVICENOW_URL=https://your-instance.service-now.com
VITE_SERVICENOW_API_KEY=your-servicenow-key
VITE_AGENTHUB_API_URL=http://localhost:4000/api
VITE_AGENTHUB_API_KEY=your-agenthub-key
```

## 📋 Implementation Roadmap

### Phase 1: Foundation ✅
- Project setup
- Authentication system
- Basic layout and routing

### Phase 2: Knowledge Base 
- AgentHub integration
- Article management
- Search functionality

### Phase 3: Ticketing
- ServiceNow integration
- Ticket viewing/creation
- Status tracking

### Phase 4: Chat Support
- AgentHub chatbot
- Agent escalation
- Queue management

### Phase 5: Additional Features
- Training resources
- Push notifications
- Analytics dashboard

## 🔒 Security Considerations

- JWT-based authentication
- Row-level security for store data
- API rate limiting
- HTTPS enforcement
- Regular security audits

## 📊 Success Metrics

- **User adoption**: Target 80% of franchisees
- **Ticket deflection**: 60% via chatbot
- **Resolution time**: 40% reduction
- **User satisfaction**: 4.5/5 rating
- **Portal uptime**: 99.9%

## 🤝 Integration Points

### ServiceNow
- REST API integration
- Ticket synchronization
- User permission sync

### AgentHub
- Workflow API
- Chat widget integration
- Knowledge base search

## 📝 License

Proprietary - All rights reserved# Deployment trigger
