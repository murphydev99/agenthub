import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, AlertCircle, CheckCircle, XCircle, MessageSquare, History, User, Edit3, Send } from 'lucide-react';
import { ticketService, type Ticket, type AuditEntry, type UpdateTicketDto } from '../services/api';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  onUpdate: () => void;
}

export function TicketDetailModal({ isOpen, onClose, ticketId, onUpdate }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [customerComment, setCustomerComment] = useState('');
  const [showCustomerUpdate, setShowCustomerUpdate] = useState(false);
  const [updatedImpact, setUpdatedImpact] = useState('');
  const [updatedUrgency, setUpdatedUrgency] = useState('');
  const updateSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket();
    }
  }, [isOpen, ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTicket(ticketId);
      setTicket(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticketId) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Map user-friendly status to ServiceNow state codes
      const stateMap: { [key: string]: string } = {
        'resolved': '6',
        'closed': '7',
        'in_progress': '2',
        'on_hold': '3'
      };
      
      await ticketService.updateTicket(ticketId, {
        state: stateMap[newStatus] || newStatus,
        description: comment ? `Status updated to ${newStatus}. Comment: ${comment}` : undefined
      });
      
      setComment('');
      setShowCommentBox(false);
      onUpdate(); // Refresh the ticket list
      await loadTicket(); // Reload this ticket
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update ticket status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomerUpdate = async () => {
    if (!ticketId || (!customerComment && !updatedImpact && !updatedUrgency)) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const updateData: UpdateTicketDto = {};
      
      if (customerComment) {
        updateData.customerComment = customerComment;
      }
      
      if (updatedImpact && updatedUrgency) {
        updateData.impact = updatedImpact;
        updateData.urgency = updatedUrgency;
      }
      
      await ticketService.updateTicket(ticketId, updateData);
      
      // Clear form
      setCustomerComment('');
      setUpdatedImpact('');
      setUpdatedUrgency('');
      setShowCustomerUpdate(false);
      
      // Refresh the ticket and list
      onUpdate();
      await loadTicket();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'on_hold':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {loading ? 'Loading...' : ticket ? `Ticket ${ticket.number}` : 'Ticket Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading ticket details...</p>
          </div>
        )}

        {error && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {ticket && !loading && (
          <div className="p-6 space-y-6">
            {/* Ticket Header */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  {getStatusIcon(ticket.status)}
                  <span className="text-sm font-medium">{ticket.status}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                {ticket.storeNumber && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Store #{ticket.storeNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-900 whitespace-pre-wrap">{ticket.description || 'No description provided'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                  <p className="text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Last Updated</h4>
                  <p className="text-gray-900">{new Date(ticket.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {ticket.assignedTo && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Assigned To</h4>
                  <p className="text-gray-900">{ticket.assignedTo}</p>
                </div>
              )}
            </div>

            {/* Comments Section - Only show customer-visible comments */}
            {ticket.comments && (
              <div className="border-t pt-6 space-y-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communication History
                </h4>
                
                <div className="space-y-3">
                  <h5 className="text-xs font-medium text-gray-700">Communication History</h5>
                  {/* Chat-like interface for comments */}
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {(() => {
                        const comments = [];
                        let currentComment = [];
                        let currentTimestamp = null;
                        let currentUser = null;
                        let isAgentHub = false;
                        
                        ticket.comments.split('\n').forEach((line) => {
                          // Check if this is a timestamp header
                          const headerMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+?) \(Additional comments\)$/);
                          
                          if (headerMatch) {
                            // Save previous comment if exists
                            if (currentComment.length > 0) {
                              comments.push({
                                timestamp: currentTimestamp,
                                user: currentUser,
                                text: currentComment.join('\n').trim(),
                                isAgentHub: isAgentHub
                              });
                              currentComment = [];
                            }
                            
                            // Start new comment
                            currentTimestamp = headerMatch[1];
                            currentUser = headerMatch[2];
                            isAgentHub = currentUser === 'AgentHub Integration';
                          } else if (line.trim()) {
                            // Add line to current comment
                            currentComment.push(line);
                          }
                        });
                        
                        // Add the last comment
                        if (currentComment.length > 0) {
                          comments.push({
                            timestamp: currentTimestamp,
                            user: currentUser,
                            text: currentComment.join('\n').trim(),
                            isAgentHub: isAgentHub
                          });
                        }
                        
                        // Render comments as chat messages
                        return comments.map((comment, index) => (
                          <div key={index} className={`flex ${comment.isAgentHub ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`max-w-[75%] ${comment.isAgentHub ? 'order-2' : ''}`}>
                              <div className={`rounded-lg p-3 ${
                                comment.isAgentHub 
                                  ? 'border-2 border-[#E94B4B] bg-red-50' 
                                  : 'bg-white border border-gray-300'
                              }`}>
                                {comment.timestamp && (
                                  <div className={`text-xs font-medium mb-2 ${
                                    comment.isAgentHub ? 'text-[#E94B4B]' : 'text-gray-500'
                                  }`}>
                                    {comment.timestamp}
                                    {!comment.isAgentHub && comment.user ? ` - ${comment.user}` : ''}
                                  </div>
                                )}
                                <div className={`text-sm whitespace-pre-wrap ${
                                  comment.isAgentHub ? 'text-gray-700' : 'text-gray-700'
                                }`}>
                                  {comment.text}
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit History Section */}
            {ticket.auditHistory && ticket.auditHistory.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activity History
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ticket.auditHistory.map((entry: AuditEntry, index: number) => (
                    <div key={index} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-1 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-700">{entry.field}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          {entry.oldValue !== 'None' && (
                            <span className="line-through mr-2">{entry.oldValue}</span>
                          )}
                          <span className="font-medium text-gray-900">→ {entry.newValue}</span>
                        </div>
                        {entry.updatedBy && (
                          <div className="text-gray-500 mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.updatedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Update Section */}
            {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Add Update</h4>
                  <button
                    onClick={() => {
                      setShowCustomerUpdate(!showCustomerUpdate);
                      // Scroll to the update section after a brief delay to allow it to render
                      if (!showCustomerUpdate) {
                        setTimeout(() => {
                          updateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }, 100);
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    {showCustomerUpdate ? 'Cancel' : 'Add Comment/Update Priority'}
                  </button>
                </div>
                
                {showCustomerUpdate && (
                  <div ref={updateSectionRef} className="space-y-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Add Comment (Optional)
                      </label>
                      <textarea
                        value={customerComment}
                        onChange={(e) => setCustomerComment(e.target.value)}
                        placeholder="Describe any updates or additional information..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Update Impact (Optional)
                        </label>
                        <select
                          value={updatedImpact}
                          onChange={(e) => setUpdatedImpact(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Keep current</option>
                          <option value="1">1 - High</option>
                          <option value="2">2 - Medium</option>
                          <option value="3">3 - Low</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Update Urgency (Optional)
                        </label>
                        <select
                          value={updatedUrgency}
                          onChange={(e) => setUpdatedUrgency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Keep current</option>
                          <option value="1">1 - High</option>
                          <option value="2">2 - Medium</option>
                          <option value="3">3 - Low</option>
                        </select>
                      </div>
                    </div>
                    
                    {updatedImpact && updatedUrgency && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        Note: Changing impact and urgency will update the ticket priority
                      </div>
                    )}
                    
                    <button
                      onClick={handleCustomerUpdate}
                      disabled={updating || (!customerComment && (!updatedImpact || !updatedUrgency))}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {updating ? (
                        'Updating...'
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Update
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}


            {(ticket.status === 'closed' || ticket.status === 'resolved') && (
              <div className="border-t pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-medium">
                    This ticket has been {ticket.status}.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}