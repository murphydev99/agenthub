import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white';
    }
  };

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className={`relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-200 ${
        isOpen ? 'scale-100' : 'scale-95'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${getButtonStyle()}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Global confirmation helper
let confirmResolve: ((value: boolean) => void) | null = null;

export function showConfirmDialog(
  message: string,
  options: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    
    // Create a temporary container
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Render the dialog
    const root = createRoot(container);
    
    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(true);
    };
    
    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(false);
    };
    
    root.render(
      <ConfirmDialog
        isOpen={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={message}
        {...options}
      />
    );
  });
}

// We need to import createRoot for the global helper
import { createRoot } from 'react-dom/client';