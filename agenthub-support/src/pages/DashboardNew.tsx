import React from 'react';
import { 
  Ticket, 
  MessageSquare, 
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Building2,
  Hash,
  User2,
  ShieldCheck,
  Lightbulb,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge, StatusPill } from '../components/ui/Badge';

// Progress bar component
const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden ${className}`}>
    <div 
      className="h-full rounded-full bg-brand-red transition-all duration-300" 
      style={{ width: `${value}%` }} 
    />
  </div>
);

// Metric card matching the agent view style
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: any; 
  trend: 'up' | 'down' | 'neutral' 
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-600" />}
            {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
            <span className={`text-xs ${
              trend === 'up' ? 'text-emerald-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {change}
            </span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-brand-red-light flex items-center justify-center">
          <Icon className="h-5 w-5 text-brand-red" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export function DashboardNew() {
  const recentTickets = [
    { 
      id: 'T-1234', 
      title: 'POS System Login Issue',
      store: '0234',
      status: 'open',
      priority: 'high',
      time: '10 mins ago'
    },
    { 
      id: 'T-1235', 
      title: 'Inventory Management Access',
      store: '0567',
      status: 'in_progress',
      priority: 'medium',
      time: '25 mins ago'
    },
    { 
      id: 'T-1236', 
      title: 'Employee Training Portal',
      store: '0234',
      status: 'resolved',
      priority: 'low',
      time: '1 hour ago'
    },
    { 
      id: 'T-1237', 
      title: 'Network Connectivity Problem',
      store: '0891',
      status: 'open',
      priority: 'high',
      time: '2 hours ago'
    }
  ];

  const stores = [
    { number: '0234', name: 'Downtown Chicago', status: 'active', tickets: 3 },
    { number: '0567', name: 'Oak Park', status: 'active', tickets: 1 },
    { number: '0891', name: 'Naperville', status: 'maintenance', tickets: 2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your franchisee support overview.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Open Tickets"
          value="12"
          change="+2 from yesterday"
          icon={Ticket}
          trend="up"
        />
        <MetricCard
          title="Resolved Today"
          value="8"
          change="+20% from average"
          icon={CheckCircle}
          trend="up"
        />
        <MetricCard
          title="Avg Response Time"
          value="18m"
          change="-5m from last week"
          icon={Clock}
          trend="down"
        />
        <MetricCard
          title="Active Chats"
          value="3"
          change="Normal volume"
          icon={MessageSquare}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Tickets</CardTitle>
                  <CardDescription>Latest support requests from your stores</CardDescription>
                </div>
                <button className="px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
                  View All
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-gray-900">{ticket.id}</span>
                          <StatusPill 
                            label={ticket.status.replace('_', ' ')} 
                            tone={
                              ticket.status === 'open' ? 'warn' :
                              ticket.status === 'resolved' ? 'good' :
                              'neutral'
                            }
                          />
                          <Badge 
                            variant={
                              ticket.priority === 'high' ? 'error' :
                              ticket.priority === 'medium' ? 'warning' :
                              'default'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{ticket.title}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Store {ticket.store}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ticket.time}
                          </span>
                        </div>
                      </div>
                      <button className="text-brand-red hover:text-red-600 text-sm font-medium">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Store Overview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Stores</CardTitle>
              <CardDescription>Quick status overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stores.map((store) => (
                <div key={store.number} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">Store #{store.number}</div>
                      <div className="text-xs text-gray-500">{store.name}</div>
                    </div>
                    <StatusPill 
                      label={store.status} 
                      tone={store.status === 'active' ? 'good' : 'warn'}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{store.tickets} open tickets</span>
                    <button className="text-brand-red hover:text-red-600 font-medium">
                      Details →
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                View All Stores
              </button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common support tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <div className="h-8 w-8 rounded-lg bg-brand-red-light flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-brand-red" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Create Ticket</div>
                  <div className="text-xs text-gray-500">Submit new support request</div>
                </div>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <div className="h-8 w-8 rounded-lg bg-brand-red-light flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-brand-red" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Start Chat</div>
                  <div className="text-xs text-gray-500">Get instant help</div>
                </div>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <div className="h-8 w-8 rounded-lg bg-brand-red-light flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-brand-red" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Knowledge Base</div>
                  <div className="text-xs text-gray-500">Browse help articles</div>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Support Health */}
          <Card>
            <CardHeader>
              <CardTitle>Support Health</CardTitle>
              <CardDescription>Current performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Resolution Rate</span>
                  <span className="text-sm font-medium">87%</span>
                </div>
                <Progress value={87} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Customer Satisfaction</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <Progress value={92} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">First Contact Resolution</span>
                  <span className="text-sm font-medium">76%</span>
                </div>
                <Progress value={76} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}