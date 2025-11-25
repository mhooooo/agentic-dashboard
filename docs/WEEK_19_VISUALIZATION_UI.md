# Week 19: Visualization UI Implementation Guide

**Status:** Ready for Implementation
**Week:** December 15-21, 2025
**Focus:** Stage 3 (Visualization Selection) and Stage 4 (Preview) UI Components
**Related Documents:**
- Implementation Guide: [MONTH_5_IMPLEMENTATION_GUIDE.md](MONTH_5_IMPLEMENTATION_GUIDE.md)
- Week 18 Backend: [WEEK_18_BACKEND_INTEGRATION.md](WEEK_18_BACKEND_INTEGRATION.md)
- Universal Widget Schema: [../lib/universal-widget/schema.ts](../lib/universal-widget/schema.ts)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Stage 3: Visualization Selection](#stage-3-visualization-selection)
4. [Stage 4: Preview & Deploy](#stage-4-preview--deploy)
5. [State Management](#state-management)
6. [Integration Guide](#integration-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Week 19 completes the Problem-First Widget Wizard by implementing the final two visual stages:

### What's Being Built

**Stage 3: Visualization Selection**
- User selects how to display their data (list, table, cards, metric, chart)
- AI recommends optimal visualization based on data structure
- User can override AI recommendation
- Visual preview of each visualization type

**Stage 4: Preview & Deploy**
- Show generated widget schema in readable format
- Live preview using UniversalDataWidget component
- Schema editing for advanced users (optional)
- Deploy button triggers widget creation

### What's Already Done (Week 18)

- ✅ Backend API routes (`/api/ai/widget-creation/chat`, `/api/ai/widget-creation/deploy`)
- ✅ Claude API client with streaming support
- ✅ Widget creation agent (intent extraction, inference)
- ✅ Conversation store (Zustand state management)
- ✅ DocumentableEvent schema
- ✅ E2E testing (100% accuracy on 5 providers)

### Key Technologies

- **React 18** - UI components with hooks
- **Tailwind CSS** - Styling and layout
- **Zustand** - Client-side state management
- **UniversalDataWidget** - Declarative widget rendering
- **Next.js 15 App Router** - Server-side API integration

---

## Architecture

### System Flow: Stage 3 → 4

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stage 3: Visualization Selection Component             │   │
│  │  - Show 5 visualization type cards                       │   │
│  │  - AI recommendation badge on suggested type             │   │
│  │  - User clicks to select                                 │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │ User selects "table"                          │
│                  ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Conversation Store                                      │   │
│  │  - setSelectedVisualization("table")                     │   │
│  │  - setStage("preview")                                   │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
│                  │ POST /api/ai/widget-creation/chat             │
│                  ▼                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                       Next.js Server                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Chat API Route                                          │   │
│  │  1. Receive currentStage="preview"                       │   │
│  │  2. Call generateWidgetSchema()                          │   │
│  │  3. Return UniversalWidgetDefinition JSON                │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stage 4: Preview Component                              │   │
│  │  - Display schema in JSON viewer                         │   │
│  │  - Render live preview with UniversalDataWidget          │   │
│  │  - "Edit Schema" button (advanced users)                 │   │
│  │  - "Deploy Widget" button                                │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │ User clicks "Deploy Widget"                   │
│                  ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/ai/widget-creation/deploy                     │   │
│  │  { schema, userIntent }                                  │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                       Next.js Server                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Deploy API Route                                        │   │
│  │  1. Validate schema                                      │   │
│  │  2. Insert to widget_instances table                     │   │
│  │  3. Publish DocumentableEvent                            │   │
│  │  4. Return { success: true, widgetId }                   │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
                   ▼
               Dashboard
         (new widget appears)
```

### Component Hierarchy

```
WidgetCreationWizard
├── StageIndicator (1/5, 2/5, 3/5, 4/5, 5/5)
├── MessageList (conversation history)
├── Stage1: ProblemDiscovery
├── Stage2: ClarifyingQuestions
├── Stage3: VisualizationSelection  ← NEW
│   ├── VisualizationCard (list)
│   ├── VisualizationCard (table)
│   ├── VisualizationCard (cards)
│   ├── VisualizationCard (metric)
│   └── VisualizationCard (chart)
└── Stage4: Preview  ← NEW
    ├── SchemaViewer (JSON display)
    ├── WidgetPreview (UniversalDataWidget with sample data)
    ├── SchemaEditor (advanced, optional)
    └── DeployButton
```

---

## Stage 3: Visualization Selection

### Component: `VisualizationSelection`

**Purpose:** Allow user to select how their data should be visualized.

**File:** `components/wizard/VisualizationSelection.tsx`

#### Props Interface

```typescript
interface VisualizationSelectionProps {
  /** AI recommended visualization type (highlighted) */
  recommendedType?: 'list' | 'table' | 'cards' | 'metric' | 'chart';

  /** AI confidence in recommendation (0-1) */
  confidence?: number;

  /** Callback when user selects a visualization */
  onSelect: (type: string) => void;

  /** Currently selected type (if user already chose) */
  selectedType?: string;
}
```

#### Implementation

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  List,
  Table,
  LayoutGrid,
  TrendingUp,
  BarChart,
} from 'lucide-react';

interface VisualizationType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  example: string;
  bestFor: string[];
}

const VISUALIZATION_TYPES: VisualizationType[] = [
  {
    id: 'list',
    name: 'List',
    description: 'Sequential items with title, subtitle, and metadata',
    icon: List,
    example: 'GitHub pull requests, Slack messages, notifications',
    bestFor: [
      'Sequential data',
      'Time-ordered items',
      'Simple data structures',
    ],
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Structured data in rows and columns',
    icon: Table,
    example: 'Jira tickets, database records, spreadsheet data',
    bestFor: [
      'Multi-column data',
      'Sortable data',
      'Structured records',
    ],
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Rich content cards with images and actions',
    icon: LayoutGrid,
    example: 'Linear issues, product catalog, user profiles',
    bestFor: [
      'Rich content',
      'Visual emphasis',
      'Multiple metadata fields',
    ],
  },
  {
    id: 'metric',
    name: 'Metric',
    description: 'Single KPI or number with label',
    icon: TrendingUp,
    example: 'Total mentions, revenue today, uptime percentage',
    bestFor: [
      'Single value',
      'KPI tracking',
      'Real-time metrics',
    ],
  },
  {
    id: 'chart',
    name: 'Chart',
    description: 'Time series or trend visualization',
    icon: BarChart,
    example: 'Events per day, sales trends, usage metrics',
    bestFor: [
      'Time series',
      'Trends',
      'Comparisons',
    ],
  },
];

export function VisualizationSelection({
  recommendedType,
  confidence = 0,
  onSelect,
  selectedType,
}: VisualizationSelectionProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleSelect = (type: string) => {
    onSelect(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          How should I display your data?
        </h3>
        <p className="text-sm text-muted-foreground">
          Select a visualization type that best fits your needs.
          {recommendedType && confidence > 0.7 && (
            <span className="ml-1 text-primary font-medium">
              I recommend &quot;{recommendedType}&quot; for your data.
            </span>
          )}
        </p>
      </div>

      {/* Visualization Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {VISUALIZATION_TYPES.map((type) => {
          const isRecommended = type.id === recommendedType && confidence > 0.7;
          const isSelected = type.id === selectedType;
          const isHovered = type.id === hoveredType;
          const Icon = type.icon;

          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all relative ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : isHovered
                  ? 'border-primary/50 shadow-sm'
                  : 'border-border hover:border-primary/30'
              }`}
              onMouseEnter={() => setHoveredType(type.id)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => handleSelect(type.id)}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2">
                  <Badge variant="default" className="shadow-sm">
                    AI Recommended ({Math.round(confidence * 100)}%)
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{type.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {type.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Example */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Example:
                  </p>
                  <p className="text-xs text-foreground">{type.example}</p>
                </div>

                {/* Best for */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Best for:
                  </p>
                  <ul className="text-xs space-y-1">
                    {type.bestFor.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Select button */}
                {isSelected && (
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    variant="default"
                  >
                    Selected ✓
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue button */}
      {selectedType && (
        <div className="flex justify-end">
          <Button
            onClick={() => onSelect(selectedType)}
            size="lg"
            className="min-w-32"
          >
            Continue →
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### Usage Example

```typescript
// In WidgetCreationWizard component
import { VisualizationSelection } from '@/components/wizard/VisualizationSelection';

function WidgetCreationWizard() {
  const {
    stage,
    inferredWidget,
    setSelectedVisualization,
    progressToNextStage
  } = useConversationStore();

  const handleVisualizationSelect = (type: string) => {
    setSelectedVisualization(type);
    progressToNextStage(); // Move to Stage 4 (preview)
  };

  if (stage === 'visualization') {
    return (
      <VisualizationSelection
        recommendedType={inferredWidget?.visualizationType}
        confidence={inferredWidget?.confidence}
        onSelect={handleVisualizationSelect}
      />
    );
  }

  // ... other stages
}
```

#### Visualization Type Mapping

| Data Structure | Recommended Type | Reasoning |
|----------------|------------------|-----------|
| Array of objects with 3+ fields | `table` | Structured data benefits from columns |
| Array of objects with title/description | `list` | Simple sequential display |
| Array with rich content (images, long text) | `cards` | Visual emphasis on content |
| Single value/count | `metric` | KPI display |
| Time series data | `chart` | Trend visualization |

---

## Stage 4: Preview & Deploy

### Component: `WidgetPreview`

**Purpose:** Show generated widget schema and live preview before deployment.

**File:** `components/wizard/WidgetPreview.tsx`

#### Props Interface

```typescript
interface WidgetPreviewProps {
  /** Generated widget schema */
  schema: UniversalWidgetDefinition;

  /** User intent for documentation */
  userIntent: UserIntent | null;

  /** Sample data for preview */
  sampleData?: any[];

  /** Callback when user deploys */
  onDeploy: () => void;

  /** Callback when user goes back */
  onBack: () => void;

  /** Loading state during deployment */
  isDeploying?: boolean;
}
```

#### Implementation

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalDataWidget } from '@/components/UniversalDataWidget';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Check, Edit } from 'lucide-react';
import { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import { UserIntent } from '@/stores/conversation-store';

export function WidgetPreview({
  schema,
  userIntent,
  sampleData = [],
  onDeploy,
  onBack,
  isDeploying = false,
}: WidgetPreviewProps) {
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [editedSchema, setEditedSchema] = useState<string>(
    JSON.stringify(schema, null, 2)
  );

  const handleSchemaEdit = () => {
    setShowSchemaEditor(true);
  };

  const handleSchemaSave = () => {
    try {
      const parsed = JSON.parse(editedSchema);
      // Validate schema
      const validation = validateWidgetDefinition(parsed);
      if (!validation.valid) {
        alert(`Invalid schema:\n${validation.errors.join('\n')}`);
        return;
      }
      setShowSchemaEditor(false);
      // Update schema in store
      // TODO: Add updateGeneratedSchema action to conversation store
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isDeploying}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Preview Your Widget</h3>
            <p className="text-sm text-muted-foreground">
              Review the widget before deploying to your dashboard
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {schema.layout.type} visualization
        </Badge>
      </div>

      {/* Tabs: Preview vs Schema */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Widget metadata */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{schema.metadata.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">
                    {schema.dataSource.provider}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{schema.layout.type}</span>
                </div>
              </div>

              {/* Live widget preview */}
              <div className="border rounded-lg p-4 min-h-64 bg-background">
                {sampleData.length > 0 ? (
                  <UniversalDataWidget
                    definition={{
                      ...schema,
                      // Override dataSource to use sample data instead of API
                      dataSource: {
                        ...schema.dataSource,
                        // Mock provider for preview
                        provider: '__preview__',
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                    No sample data available for preview
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User intent summary */}
          {userIntent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Problem Being Solved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Problem:</span>{' '}
                  {userIntent.problemSolved}
                </div>
                <div>
                  <span className="text-muted-foreground">Goal:</span>{' '}
                  {userIntent.goal}
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Outcome:</span>{' '}
                  {userIntent.expectedOutcome}
                </div>
                {userIntent.impactMetric && (
                  <div>
                    <span className="text-muted-foreground">Impact:</span>{' '}
                    {userIntent.impactMetric}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Widget Schema</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSchemaEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Schema
              </Button>
            </CardHeader>
            <CardContent>
              {showSchemaEditor ? (
                <div className="space-y-3">
                  <textarea
                    value={editedSchema}
                    onChange={(e) => setEditedSchema(e.target.value)}
                    className="w-full h-96 font-mono text-xs p-3 border rounded-lg bg-muted"
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSchemaSave}>
                      Save Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSchemaEditor(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(schema, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deploy Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isDeploying}
        >
          Go Back
        </Button>
        <Button
          size="lg"
          onClick={onDeploy}
          disabled={isDeploying}
          className="min-w-32"
        >
          {isDeploying ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Deploying...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Deploy Widget
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

#### Usage Example

```typescript
// In WidgetCreationWizard component
import { WidgetPreview } from '@/components/wizard/WidgetPreview';

function WidgetCreationWizard() {
  const {
    stage,
    generatedSchema,
    extractedIntent,
    setStage,
  } = useConversationStore();

  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const response = await fetch('/api/ai/widget-creation/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: generatedSchema,
          userIntent: extractedIntent,
        }),
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const data = await response.json();

      // Show success message
      alert(`Widget deployed successfully! ID: ${data.widgetId}`);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      alert('Failed to deploy widget. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleBack = () => {
    setStage('visualization');
  };

  if (stage === 'preview') {
    return (
      <WidgetPreview
        schema={generatedSchema}
        userIntent={extractedIntent}
        sampleData={[/* mock data for preview */]}
        onDeploy={handleDeploy}
        onBack={handleBack}
        isDeploying={isDeploying}
      />
    );
  }

  // ... other stages
}
```

---

## State Management

### Conversation Store Updates

**File:** `stores/conversation-store.ts`

#### New State Fields

```typescript
interface ConversationStore {
  // ... existing fields

  /** Selected visualization type (Stage 3) */
  selectedVisualization: string | null;

  /** Generated widget schema (Stage 4) */
  generatedSchema: UniversalWidgetDefinition | null;

  /** Actions */
  setSelectedVisualization: (type: string) => void;
  setGeneratedSchema: (schema: UniversalWidgetDefinition) => void;
  updateGeneratedSchema: (schema: UniversalWidgetDefinition) => void;
}
```

#### New Actions

```typescript
// Add to useConversationStore
setSelectedVisualization: (type) => {
  set({ selectedVisualization: type });

  // Publish event to Event Mesh
  const eventMesh = useEventMesh.getState();
  eventMesh.publish(
    'wizard.visualization.selected',
    {
      visualizationType: type,
      timestamp: new Date().toISOString(),
    },
    'conversation-store'
  );

  console.log('[ConversationStore] Selected visualization:', type);
},

setGeneratedSchema: (schema) => {
  set({ generatedSchema: schema });

  // Publish event to Event Mesh
  const eventMesh = useEventMesh.getState();
  eventMesh.publish(
    'wizard.schema.generated',
    {
      schemaId: schema.metadata.name,
      visualizationType: schema.layout.type,
      timestamp: new Date().toISOString(),
    },
    'conversation-store'
  );

  console.log('[ConversationStore] Generated schema:', schema.metadata.name);
},

updateGeneratedSchema: (schema) => {
  set({ generatedSchema: schema });

  console.log('[ConversationStore] Updated schema:', schema.metadata.name);
},
```

### Stage Progress Validation

```typescript
function canProgress(state: ConversationStore): boolean {
  switch (state.stage) {
    // ... existing cases

    case 'visualization':
      // Need selected visualization type
      return state.selectedVisualization !== null;

    case 'preview':
      // Need generated schema
      return state.generatedSchema !== null;

    case 'deploy':
      // Final stage - always can progress (marks completion)
      return true;

    default:
      return false;
  }
}
```

---

## Integration Guide

### Complete Wizard Flow

```typescript
// app/wizard/page.tsx
'use client';

import { useState } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { StageIndicator } from '@/components/wizard/StageIndicator';
import { ProblemDiscovery } from '@/components/wizard/ProblemDiscovery';
import { ClarifyingQuestions } from '@/components/wizard/ClarifyingQuestions';
import { VisualizationSelection } from '@/components/wizard/VisualizationSelection';
import { WidgetPreview } from '@/components/wizard/WidgetPreview';

export default function WizardPage() {
  const {
    stage,
    messages,
    extractedIntent,
    inferredWidget,
    selectedVisualization,
    generatedSchema,
    setStage,
    setSelectedVisualization,
    setGeneratedSchema,
    progressToNextStage,
  } = useConversationStore();

  const [isDeploying, setIsDeploying] = useState(false);

  // Stage 3: Visualization selection
  const handleVisualizationSelect = async (type: string) => {
    setSelectedVisualization(type);

    // Call API to confirm selection
    const response = await fetch('/api/ai/widget-creation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: type,
        currentStage: 'visualization',
        context: { selectedVisualization: type },
      }),
    });

    const data = await response.json();

    // Progress to Stage 4 (preview)
    progressToNextStage();
  };

  // Stage 4: Generate schema and show preview
  const handleGenerateSchema = async () => {
    const response = await fetch('/api/ai/widget-creation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'continue',
        currentStage: 'preview',
        context: {
          inferredWidget,
          implementationDetails: {}, // From clarifying questions
          extractedIntent,
          selectedVisualization,
        },
      }),
    });

    const data = await response.json();
    setGeneratedSchema(data.generatedSchema);
  };

  // Stage 5: Deploy widget
  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const response = await fetch('/api/ai/widget-creation/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: generatedSchema,
          userIntent: extractedIntent,
        }),
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const data = await response.json();

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Failed to deploy widget');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stage indicator */}
        <StageIndicator stage={stage} />

        {/* Render current stage */}
        {stage === 'problem_discovery' && <ProblemDiscovery />}
        {stage === 'clarifying_questions' && <ClarifyingQuestions />}
        {stage === 'visualization' && (
          <VisualizationSelection
            recommendedType={inferredWidget?.visualizationType}
            confidence={inferredWidget?.confidence}
            onSelect={handleVisualizationSelect}
          />
        )}
        {stage === 'preview' && generatedSchema && (
          <WidgetPreview
            schema={generatedSchema}
            userIntent={extractedIntent}
            onDeploy={handleDeploy}
            onBack={() => setStage('visualization')}
            isDeploying={isDeploying}
          />
        )}
      </div>
    </div>
  );
}
```

### Data Flow Diagram

```
User Problem
     ↓
[Stage 1: Problem Discovery]
     ↓ (AI extracts intent)
User Intent + Inferred Widget
     ↓
[Stage 2: Clarifying Questions]
     ↓ (AI asks follow-ups)
Implementation Details
     ↓
[Stage 3: Visualization Selection]
     ↓ (User chooses type)
Selected Visualization Type
     ↓
[Stage 4: Preview]
     ↓ (AI generates schema)
Widget Schema (UniversalWidgetDefinition)
     ↓ (User approves)
[Stage 5: Deploy]
     ↓
Database (widget_instances)
Event Mesh (DocumentableEvent)
     ↓
Dashboard (new widget appears)
```

---

## Testing

### Running Tests

```bash
# Run visualization flow tests
npx tsx scripts/test-visualization-flow.ts
```

### Expected Output

```
================================================================================
🧪 VISUALIZATION FLOW TEST SUITE
================================================================================

Testing all 5 visualization types: list, table, cards, metric, chart

================================================================================
Test 1: List Visualization
================================================================================
Description: GitHub Pull Requests displayed as sequential list
Visualization Type: list

📋 Step 1: Schema Validation
  ✅ Schema is valid

🔍 Step 2: Custom Validation Checks
  ✅ Has list layout type
  ✅ Has title field
  ✅ Has badge configuration
  ✅ Has onSelect interaction

  Passed: 4/4

💾 Step 3: JSON Serialization
  ✅ Schema serializes correctly (2847 bytes)

📊 Step 4: Sample Data Compatibility
  Sample data items: 2
  Schema fields: 5
  Field paths defined: $.number, $.title, $.user.login, $.state, $.created_at

✅ PASSED
Duration: 12ms

... (4 more tests for table, cards, metric, chart)

================================================================================
STAGE TRANSITION TESTS
================================================================================

📍 Testing stage flow:
  problem_discovery → clarifying_questions
  clarifying_questions → visualization
  visualization → preview
  preview → deploy

✅ All stage transitions validated

================================================================================
ERROR HANDLING TESTS
================================================================================

📝 Test 1: Invalid JSON schema
  ✅ Correctly rejected invalid schema
     Errors: dataSource.provider is required, dataSource.endpoint is required, ...

📝 Test 2: Missing required fields
  ✅ Correctly rejected schema with empty fields array

📝 Test 3: Invalid layout type
  ✅ Type system would prevent invalid layout types

================================================================================
TEST SUMMARY
================================================================================

📊 Results:
   Total Tests: 5
   Passed: 5
   Failed: 0
   Success Rate: 100.0% ✅

📈 Performance:
   Average Test Duration: 15ms

📋 Detailed Results by Visualization Type:
   ✅ List Visualization (list)
      4/4 checks passed
   ✅ Table Visualization (table)
      4/4 checks passed
   ✅ Cards Visualization (cards)
      4/4 checks passed
   ✅ Metric Visualization (metric)
      4/4 checks passed
   ✅ Chart Visualization (chart)
      4/4 checks passed

💡 Recommendations:
   ✅ All visualization types validated successfully!
   ✅ Ready for Stage 3/4 UI implementation
```

### Test Coverage

**What's Tested:**
- ✅ All 5 visualization types (list, table, cards, metric, chart)
- ✅ Schema validation for each type
- ✅ Custom validation checks (layout-specific requirements)
- ✅ JSON serialization/deserialization
- ✅ Sample data compatibility
- ✅ Stage transitions (problem → clarify → visualize → preview → deploy)
- ✅ Error handling (invalid JSON, missing fields)

**What's NOT Tested (Manual Testing Required):**
- ❌ UI rendering (requires browser)
- ❌ User interactions (clicks, form inputs)
- ❌ API integration (requires server)
- ❌ Event Mesh integration (requires full app context)

### Manual Testing Checklist

**Stage 3: Visualization Selection**
- [ ] All 5 visualization cards render correctly
- [ ] AI recommended badge appears when confidence > 70%
- [ ] User can select any visualization type
- [ ] Selected card shows "Selected ✓" button
- [ ] Hovering highlights card border
- [ ] Continue button appears after selection
- [ ] Stage transitions to preview after selection

**Stage 4: Preview**
- [ ] Generated schema displays in Schema tab
- [ ] Live preview renders in Preview tab
- [ ] Widget metadata displays correctly (name, provider, type)
- [ ] User intent summary shows problem/goal/outcome
- [ ] "Edit Schema" button allows JSON editing
- [ ] "Deploy Widget" button triggers deployment
- [ ] Loading state shows during deployment
- [ ] Success redirects to dashboard
- [ ] Error shows user-friendly message

**Integration**
- [ ] Stage indicator shows 3/5 for visualization
- [ ] Stage indicator shows 4/5 for preview
- [ ] Back navigation works (preview → visualization)
- [ ] Data persists across stage transitions
- [ ] Event Mesh publishes stage transition events

---

## Troubleshooting

### Issue: Visualization cards not rendering

**Symptoms:**
- Blank screen on Stage 3
- Console error: "Cannot read property 'icon' of undefined"

**Cause:** Missing Lucide icons import

**Solution:**
```bash
# Install Lucide icons if not already installed
npm install lucide-react
```

---

### Issue: UniversalDataWidget shows "No data"

**Symptoms:**
- Preview shows empty state
- No sample data displayed

**Cause:** Sample data not passed to WidgetPreview component

**Solution:**
```typescript
// Generate sample data for preview
const sampleData = generateSampleData(schema.layout.type);

<WidgetPreview
  schema={schema}
  sampleData={sampleData}  // ← Pass sample data
  // ... other props
/>
```

---

### Issue: Schema validation fails

**Symptoms:**
- Deploy button disabled
- Error: "Invalid schema: missing required fields"

**Cause:** Generated schema missing required fields

**Solution:**
```typescript
// Check schema validation before displaying preview
const validation = validateWidgetDefinition(generatedSchema);

if (!validation.valid) {
  console.error('Schema validation errors:', validation.errors);
  // Show error to user or regenerate schema
}
```

---

### Issue: Stage transition doesn't trigger

**Symptoms:**
- User selects visualization but stays on Stage 3
- No API call after selection

**Cause:** Missing `progressToNextStage()` call

**Solution:**
```typescript
const handleVisualizationSelect = async (type: string) => {
  setSelectedVisualization(type);

  // Call API to confirm selection
  await fetch('/api/ai/widget-creation/chat', { /* ... */ });

  // IMPORTANT: Progress to next stage
  progressToNextStage(); // ← Add this line
};
```

---

### Issue: Deploy fails with 400 error

**Symptoms:**
- Deploy button shows "Deploying..." then error
- Console: "Invalid schema: missing required fields"

**Cause:** Schema missing metadata, dataSource, or layout fields

**Solution:**
```typescript
// Validate schema before deployment
const { valid, errors } = validateWidgetDefinition(schema);

if (!valid) {
  alert(`Cannot deploy:\n${errors.join('\n')}`);
  return;
}

// Proceed with deployment
await fetch('/api/ai/widget-creation/deploy', { /* ... */ });
```

---

## Next Steps

### After Week 19 Completion

1. **Week 20: Polish & Edge Cases**
   - Error recovery (go back, edit answers)
   - Schema editing with live preview updates
   - Mobile responsive layout
   - Loading skeletons during API calls

2. **Week 21: Domain Expansion**
   - Add Stripe provider (payment widgets)
   - Add Twilio provider (SMS widgets)
   - Test complex workflows (payment → SMS automation)

3. **Month 6: Advanced Features**
   - Multi-format Journalist (LinkedIn, blog, YouTube)
   - AI-powered knowledge graph
   - MCP server integration (optional)

---

**Last Updated:** December 14, 2025
**Status:** Ready for Implementation
**Contributors:** Agentic Dashboard Team

**Questions or Issues?**
- Week 18 Backend: [WEEK_18_BACKEND_INTEGRATION.md](WEEK_18_BACKEND_INTEGRATION.md)
- Implementation Guide: [MONTH_5_IMPLEMENTATION_GUIDE.md](MONTH_5_IMPLEMENTATION_GUIDE.md)
- Troubleshooting: See section above
