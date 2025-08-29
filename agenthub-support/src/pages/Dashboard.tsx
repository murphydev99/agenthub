import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Ticket, 
  MessageSquare, 
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Building2,
  Hash,
  Activity,
  Zap,
  Shield,
  Mail,
  Calendar,
  CreditCard,
  MapPin,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileText,
  HelpCircle
} from 'lucide-react';
import { ticketService } from '../services/api';
import type { Ticket as TicketType } from '../services/api';
import { useAuthB2C } from '../contexts/AuthContextB2CSimple';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthB2C();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketService.getTickets();
      setTickets(data);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const openTickets = tickets.filter(t => t.status === 'new' || t.status === 'open' || t.status === 'in_progress');
  const resolvedToday = tickets.filter(t => {
    const today = new Date().toDateString();
    return (t.status === 'resolved' || t.status === 'closed') && 
           new Date(t.updatedAt).toDateString() === today;
  });
  const criticalTickets = tickets.filter(t => t.priority === 'critical' || t.priority === '1');
  const highPriorityTickets = tickets.filter(t => 
    t.priority === 'critical' || t.priority === '1' || 
    t.priority === 'high' || t.priority === '2'
  );

  const stats = [
    { 
      name: 'Open Tickets', 
      value: openTickets.length.toString(), 
      icon: Ticket,
      change: criticalTickets.length > 0 ? `${criticalTickets.length} critical` : 'Normal',
      changeType: criticalTickets.length > 0 ? 'increase' : 'neutral',
      changeLabel: criticalTickets.length > 0 ? 'needs attention' : 'volume'
    },
    { 
      name: 'Resolved Today', 
      value: resolvedToday.length.toString(), 
      icon: CheckCircle,
      change: resolvedToday.length > 0 ? 'Good' : 'None',
      changeType: resolvedToday.length > 0 ? 'increase' : 'neutral',
      changeLabel: 'tickets resolved'
    },
    { 
      name: 'High Priority', 
      value: highPriorityTickets.length.toString(), 
      icon: AlertCircle,
      change: highPriorityTickets.length > 5 ? 'High' : 'Normal',
      changeType: highPriorityTickets.length > 5 ? 'increase' : 'neutral',
      changeLabel: 'priority issues'
    },
    { 
      name: 'Total Tickets', 
      value: tickets.length.toString(), 
      icon: FileText,
      change: 'All time',
      changeType: 'neutral',
      changeLabel: 'in system'
    }
  ];

  // Helper function to get relative time
  const getTimeAgo = (dateInput: Date | string) => {
    // Handle ServiceNow timestamps which come as strings without timezone (they're in UTC)
    let date: Date;
    if (typeof dateInput === 'string') {
      // If the string doesn't contain timezone info (no Z or +/-), assume it's UTC
      if (!dateInput.includes('Z') && !dateInput.includes('+') && !dateInput.includes('T')) {
        // ServiceNow format: "2024-01-15 14:30:00" - treat as UTC
        date = new Date(dateInput + ' UTC');
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = dateInput;
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Handle negative times (future dates) or very recent
    if (diffMins < 0) return 'just now';
    if (diffMins === 0) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  // Get recent tickets (latest 6)
  const recentTickets = tickets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map(ticket => ({
      id: ticket.number,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      store: ticket.storeNumber || 'N/A',
      time: getTimeAgo(ticket.createdAt),
      assignee: ticket.assignedTo || 'Unassigned'
    }));

  const announcements = [
    { 
      title: 'System Maintenance Scheduled',
      description: 'POS system maintenance scheduled for Saturday 2AM-4AM EST',
      type: 'warning',
      date: 'Today'
    },
    { 
      title: 'New Training Module Available',
      description: 'Customer service excellence module now available in the training portal',
      type: 'info',
      date: 'Yesterday'
    },
    { 
      title: 'Holiday Hours Update',
      description: 'Updated holiday hours have been configured in the system',
      type: 'info',
      date: '2 days ago'
    }
  ];

  const knowledgeArticles = [
    { title: 'How to Reset POS Password', views: 234, helpful: 89 },
    { title: 'Inventory Count Procedures', views: 156, helpful: 72 },
    { title: 'Processing Refunds Guide', views: 143, helpful: 68 },
    { title: 'Employee Scheduling System', views: 98, helpful: 45 },
    { title: 'Opening & Closing Procedures', views: 87, helpful: 41 }
  ];

  // Extract user info from B2C claims
  const userName = user?.name || user?.username || 'User';
  const userEmail = user?.username || '';
  
  // Get user initials from name
  const getUserInitials = (name: string) => {
    if (!name || name === 'User') return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Get first name from full name
  const getFirstName = (name: string) => {
    if (!name || name === 'User') return 'User';
    const parts = name.split(' ');
    return parts[0];
  };

  return (
    <div className="h-full max-w-7xl mx-auto p-4">
      <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column - User Info & Quick Actions */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* User Welcome */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E94B4B] to-red-600 flex items-center justify-center text-white font-bold text-lg">
                {getUserInitials(userName)}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Welcome back, {getFirstName(userName)}!</h2>
                <p className="text-xs text-gray-500">Franchise Owner</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Franchisee ID</span>
                <span className="font-mono font-semibold text-gray-900">{user?.franchiseeId || 'FR-12345'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Store Numbers</span>
                <div className="flex gap-1">
                  {(user?.storeNumbers || ['0234', '0567', '0891']).map(store => (
                    <span key={store} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                      {store}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Support Tier</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Premium</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Support Metrics</h3>
            </div>
            <div className="p-4 space-y-3">
              {stats.map((stat) => (
                <div key={stat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{stat.name}</div>
                      <div className="font-semibold text-gray-900">{stat.value}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium flex items-center gap-1 justify-end ${
                      stat.changeType === 'increase' ? 'text-emerald-600' : 
                      stat.changeType === 'decrease' ? 'text-blue-600' : 
                      'text-gray-500'
                    }`}>
                      {stat.changeType === 'increase' && <ArrowUp className="h-3 w-3" />}
                      {stat.changeType === 'decrease' && <ArrowDown className="h-3 w-3" />}
                      {stat.change}
                    </div>
                    <div className="text-[10px] text-gray-400">{stat.changeLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Quick Actions</h3>
            </div>
            <div className="p-2">
              <button 
                onClick={() => navigate('/tickets')}
                className="w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Ticket className="h-4 w-4 text-[#E94B4B]" />
                  </div>
                  <span className="text-sm text-gray-700">Create Ticket</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              
              <button className="w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700">Start Chat</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              
              <button className="w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Browse Knowledge Base</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
              
              <button className="w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">Request Callback</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Center - Tickets */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Recent Tickets</h3>
                  <p className="text-xs text-gray-500">Your support ticket history</p>
                </div>
                <button 
                  onClick={() => navigate('/tickets')}
                  className="text-xs text-[#E94B4B] hover:text-red-600 font-medium cursor-pointer">
                  View All Tickets →
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E94B4B] mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading tickets...</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-500">{ticket.id}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{ticket.time}</span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">{ticket.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Store #{ticket.store}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ticket.assignee}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        {(ticket.priority === 'high' || ticket.priority === 'critical') && (
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                            ticket.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {ticket.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Announcements & Knowledge Base */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Announcements
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {announcements.map((announcement, idx) => (
                <div key={idx} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      announcement.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-gray-900 mb-0.5">{announcement.title}</h4>
                      <p className="text-xs text-gray-600 mb-1">{announcement.description}</p>
                      <p className="text-xs text-gray-400">{announcement.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Knowledge Base Articles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                Popular Articles
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {knowledgeArticles.map((article, idx) => (
                <button key={idx} className="w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-xs font-medium text-gray-900 group-hover:text-[#E94B4B]">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{article.views} views</span>
                        <span className="text-xs text-gray-500">{article.helpful}% helpful</span>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 mt-0.5" />
                  </div>
                </button>
              ))}
              
              <button className="w-full mt-2 text-xs text-[#E94B4B] hover:text-red-600 font-medium">
                Browse All Articles →
              </button>
            </div>
          </div>

          {/* Help Resources */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                Need Help?
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Support Hotline</span>
                  <span className="font-semibold text-gray-900">1-800-SUPPORT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email Support</span>
                  <span className="font-semibold text-gray-900">help@franchise.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Live Chat Hours</span>
                  <span className="font-semibold text-gray-900">24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}