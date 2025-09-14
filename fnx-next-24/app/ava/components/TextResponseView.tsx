import React from 'react';
import { MessageCircle, ArrowLeft } from 'lucide-react';

interface TextResponseViewProps {
  message: string;
  onScrollToMessage?: (messageId: string) => void;
  messageId?: string;
}

export const TextResponseView: React.FC<TextResponseViewProps> = ({ 
  message, 
  onScrollToMessage, 
  messageId 
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assistant Response</h3>
              <p className="text-sm text-gray-600">General information</p>
            </div>
          </div>
          {onScrollToMessage && messageId && (
            <button
              onClick={() => onScrollToMessage(messageId)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to message
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
};