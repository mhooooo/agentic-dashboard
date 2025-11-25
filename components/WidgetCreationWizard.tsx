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
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import type { LayoutType } from '@/lib/universal-widget/schema';

// TODO: Uncomment when Stage 3-4 components are created by sub-agents
// import { VisualizationSelector } from '@/components/wizard/VisualizationSelector';
// import { WidgetPreview } from '@/components/wizard/WidgetPreview';

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
  const router = useRouter();

  const stage = useConversationStore((state) => state.stage);
  const messages = useConversationStore((state) => state.messages);
  const addMessage = useConversationStore((state) => state.addMessage);
  const reset = useConversationStore((state) => state.reset);
  const extractedIntent = useConversationStore((state) => state.extractedIntent);
  const inferredWidget = useConversationStore((state) => state.inferredWidget);
  const setStage = useConversationStore((state) => state.setStage);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stage 3-4-5 state
  const [selectedVisualization, setSelectedVisualization] = useState<LayoutType | null>(null);
  const [widgetSchema, setWidgetSchema] = useState<UniversalWidgetDefinition | null>(null);
  const [deployedWidgetId, setDeployedWidgetId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

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

  // Cleanup: Abort pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setLastUserMessage(userMessage);

    // Add user message
    addMessage('user', userMessage);
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Stage 1: Problem Discovery - Returns structured JSON (not streaming)
      if (stage === 'problem_discovery') {
        const response = await fetch('/api/ai/widget-creation/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            stage: stage,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          } else if (response.status === 500) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error. Please try again.');
          } else {
            throw new Error(`API error: ${response.status}`);
          }
        }

        const data = await response.json();

        // Add AI response
        addMessage('assistant', data.message);

        // Store extracted intent and inferred widget
        if (data.extractedIntent) {
          useConversationStore.getState().setExtractedIntent(data.extractedIntent);
        }
        if (data.inferredWidget) {
          useConversationStore.getState().setInferredWidget(data.inferredWidget);
        }

        // Progress to next stage
        if (data.nextStage) {
          useConversationStore.getState().setStage(data.nextStage);
        }

        // Reset retry count on success
        setRetryCount(0);
      } else {
        // Stages 2-5: Use streaming for natural conversation
        await handleStreamingResponse(userMessage);
        setRetryCount(0);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Handle abort errors (user cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled by user');
        return;
      }

      // Set error message for display
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setError(errorMessage);

      addMessage('assistant', `⚠️ ${errorMessage}`);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (!lastUserMessage) return;

    setRetryCount((prev) => prev + 1);
    setInputValue(lastUserMessage);

    // Automatically trigger send after a brief delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleStreamingResponse = async (userMessage: string) => {
    const extractedIntent = useConversationStore.getState().extractedIntent;
    const inferredWidget = useConversationStore.getState().inferredWidget;

    const response = await fetch('/api/ai/widget-creation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        stage: stage,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        extractedIntent,
        inferredWidget,
      }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again.');
      }
      throw new Error(`API error: ${response.status}`);
    }

    // Read streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let accumulatedText = '';

    // Add placeholder message that we'll update
    const messageIndex = messages.length;
    addMessage('assistant', '');

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE events (format: "data: {json}\n\n")
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const jsonStr = line.replace('data: ', '');

          try {
            const data = JSON.parse(jsonStr);

            if (data.text) {
              // Accumulate text
              accumulatedText += data.text;

              // Update message in store
              useConversationStore.setState((state) => {
                const newMessages = [...state.messages];
                newMessages[messageIndex] = {
                  ...newMessages[messageIndex],
                  content: accumulatedText,
                };
                return { messages: newMessages };
              });
            } else if (data.done) {
              // Stream complete
              break;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', jsonStr, parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
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
      setSelectedVisualization(null);
      setWidgetSchema(null);
      setDeployedWidgetId(null);
      setError(null);
      addMessage(
        'assistant',
        'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
      );
    }
  };

  /**
   * Stage 3: Visualization selection
   * User picks how to display the data
   */
  const handleVisualizationSelected = (visualizationType: LayoutType) => {
    setSelectedVisualization(visualizationType);
    setError(null);

    // Progress to Stage 4: Preview
    setStage('preview');

    // Generate widget schema based on provider + visualization
    // This will be called by the WidgetPreview component
    console.log('[Wizard] Visualization selected:', visualizationType);
  };

  /**
   * Stage 3: Back button
   * Return to Stage 2 (clarifying questions)
   */
  const handleVisualizationBack = () => {
    setStage('clarifying_questions');
    setSelectedVisualization(null);
  };

  /**
   * Stage 4: Widget preview loaded
   * Schema generated and shown to user
   */
  const handleWidgetSchemaGenerated = (schema: UniversalWidgetDefinition) => {
    setWidgetSchema(schema);
    console.log('[Wizard] Widget schema generated:', schema);
  };

  /**
   * Stage 4: Back button
   * Return to Stage 3 (visualization selection)
   */
  const handlePreviewBack = () => {
    setStage('visualization');
    setWidgetSchema(null);
  };

  /**
   * Stage 4: Deploy button
   * Deploy widget to dashboard
   */
  const handleDeploy = async () => {
    if (!widgetSchema || !extractedIntent) {
      setError('Missing required data for deployment');
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/widget-creation/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetDefinition: widgetSchema,
          userIntent: extractedIntent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Deploy failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Deployment failed');
      }

      // Success!
      setDeployedWidgetId(data.widgetId);
      setStage('deploy'); // Move to success stage

      // Call callback if provided
      if (onWidgetCreated) {
        onWidgetCreated(data.widgetId);
      }

      console.log('[Wizard] Widget deployed successfully:', data.widgetId);
    } catch (error) {
      console.error('[Wizard] Deploy error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deploy widget';
      setError(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  /**
   * Stage 5: View on dashboard
   * Close wizard and navigate to dashboard
   */
  const handleViewDashboard = () => {
    onClose();
    router.push('/dashboard');
  };

  /**
   * Stage 5: Create another widget
   * Reset wizard to Stage 1
   */
  const handleCreateAnother = () => {
    reset();
    setSelectedVisualization(null);
    setWidgetSchema(null);
    setDeployedWidgetId(null);
    setError(null);
    addMessage(
      'assistant',
      'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
    );
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

        {/* Main Content - Stage Routing */}
        <div className="flex-1 overflow-y-auto">
          {/* Stages 1-2: Chat interface */}
          {(stage === 'problem_discovery' || stage === 'clarifying_questions') && (
            <div className="p-4 space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium">
                    {stage === 'problem_discovery'
                      ? 'Understanding your problem...'
                      : 'Thinking of questions...'}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Stage 3: Visualization selection */}
          {stage === 'visualization' && (
            <VisualizationSelectorPlaceholder
              inferredWidget={inferredWidget}
              onSelect={handleVisualizationSelected}
              onBack={handleVisualizationBack}
            />
          )}

          {/* Stage 4: Preview */}
          {stage === 'preview' && (
            <WidgetPreviewPlaceholder
              provider={inferredWidget?.provider || ''}
              visualizationType={selectedVisualization || 'list'}
              onSchemaGenerated={handleWidgetSchemaGenerated}
              onDeploy={handleDeploy}
              onBack={handlePreviewBack}
              isDeploying={isDeploying}
              widgetSchema={widgetSchema}
            />
          )}

          {/* Stage 5: Success */}
          {stage === 'deploy' && (
            <DeploySuccessScreen
              widgetId={deployedWidgetId || ''}
              widgetName={widgetSchema?.metadata.name || 'Widget'}
              onViewDashboard={handleViewDashboard}
              onCreateAnother={handleCreateAnother}
            />
          )}
        </div>

        {/* Input (only for Stages 1-2) */}
        {(stage === 'problem_discovery' || stage === 'clarifying_questions') && (
          <div className="p-4 border-t bg-muted/30">
            {/* Error display */}
            {error && (
              <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">Error</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                </div>
                {lastUserMessage && (
                  <button
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    Retry {retryCount > 0 && `(${retryCount})`}
                  </button>
                )}
              </div>
            )}

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
        )}

        {/* Error banner (shown for Stages 3-4 if deployment fails) */}
        {(stage === 'visualization' || stage === 'preview') && error && (
          <div className="p-4 border-t bg-destructive/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-3 py-1.5 text-xs border border-destructive/20 rounded-md hover:bg-destructive/5 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PLACEHOLDER: VisualizationSelector Component
 *
 * This component will be created by Sub-Agent 1.
 * Expected props and behavior documented here.
 */
interface VisualizationSelectorPlaceholderProps {
  inferredWidget: { provider: string; widgetType: string; confidence: number; reasoning?: string } | null;
  onSelect: (visualizationType: LayoutType) => void;
  onBack: () => void;
}

function VisualizationSelectorPlaceholder({
  inferredWidget,
  onSelect,
  onBack,
}: VisualizationSelectorPlaceholderProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="max-w-md space-y-4">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-2xl font-bold">Choose Visualization</h3>
        <p className="text-muted-foreground">
          Based on your needs, we recommend a visualization for{' '}
          <span className="font-semibold text-foreground">{inferredWidget?.provider || 'your data'}</span>.
        </p>

        <div className="mt-8 space-y-2">
          <p className="text-sm text-muted-foreground">Available options:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(['list', 'table', 'cards', 'metric', 'chart'] as LayoutType[]).map((type) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors capitalize"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>TODO:</strong> This is a placeholder. Sub-Agent 1 will create the full VisualizationSelector component
            at <code>components/wizard/VisualizationSelector.tsx</code>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PLACEHOLDER: WidgetPreview Component
 *
 * This component will be created by Sub-Agent 2.
 * Expected props and behavior documented here.
 */
interface WidgetPreviewPlaceholderProps {
  provider: string;
  visualizationType: LayoutType;
  onSchemaGenerated: (schema: UniversalWidgetDefinition) => void;
  onDeploy: () => void;
  onBack: () => void;
  isDeploying: boolean;
  widgetSchema: UniversalWidgetDefinition | null;
}

function WidgetPreviewPlaceholder({
  provider,
  visualizationType,
  onSchemaGenerated,
  onDeploy,
  onBack,
  isDeploying,
  widgetSchema,
}: WidgetPreviewPlaceholderProps) {
  // Auto-generate placeholder schema on mount
  useEffect(() => {
    if (!widgetSchema) {
      const placeholderSchema: UniversalWidgetDefinition = {
        metadata: {
          name: `${provider} ${visualizationType}`,
          description: `Preview of ${provider} ${visualizationType} widget`,
          category: 'development',
          version: 1,
        },
        dataSource: {
          provider: provider,
          endpoint: '/api/placeholder',
          method: 'GET',
        },
        fields: [
          {
            name: 'title',
            path: '$.title',
            label: 'Title',
            type: 'string',
          },
        ],
        layout: {
          type: visualizationType,
        } as any,
      };

      onSchemaGenerated(placeholderSchema);
    }
  }, [provider, visualizationType, widgetSchema, onSchemaGenerated]);

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">👀</div>
          <h3 className="text-2xl font-bold">Widget Preview</h3>
          <p className="text-muted-foreground">
            Here's how your <span className="font-semibold text-foreground">{provider}</span>{' '}
            widget will look as a <span className="font-semibold text-foreground">{visualizationType}</span>.
          </p>
        </div>

        {/* Placeholder widget preview */}
        <div className="border rounded-lg p-6 bg-muted/30 min-h-[200px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{widgetSchema?.metadata.name}</h4>
                <p className="text-sm text-muted-foreground">{widgetSchema?.metadata.description}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {visualizationType}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Provider: <span className="font-medium text-foreground">{provider}</span></p>
              <p>Layout: <span className="font-medium text-foreground">{visualizationType}</span></p>
            </div>

            {widgetSchema && (
              <details className="mt-4">
                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  View schema (JSON)
                </summary>
                <pre className="mt-2 text-xs bg-background p-3 rounded border overflow-auto max-h-[200px]">
                  {JSON.stringify(widgetSchema, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={isDeploying}
            className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            ← Back
          </button>

          <button
            onClick={onDeploy}
            disabled={isDeploying || !widgetSchema}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isDeploying ? 'Deploying...' : 'Deploy Widget'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>TODO:</strong> This is a placeholder. Sub-Agent 2 will create the full WidgetPreview component
            at <code>components/wizard/WidgetPreview.tsx</code> with live preview rendering.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Stage 5: Deploy Success Screen
 *
 * Shows success message and navigation options after widget deployment.
 */
interface DeploySuccessScreenProps {
  widgetId: string;
  widgetName: string;
  onViewDashboard: () => void;
  onCreateAnother: () => void;
}

function DeploySuccessScreen({
  widgetId,
  widgetName,
  onViewDashboard,
  onCreateAnother,
}: DeploySuccessScreenProps) {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="max-w-md space-y-6">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success message */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
            Widget Deployed Successfully!
          </h3>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{widgetName}</span> has been added to your dashboard.
          </p>
          <p className="text-xs text-muted-foreground">Widget ID: {widgetId}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            onClick={onViewDashboard}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            View on Dashboard
          </button>

          <button
            onClick={onCreateAnother}
            className="w-full px-6 py-3 border rounded-md font-medium hover:bg-accent transition-colors"
          >
            Create Another Widget
          </button>
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
