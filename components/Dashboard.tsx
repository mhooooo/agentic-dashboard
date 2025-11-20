'use client';

/**
 * Dashboard Component
 *
 * The main dashboard layout using react-grid-layout.
 * Manages widget positions, drag-and-drop, and resizing.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useEventMesh } from '@/lib/event-mesh/mesh';
import { useCheckpointManager, useUndoRedoShortcuts } from '@/lib/checkpoint/manager';
import { toast as sonnerToast, Toaster } from 'sonner';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/styles.css';

// Widget imports
import { GitHubWidget } from './widgets/GitHubWidget';
import { JiraWidget } from './widgets/JiraWidget';
import { EventFlowDebugger } from './EventFlowDebugger';
import { WidgetSelector, type WidgetOption } from './WidgetSelector';
import { UniversalDataWidget } from './UniversalDataWidget';
import { loadWidgetDefinition } from '@/lib/universal-widget/loader';

// Widget versioning system
import {
  type WidgetInstance,
  createWidgetInstance,
  normalizeWidgetInstances,
} from '@/lib/widgets';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  // Widget layout state (positions and sizes)
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'welcome', x: 0, y: 0, w: 6, h: 4 },
    // More widgets will be added dynamically
  ]);

  // Widget instances (what widgets are on the dashboard)
  const [widgets, setWidgets] = useState<WidgetInstance[]>([
    { id: 'welcome', type: 'welcome', version: 1, config: {} },
  ]);

  // Loading state for database fetch
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [widgetsLoaded, setWidgetsLoaded] = useState(false);

  // Ref to track if we're currently restoring from a checkpoint
  const isRestoringRef = useRef(false);

  // Ref to track if initial checkpoint was created
  const initialCheckpointCreated = useRef(false);

  // Ref to store layout save timeout for debouncing
  const layoutSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event Flow Debugger state
  const [debuggerOpen, setDebuggerOpen] = useState(false);

  // Widget Selector state
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Event Mesh state (for Safe Mode toggle)
  const meshEnabled = useEventMesh((state) => state.enabled);
  const toggleSafeMode = useEventMesh((state) => state.toggleSafeMode);

  // Checkpoint Manager state
  const createCheckpoint = useCheckpointManager((state) => state.createCheckpoint);
  const undo = useCheckpointManager((state) => state.undo);
  const redo = useCheckpointManager((state) => state.redo);
  const canUndo = useCheckpointManager((state) => state.canUndo());
  const canRedo = useCheckpointManager((state) => state.canRedo());

  /**
   * Load widgets from database on mount
   */
  useEffect(() => {
    const loadWidgets = async () => {
      try {
        setWidgetsLoading(true);

        const response = await fetch('/api/widgets');
        if (!response.ok) {
          throw new Error('Failed to load widgets');
        }

        const data = await response.json();
        const loadedWidgets = data.widgets || [];

        if (loadedWidgets.length > 0) {
          // Build layout from loaded widgets
          const loadedLayout = loadedWidgets.map((widget: WidgetInstance) => ({
            i: widget.id,
            x: widget.layout?.x ?? 0,
            y: widget.layout?.y ?? Infinity,
            w: widget.layout?.w ?? 6,
            h: widget.layout?.h ?? 4,
          }));

          // Use database as source of truth - don't inject hardcoded widgets
          setWidgets(loadedWidgets);
          setLayout(loadedLayout);
        } else {
          // Only show welcome widget if NO widgets in database (first time user)
          setWidgets([{ id: 'welcome', type: 'welcome', version: 1, config: {} }]);
          setLayout([{ i: 'welcome', x: 0, y: 0, w: 6, h: 4 }]);
        }

        setWidgetsLoaded(true);
      } catch (error) {
        console.error('[Dashboard] Error loading widgets:', error);
        // Continue with default widgets (welcome)
        setWidgetsLoaded(true);
      } finally {
        setWidgetsLoading(false);
      }
    };

    loadWidgets();
  }, []);

  /**
   * Create a checkpoint with current state
   * Now accepts state as parameters to avoid closure issues
   */
  const saveCheckpoint = useCallback((
    currentLayout: Layout[],
    currentWidgets: WidgetInstance[],
    description: string
  ) => {
    createCheckpoint({
      timestamp: new Date(),
      layout: currentLayout,
      widgets: currentWidgets,
      description,
    });
  }, [createCheckpoint]);

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    // Set flag BEFORE calling undo to prevent any checkpoint creation
    isRestoringRef.current = true;

    const snapshot = undo();
    if (snapshot) {
      // Normalize widgets to ensure they're at the latest version
      const normalizedWidgets = normalizeWidgetInstances(snapshot.widgets);

      setLayout(snapshot.layout);
      setWidgets(normalizedWidgets);
      sonnerToast.success('↩️ Undo');

      // Clear the flag after state updates settle
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 200);
    } else {
      // If undo failed, clear the flag immediately
      isRestoringRef.current = false;
    }
  }, [undo]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    // Set flag BEFORE calling redo to prevent any checkpoint creation
    isRestoringRef.current = true;

    const snapshot = redo();
    if (snapshot) {
      // Normalize widgets to ensure they're at the latest version
      const normalizedWidgets = normalizeWidgetInstances(snapshot.widgets);

      setLayout(snapshot.layout);
      setWidgets(normalizedWidgets);
      sonnerToast.success('↪️ Redo');

      // Clear the flag after state updates settle
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 200);
    } else {
      // If redo failed, clear the flag immediately
      isRestoringRef.current = false;
    }
  }, [redo]);

  // Set up keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
  useUndoRedoShortcuts(handleUndo, handleRedo);

  // Create initial checkpoint on mount
  useEffect(() => {
    if (!initialCheckpointCreated.current) {
      // Create initial checkpoint with the starting state
      createCheckpoint({
        timestamp: new Date(),
        layout,
        widgets,
        description: 'Initial state',
      });
      initialCheckpointCreated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Handle layout changes from drag/drop or resize
   */
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);

    // Debounce layout saves to database - only save after user stops dragging (1 second delay)
    if (layoutSaveTimeoutRef.current) {
      clearTimeout(layoutSaveTimeoutRef.current);
    }

    layoutSaveTimeoutRef.current = setTimeout(() => {
      // Save each widget's position to database
      newLayout.forEach((layoutItem) => {
        const widget = widgets.find(w => w.id === layoutItem.i);
        if (widget && widget.id !== 'welcome') {
          fetch(`/api/widgets/${widget.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              layout: {
                x: layoutItem.x,
                y: layoutItem.y,
                w: layoutItem.w,
                h: layoutItem.h,
              },
            }),
          }).catch((error) => {
            console.error('[Dashboard] Error saving layout:', error);
            // Don't block UI on error
          });
        }
      });
    }, 1000); // Wait 1 second after user stops dragging
  }, [widgets]);

  /**
   * Add a new widget to the dashboard
   */
  const addWidget = useCallback(async (type: string, config: Record<string, any>) => {
    // Create widget instance with current version
    const newWidget = createWidgetInstance(type, config);

    const newLayoutItem: Layout = {
      i: newWidget.id,
      x: (widgets.length * 6) % 12, // Position in grid
      y: Infinity, // Place at bottom
      w: 6, // Default width: half the grid
      h: 4, // Default height
    };

    // Calculate new state
    const updatedWidgets = [...widgets, newWidget];
    const updatedLayout = [...layout, newLayoutItem];

    // Update state
    setWidgets(updatedWidgets);
    setLayout(updatedLayout);

    // Create checkpoint immediately with the new state
    saveCheckpoint(updatedLayout, updatedWidgets, `Added ${type} widget`);

    // Save to database (async, don't block UI)
    try {
      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newWidget.id,
          type: newWidget.type,
          version: newWidget.version,
          config: config,
          layout: {
            x: newLayoutItem.x,
            y: newLayoutItem.y,
            w: newLayoutItem.w,
            h: newLayoutItem.h,
          },
        }),
      });

      if (!response.ok) {
        console.error('[Dashboard] Failed to save widget to database');
      }
    } catch (error) {
      console.error('[Dashboard] Error saving widget:', error);
      // Don't show error to user - widget is still in local state
    }
  }, [widgets, layout, saveCheckpoint]);

  /**
   * Remove a widget from the dashboard
   */
  const removeWidget = useCallback(async (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);

    // Calculate new state
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    const updatedLayout = layout.filter(l => l.i !== widgetId);

    // Update state
    setWidgets(updatedWidgets);
    setLayout(updatedLayout);

    // Create checkpoint immediately with the new state
    saveCheckpoint(updatedLayout, updatedWidgets, `Removed ${widget?.type || 'widget'}`);

    // Delete from database (async, don't block UI)
    // Skip database deletion for hardcoded widgets (welcome, etc.)
    const isHardcodedWidget = widgetId === 'welcome' || widget?.type === 'welcome';

    if (!isHardcodedWidget) {
      try {
        const response = await fetch(`/api/widgets/${widgetId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          // Log only if it's not a 404 (widget already deleted or never existed)
          if (response.status !== 404) {
            console.error('[Dashboard] Failed to delete widget from database:', response.status);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error deleting widget:', error);
        // Don't show error to user - widget is already removed from local state
      }
    }
  }, [widgets, layout, saveCheckpoint]);

  /**
   * Handle widget selection from the selector modal
   */
  const handleSelectWidget = useCallback((widgetOption: WidgetOption) => {
    if (widgetOption.isUniversal) {
      // Universal widget: load definition and add
      const definition = loadWidgetDefinition(widgetOption.type);
      if (definition) {
        addWidget(widgetOption.type, { definition });
      } else {
        console.error(`Failed to load widget definition: ${widgetOption.type}`);
      }
    } else {
      // Legacy hardcoded widget
      addWidget(widgetOption.type, {});
    }
  }, [addWidget]);

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

      // Universal widgets (JSON-based)
      case 'github-prs':
      case 'linear-issues':
      case 'slack-messages':
      case 'calendar-events': {
        const definition = loadWidgetDefinition(widget.type);
        if (definition) {
          return <UniversalDataWidget definition={definition} />;
        } else {
          return (
            <div className="p-4 text-sm text-red-600">
              Failed to load widget definition: {widget.type}
            </div>
          );
        }
      }

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
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-1 border rounded-md">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  canUndo
                    ? 'hover:bg-accent text-foreground'
                    : 'text-muted-foreground cursor-not-allowed'
                }`}
                title="Undo (Cmd+Z)"
              >
                ↩️ Undo
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  canRedo
                    ? 'hover:bg-accent text-foreground'
                    : 'text-muted-foreground cursor-not-allowed'
                }`}
                title="Redo (Cmd+Shift+Z)"
              >
                ↪️ Redo
              </button>
            </div>

            {/* Settings Link */}
            <a
              href="/settings/credentials"
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-border hover:bg-accent text-foreground"
              title="Manage API Credentials"
            >
              ⚙️ Settings
            </a>

            {/* Event Flow Debugger Toggle */}
            <button
              onClick={() => setDebuggerOpen(!debuggerOpen)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                debuggerOpen
                  ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'
                  : 'bg-background text-foreground border-border hover:bg-accent'
              }`}
              title="Toggle Event Flow Debugger"
            >
              🐛 Debugger
            </button>

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
              onClick={() => setSelectorOpen(true)}
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeWidget(widget.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors z-10 relative"
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

      {/* Toast Notifications (Sonner) */}
      <Toaster position="bottom-center" richColors />

      {/* Event Flow Debugger */}
      <EventFlowDebugger
        isOpen={debuggerOpen}
        onClose={() => setDebuggerOpen(false)}
      />

      {/* Widget Selector Modal */}
      <WidgetSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelectWidget={handleSelectWidget}
      />
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
