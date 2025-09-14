"use client";
import { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, Trash2, X, ChevronDown, ChevronRight, Zap, History, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatInput } from './components/ChatInput';
import { MessagesList } from './components/MessagesList';
import { ToolOutput } from './components/ToolOutput';
import { Message, ProgressStep } from './types/api';
import ChatHistorySidebar from './components/ChatHistoryDropdown';
import WorkflowEditor, { ExecutionPlan } from './components/WorkflowEditor';
import { DEFAULT_MODEL, getModelDisplayName, isValidModel, validateAndGetModel } from './config/models';

const customStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes flash-success {
    0% { opacity: 0; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(0.8); }
  }
  
  @keyframes title-update {
    0% { transform: translateY(0px); opacity: 1; }
    50% { transform: translateY(-2px); opacity: 0.7; }
    100% { transform: translateY(0px); opacity: 1; }
  }
  
  @keyframes pulse-border {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
  
  .animate-flash-success {
    animation: flash-success 1.5s ease-out forwards;
  }
  
  .animate-title-update {
    animation: title-update 0.6s ease-in-out;
  }
  
  .animate-pulse-border {
    animation: pulse-border 2s ease-out infinite;
  }
`;

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  if (!document.head.querySelector('style[data-title-animations]')) {
    styleElement.setAttribute('data-title-animations', 'true');
    document.head.appendChild(styleElement);
  }
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('current_session_id');
      return saved || `session-${Date.now()}`;
    }
    return `session-${Date.now()}`;
  });
  const [activeToolOutput, setActiveToolOutput] = useState<Message | null>(null);
  const [showToolOutput, setShowToolOutput] = useState(false);
  const [activeStreamController, setActiveStreamController] = useState<AbortController | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sessionUpdateKey, setSessionUpdateKey] = useState<number>(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] = useState<string>('Current Chat');
  const [titleJustUpdated, setTitleJustUpdated] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Validate the default model on initialization
    const validatedModel = validateAndGetModel(DEFAULT_MODEL.id);
    return validatedModel.id;
  });

  // Plan review state
  const [showPlanReview, setShowPlanReview] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [planReviewId, setPlanReviewId] = useState<string | null>(null);
  const [planReviewMessage, setPlanReviewMessage] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Title polling state
  const [isPollingTitle, setIsPollingTitle] = useState(false);
  const titlePollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titlePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timeoutTimer = useRef<NodeJS.Timeout | null>(null);
  const resultReceivedRef = useRef(false);
  const streamCompleteRef = useRef(false);
  const eventsReceivedRef = useRef<string[]>([]);
  const streamStartTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session info
  const [sessionInfo, setSessionInfo] = useState({
    conversation_length: 0,
    has_search_results: false,
    search_history_count: 0,
    latest_search_summary: {}
  });

  // Debug loading state
  useEffect(() => {
    console.log('[LOADER-DEBUG] isLoading changed to:', isLoading);
  }, [isLoading]);

  // Global failsafe for stuck loader
  useEffect(() => {
    if (isLoading) {
      const failsafeTimer = setTimeout(() => {
        console.error('[LOADER-FAILSAFE] Loader stuck for 30s, forcing stop');
        setIsLoading(false);
        cleanupStream();
      }, 30000);

      return () => clearTimeout(failsafeTimer);
    }
  }, [isLoading]);

  // Title polling functions
  const startTitlePolling = async (sessionId: string) => {
    console.log(`[TITLE-POLLING] Starting title polling for session: ${sessionId}`);
    setIsPollingTitle(true);

    let pollAttempts = 0;
    const maxPollAttempts = 30; // Poll for up to 60 seconds (30 attempts * 2 seconds)

    const pollForTitle = async () => {
      try {
        pollAttempts++;
        console.log(`[TITLE-POLLING] Attempt ${pollAttempts}/${maxPollAttempts}`);

        const response = await fetch(`http://localhost:8000/conversations/${sessionId}`);

        if (response.ok) {
          const data = await response.json();

          // Check if we have a title and it's different from current
          if (data.title && data.title !== 'New Chat' && data.title !== currentChatTitle) {
            console.log(`[TITLE-POLLING] Title found: ${data.title}`);
            setCurrentChatTitle(data.title);
            setTitleJustUpdated(true);
            setTimeout(() => setTitleJustUpdated(false), 1500);
            setIsPollingTitle(false);

            // Clear the polling interval
            if (titlePollingIntervalRef.current) {
              clearInterval(titlePollingIntervalRef.current);
              titlePollingIntervalRef.current = null;
            }

            // Clear the timeout
            if (titlePollingTimerRef.current) {
              clearTimeout(titlePollingTimerRef.current);
              titlePollingTimerRef.current = null;
            }

            return;
          }
        }

        // If we've reached max attempts, stop polling
        if (pollAttempts >= maxPollAttempts) {
          console.log(`[TITLE-POLLING] Max attempts reached, stopping polling`);
          setIsPollingTitle(false);

          if (titlePollingIntervalRef.current) {
            clearInterval(titlePollingIntervalRef.current);
            titlePollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error(`[TITLE-POLLING] Error during polling attempt ${pollAttempts}:`, error);

        // On error, continue polling unless we've reached max attempts
        if (pollAttempts >= maxPollAttempts) {
          setIsPollingTitle(false);
          if (titlePollingIntervalRef.current) {
            clearInterval(titlePollingIntervalRef.current);
            titlePollingIntervalRef.current = null;
          }
        }
      }
    };

    // Start polling every 2 seconds
    titlePollingIntervalRef.current = setInterval(pollForTitle, 2000);

    // Set a timeout to stop polling after 60 seconds
    titlePollingTimerRef.current = setTimeout(() => {
      console.log(`[TITLE-POLLING] Timeout reached, stopping polling`);
      setIsPollingTitle(false);

      if (titlePollingIntervalRef.current) {
        clearInterval(titlePollingIntervalRef.current);
        titlePollingIntervalRef.current = null;
      }
    }, 60000); // 60 seconds
  };

  const cleanupTitlePolling = () => {
    if (titlePollingIntervalRef.current) {
      clearInterval(titlePollingIntervalRef.current);
      titlePollingIntervalRef.current = null;
    }

    if (titlePollingTimerRef.current) {
      clearTimeout(titlePollingTimerRef.current);
      titlePollingTimerRef.current = null;
    }

    setIsPollingTitle(false);
    setTitleJustUpdated(false);
  };

  // Toggle section collapse
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const cleanupStream = () => {
    console.log('[CLEANUP] Cleaning up stream state.');
    setIsLoading(false); // Always clear loading
    setActiveStreamController(null);
    streamCompleteRef.current = false;
    resultReceivedRef.current = false;
    eventsReceivedRef.current = [];

    if (timeoutTimer.current) {
      clearTimeout(timeoutTimer.current);
      timeoutTimer.current = null;
    }

    // Clean up title polling as well
    cleanupTitlePolling();
  };

  const handleStreamTimeout = (assistantMessageId: string) => {
    console.error('[SSE-TIMEOUT] Stream timeout - no events received');
    console.log('[SSE-TIMEOUT] Events received so far:', eventsReceivedRef.current);

    setMessages(prev => prev.map(msg =>
      msg.id === assistantMessageId
        ? {
          ...msg,
          content: '⏱️ Request timed out - no response from server',
          isStreaming: false,
          isError: true
        }
        : msg
    ));

    cleanupStream();
  };

  const handleSessionSelect = async (newSessionId: string) => {
    if (newSessionId === sessionId) return;

    // Abort any ongoing stream before switching
    if (activeStreamController) {
      activeStreamController.abort();
      cleanupStream();
    }

    // Clean up title polling
    cleanupTitlePolling();

    setSessionId(newSessionId);
    setMessages([]);
    setActiveToolOutput(null);
    setShowToolOutput(false);
    setCollapsedSections({});
    setShowPlanReview(false);
    setCurrentPlan(null);
    setPlanReviewMessage('');

    // Reset model to default for new session
    setSelectedModel(DEFAULT_MODEL.id);

    if (typeof window !== 'undefined') {
      localStorage.setItem('current_session_id', newSessionId);
    }

    console.log(`🔄 Switched to session: ${newSessionId}`);
  };

  const handleNewSession = () => {
    if (activeStreamController) {
      activeStreamController.abort();
      cleanupStream();
    }

    // Clean up title polling
    cleanupTitlePolling();

    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([]);
    setActiveToolOutput(null);
    setShowToolOutput(false);
    setCollapsedSections({});
    setShowPlanReview(false);
    setCurrentPlan(null);
    setPlanReviewMessage('');
    setCurrentChatTitle('Current Chat');
    setTitleJustUpdated(false);

    // Reset model to default for new session
    setSelectedModel(DEFAULT_MODEL.id);

    if (typeof window !== 'undefined') {
      localStorage.setItem('current_session_id', newSessionId);
    }
    setSessionUpdateKey(Date.now());
    console.log(`🆕 Created new session: ${newSessionId}`);
  };

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    console.log(`🗑️ Deleting session: ${sessionIdToDelete}`);
    try {
      const response = await fetch(`http://localhost:8000/session/${sessionIdToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }

      if (sessionId === sessionIdToDelete) {
        handleNewSession();
      } else {
        setSessionUpdateKey(Date.now());
      }

    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleGenerateEmail = (company: string, contact: string) => {
    handleSendMessage(`Generate a personalized email for ${company} (${contact})`);
  };

  const handleModelChange = (modelId: string) => {
    // Validate the model before setting it
    if (isValidModel(modelId)) {
      setSelectedModel(modelId);
      console.log(`🤖 Model changed to: ${modelId}`);
    } else {
      console.error(`❌ Invalid model ID: ${modelId}, keeping current model: ${selectedModel}`);
      // Optionally show a user-friendly error message
      alert(`Invalid model selected. Please choose a valid model from the list.`);
    }
  };



  const handleApprovePlan = () => {
    if (!planReviewId) {
      console.error("Cannot approve plan, no ID found!");
      return;
    }
    setShowPlanReview(false);
    setCurrentPlan(null);
    setHasUnsavedChanges(false);
    // Construct the message with the actual plan ID
    handleSendMessage(`APPROVE_PLAN:${planReviewId}`);
    setPlanReviewId(null); // Clear the ID after use


    // Failsafe to clear loading after 10 seconds
    setTimeout(() => {
      if (isLoading) {
        console.log('[WORKFLOW] Failsafe: Clearing stuck loader');
        setIsLoading(false);
      }
    }, 10000);
  };



  const handleEditPlan = (editedPlan: ExecutionPlan) => {
    setShowPlanReview(false);
    setCurrentPlan(null);
    setHasUnsavedChanges(false);
    const planJson = JSON.stringify(editedPlan);
    handleSendMessage(`EDIT_PLAN:${planJson}`);

    // Failsafe to clear loading after 10 seconds
    setTimeout(() => {
      if (isLoading) {
        console.log('[WORKFLOW] Failsafe: Clearing stuck loader');
        setIsLoading(false);
      }
    }, 10000);
  };

  const handleCancelPlan = () => {
    if (hasUnsavedChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
    }
    setShowPlanReview(false);
    setCurrentPlan(null);
    setPlanReviewMessage('');
    setHasUnsavedChanges(false);
  };

  const handleMessageClick = (message: Message) => {
    console.log("🖱️ Message clicked:", message.id, message.responseType);
    if (message.responseType && message.responseType !== 'text_response' && !message.isStreaming) {
      setActiveToolOutput(message);
      setShowToolOutput(true);
    }
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('ring-2', 'ring-gray-400', 'ring-opacity-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-gray-400', 'ring-opacity-50');
      }, 2000);
    }
  };

  const handleSendMessage = async (content: string, model?: string) => {
    // Check if this is a system message that should be hidden
    const isSystemMessage = content.startsWith('APPROVE_PLAN:') || content.startsWith('EDIT_PLAN:');

    // Block sending messages if plan review is active (except for approval/edit messages)
    if (showPlanReview && !isSystemMessage) {
      console.warn('[SEND] Cannot send messages while plan review is active');
      return;
    }

    if (activeStreamController) activeStreamController.abort();
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);

    const assistantMessageId = `assistant-${Date.now()}`;
    resultReceivedRef.current = false;
    streamCompleteRef.current = false;
    eventsReceivedRef.current = [];
    streamStartTimeRef.current = Date.now();

    // Only create user message if it's not a system message
    if (!isSystemMessage) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }

    console.log('[SSE] Request started, setting loading to true');
    setIsLoading(true);

    const controller = new AbortController();
    setActiveStreamController(controller);

    timeoutTimer.current = setTimeout(() => {
      if (!resultReceivedRef.current && !streamCompleteRef.current) {
        controller.abort();
        handleStreamTimeout(assistantMessageId);
      }
    }, 600000); // 10 minutes

    try {
      console.log('[SSE] Starting request to backend');
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          model: model || selectedModel
        }),
        signal: controller.signal,
      });

      console.log('[SSE] Response received:', { status: response.status, statusText: response.statusText });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageCreated = false;
      let currentEventName: string | null = null;

      const resetEventTimeout = () => {
        if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
        timeoutTimer.current = setTimeout(() => {
          if (!resultReceivedRef.current && !streamCompleteRef.current) {
            controller.abort();
            handleStreamTimeout(assistantMessageId);
          }
        }, 600000);
      };
      resetEventTimeout();

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        const processableLines = done ? lines : lines.slice(0, -1);
        buffer = done ? '' : (lines[lines.length - 1] || '');

        for (const line of processableLines) {
          if (!line.trim()) continue;

          if (line.startsWith('event:')) {
            currentEventName = line.substring(7).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            if (!currentEventName) {
              console.warn('[SSE] Received data line without a preceding event:', line);
              continue;
            }

            let data;
            try {
              data = JSON.parse(line.substring(6));
              console.log('[SSE] Parsed data for event', currentEventName, ':', data);
            } catch (e) {
              console.error(`[SSE] Failed to parse data for event ${currentEventName}:`, line);
              console.error('[SSE] Parse error:', e);
              currentEventName = null;
              continue;
            }

            const event = currentEventName;
            eventsReceivedRef.current.push(event);
            resetEventTimeout();
            console.log(`[SSE] Processing event: ${event}`, data);

            switch (event) {
              case 'connected':
                break;

              case 'progress': {
                let progressMessage = data.message || data.description || (data.step_id ? `Executing ${data.step_id}` : 'Processing...');
                if (!progressMessage.trim()) continue;

                const newStep: ProgressStep = { text: progressMessage, timestamp: Date.now() };
                console.log('[SSE-PROGRESS] Adding step:', newStep);

                if (!assistantMessageCreated) {
                  console.log('[SSE-PROGRESS] Creating new assistant message with first step.');
                  const progressMsg: Message = {
                    id: assistantMessageId, type: 'assistant', content: progressMessage,
                    timestamp: new Date(), isStreaming: true, progressSteps: [newStep],
                  };
                  setMessages(prev => [...prev, progressMsg]);
                  assistantMessageCreated = true;
                } else {
                  console.log('[SSE-PROGRESS] Appending step to existing message.');
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: progressMessage, progressSteps: [...(msg.progressSteps || []), newStep] }
                      : msg
                  ));
                }
                break;
              }

              case 'title_update_triggered': {
                console.log('[SSE] Title update triggered for session:', data.session_id);
                setSessionUpdateKey(Date.now());

                // Start polling for the updated title instead of directly setting it
                startTitlePolling(data.session_id);
                break;
              }


              case 'plan_review': {
                console.log('[SSE-PLAN-REVIEW] Plan review received', data);
                setCurrentPlan(data.plan);
                setPlanReviewId(data.plan.plan_id); // <-- Add this line to store the ID
                setPlanReviewMessage(data.message || 'Please review and approve/edit the execution plan');
                setShowPlanReview(true);
                setHasUnsavedChanges(false);
                break;
              }


              case 'result': {
                console.log('[SSE-RESULT] Result received', data);
                console.log('[SSE-RESULT] Should stop loading here');
                resultReceivedRef.current = true;

                // Get existing progress steps
                let existingSteps: ProgressStep[] = [];
                const currentMessages = messages; // Capture current state
                const currentMsg = currentMessages.find(m => m.id === assistantMessageId);
                if (currentMsg) {
                  existingSteps = currentMsg.progressSteps || [];
                }

                console.log(`[SSE-RESULT] Transferring ${existingSteps.length} progress steps to final message.`);
                console.log('[SSE-RESULT] assistantMessageCreated:', assistantMessageCreated);

                let responseType: 'text_response' | 'tool_response' | 'multi_tool_response' | 'plan_review' = 'text_response';
                let toolName = data.tool_name;
                if (data.tool_outputs?.length > 1) responseType = 'multi_tool_response';
                else if (data.tool_outputs?.length === 1) {
                  responseType = 'tool_response';
                  toolName = data.tool_outputs[0].tool_name;
                }

                const resultMessage: Message = {
                  id: assistantMessageId,
                  type: 'assistant',
                  content: data.message || '[No content received]',
                  timestamp: new Date(),
                  isStreaming: false,
                  isError: false,
                  progressSteps: existingSteps,
                  responseType,
                  toolName,
                  data: data.data,
                  toolOutputs: data.tool_outputs?.map((out: any) => ({
                    toolName: out.tool_name,
                    data: out.result,
                    message: out.description || out.result?.message
                  })),
                  suggested_actions: data.suggested_actions
                };

                console.log('[SSE-RESULT] Final message object:', {
                  id: resultMessage.id,
                  type: resultMessage.type,
                  content: resultMessage.content,
                  isStreaming: resultMessage.isStreaming
                });

                // Clear loading state immediately when result is received
                setIsLoading(false);

                // Update messages with the result
                setMessages(prevMessages => {
                  console.log('[SSE-RESULT] Inside setMessages - prev messages:', prevMessages.map(m => ({
                    id: m.id,
                    type: m.type,
                    content: m.content?.substring(0, 50)
                  })));

                  // Check if assistant message already exists
                  const existingIndex = prevMessages.findIndex(m => m.id === assistantMessageId);

                  let newMessages: Message[];
                  if (existingIndex !== -1) {
                    // Update existing message
                    console.log('[SSE-RESULT] Updating existing message at index:', existingIndex);
                    newMessages = [...prevMessages];
                    newMessages[existingIndex] = resultMessage;
                  } else {
                    // Add new message
                    console.log('[SSE-RESULT] Adding new message to array');
                    newMessages = [...prevMessages, resultMessage];
                  }

                  console.log('[SSE-RESULT] New messages after update:', newMessages.map(m => ({
                    id: m.id,
                    type: m.type,
                    content: m.content?.substring(0, 50)
                  })));

                  return newMessages;
                });

                // Mark that assistant message has been created
                assistantMessageCreated = true;

                if (resultMessage.responseType !== 'text_response') {
                  setActiveToolOutput(resultMessage);
                  setShowToolOutput(true);
                }
                if (data.session_info) setSessionInfo(data.session_info);

                break;
              }

              case 'done':
                console.log('[SSE] Done event received. Finalizing stream state.');
                console.log('[SSE-DONE] Should definitely stop loading here');
                streamCompleteRef.current = true;

                // ALWAYS clear loading on done, no matter what
                setIsLoading(false);

                // Only update streaming state if we haven't received a result yet
                if (!resultReceivedRef.current) {
                  console.log('[SSE-DONE] No result received yet, updating streaming state only');
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false, isError: false }
                      : msg
                  ));
                } else {
                  console.log('[SSE-DONE] Result already received, skipping message update');
                }

                // Always cleanup
                setTimeout(() => {
                  cleanupStream();
                }, 100);
                break;

              case 'error': {
                console.error('[SSE] Error event:', data);
                console.log('[SSE-ERROR] Error occurred, stopping loading');
                resultReceivedRef.current = true;
                setIsLoading(false);

                const errorMessage: Message = {
                  id: assistantMessageId, type: 'assistant', content: data.message || 'An error occurred',
                  timestamp: new Date(), isStreaming: false, isError: true
                };
                if (assistantMessageCreated) {
                  setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? errorMessage : msg));
                } else {
                  setMessages(prev => [...prev, errorMessage]);
                }
                break;
              }

              default:
                console.warn(`[SSE] Unknown event: ${event}`, data);
            }
            currentEventName = null;
          }
        }
        if (done) {
          console.log('[SSE] Stream reader finished.');
          break;
        }
      }

      if (!resultReceivedRef.current && assistantMessageCreated && streamCompleteRef.current) {
        console.warn('[SSE-FINAL] Stream completed without a "result" event.');
        setMessages(prev => prev.map(msg =>
          (msg.id === assistantMessageId)
            ? { ...msg, isStreaming: false, content: '⚠️ Request completed but no result received', isError: true }
            : msg
        ));
      }
    } catch (error: any) {
      console.error('[SSE-FATAL] Stream error, stopping loading:', error);
      setIsLoading(false);

      if (error.name === 'AbortError') console.log('[SSE-FATAL] Stream aborted by user');
      else {
        const errorMsg: Message = {
          id: assistantMessageId, type: 'assistant', content: `❌ Connection error: ${error.message}`,
          timestamp: new Date(), isStreaming: false, isError: true
        };
        setMessages(prev => {
          const existingMsg = prev.find(m => m.id === assistantMessageId);
          return existingMsg ? prev.map(m => m.id === assistantMessageId ? errorMsg : m) : [...prev, errorMsg];
        });
      }
    } finally {
      console.log('[SSE-FINALLY] Ensuring loading is stopped');
      setIsLoading(false);
      cleanupStream();
    }
  };

  // useEffect to load history on mount or when sessionId changes
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!sessionId) return;

      console.log(`[HISTORY] Loading history for session: ${sessionId}`);
      setIsLoading(true);

      try {
        const response = await fetch(`http://localhost:8000/conversations/${sessionId}`);

        if (response.status === 404) {
          console.log('[HISTORY] Session not found on server, starting fresh.');
          setMessages([]);
          setActiveToolOutput(null);
          setShowToolOutput(false);
          setCurrentChatTitle('Current Chat');
          setTitleJustUpdated(false);
          setSessionInfo({ conversation_length: 0, has_search_results: false, search_history_count: 0, latest_search_summary: {} });
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load history: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[HISTORY] Raw data from API:', data);

        // Set chat title if available
        if (data.title) {
          setCurrentChatTitle(data.title);
        } else {
          setCurrentChatTitle('Current Chat');
        }
        setTitleJustUpdated(false); // Don't show success animation for loaded titles

        if (!data.messages || !Array.isArray(data.messages)) {
          console.warn('[HISTORY] API response is not in the expected format.');
          setMessages([]);
          return;
        }

        // 1. Create a lookup map for tool outputs for efficient association
        const toolOutputsMap = new Map();
        if (data.tool_outputs && Array.isArray(data.tool_outputs)) {
          for (const output of data.tool_outputs) {
            toolOutputsMap.set(output.tool_call_id, output);
          }
        }

        // 2. Transform API messages into the frontend's Message type
        const transformedHistory: Message[] = data.messages.map((apiMsg: any, index: number) => {
          const baseMessage = {
            id: `history-${sessionId}-${index}`,
            type: apiMsg.role as 'user' | 'assistant',
            content: apiMsg.content,
            timestamp: new Date(), // API response lacks timestamps, so we generate them
            isStreaming: false,
            isError: false,
          };

          // Handle assistant messages that made tool calls
          if (apiMsg.role === 'assistant' && apiMsg.tool_calls?.length > 0) {
            const toolOutputs = apiMsg.tool_calls.map((call: any) => {
              const output = toolOutputsMap.get(call.id);
              if (!output) {
                return {
                  toolName: call.function.name,
                  data: { status: 'error', message: 'Missing output in history' },
                  message: `Executing ${call.function.name}`
                };
              }
              return {
                toolName: output.tool_name,
                data: output.result,
                message: output.description || output.result?.message || `Result for ${output.tool_name}`,
              };
            });

            const responseType = toolOutputs.length > 1 ? 'multi_tool_response' : 'tool_response';
            const toolName = toolOutputs.length === 1 ? toolOutputs[0].toolName : 'Multiple Tools';

            let finalContent = apiMsg.content;
            if (!finalContent && toolOutputs.length > 0) {
              finalContent = `Executed ${toolOutputs.length} tool${toolOutputs.length > 1 ? 's' : ''}. Click to view details.`;
            }

            return {
              ...baseMessage,
              content: finalContent,
              responseType: responseType,
              toolName: toolName,
              toolOutputs: toolOutputs,
            };
          }

          // Handle user messages and simple assistant text responses
          return {
            ...baseMessage,
            responseType: 'text_response',
          };
        });

        console.log('[HISTORY] Transformed history for frontend:', transformedHistory);
        setMessages(transformedHistory);

        // You can extract session info from the last message if available, or from a dedicated 'info' block
        // For now, we'll just set it based on the loaded messages length
        setSessionInfo(prev => ({ ...prev, conversation_length: transformedHistory.length }));

      } catch (error) {
        console.error('[HISTORY] Error loading conversation history:', error);
        setCurrentChatTitle('Current Chat');
        setTitleJustUpdated(false);
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: `Could not load conversation history. Error: ${(error as Error).message}`,
          timestamp: new Date(),
          isError: true,
        };
        setMessages([errorMsg]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversationHistory();
  }, [sessionId]);

  // Save session state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_session_id', sessionId);
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeStreamController) activeStreamController.abort();
      if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
      cleanupTitlePolling();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  // Wrapper for ToolOutput with collapsible functionality
  const CollapsibleToolOutputWrapper = ({ message }: { message: Message }) => {
    const baseKey = `${message.id}-${message.timestamp?.getTime()}`;
    const sectionKey = `${baseKey}-main`;
    const isCollapsed = collapsedSections[sectionKey];

    return (
      <div className="space-y-3">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full shadow-sm"></div>
            <span className="font-semibold text-gray-900">Tool: {message.toolName || (message.responseType === 'multi_tool_response' ? 'Multiple Tools' : 'Unknown')}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium">Generated at: {message.timestamp?.toLocaleString()}</p>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => toggleSection(sectionKey)} className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-between text-left transition-all duration-200 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Tool Output Content</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{isCollapsed ? 'Expand' : 'Collapse'}</span>
              {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>
          </button>
          <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-none'}`}>
            <div className="bg-white">
              <ToolOutput message={message} onGenerateEmail={handleGenerateEmail} onScrollToMessage={scrollToMessage} onSwitchTab={() => { setShowToolOutput(false); setActiveToolOutput(null); }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Updated header component with history button and title polling indication
  const AppHeader = () => (
    <div className="p-4 border-b border-gray-300 flex-shrink-0 bg-gradient-to-r from-white to-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ava</h1>
            <p className="text-xs text-gray-500">AI SDR Assistant</p>
          </div>
        </div>

        {/* Current Chat Title Display with smooth transition */}
        <div className="flex-1 text-center">
          <div className="relative">
            <h2 className={`text-sm font-medium text-gray-700 truncate max-w-md mx-auto transition-all duration-500 ease-in-out ${isPollingTitle ? 'opacity-75' : 'opacity-100'
              }`}>
              {currentChatTitle}
            </h2>
            {isPollingTitle && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            <Bot className="w-3 h-3" />
            <span className="font-medium">{getModelDisplayName(selectedModel)}</span>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${sidebarOpen
              ? 'bg-gray-200 text-gray-800 cursor-default'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            title={sidebarOpen ? "Chat history is open" : "Open chat history"}
            disabled={sidebarOpen}
          >
            <History className="w-3 h-3" />
            History
          </button>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            title="Start new conversation"
          >
            <MessageSquare className="w-3 h-3" />
            New
          </button>
        </div>
      </div>
    </div>
  );

  // Chat History Panel Component
  const ChatHistoryPanel = () => (
    <div className="h-full bg-gradient-to-b from-gray-50 to-white border-r border-gray-300">
      <ChatHistorySidebar
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        sessionUpdateKey={sessionUpdateKey}
        isOpen={true} // Always open when panel is shown
        onToggle={() => setSidebarOpen(false)} // Close the sidebar when toggle is called
        isPanelMode={true} // Add this prop to indicate panel mode
      />
    </div>
  );

  // Main Chat Panel Component with disabled state
  const MainChatPanel = () => (
    <div className="h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col shadow-lg relative">
      <AppHeader />

      {/* Overlay when plan review is active */}
      {showPlanReview && (
        <div className="absolute inset-0 z-20 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md text-center animate-pulse-border">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Chat Locked</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please review and approve the workflow plan before continuing the conversation.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Workflow review in progress</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col-reverse overflow-hidden">
          <div className="flex-shrink-0">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={showPlanReview}
              disabledMessage={showPlanReview ? "Complete workflow review to continue" : undefined}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              hasActiveConversation={messages.length > 0}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <MessagesList
              messages={messages}
              isLoading={isLoading}
              onMessageClick={handleMessageClick}
              onSendMessage={handleSendMessage}
              activeMessageId={activeToolOutput?.id}
            />
          </div>
        </div>
      </div>
      <div className="p-3 border-t border-gray-300 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span className="bg-gray-200 px-2 py-1 rounded-full">{sessionId.slice(-8)}</span>
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{messages.length} msgs</span>
        </div>
      </div>
    </div>
  );

  // Tool Output Panel Component
  const ToolOutputPanel = () => (
    <div className="h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tool Output</h2>
            <p className="text-xs text-gray-600">Detailed results and content</p>
          </div>
          <button
            onClick={() => { setShowToolOutput(false); setActiveToolOutput(null); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg"
            title="Close tool output panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {activeToolOutput ? (
          <CollapsibleToolOutputWrapper message={activeToolOutput} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Bot className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium">No tool output selected</p>
            <p className="text-xs text-gray-400 mt-1">Click on a message with tool results to view details</p>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced Plan Review Panel Component
  const PlanReviewPanel = () => (
    <div className="h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">Workflow Review</h2>
              <p className="text-xs text-blue-600">{planReviewMessage}</p>
            </div>
          </div>
          <button
            onClick={handleCancelPlan}
            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-white/60 rounded-lg transition-colors"
            title="Cancel plan review"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApprovePlan}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve & Execute
          </button>
          <button
            onClick={handleCancelPlan}
            className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4 min-h-0">
        {currentPlan ? (
          <div className="h-full bg-white rounded-xl shadow-inner border border-blue-100">
            <WorkflowEditor
              initialPlan={currentPlan}
              onExportPlan={handleEditPlan}
              isReadOnly={false}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center animate-pulse">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <p className="font-medium text-gray-700">Loading workflow...</p>
              <p className="text-xs text-gray-500 mt-1">Preparing execution plan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render the appropriate layout based on current state
  const renderLayout = () => {
    const panels = [];

    // History panel (if sidebar is open)
    if (sidebarOpen) {
      panels.push(
        <Panel key="history" defaultSize={25} minSize={20} maxSize={40}>
          <ChatHistoryPanel />
        </Panel>
      );

      // Add resize handle
      panels.push(
        <PanelResizeHandle key="history-handle" className="group relative w-2 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 hover:from-gray-500 hover:via-gray-600 hover:to-gray-500 transition-all duration-200 cursor-col-resize flex items-center justify-center border-r border-gray-300">
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-white to-transparent opacity-50 group-hover:opacity-80"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 flex items-center justify-center border border-gray-300">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Drag to resize
            </div>
          </div>
        </PanelResizeHandle>
      );
    }

    // Main chat panel - adjust size based on other panels
    const mainPanelSize = (() => {
      const panelCount = [sidebarOpen, showToolOutput, showPlanReview].filter(Boolean).length;
      if (panelCount === 0) return 100; // No panels open
      if (panelCount === 1) return 70; // One panel open
      if (panelCount === 2) return 50; // Two panels open
      return 40; // All three panels open
    })();

    panels.push(
      <Panel key="main" defaultSize={mainPanelSize} minSize={30}>
        <MainChatPanel />
      </Panel>
    );

    // Tool output panel (if shown)
    if (showToolOutput) {
      panels.push(
        <PanelResizeHandle key="tool-handle" className="group relative w-2 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-300 hover:from-gray-500 hover:via-gray-600 hover:to-gray-500 transition-all duration-200 cursor-col-resize flex items-center justify-center border-l border-gray-300">
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-white to-transparent opacity-50 group-hover:opacity-80"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 flex items-center justify-center border border-gray-300">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Drag to resize
            </div>
          </div>
        </PanelResizeHandle>
      );

      panels.push(
        <Panel key="tool" defaultSize={sidebarOpen ? 30 : 40} minSize={25} maxSize={60}>
          <ToolOutputPanel />
        </Panel>
      );
    }

    // Plan review panel (if shown)
    if (showPlanReview) {
      panels.push(
        <PanelResizeHandle key="plan-handle" className="group relative w-2 bg-gradient-to-b from-blue-300 via-blue-400 to-blue-300 hover:from-blue-500 hover:via-blue-600 hover:to-blue-500 transition-all duration-200 cursor-col-resize flex items-center justify-center border-l border-blue-300">
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-white to-transparent opacity-50 group-hover:opacity-80"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 flex items-center justify-center border border-blue-300">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-blue-400 rounded-full"></div>
              <div className="w-0.5 h-4 bg-blue-400 rounded-full"></div>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-blue-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Drag to resize
            </div>
          </div>
        </PanelResizeHandle>
      );

      const planPanelSize = (() => {
        const otherPanels = [sidebarOpen, showToolOutput].filter(Boolean).length;
        if (otherPanels === 0) return 50; // Only plan panel
        if (otherPanels === 1) return 40; // Plan + one other
        return 35; // Plan + two others
      })();

      panels.push(
        <Panel key="plan" defaultSize={planPanelSize} minSize={30} maxSize={70}>
          <PlanReviewPanel />
        </Panel>
      );
    }

    return (
      <PanelGroup direction="horizontal">
        {panels}
      </PanelGroup>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex transition-all duration-300">
      {renderLayout()}
    </div>
  );
}

export default App;