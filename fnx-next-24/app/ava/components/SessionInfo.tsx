import React from 'react';
import { BarChart3, Search, Mail, MessageSquare } from 'lucide-react';

interface SessionInfoProps {
  sessionInfo: {
    conversation_length: number;
    has_search_results: boolean;
    search_history_count: number;
    latest_search_summary: Record<string, number>;
  };
  compact?: boolean;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({ sessionInfo, compact = false }) => {
  if (compact) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{sessionInfo.conversation_length}</div>
          <div className="text-xs text-gray-600 font-medium">Messages</div>
        </div>
        
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Search className="w-5 h-5 text-gray-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">{sessionInfo.search_history_count}</div>
          <div className="text-xs text-gray-600 font-medium">Searches</div>
        </div>
        
        {Object.entries(sessionInfo.latest_search_summary).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-600 font-medium capitalize">{key}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Session Stats</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Messages</p>
            <p className="font-semibold">{sessionInfo.conversation_length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Searches</p>
            <p className="font-semibold">{sessionInfo.search_history_count}</p>
          </div>
        </div>
        
        {Object.entries(sessionInfo.latest_search_summary).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600 capitalize">{key}</p>
              <p className="font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};