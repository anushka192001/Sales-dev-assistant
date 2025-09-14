// File: components/SessionManager.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { ApiService } from '../services/api';

interface SessionData {
  session_id: string;
  exists: boolean;
  message_count?: number;
  last_updated?: string;
  file_size?: number;
  error?: string;
}

interface SessionManagerProps {
  currentSessionId: string;
  onSwitchSession: (sessionId: string) => void;
  onClose: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSwitchSession,
  onClose
}) => {
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get list of all sessions
      const sessionsResponse = await ApiService.getSessions();
      const sessionList = sessionsResponse.sessions || [];
      setSessions(sessionList);

      // Get details for each session
      const details: Record<string, SessionData> = {};
      
      for (const sessionId of sessionList) {
        try {
          const summary = await ApiService.getSessionSummary(sessionId);
          details[sessionId] = summary;
        } catch (err) {
          console.error(`Error loading session ${sessionId}:`, err);
          details[sessionId] = {
            session_id: sessionId,
            exists: false,
            error: 'Failed to load'
          };
        }
      }

      setSessionDetails(details);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent switching to session
    
    if (!confirm(`Are you sure you want to delete session ${sessionId.slice(-8)}? This action cannot be undone.`)) {
      return;
    }

    try {
      await ApiService.clearSession(sessionId);
      
      // Remove from local state
      setSessions(prev => prev.filter(id => id !== sessionId));
      setSessionDetails(prev => {
        const updated = { ...prev };
        delete updated[sessionId];
        return updated;
      });

      console.log(`🗑️ Deleted session: ${sessionId}`);
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        return 'Just now';
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)}KB`;
    } else {
      return `${(kb / 1024).toFixed(1)}MB`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 absolute top-full left-0 right-0 z-50 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Conversation History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 absolute top-full left-0 right-0 z-50 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Conversation History</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No previous conversations found</p>
            <p className="text-sm text-gray-500">Start chatting to create your first session</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions
              .sort((a, b) => {
                // Sort by last_updated, current session first
                if (a === currentSessionId) return -1;
                if (b === currentSessionId) return 1;
                
                const aTime = sessionDetails[a]?.last_updated || '';
                const bTime = sessionDetails[b]?.last_updated || '';
                return bTime.localeCompare(aTime);
              })
              .map((sessionId) => {
                const details = sessionDetails[sessionId];
                const isCurrent = sessionId === currentSessionId;
                
                return (
                  <div
                    key={sessionId}
                    onClick={() => !isCurrent && onSwitchSession(sessionId)}
                    className={`
                      p-2.5 rounded-lg border cursor-pointer transition-all
                      ${isCurrent 
                        ? 'border-gray-300 bg-gray-50 cursor-default' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`
                            text-sm font-medium truncate
                            ${isCurrent ? 'text-gray-900' : 'text-gray-900'}
                          `}>
                            {sessionId.slice(-12)}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {details?.message_count || 0} messages
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(details?.last_updated)}
                          </span>
                          
                          {details?.file_size && (
                            <span>{formatFileSize(details.file_size)}</span>
                          )}
                        </div>
                      </div>
                      
                      {!isCurrent && (
                        <button
                          onClick={(e) => handleDeleteSession(sessionId, e)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {details?.error && (
                      <div className="mt-2 text-xs text-red-600">
                        Error: {details.error}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sessions.length} total sessions</span>
          <button
            onClick={loadSessions}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};