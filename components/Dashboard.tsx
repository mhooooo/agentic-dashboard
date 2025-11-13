'use client';

/**
 * Dashboard Component
 *
 * The main dashboard layout using react-grid-layout.
 * Manages widget positions, drag-and-drop, and resizing.
 */

import { useState, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useEventMesh } from '@/lib/event-mesh/mesh';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/styles.css';

// Widget imports
import { GitHubWidget } from './widgets/GitHubWidget';
import { JiraWidget } from './widgets/JiraWidget';

interface DashboardProps {
  userId: string;
}

/**
 * Widget Instance
 */
interface WidgetInstance {
  id: string;
  type: string;
  config: Record<string, any>;
}

export function Dashboard({ userId }: DashboardProps) {
  // Widget layout state (positions and sizes)
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'welcome', x: 0, y: 0, w: 6, h: 4 },
    // More widgets will be added dynamically
  ]);

  // Widget instances (what widgets are on the dashboard)
  const [widgets, setWidgets] = useState<WidgetInstance[]>([
    { id: 'welcome', type: 'welcome', config: {} },
  ]);

  // Event Mesh state (for Safe Mode toggle)
  const meshEnabled = useEventMesh((state) => state.enabled);
  const toggleSafeMode = useEventMesh((state) => state.toggleSafeMode);

  /**
   * Handle layout changes from drag/drop or resize
   */
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);

    // TODO: Save layout to Supabase
    // This will be implemented when we add persistence
  }, []);

  /**
   * Add a new widget to the dashboard
   */
  const addWidget = useCallback((type: string, config: Record<string, any>) => {
    const id = crypto.randomUUID();

    // Find a good position for the new widget
    const newWidget: WidgetInstance = {
      id,
      type,
      config,
    };

    const newLayoutItem: Layout = {
      i: id,
      x: (widgets.length * 6) % 12, // Position in grid
      y: Infinity, // Place at bottom
      w: 6, // Default width: half the grid
      h: 4, // Default height
    };

    setWidgets([...widgets, newWidget]);
    setLayout([...layout, newLayoutItem]);
  }, [widgets, layout]);

  /**
   * Remove a widget from the dashboard
   */
  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    setLayout(layout.filter(l => l.i !== widgetId));
  }, [widgets, layout]);

  /**
   * Render a widget based on its type
   */
  const renderWidget = (widget: WidgetInstance) => {
    switch (widget.type) {
      case 'welcome':
        return (
          <WelcomeCard
            onAddWidget={addWidget}
          />
        );
      case 'github':
        return <GitHubWidget {...widget.config} />;
      case 'jira':
        return <JiraWidget {...widget.config} />;
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Unknown widget type: {widget.type}
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">Agentic Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered, interconnected widgets
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Safe Mode Toggle */}
            <button
              onClick={toggleSafeMode}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                meshEnabled
                  ? 'bg-green-100 text-green-900 hover:bg-green-200'
                  : 'bg-red-100 text-red-900 hover:bg-red-200'
              }`}
            >
              {meshEnabled ? '🔗 Mesh Enabled' : '🔒 Safe Mode'}
            </button>

            {/* Add Widget Button */}
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              onClick={() => {
                // TODO: Open widget marketplace or chat
                console.log('Add widget clicked');
              }}
            >
              + Add Widget
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <main className="flex-1 overflow-auto p-4">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={100}
          width={1200}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="bg-card border rounded-lg shadow-sm overflow-hidden"
            >
              {/* Widget Header (drag handle) */}
              <div className="drag-handle flex items-center justify-between p-3 border-b bg-muted/50 cursor-move">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {widget.type}
                  </span>
                </div>
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Widget Content */}
              <div className="p-4 h-full overflow-auto">
                {renderWidget(widget)}
              </div>
            </div>
          ))}
        </GridLayout>
      </main>
    </div>
  );
}

/**
 * Welcome Card - The initial widget users see
 */
function WelcomeCard({ onAddWidget }: { onAddWidget: (type: string, config: any) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="text-4xl">👋</div>
      <h2 className="text-xl font-semibold">Welcome to Your Dashboard</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Click below to add widgets and see the Event Mesh magic in action!
      </p>

      {/* Demo Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm mt-6">
        <button
          onClick={() => onAddWidget('github', {})}
          className="px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          + Add GitHub Widget
        </button>
        <button
          onClick={() => onAddWidget('jira', { project_key: 'PROJ' })}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Jira Widget
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
        <p className="text-xs font-semibold text-blue-900 mb-1">
          ✨ Try the Magic:
        </p>
        <ol className="text-xs text-blue-800 text-left space-y-1">
          <li>1. Add both widgets above</li>
          <li>2. Click any GitHub PR with &quot;PROJ-123&quot; in the title</li>
          <li>3. Watch the Jira widget auto-filter to that ticket! 🎉</li>
        </ol>
      </div>
    </div>
  );
}
