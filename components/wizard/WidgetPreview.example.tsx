/**
 * WidgetPreview Component - Usage Example
 *
 * This file demonstrates how to integrate the WidgetPreview component
 * into the widget creation wizard flow.
 *
 * To test this component:
 * 1. Create a test page at /app/test-preview/page.tsx
 * 2. Copy the code below
 * 3. Navigate to http://localhost:3000/test-preview
 * 4. You should see the widget preview panel with:
 *    - Left side: JSON schema (editable)
 *    - Right side: Live widget preview
 *    - Bottom: Back and Deploy buttons
 */

'use client';

import { useState } from 'react';
import { WidgetPreview } from '@/components/wizard/WidgetPreview';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';

/**
 * Sample widget schema for testing
 */
const SAMPLE_GITHUB_PR_SCHEMA: UniversalWidgetDefinition = {
  metadata: {
    name: 'GitHub Pull Requests',
    description: 'Shows open pull requests from a repository',
    category: 'development',
    version: 1,
  },
  dataSource: {
    provider: 'github',
    endpoint: '/repos/facebook/react/pulls',
    method: 'GET',
    pollInterval: 300, // Refresh every 5 minutes
  },
  fields: [
    {
      name: 'id',
      path: '$.id',
      type: 'number',
    },
    {
      name: 'title',
      path: '$.title',
      type: 'string',
    },
    {
      name: 'number',
      path: '$.number',
      type: 'number',
    },
    {
      name: 'state',
      path: '$.state',
      type: 'enum',
      enumLabels: {
        open: 'Open',
        closed: 'Closed',
        merged: 'Merged',
      },
    },
    {
      name: 'author',
      path: '$.user.login',
      type: 'string',
    },
    {
      name: 'created',
      path: '$.created_at',
      type: 'date',
    },
  ],
  layout: {
    type: 'list',
    fields: {
      title: 'title',
      subtitle: 'author',
      metadata: ['number', 'created'],
      badge: {
        field: 'state',
        colorMap: {
          open: 'bg-green-100 text-green-800',
          closed: 'bg-gray-100 text-gray-800',
          merged: 'bg-purple-100 text-purple-800',
        },
      },
    },
    searchable: true,
    searchField: 'title',
  },
  interactions: {
    onSelect: {
      eventName: 'github.pr.selected',
      payload: {
        prId: '{{id}}',
        prNumber: '{{number}}',
        prTitle: '{{title}}',
      },
      source: 'github-pr-widget',
    },
  },
  emptyMessage: 'No pull requests found',
  errorMessage: 'Failed to load pull requests. Check your GitHub credentials.',
};

/**
 * Test page component
 *
 * This demonstrates how to use WidgetPreview in the wizard flow.
 */
export default function TestWidgetPreviewPage() {
  const [schema, setSchema] = useState<UniversalWidgetDefinition>(SAMPLE_GITHUB_PR_SCHEMA);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleSchemaChange = (newSchema: UniversalWidgetDefinition) => {
    console.log('Schema updated:', newSchema);
    setSchema(newSchema);
  };

  const handleBack = () => {
    console.log('Back button clicked');
    alert('In the real wizard, this would navigate back to Stage 3 (Visualization)');
  };

  const handleDeploy = async () => {
    console.log('Deploy button clicked');
    setIsDeploying(true);

    try {
      // Simulate API call to deploy widget
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real implementation, this would:
      // 1. Call POST /api/widgets to save the widget
      // 2. Publish "wizard.widget.deployed" event
      // 3. Navigate to the dashboard
      // 4. Show success notification

      alert('Widget deployed successfully! 🎉');
      console.log('Widget deployed:', schema);
    } catch (error) {
      console.error('Deployment failed:', error);
      alert('Deployment failed. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Widget Preview - Test Page</h1>
          <p className="text-muted-foreground">
            Stage 4 of the widget creation wizard. Edit the schema or deploy to dashboard.
          </p>
        </div>

        {/* Widget Preview Component */}
        <div className="bg-card border rounded-lg p-6 shadow-sm h-[calc(100vh-200px)]">
          <WidgetPreview
            schema={schema}
            onSchemaChange={handleSchemaChange}
            onBack={handleBack}
            onDeploy={handleDeploy}
            isDeploying={isDeploying}
          />
        </div>

        {/* Debug info */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
          <div className="text-xs space-y-1">
            <div>Widget Name: {schema.metadata.name}</div>
            <div>Provider: {schema.dataSource.provider}</div>
            <div>Layout Type: {schema.layout.type}</div>
            <div>Field Count: {schema.fields.length}</div>
            <div>Is Deploying: {isDeploying ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Integration with main wizard
 *
 * In the actual WidgetCreationWizard.tsx, you would integrate like this:
 *
 * ```tsx
 * import { WidgetPreview } from '@/components/wizard/WidgetPreview';
 *
 * // In your wizard component:
 * const stage = useConversationStore((state) => state.stage);
 * const [generatedSchema, setGeneratedSchema] = useState<UniversalWidgetDefinition | null>(null);
 *
 * // In your render:
 * {stage === 'preview' && generatedSchema && (
 *   <WidgetPreview
 *     schema={generatedSchema}
 *     onSchemaChange={setGeneratedSchema}
 *     onBack={() => {
 *       useConversationStore.getState().setStage('visualization');
 *     }}
 *     onDeploy={async () => {
 *       setIsDeploying(true);
 *       try {
 *         const response = await fetch('/api/widgets', {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json' },
 *           body: JSON.stringify({ definition: generatedSchema }),
 *         });
 *
 *         const result = await response.json();
 *
 *         if (result.success) {
 *           // Publish event
 *           useEventMesh.getState().publish('wizard.widget.deployed', {
 *             widgetId: result.data.id,
 *             schema: generatedSchema,
 *           }, 'widget-wizard');
 *
 *           // Navigate to dashboard
 *           router.push('/dashboard');
 *         }
 *       } finally {
 *         setIsDeploying(false);
 *       }
 *     }}
 *     isDeploying={isDeploying}
 *   />
 * )}
 * ```
 */
