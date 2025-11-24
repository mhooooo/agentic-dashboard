'use client';

/**
 * Widget Creation Wizard
 *
 * Problem-first conversational interface for creating widgets.
 * 5-stage flow:
 * 1. Problem Discovery - Ask "What problem are you solving?"
 * 2. Clarifying Questions - Gather implementation details
 * 3. Visualization - Choose how to display data
 * 4. Preview - Show generated widget schema
 * 5. Deploy - Create widget and add to dashboard
 */

import { useState, useEffect, useRef } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { cn } from '@/lib/utils';

export interface WidgetCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onWidgetCreated?: (widgetId: string) => void;
}

export function WidgetCreationWizard({
  isOpen,
  onClose,
  onWidgetCreated,
}: WidgetCreationWizardProps) {
  const stage = useConversationStore((state) => state.stage);
  const messages = useConversationStore((state) => state.messages);
  const addMessage = useConversationStore((state) => state.addMessage);
  const reset = useConversationStore((state) => state.reset);

  const [isLoading, setIsLoading] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage(
        'assistant',
        'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
      );
    }
  }, [isOpen, messages.length, addMessage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Call API (placeholder for now - will be implemented in Task 6)
      // For now, just echo back
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addMessage(
        'assistant',
        `I understand you're working on: "${userMessage}". Let me think about how to help you with that...`
      );
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('assistant', 'Sorry, something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? This will clear the conversation.')) {
      reset();
      addMessage(
        'assistant',
        'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Create Widget</h2>
            <p className="text-sm text-muted-foreground">
              Conversational widget creation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors"
              disabled={isLoading}
            >
              Start Over
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Stage Indicator */}
        <div className="p-4 border-b bg-muted/30">
          <StageIndicator stage={stage} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stage Indicator - Shows progress through 5-stage wizard
 */
function StageIndicator({ stage }: { stage: string }) {
  const stages = [
    { id: 'problem_discovery', label: 'Problem' },
    { id: 'clarifying_questions', label: 'Details' },
    { id: 'visualization', label: 'Visualization' },
    { id: 'preview', label: 'Preview' },
    { id: 'deploy', label: 'Deploy' },
  ];

  const currentIdx = stages.findIndex((s) => s.id === stage);

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {stages.map((s, idx) => (
        <div key={s.id} className="flex items-center">
          {/* Stage Circle */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                idx <= currentIdx
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {idx + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                idx <= currentIdx ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </div>

          {/* Connector Line */}
          {idx < stages.length - 1 && (
            <div
              className={cn(
                'w-12 h-px mx-2 transition-colors',
                idx < currentIdx ? 'bg-primary' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Message Bubble - Displays user and assistant messages
 */
function MessageBubble({ message }: { message: { role: string; content: string; timestamp: Date } }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2.5 shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute ago
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour ago
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Otherwise show time
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
