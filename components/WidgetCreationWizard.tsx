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
import type { UniversalWidgetDefinition, LayoutType, FieldMapping } from '@/lib/universal-widget/schema';
import confetti from 'canvas-confetti';

// Real Stage 3-4 components
import { VisualizationSelector } from '@/components/wizard/VisualizationSelector';
import { WidgetPreview } from '@/components/wizard/WidgetPreview';

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
  const goToPreviousStage = useConversationStore((state) => state.goToPreviousStage);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployRetryCount, setDeployRetryCount] = useState(0);

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
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    reset();
    setSelectedVisualization(null);
    setWidgetSchema(null);
    setDeployedWidgetId(null);
    setError(null);
    setDeployError(null);
    setShowResetConfirm(false);
    addMessage(
      'assistant',
      'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
    );
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };
  /**
   * Handle back navigation
   * Uses the store's goToPreviousStage which preserves conversation state
   */
  const handleBack = () => {
    goToPreviousStage();

    // Clear stage-specific local state
    if (stage === 'visualization') {
      setSelectedVisualization(null);
    } else if (stage === 'preview') {
      setWidgetSchema(null);
      setDeployError(null);
    } else if (stage === 'deploy') {
      setDeployedWidgetId(null);
    }
  };

  /**
   * Stage 3: Visualization selection
   * User picks how to display the data
   */
  const handleVisualizationSelected = (visualizationType: LayoutType) => {
    setSelectedVisualization(visualizationType);
    setError(null);

    // Generate initial widget schema based on provider + visualization
    const provider = inferredWidget?.provider || 'unknown';
    const initialSchema = generateInitialSchema(provider, visualizationType, extractedIntent);
    setWidgetSchema(initialSchema);

    // Progress to Stage 4: Preview
    setStage('preview');

    console.log('[Wizard] Visualization selected:', visualizationType, 'Schema:', initialSchema);
  };

  /**
   * Stage 3: Back button
   * Return to Stage 2 (clarifying questions)
   */
  

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
  

  /**
   * Stage 4: Deploy button
   * Deploy widget to dashboard
   */
  const handleDeploy = async () => {
    if (!widgetSchema || !extractedIntent) {
      setDeployError('Missing required data for deployment');
      return;
    }

    setIsDeploying(true);
    setDeployError(null);

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
      setDeployRetryCount(0); // Reset retry counter on success
      setStage('deploy'); // Move to success stage

      // Call callback if provided
      if (onWidgetCreated) {
        onWidgetCreated(data.widgetId);
      }

      console.log('[Wizard] Widget deployed successfully:', data.widgetId);
    } catch (error) {
      console.error('[Wizard] Deploy error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deploy widget';
      setDeployError(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };
  /**
   * Retry deployment after error
   */
  const handleDeployRetry = () => {
    setDeployRetryCount((prev) => prev + 1);
    handleDeploy();
  };

  /**
   * Stage 5: View on dashboard
   * Close wizard and navigate to dashboard
   */
  const handleViewDashboard = () => {
    onClose();
    router.push('/');
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
    setDeployError(null);
    addMessage(
      'assistant',
      'Hi! I\'m here to help you create a widget. What problem are you trying to solve?'
    );
  };

  /**
   * Generate initial widget schema
   * Creates a basic schema based on provider and visualization type
   */
  const generateInitialSchema = (
    provider: string,
    visualizationType: LayoutType,
    intent: any
  ): UniversalWidgetDefinition => {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    // Create a basic schema - this will be refined by the user in the preview stage
    const schema: UniversalWidgetDefinition = {
      metadata: {
        name: `${providerName} ${visualizationType}`,
        description: intent?.problemSolved || `View ${provider} data as ${visualizationType}`,
        category: getCategoryForProvider(provider),
        version: 1,
      },
      dataSource: {
        provider: provider,
        endpoint: getDefaultEndpointForProvider(provider),
        method: 'GET',
      },
      fields: getDefaultFieldsForProvider(provider),
      layout: getDefaultLayoutForType(visualizationType, provider),
    };

    return schema;
  };

  /**
   * Helper: Get category for provider
   */
  const getCategoryForProvider = (provider: string): string => {
    const categoryMap: Record<string, string> = {
      github: 'development',
      jira: 'project-management',
      linear: 'project-management',
      slack: 'communication',
      calendar: 'productivity',
      stripe: 'finance',
      twilio: 'communication',
    };
    return categoryMap[provider] || 'general';
  };

  /**
   * Helper: Get default endpoint for provider
   */
  const getDefaultEndpointForProvider = (provider: string): string => {
    const endpointMap: Record<string, string> = {
      github: '/repos/:owner/:repo/pulls',
      jira: '/rest/api/3/search',
      linear: '/issues',
      slack: '/conversations.history',
      calendar: '/calendars/:calendarId/events',
      stripe: '/charges',
      twilio: '/Messages',
    };
    return endpointMap[provider] || '/data';
  };

  /**
   * Helper: Get default fields for provider
   */
  const getDefaultFieldsForProvider = (provider: string): FieldMapping[] => {
    // Generic fields that work for most providers
    return [
      {
        name: 'id',
        path: '$.id',
        label: 'ID',
        type: 'string',
      },
      {
        name: 'title',
        path: '$.title',
        label: 'Title',
        type: 'string',
      },
      {
        name: 'status',
        path: '$.status',
        label: 'Status',
        type: 'string',
      },
    ];
  };

  /**
   * Helper: Get default layout for visualization type
   */
  const getDefaultLayoutForType = (type: LayoutType, provider: string): any => {
    switch (type) {
      case 'list':
        return {
          type: 'list',
          fields: {
            title: 'title',
            subtitle: 'status',
          },
        };
      case 'table':
        return {
          type: 'table',
          columns: [
            { field: 'title', label: 'Title' },
            { field: 'status', label: 'Status' },
          ],
        };
      case 'cards':
        return {
          type: 'cards',
          fields: {
            title: 'title',
            description: 'status',
          },
        };
      case 'metric':
        return {
          type: 'metric',
          valueField: 'count',
          label: `Total ${provider} items`,
        };
      case 'chart':
        return {
          type: 'chart',
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value',
        };
      default:
        return { type };
    }
  };

  // Determine if Back button should be shown
  const canGoBack = stage !== 'problem_discovery' && stage !== 'deploy';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-3xl h-[90vh] md:h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b">
          {/* Back button (only visible on stages 2-5, not stage 1 or deploy) */}
          {canGoBack && (
            <button
              onClick={handleBack}
              disabled={isLoading || isDeploying}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
              title="Go back to previous stage"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex-1 min-w-0 px-2">
            <h2 className="text-lg md:text-xl font-bold truncate">Create Widget</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              Conversational widget creation
            </p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={handleReset}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm border rounded-md hover:bg-accent transition-colors whitespace-nowrap"
              disabled={isLoading}
            >
              <span className="hidden sm:inline">Start Over</span>
              <span className="sm:hidden">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="px-2 md:px-3 py-1.5 text-xs md:text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Stage Indicator */}
        <div className="px-2 py-3 md:p-4 border-b bg-muted/30">
          <StageIndicator stage={stage} />
        </div>

        {/* Main Content - Stage Routing */}
        <div className="flex-1 overflow-y-auto">
          {/* Stages 1-2: Chat interface */}
          {(stage === 'problem_discovery' || stage === 'clarifying_questions') && (
            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg px-3 md:px-4 py-2 md:py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs md:text-sm font-medium">
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
            <div className="p-4 md:p-8">
              <VisualizationSelector
                recommendedType={inferredWidget?.widgetType as LayoutType || null}
                selectedType={selectedVisualization}
                onSelect={handleVisualizationSelected}
              />
            </div>
          )}

          {/* Stage 4: Preview */}
          {stage === 'preview' && widgetSchema && (
            <div className="p-4 md:p-8">
              <WidgetPreview
                schema={widgetSchema}
                onSchemaChange={setWidgetSchema}
                onBack={handleBack}
                onDeploy={handleDeploy}
                isDeploying={isDeploying}
              />

              {/* Deploy error display */}
              {deployError && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-destructive font-medium">Deployment Failed</p>
                      <p className="text-xs text-destructive/80 mt-1">{deployError}</p>
                    </div>
                    <button
                      onClick={handleDeployRetry}
                      disabled={isDeploying}
                      className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      Retry {deployRetryCount > 0 && `(${deployRetryCount})`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 5: Success */}
          {stage === 'deploy' && (
            <DeploySuccessScreen
              widgetId={deployedWidgetId || ''}
              widgetName={widgetSchema?.metadata.name || 'Widget'}
              widgetSchema={widgetSchema}
              provider={inferredWidget?.provider || 'Unknown'}
              visualizationType={selectedVisualization || 'list'}
              onViewDashboard={handleViewDashboard}
              onCreateAnother={handleCreateAnother}
            />
          )}
        </div>

        {/* Input (only for Stages 1-2) */}
        {(stage === 'problem_discovery' || stage === 'clarifying_questions') && (
          <div className="p-3 md:p-4 border-t bg-muted/30">
            {/* Error display */}
            {error && (
              <div className="mb-3 p-2 md:p-3 bg-destructive/10 border border-destructive/20 rounded-md flex flex-col sm:flex-row items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-destructive font-medium">Error</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                </div>
                {lastUserMessage && (
                  <button
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    Retry {retryCount > 0 && `(${retryCount})`}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {/* Input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm md:text-base border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Error banner (shown for Stages 3-4 if deployment fails) */}
        {(stage === 'visualization' || stage === 'preview') && error && (
          <div className="p-3 md:p-4 border-t bg-destructive/10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-destructive font-medium">Error</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-3 py-1.5 text-xs border border-destructive/20 rounded-md hover:bg-destructive/5 transition-colors whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-2">Start Over?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to start over? All progress will be lost and you'll need to begin from the first stage.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelReset}
                className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Yes, Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
    <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="text-4xl md:text-6xl mb-2 md:mb-4">🎨</div>
        <h3 className="text-xl md:text-2xl font-bold">Choose Visualization</h3>
        <p className="text-sm md:text-base text-muted-foreground">
          Based on your needs, we recommend a visualization for{' '}
          <span className="font-semibold text-foreground">{inferredWidget?.provider || 'your data'}</span>.
        </p>

        <div className="mt-6 md:mt-8 space-y-2">
          <p className="text-xs md:text-sm text-muted-foreground">Available options:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {(['list', 'table', 'cards', 'metric', 'chart'] as LayoutType[]).map((type) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base border rounded-md hover:bg-accent transition-colors capitalize"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 md:mt-8">
          <button
            onClick={onBack}
            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border rounded-md hover:bg-accent transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="mt-4 p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300">
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
  error: string | null;
  onRetry: () => void;
  retryCount: number;
}

function WidgetPreviewPlaceholder({
  provider,
  visualizationType,
  onSchemaGenerated,
  onDeploy,
  onBack,
  isDeploying,
  widgetSchema,
  error,
  onRetry,
  retryCount,
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
    <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px]">
      <div className="max-w-2xl w-full space-y-4 md:space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl md:text-6xl mb-2 md:mb-4">👀</div>
          <h3 className="text-xl md:text-2xl font-bold">Widget Preview</h3>
          <p className="text-sm md:text-base text-muted-foreground">
            Here's how your <span className="font-semibold text-foreground">{provider}</span>{' '}
            widget will look as a <span className="font-semibold text-foreground">{visualizationType}</span>.
          </p>
        </div>

        {/* Placeholder widget preview */}
        <div className="border rounded-lg p-4 md:p-6 bg-muted/30 min-h-[150px] md:min-h-[200px]">
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm md:text-base truncate">{widgetSchema?.metadata.name}</h4>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{widgetSchema?.metadata.description}</p>
              </div>
              <span className="text-[10px] md:text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                {visualizationType}
              </span>
            </div>

            <div className="text-xs md:text-sm text-muted-foreground">
              <p>Provider: <span className="font-medium text-foreground">{provider}</span></p>
              <p>Layout: <span className="font-medium text-foreground">{visualizationType}</span></p>
            </div>

            {widgetSchema && (
              <details className="mt-4">
                <summary className="text-[10px] md:text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                  View schema (JSON)
                </summary>
                <pre className="mt-2 text-[10px] md:text-xs bg-background p-2 md:p-3 rounded border overflow-auto max-h-[150px] md:max-h-[200px]">
                  {JSON.stringify(widgetSchema, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {/* Deploy error display */}
        {error && (
          <div className="p-2 md:p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-destructive font-medium">Deployment Failed</p>
                <p className="text-[10px] md:text-xs text-destructive/80 mt-1">{error}</p>
              </div>
              <button
                onClick={onRetry}
                disabled={isDeploying}
                className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Retry {retryCount > 0 && `(${retryCount})`}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button
            onClick={onBack}
            disabled={isDeploying}
            className="w-full sm:w-auto px-3 md:px-4 py-2 text-xs md:text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            ← Back
          </button>

          <button
            onClick={onDeploy}
            disabled={isDeploying || !widgetSchema}
            className="w-full sm:w-auto px-4 md:px-6 py-2 text-sm md:text-base bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isDeploying ? 'Deploying...' : 'Deploy Widget'}
          </button>
        </div>

        <div className="mt-4 p-2 md:p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300">
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
 * Shows success message, confetti animation, widget preview, and navigation options.
 */
interface DeploySuccessScreenProps {
  widgetId: string;
  widgetName: string;
  widgetSchema: UniversalWidgetDefinition | null;
  provider: string;
  visualizationType: LayoutType;
  onViewDashboard: () => void;
  onCreateAnother: () => void;
}

function DeploySuccessScreen({
  widgetId,
  widgetName,
  widgetSchema,
  provider,
  visualizationType,
  onViewDashboard,
  onCreateAnother,
}: DeploySuccessScreenProps) {
  // Trigger confetti on mount
  useEffect(() => {
    // Fire confetti burst
    const duration = 1500;
    const end = Date.now() + duration;

    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  // Get visualization icon
  const getVisualizationIcon = (type: LayoutType) => {
    switch (type) {
      case 'list':
        return '📋';
      case 'table':
        return '📊';
      case 'cards':
        return '🃏';
      case 'metric':
        return '📈';
      case 'chart':
        return '📉';
      default:
        return '📦';
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px]">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success icon with animation */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center animate-scale-in">
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
            <h3 className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              Widget Deployed!
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">
              <span className="font-semibold text-foreground">{widgetName}</span> has been added to your dashboard.
            </p>
          </div>
        </div>

        {/* Widget preview card */}
        <div className="border rounded-lg p-4 md:p-6 bg-muted/30 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base md:text-lg truncate">{widgetName}</h4>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {widgetSchema?.metadata.description || 'No description'}
              </p>
            </div>
            <div className="text-3xl md:text-4xl shrink-0">{getVisualizationIcon(visualizationType)}</div>
          </div>

          {/* Deployment summary */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="font-medium text-sm md:text-base capitalize">{provider}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visualization</p>
              <p className="font-medium text-sm md:text-base capitalize">{visualizationType}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Widget ID</p>
              <p className="font-mono text-xs md:text-sm text-muted-foreground truncate">{widgetId}</p>
            </div>
          </div>

          {/* Optional: Schema preview toggle */}
          {widgetSchema && (
            <details className="pt-4 border-t">
              <summary className="text-xs md:text-sm cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                View JSON Schema
              </summary>
              <pre className="mt-3 text-xs bg-background p-3 rounded border overflow-auto max-h-[200px]">
                {JSON.stringify(widgetSchema, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Navigation actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={onViewDashboard}
            className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors text-sm md:text-base"
          >
            View on Dashboard
          </button>

          <button
            onClick={onCreateAnother}
            className="flex-1 px-4 md:px-6 py-2.5 md:py-3 border rounded-md font-medium hover:bg-accent transition-colors text-sm md:text-base"
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
    { id: 'problem_discovery', label: 'Problem', shortLabel: 'P' },
    { id: 'clarifying_questions', label: 'Details', shortLabel: 'D' },
    { id: 'visualization', label: 'Visualization', shortLabel: 'V' },
    { id: 'preview', label: 'Preview', shortLabel: 'Pr' },
    { id: 'deploy', label: 'Deploy', shortLabel: 'D' },
  ];

  const currentIdx = stages.findIndex((s) => s.id === stage);

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {/* Mobile: Show only current stage */}
      <div className="md:hidden flex items-center justify-center w-full gap-2">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
          {currentIdx + 1}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{stages[currentIdx]?.label || 'Unknown'}</span>
          <span className="text-xs text-muted-foreground">Step {currentIdx + 1} of {stages.length}</span>
        </div>
      </div>

      {/* Desktop: Show all stages */}
      <div className="hidden md:flex items-center justify-between w-full">
        {stages.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            {/* Stage Circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-medium transition-colors',
                  idx <= currentIdx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] lg:text-xs font-medium text-center',
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
                  'w-6 lg:w-12 h-px mx-1 lg:mx-2 transition-colors',
                  idx < currentIdx ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>
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
          'max-w-[90%] md:max-w-[80%] lg:max-w-[70%] rounded-lg px-3 md:px-4 py-2 md:py-2.5 shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'text-[10px] md:text-xs mt-1',
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
