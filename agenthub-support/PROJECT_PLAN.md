# AgentHub Support Portal - Project Plan

## Overview
Comprehensive self-service portal for Dunkin/Baskin Robbins franchisees with AI-powered support and human agent escalation.

## Core Requirements

### 1. User Management
- **10,000+ users** with unique credentials
- **Multi-factor authentication (MFA)** 
- Store-based access control (users only see their store data)
- User roles: Franchisee, Store Manager, Employee, Admin

### 2. Authentication System
- Username/password login
- MFA via SMS/Email/Authenticator app
- Session management
- Password reset functionality
- Account lockout after failed attempts

### 3. Knowledge Base (Powered by AgentHub)
- AI-powered article search using AgentHub workflows
- Categorized knowledge articles
- Franchisee-facing documentation
- Smart suggestions based on user queries
- Article rating and feedback system

### 4. Ticket Management
- View tickets filtered by store number/PC number
- Create new tickets
- Real-time ticket status updates
- Ticket history and comments
- File attachments support
- Integration with ServiceNow APIs

### 5. Chat Support
- AgentHub chatbot integration
- Smart workflow-based responses
- Escalation to human agents when needed
- Chat history preservation
- Agent availability status
- Queue management for human handoff

### 6. Training Resources
- Video tutorials
- Documentation library
- Interactive guides
- Progress tracking
- Certification system

### 7. Portal Features
- Dashboard with key metrics
- Push notifications for important updates
- Quick links to common resources
- Announcements and news
- Store profile management

### 8. ServiceNow Integration
- Pull ticket data via REST APIs
- Push new tickets to ServiceNow
- Sync user permissions
- Real-time status updates
- Attachment synchronization

## Technical Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for data fetching
- **React Hook Form** for forms

### Backend (To be developed)
- **Node.js/Express** or **ASP.NET Core**
- **PostgreSQL** or **SQL Server** database
- **Redis** for session management
- **WebSockets** for real-time updates

### Integrations
- **ServiceNow REST APIs**
- **AgentHub Workflow API**
- **SMS/Email providers** for MFA
- **Push notification service**

### Security
- JWT-based authentication
- Row-level security for store data
- API rate limiting
- HTTPS everywhere
- Content Security Policy
- OWASP compliance

## Database Schema

### Core Tables
```sql
-- Users
users (
  id, username, email, phone, 
  password_hash, mfa_enabled, 
  created_at, updated_at
)

-- User Store Associations
user_stores (
  user_id, store_number, pc_number, 
  role, permissions
)

-- Knowledge Articles
articles (
  id, title, content, category, 
  tags, author_id, views, 
  created_at, updated_at
)

-- Tickets (cached from ServiceNow)
tickets (
  id, servicenow_id, store_number, 
  title, description, status, 
  priority, created_at, updated_at
)

-- Chat Sessions
chat_sessions (
  id, user_id, started_at, 
  escalated_to_agent, agent_id, 
  resolved, satisfaction_rating
)

-- Chat Messages
chat_messages (
  id, session_id, sender_type, 
  sender_id, message, timestamp
)
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup and configuration
- [ ] Basic authentication system
- [ ] User management interface
- [ ] Database schema implementation
- [ ] Basic dashboard layout

### Phase 2: Knowledge Base (Week 3-4)
- [ ] AgentHub workflow integration
- [ ] Article management system
- [ ] Search functionality
- [ ] Category/tag system
- [ ] Article ratings

### Phase 3: Ticketing System (Week 5-6)
- [ ] ServiceNow API integration
- [ ] Ticket viewing interface
- [ ] Ticket creation workflow
- [ ] Status updates and notifications
- [ ] File attachment handling

### Phase 4: Chat Support (Week 7-8)
- [ ] Integrate AgentHub chatbot
- [ ] Human agent interface
- [ ] Escalation workflow
- [ ] Chat history storage
- [ ] Agent availability system

### Phase 5: Additional Features (Week 9-10)
- [ ] Training resources section
- [ ] Push notifications
- [ ] Quick links management
- [ ] Store profile pages
- [ ] Analytics dashboard

### Phase 6: Testing & Deployment (Week 11-12)
- [ ] Security testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Production deployment

## Success Metrics
- User adoption rate (target: 80% of franchisees)
- Ticket deflection rate via chatbot (target: 60%)
- Average resolution time reduction (target: 40%)
- User satisfaction score (target: 4.5/5)
- Portal uptime (target: 99.9%)

## Risk Mitigation
- **ServiceNow API limits**: Implement caching and rate limiting
- **User adoption**: Comprehensive training and onboarding
- **Performance at scale**: Load testing and optimization
- **Security breaches**: Regular security audits and penetration testing
- **Integration failures**: Fallback mechanisms and error handling

## Next Steps
1. Finalize technical requirements with stakeholders
2. Set up development environment
3. Create detailed API specifications
4. Design UI/UX mockups
5. Begin Phase 1 implementation