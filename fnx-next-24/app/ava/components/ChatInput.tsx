import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Mic, Square, Bot, Sparkles, X, Edit2, Lock } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { DEFAULT_MODEL } from '../config/models';

interface ChatInputProps {
  onSendMessage: (message: string, model?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  hasActiveConversation?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  disabledMessage = "Chat is currently disabled",
  selectedModel = DEFAULT_MODEL.id,
  onModelChange,
  hasActiveConversation = false
}) => {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [autoSendCountdown, setAutoSendCountdown] = useState(2);
  const [shouldStartAutoSend, setShouldStartAutoSend] = useState(false);

  const recognitionRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef(message);

  const SILENCE_THRESHOLD = 1500; // 1.5 seconds of silence before considering speech ended
  const AUTO_SEND_DELAY = 2000; // 2 seconds to edit before auto-send

  // Keep messageRef in sync with message state
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Handle auto-send trigger
  useEffect(() => {
    if (shouldStartAutoSend && message.trim() && !isListening && !disabled) {
      startAutoSend();
      setShouldStartAutoSend(false);
    }
  }, [shouldStartAutoSend, message, isListening, disabled]);

  useEffect(() => {
    // Check for speech recognition support
    const hasSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(hasSupport);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
      if (autoSendIntervalRef.current) clearInterval(autoSendIntervalRef.current);
    };
  }, []);

  // Cancel auto-send if disabled
  useEffect(() => {
    if (disabled && isAutoSending) {
      cancelAutoSend();
    }
  }, [disabled]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startDurationTimer = () => {
    setRecordingDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setRecordingDuration(0);
  };

  const cancelAutoSend = () => {
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (autoSendIntervalRef.current) {
      clearInterval(autoSendIntervalRef.current);
      autoSendIntervalRef.current = null;
    }
    setIsAutoSending(false);
    setAutoSendCountdown(2);
    setShouldStartAutoSend(false);

    // Focus the input for editing
    inputRef.current?.focus();
  };

  const startAutoSend = () => {
    if (!messageRef.current.trim() || isAutoSending || disabled) return;

    setIsAutoSending(true);
    setAutoSendCountdown(2);

    // Countdown interval
    autoSendIntervalRef.current = setInterval(() => {
      setAutoSendCountdown(prev => {
        if (prev <= 1) {
          if (autoSendIntervalRef.current) {
            clearInterval(autoSendIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-send timeout
    autoSendTimeoutRef.current = setTimeout(() => {
      const currentMessage = messageRef.current;
      if (currentMessage.trim() && !disabled) {
        onSendMessage(currentMessage.trim(), selectedModel);
        setMessage('');
      }
      setIsAutoSending(false);
      setAutoSendCountdown(2);
    }, AUTO_SEND_DELAY);
  };

  const resetSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    silenceTimeoutRef.current = setTimeout(() => {
      // Stop recognition when silence is detected
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, SILENCE_THRESHOLD);
  };

  const setupSpeechRecognition = () => {
    if (!isSupported) return null;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalTranscript = finalTranscript;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      finalTranscript = newFinalTranscript;
      const fullTranscript = finalTranscript + interimTranscript;
      setMessage(fullTranscript);
      setPermissionError('');

      // Reset silence timer on new speech
      resetSilenceTimeout();
    };

    recognition.onstart = () => {
      setIsListening(true);
      setPermissionError('');
      finalTranscript = '';
      startDurationTimer();
      resetSilenceTimeout();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopDurationTimer();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Trigger auto-send check
      setShouldStartAutoSend(true);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      stopDurationTimer();

      switch (event.error) {
        case 'not-allowed':
          setPermissionError('Microphone access denied. Please allow microphone access in your browser settings.');
          break;
        case 'no-speech':
          // No error for no-speech, trigger auto-send check
          setShouldStartAutoSend(true);
          break;
        case 'audio-capture':
          setPermissionError('No microphone found. Please check your microphone.');
          break;
        case 'network':
          setPermissionError('Network error. Please check your internet connection.');
          break;
        default:
          if (event.error !== 'aborted') {
            setPermissionError('Speech recognition error. Please try again.');
          }
      }
    };

    return recognition;
  };

  const toggleListening = async () => {
    if (!isSupported || disabled) return;

    if (isListening && recognitionRef.current) {
      // Stop recording
      recognitionRef.current.stop();
      return;
    }

    // Cancel any auto-send in progress
    cancelAutoSend();

    // Start recording
    setPermissionError('');

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);

      if (error.name === 'NotAllowedError') {
        setPermissionError('Microphone access denied. Please allow access and try again.');
      } else {
        setPermissionError('Failed to start voice recognition. Please try again.');
      }

      setIsListening(false);
    }
  };

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      cancelAutoSend();
      onSendMessage(message.trim(), selectedModel);
      setMessage('');
    }
  };

  return (
    <div className="border-t border-gray-300 bg-gradient-to-r from-white to-gray-50">
      {/* Disabled state warning */}
      {disabled && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">{disabledMessage}</span>
          </div>
        </div>
      )}

      {/* Auto-send countdown bar */}
      {isAutoSending && !disabled && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Edit2 className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-medium">Sending in {autoSendCountdown}s...</span>
                <span className="text-green-600 text-xs">Click to edit or press Enter</span>
              </div>
              <div className="mt-1 w-full bg-green-200 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${((2 - autoSendCountdown) / 2) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={cancelAutoSend}
              className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              title="Cancel auto-send"
            >
              <X className="w-3 h-3 text-green-600" />
            </button>
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="flex gap-2 items-center">
          {/* Model Selector */}
          <div className="flex-shrink-0">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange || (() => { })}
              disabled={disabled || hasActiveConversation}
              compact={true}
            />
          </div>
          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                // Cancel auto-send if user starts typing
                if (isAutoSending) {
                  cancelAutoSend();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                disabled
                  ? "Chat disabled"
                  : isListening
                    ? "Listening..."
                    : "Ask me to find prospects or generate emails..."
              }
              className={`
                w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 
                focus:border-transparent resize-none shadow-sm bg-white/80 backdrop-blur-sm 
                transition-all duration-200 
                ${isListening ? 'pr-20' : ''}
                ${isAutoSending ? 'ring-2 ring-green-400 border-green-400' : ''}
                ${permissionError ? 'border-red-300' : 'border-gray-300'}
                ${disabled ? 'cursor-not-allowed opacity-60 bg-gray-50' : ''}
              `}
              disabled={isLoading || disabled}
              onClick={() => {
                // Cancel auto-send if user clicks on input
                if (isAutoSending) {
                  cancelAutoSend();
                }
              }}
            />

            {/* Recording indicator inside input */}
            {isListening && !disabled && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <div className="flex items-center gap-1 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">{formatDuration(recordingDuration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Voice Input Button */}
          {isSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading || isAutoSending || disabled}
              className={`
                relative p-2.5 rounded-xl border transition-all duration-200 shadow-sm
                ${isListening
                  ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white shadow-lg scale-110'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }
                ${(isLoading || isAutoSending || disabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                transform active:scale-95
              `}
              title={disabled ? "Chat disabled" : isListening ? "Stop recording" : "Start voice input"}
            >
              {isListening ? (
                <div className="relative">
                  <Square className="w-4 h-4 fill-current" />
                  {/* Subtle pulse effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className={`
              bg-gradient-to-r from-gray-800 to-black hover:from-black hover:to-gray-900 
              disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2.5 rounded-xl 
              transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl 
              disabled:shadow-none transform hover:scale-105 active:scale-95
              ${isAutoSending && !disabled ? 'animate-pulse' : ''}
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
            title={disabled ? "Chat disabled" : "Send message"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Model switching warning */}
        {hasActiveConversation && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
            Model switching disabled during active conversation. Start a Untitled Chat to change models.
          </div>
        )}

        {/* Error message */}
        {permissionError && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            {permissionError}
          </div>
        )}

        {/* Browser compatibility notice - only show if not supported */}
        {!isSupported && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
            Voice input is not supported in your browser. Try Chrome, Safari, or Edge.
          </div>
        )}
      </div>
    </div>
  );
};