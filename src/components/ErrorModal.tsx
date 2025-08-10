import React from 'react';
import { X, AlertTriangle, Wifi, Key, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error, onRetry }) => {
  if (!isOpen) return null;

  const getErrorDetails = (errorMessage: string) => {
    if (errorMessage.includes('WebSocket connection error')) {
      return {
        title: 'Connection Error',
        icon: <Wifi className="w-8 h-8 text-red-500" />,
        description: 'Unable to connect to Deepgram speech recognition service.',
        suggestions: [
          'Check your internet connection',
          'Verify your Deepgram API key is valid',
          'Try refreshing the page',
          'Switch to text input as an alternative'
        ],
        type: 'connection'
      };
    }
    
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return {
        title: 'Authentication Error',
        icon: <Key className="w-8 h-8 text-red-500" />,
        description: 'There\'s an issue with your Deepgram API key.',
        suggestions: [
          'Verify your API key is correct',
          'Check if your API key has expired',
          'Ensure you have sufficient Deepgram credits',
          'Try regenerating your API key'
        ],
        type: 'auth'
      };
    }

    return {
      title: 'Speech Recognition Error',
      icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
      description: 'An error occurred with the speech recognition service.',
      suggestions: [
        'Try recording again',
        'Check your microphone permissions',
        'Switch to text input',
        'Refresh the page and try again'
      ],
      type: 'general'
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {errorDetails.icon}
            <h2 className="text-xl font-semibold text-gray-900">
              {errorDetails.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            {errorDetails.description}
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">What you can try:</h3>
            <ul className="space-y-1">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Details (Collapsible) */}
          <details className="bg-red-50 border border-red-200 rounded-lg">
            <summary className="p-3 cursor-pointer text-sm font-medium text-red-800 hover:bg-red-100 rounded-lg">
              Technical Details
            </summary>
            <div className="p-3 pt-0">
              <code className="text-xs text-red-700 bg-red-100 p-2 rounded block overflow-x-auto">
                {error}
              </code>
            </div>
          </details>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};