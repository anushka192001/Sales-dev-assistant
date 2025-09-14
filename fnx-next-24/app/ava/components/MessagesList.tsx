import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Search, Mail, MessageCircle, Check, Building2, Users, Zap, Workflow, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
// UPDATED: Import the new types
import { Message, ProgressStep } from '../types/api';

interface MessagesListProps {
  messages: Message[];
  isLoading: boolean;
  onMessageClick: (message: Message) => void;
  onSendMessage?: (message: string) => void;
  activeMessageId?: string;
}

// NEW: A component to render the persistent progress steps log
const ProgressStepsDisplay: React.FC<{ steps: ProgressStep[] }> = ({ steps }) => {
  if (!steps || steps.length === 0) {
    return null;
  }
  console.log('[UI] Rendering ProgressStepsDisplay with', steps.length, 'steps.');

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-gray-600">{step.text}</span>
        </div>
      ))}
    </div>
  );
};


export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  isLoading,
  onMessageClick,
  onSendMessage,
  activeMessageId
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [clickedActions, setClickedActions] = useState<Record<string, number>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getMessageIcon = (message: Message) => {
    if (message.type === 'user') return <User className="w-3 h-3" />;
    if (message.isStreaming) return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
    if (message.isError) return <AlertCircle className="w-3 h-3 text-red-500" />;
    switch (message.responseType) {
      case 'tool_response': return <Search className="w-3 h-3 text-gray-600" />;
      case 'multi_tool_response': return <Zap className="w-3 h-3 text-gray-600" />;
      default: return <Bot className="w-3 h-3 text-gray-500" />;
    }
  };

  const hasToolOutput = (message: Message) => (
    (message.responseType === 'tool_response' && message.toolName && message.data) ||
    (message.responseType === 'multi_tool_response' && message.toolOutputs && message.toolOutputs.length > 0)
  );

  const handleToolOutputClick = (message: Message, e: React.MouseEvent) => {
    e.stopPropagation();
    onMessageClick(message);
  };

  const getToolDisplayName = (toolName: string) => {
    switch (toolName) {
      case 'search_companies': return 'Companies';
      case 'search_leads': return 'Contacts';
      case 'suggest_email': return 'Email';
      case 'create_cadence': return 'Cadence';
      default: return toolName;
    }
  };

  const getToolOutputBubbleText = (message: Message) => {
    if (message.responseType === 'multi_tool_response' && message.toolOutputs) {
      const totalCount = message.toolOutputs.reduce((sum, output) => sum + (output.data?.companies?.length || output.data?.contacts?.length || 0), 0);
      const toolTypes = new Set(message.toolOutputs.map(o => o.toolName));
      return toolTypes.size > 1 ? `${message.toolOutputs.length} Tool Results (${totalCount} items)` : `${message.toolOutputs.length} Results`;
    }
    if (message.responseType === 'tool_response' && message.toolOutputs?.length) {
      const toolOutput = message.toolOutputs[0];
      const count = toolOutput.data?.companies?.length || toolOutput.data?.contacts?.length || 0;
      return `${getToolDisplayName(toolOutput.toolName)} Results${count > 0 ? ` (${count})` : ''}`;
    }
    return 'Tool Output';
  };

  const renderToolOutputBubbles = (message: Message) => {
    const label = getToolOutputBubbleText(message);
    return (
      <div className="flex justify-start">
        <button onClick={(e) => handleToolOutputClick(message, e)} className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-300 rounded-full px-5 py-2.5 text-xs text-gray-800 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105">
          <Zap className="w-3 h-3 text-gray-700" />
          <span className="font-semibold">{label}</span>
        </button>
      </div>
    );
  };

  const handleActionClick = (messageId: string, actionIndex: number, action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickedActions[messageId] !== undefined) return;
    setClickedActions(prev => ({ ...prev, [messageId]: actionIndex }));
    if (onSendMessage) onSendMessage(action);
  };

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-3">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-lg"><MessageCircle className="w-6 h-6 text-white" /></div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Start a Conversation</h3>
          <p className="text-gray-600 text-xs leading-relaxed">Ask me to find prospects or generate campaigns to get started.</p>
        </div>
      </div>
    );
  }

  const lastUserMessageIndex = messages.findLastIndex(m => m.type === 'user');

  console.log('[MESSAGES-LIST] Rendering messages:', messages.map(m => ({ id: m.id, type: m.type, content: m.content?.substring(0, 50), isStreaming: m.isStreaming })));

  return (
    <div className="h-full overflow-y-auto px-3 bg-gradient-to-b from-white to-gray-50">
      <div className="py-3 space-y-2">
        {messages.map((message, index) => {
          console.log(`[MESSAGES-LIST] Rendering message ${index}:`, { id: message.id, type: message.type, content: message.content?.substring(0, 50), isStreaming: message.isStreaming });
          const isUser = message.type === 'user';
          const isActive = activeMessageId === message.id;
          const hasTools = hasToolOutput(message) && !message.isStreaming;
          const hasClickedAction = clickedActions[message.id] !== undefined;

          const showSuggestedActions =
            message?.suggested_actions &&
            !isUser &&
            Array.isArray(message.suggested_actions) &&
            message.suggested_actions.length > 0 &&
            (hasClickedAction || index > lastUserMessageIndex) &&
            !message.isStreaming;

          return (
            <div key={message.id} className="space-y-1">
              {hasTools && renderToolOutputBubbles(message)}
              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`} onClick={() => !message.isStreaming && onMessageClick(message)}>
                <div id={`message-${message.id}`}
                  className={`max-w-[75%] px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 transform
                    ${isUser ? 'bg-gradient-to-br from-gray-800 to-black text-white shadow-lg hover:shadow-xl border border-gray-700 hover:scale-[1.02]'
                      : message.isError ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-900 border border-red-200 shadow-md'
                        : message.isStreaming ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border border-blue-200 shadow-md animate-pulse'
                          : 'bg-gradient-to-br from-white to-gray-50 text-gray-800 border border-gray-200 shadow-md hover:shadow-lg backdrop-blur-sm hover:scale-[1.02]'
                    }
                    ${isActive && !message.isStreaming ? 'ring-2 ring-gray-400 ring-offset-2 shadow-xl' : ''}
                  `}>
                  <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm
                        ${message.isStreaming ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300'
                          : message.isError ? 'bg-gradient-to-br from-red-100 to-red-200 border-red-300'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300'
                        }`}>
                        {getMessageIcon(message)}
                      </div>
                    )}
                    <span className={`text-xs font-semibold ${isUser ? 'text-gray-300' : 'text-gray-700'}`}>{isUser ? 'You' : 'Assistant'}</span>
                    {message.isStreaming && <span className="text-xs font-medium text-blue-600 animate-pulse">Processing...</span>}
                    {!message.isStreaming && <span className={`text-xs font-medium ${isUser ? 'text-gray-400' : 'text-gray-500'}`}>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>

                  {/* UPDATED: Render the persistent progress steps log */}
                  <ProgressStepsDisplay steps={message.progressSteps || []} />

                  {/* UPDATED: Render final content with a separator if progress steps exist */}
                  {message.content && (
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? 'text-right' : 'text-left'}
                                     ${message.progressSteps && message.progressSteps.length > 0 ? 'mt-3 pt-3 border-t border-gray-200' : ''}`}>
                      {message.content}
                    </div>
                  )}

                  {/* DEBUG: Show if content is missing */}
                  {!message.content && !isUser && (
                    <div className="text-xs text-red-500 italic">
                      [DEBUG] No content - ID: {message.id}, Type: {message.type}, Streaming: {message.isStreaming ? 'true' : 'false'}
                    </div>
                  )}

                  {/* REMOVED: The old temporary progressInfo display has been removed to avoid redundancy */}

                  {/* Suggested Actions Section */}
                  {showSuggestedActions && (
                    <div className="mt-3 space-y-2">
                      {/* ... your existing suggested actions JSX ... */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-3 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300 shadow-sm"><Bot className="w-3 h-3 text-gray-600" /></div>
                <span className="text-xs font-semibold text-gray-700">Assistant</span><span className="text-xs font-medium text-gray-400 animate-pulse">is thinking...</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full animate-bounce shadow-sm"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
};