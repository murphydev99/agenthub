import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ticketService, type CreateTicketDto } from '../services/api';
import { useAuthB2C } from '../contexts/AuthContextB2CSimple';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledData?: {
    title?: string;
    description?: string;
    impact?: string;
    urgency?: string;
  };
}

export function CreateTicketModal({ isOpen, onClose, onSuccess, prefilledData }: CreateTicketModalProps) {
  const { user } = useAuthB2C();
  
  // Mock data for demo - in production, this would come from user profile or API
  const franchiseeId = 'FR-12345';
  const availableStores = ['0234', '0567', '0891'];
  
  const [formData, setFormData] = useState<CreateTicketDto & { impact?: string; urgency?: string }>({
    title: '',
    description: '',
    impact: '2', // Default to Medium
    urgency: '2', // Default to Medium
    storeNumber: availableStores[0] || '', // Default to first store
    franchiseeId: franchiseeId
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate priority based on Impact and Urgency
  const calculatePriority = (impact: string, urgency: string): string => {
    // Based on ServiceNow priority matrix
    if (impact === '1' && urgency === '1') return '1 - Critical';
    if ((impact === '1' && urgency === '2') || (impact === '2' && urgency === '1')) return '2 - High';
    if ((impact === '1' && urgency === '3') || (impact === '2' && urgency === '2') || (impact === '3' && urgency === '1')) return '3 - Moderate';
    if ((impact === '2' && urgency === '3') || (impact === '3' && urgency === '2')) return '4 - Low';
    if (impact === '3' && urgency === '3') return '5 - Planning';
    return '3 - Moderate'; // Default
  };
  
  // Reset form when modal opens with franchisee ID populated
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: prefilledData?.title || '',
        description: prefilledData?.description || '',
        impact: prefilledData?.impact || '2',
        urgency: prefilledData?.urgency || '2',
        storeNumber: availableStores[0] || '',
        franchiseeId: franchiseeId
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Creating ticket with data:', formData);
      console.log('Impact:', formData.impact, 'Urgency:', formData.urgency);
      console.log('Expected priority:', calculatePriority(formData.impact || '2', formData.urgency || '2'));
      const result = await ticketService.createTicket(formData);
      console.log('Ticket created:', result);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        impact: '2',
        urgency: '2',
        storeNumber: availableStores[0] || '',
        franchiseeId: franchiseeId
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the issue"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of the issue..."
            />
          </div>

          {/* Impact and Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="impact" className="block text-sm font-medium text-gray-700 mb-1">
                Impact
              </label>
              <select
                id="impact"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">1 - High</option>
                <option value="2">2 - Medium</option>
                <option value="3">3 - Low</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                Urgency
              </label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">1 - High</option>
                <option value="2">2 - Medium</option>
                <option value="3">3 - Low</option>
              </select>
            </div>
          </div>
          
          {/* Calculated Priority Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-600">Calculated Priority:</div>
            <div className="text-lg font-semibold text-gray-900">
              {calculatePriority(formData.impact || '2', formData.urgency || '2')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Store Number Dropdown */}
            <div>
              <label htmlFor="storeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Store <span className="text-red-500">*</span>
              </label>
              <select
                id="storeNumber"
                required
                value={formData.storeNumber || ''}
                onChange={(e) => setFormData({ ...formData, storeNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableStores.map(store => (
                  <option key={store} value={store}>
                    Store #{store}
                  </option>
                ))}
              </select>
            </div>

            {/* Franchisee ID - Read Only */}
            <div>
              <label htmlFor="franchiseeId" className="block text-sm font-medium text-gray-700 mb-1">
                Franchisee ID
              </label>
              <input
                id="franchiseeId"
                type="text"
                value={formData.franchiseeId || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-600"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}