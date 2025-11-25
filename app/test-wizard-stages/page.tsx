'use client';

/**
 * Test page for wizard stages integration
 *
 * Tests the flow:
 * - Stages 1-2: Chat interface
 * - Stage 3: Visualization selector
 * - Stage 4: Widget preview
 * - Stage 5: Success screen
 */

import { useState } from 'react';
import { WidgetCreationWizard } from '@/components/WidgetCreationWizard';
import { useConversationStore } from '@/stores/conversation-store';

export default function TestWizardStagesPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(true);
  const stage = useConversationStore((state) => state.stage);
  const inferredWidget = useConversationStore((state) => state.inferredWidget);
  const setStage = useConversationStore((state) => state.setStage);
  const setInferredWidget = useConversationStore((state) => state.setInferredWidget);

  const handleWidgetCreated = (widgetId: string) => {
    console.log('Widget created:', widgetId);
  };

  // Test helpers - simulate stage progression
  const goToStage3 = () => {
    setInferredWidget({
      provider: 'github',
      widgetType: 'pull-requests',
      confidence: 0.95,
      reasoning: 'Testing Stage 3',
    });
    setStage('visualization');
  };

  const goToStage4 = () => {
    setStage('preview');
  };

  const goToStage5 = () => {
    setStage('deploy');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Wizard Stages Test</h1>
          <p className="text-muted-foreground">
            Testing the integration of Stages 3-5 with the wizard flow
          </p>
        </div>

        {/* Current state display */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h2 className="text-lg font-semibold mb-2">Current State</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Stage:</span>{' '}
              <code className="bg-muted px-2 py-0.5 rounded">{stage}</code>
            </p>
            {inferredWidget && (
              <p>
                <span className="font-medium">Inferred Widget:</span>{' '}
                <code className="bg-muted px-2 py-0.5 rounded">
                  {inferredWidget.provider} / {inferredWidget.widgetType}
                </code>{' '}
                <span className="text-muted-foreground">
                  ({(inferredWidget.confidence * 100).toFixed(0)}% confidence)
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Stage navigation controls */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Stage Navigation</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setStage('problem_discovery')}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              Stage 1: Problem
            </button>
            <button
              onClick={() => setStage('clarifying_questions')}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              Stage 2: Questions
            </button>
            <button
              onClick={goToStage3}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              Stage 3: Viz
            </button>
            <button
              onClick={goToStage4}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              Stage 4: Preview
            </button>
            <button
              onClick={goToStage5}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              Stage 5: Success
            </button>
          </div>
        </div>

        {/* Open wizard button */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90"
          >
            Open Wizard
          </button>
        </div>

        {/* Expected behavior */}
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold mb-2">Expected Behavior</h2>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Stages 1-2: Chat interface with message bubbles and input</li>
            <li>Stage 3: Visualization selector with 5 options (list, table, cards, metric, chart)</li>
            <li>Stage 4: Widget preview with schema display and deploy button</li>
            <li>Stage 5: Success screen with "View Dashboard" and "Create Another" buttons</li>
            <li>Back button should work: 3→2, 4→3</li>
            <li>Error handling should show errors above input (Stages 1-2) or as banner (Stages 3-4)</li>
          </ul>
        </div>

        {/* Integration notes */}
        <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/30">
          <h2 className="text-lg font-semibold mb-2">Integration Notes</h2>
          <p className="text-sm mb-2">
            <strong>Stage 3-4 components are placeholders.</strong> Sub-agents will create:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>
              <code>components/wizard/VisualizationSelector.tsx</code> - Full visualization selection UI
            </li>
            <li>
              <code>components/wizard/WidgetPreview.tsx</code> - Live widget preview with real rendering
            </li>
          </ul>
          <p className="text-sm mt-2">
            Current placeholders demonstrate the correct prop interfaces and data flow.
          </p>
        </div>
      </div>

      {/* Wizard modal */}
      <WidgetCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onWidgetCreated={handleWidgetCreated}
      />
    </div>
  );
}
