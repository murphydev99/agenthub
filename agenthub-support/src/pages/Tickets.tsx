import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, ChevronDown, Loader2, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { useAuthB2C } from '../contexts/AuthContextB2CSimple';
import { ticketService } from '../services/api';
import type { Ticket } from '../services/api';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketDetailModal } from '../components/TicketDetailModal';

export function Tickets() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'priority'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const { user } = useAuthB2C();

  // Load tickets on component mount
  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  // Extract unique statuses from tickets
  useEffect(() => {
    const statuses = [...new Set(tickets.map(t => t.status))].sort();
    setAvailableStatuses(statuses);
  }, [tickets]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get tickets from ServiceNow via our API
      const filters = filterStatus !== 'all' ? { status: filterStatus } : undefined;
      const data = await ticketService.getTickets(filters);
      console.log('Loaded tickets:', data);
      // Log priority values specifically
      data.forEach((ticket: any, index: number) => {
        console.log(`Ticket ${index + 1} priority:`, ticket.priority, '| status:', ticket.status);
      });
      setTickets(data);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.response?.data?.error || 'Failed to load tickets');
      // Don't use mock data - show actual error
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredAndSortedTickets = tickets
    .filter(ticket => {
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
      if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ticket.number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { 'critical': 0, '1': 0, 'high': 1, '2': 1, 'medium': 2, 'moderate': 2, '3': 2, 'low': 3, '4': 3, 'planning': 4, '5': 4 };
          const aPriority = priorityOrder[a.priority.toLowerCase()] ?? 5;
          const bPriority = priorityOrder[b.priority.toLowerCase()] ?? 5;
          comparison = aPriority - bPriority;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'new':
        return 'bg-amber-100 text-amber-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'resolved':
      case 'closed':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case '1':
        return 'bg-red-100 text-red-700';
      case 'high':
      case '2':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
      case 'moderate':
      case '3':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
      case '4':
        return 'bg-gray-100 text-gray-700';
      case 'planning':
      case '5':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    // Handle ServiceNow timestamps which come as strings without timezone (they're in UTC)
    let date: Date;
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
      // ServiceNow format: "2024-01-15 14:30:00" - treat as UTC
      date = new Date(dateString + ' UTC');
    } else {
      date = new Date(dateString);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-600">Manage and track your support requests</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
            >
              <option value="all">All Status</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created' | 'updated' | 'priority')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
            >
              <option value="created">Sort by Created</option>
              <option value="updated">Sort by Updated</option>
              <option value="priority">Sort by Priority</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            
            <button 
              onClick={loadTickets}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#E94B4B] text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Unable to load tickets</p>
            <p className="text-sm text-amber-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-red mx-auto mb-4" />
            <p className="text-gray-600">Loading tickets...</p>
          </div>
        ) : filteredAndSortedTickets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setShowDetailModal(true);
                    }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">{ticket.number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                        {ticket.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                            {ticket.description.length > 30 
                              ? ticket.description.substring(0, 30) + '...'
                              : ticket.description
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{ticket.storeNumber || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{formatDate(ticket.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicketId(ticket.id);
                          setShowDetailModal(true);
                        }}
                        className="text-brand-red hover:text-red-600 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadTickets(); // Reload tickets after successful creation
        }}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTicketId(null);
        }}
        ticketId={selectedTicketId}
        onUpdate={() => {
          loadTickets(); // Reload tickets after status update
        }}
      />
    </div>
  );
}