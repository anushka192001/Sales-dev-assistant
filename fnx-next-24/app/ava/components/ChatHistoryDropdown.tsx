import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Clock, Trash2, Bot, Plus, X } from 'lucide-react';

interface ChatSession {
    session_id: string;
    title: string;
}

interface ChatHistorySidebarProps {
    currentSessionId: string;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    sessionUpdateKey: number;
    isOpen: boolean;
    onToggle: () => void;
    isPanelMode?: boolean; // New prop to indicate panel mode
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    currentSessionId,
    onSessionSelect,
    onNewSession,
    onDeleteSession,
    sessionUpdateKey,
    isOpen,
    onToggle,
    isPanelMode = false
}) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentTitle, setCurrentTitle] = useState<string>('Current Chat');

    // Load sessions when component mounts, sessionId changes, or update key changes
    useEffect(() => {
        if (isOpen || isPanelMode) {
            loadChatSessions();
        }
    }, [currentSessionId, sessionUpdateKey, isOpen, isPanelMode]);

    // Load chat sessions from the server
    const loadChatSessions = async () => {
        if (loading) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/sessions');
            if (response.ok) {
                const data = await response.json();
                console.log('[ChatHistory] Raw sessions data:', data);

                const formattedSessions = data.sessions.map((session: any) => {
                    console.log('[ChatHistory] Processing session:', session.session_id, session);
                    return {
                        session_id: session.session_id,
                        title: session.title || 'Untitled Chat',
                    };
                });

                console.log('[ChatHistory] Formatted sessions:', formattedSessions);
                setSessions(formattedSessions);

                // Update current session title
                const currentSession = formattedSessions.find((s: ChatSession) => s.session_id === currentSessionId);
                if (currentSession) {
                    setCurrentTitle(currentSession.title);
                } else {
                    setCurrentTitle('Untitled Chat');
                }
            } else {
                console.error('[ChatHistory] Failed to load sessions:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to load chat sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSessionClick = (sessionId: string) => {
        onSessionSelect(sessionId);
    };

    const handleDeleteClick = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        console.log('[ChatHistory] Delete clicked for session:', sessionId);
        if (confirm('Are you sure you want to delete this chat?')) {
            await onDeleteSession(sessionId);
            await loadChatSessions(); // Refresh the list
        }
    };

    const handleNewChatClick = () => {
        onNewSession();
    };


    // Panel Mode Render (for resizable panels)
    if (isPanelMode) {
        return (
            <div className="h-full bg-white flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900">Chat History</h2>
                        <button
                            onClick={onToggle}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Close chat history"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Untitled Chat Button */}
                    <button
                        onClick={handleNewChatClick}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="font-medium">Untitled Chat</span>
                    </button>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">
                            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"></div>
                            <span className="text-sm">Loading chats...</span>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">No chat history yet</p>
                            <p className="text-xs text-gray-400 mt-1">Start a new conversation to see it here</p>
                        </div>
                    ) : (
                        <div className="p-2">
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <button
                                        key={session.session_id}
                                        onClick={() => handleSessionClick(session.session_id)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors group relative ${session.session_id === currentSessionId
                                            ? 'bg-gray-100 border-l-2 border-gray-600'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Bot className="w-3 h-3 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-medium text-gray-900 truncate text-sm pr-6">
                                                        {session.title}
                                                    </h4>
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, session.session_id)}
                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                        title="Delete chat"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="text-xs text-gray-500 text-center">
                        <span className="bg-gray-200 px-2 py-1 rounded-full">
                            {sessions.length} chats
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Original Overlay Mode Render (for backward compatibility)
    return (
        <>
            {/* Sidebar */}
            <div className={`fixed left-0 top-0 h-full bg-white border-r border-gray-300 shadow-lg z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`} style={{ width: '280px' }}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900">Chat History</h2>
                            <button
                                onClick={onToggle}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Untitled Chat Button */}
                        <button
                            onClick={handleNewChatClick}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="font-medium">Untitled Chat</span>
                        </button>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"></div>
                                <span className="text-sm">Loading chats...</span>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm font-medium">No chat history yet</p>
                                <p className="text-xs text-gray-400 mt-1">Start a new conversation to see it here</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                <div className="space-y-1">
                                    {sessions.map((session) => (
                                        <button
                                            key={session.session_id}
                                            onClick={() => handleSessionClick(session.session_id)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors group relative ${session.session_id === currentSessionId
                                                ? 'bg-gray-100 border-l-2 border-gray-600'
                                                : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Bot className="w-3 h-3 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-medium text-gray-900 truncate text-sm pr-6">
                                                            {session.title}
                                                        </h4>
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, session.session_id)}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                            title="Delete chat"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <div className="text-xs text-gray-500 text-center">
                            <span className="bg-gray-200 px-2 py-1 rounded-full">
                                {sessions.length} chats
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-25 z-40"
                    onClick={onToggle}
                />
            )}

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className={`fixed top-4 z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-300 ${isOpen ? 'left-72' : 'left-4'
                    }`}
                title={isOpen ? 'Close chat history' : 'Open chat history'}
            >
                {isOpen ? (
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
            </button>
        </>
    );
};

export default ChatHistorySidebar;