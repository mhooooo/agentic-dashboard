# Wizard Component Interfaces

**For Sub-Agents 1-2:** Component prop specifications for Stage 3-4 integration

---

## VisualizationSelector Component

**File:** `components/wizard/VisualizationSelector.tsx`

### Props Interface

```typescript
export interface VisualizationSelectorProps {
  /**
   * AI-inferred widget recommendation from Stage 2
   * Contains provider info and confidence score
   */
  inferredWidget: {
    provider: string;        // 'github' | 'jira' | 'linear' | 'slack' | 'calendar'
    widgetType: string;      // e.g., 'pull-requests', 'issues', 'messages'
    confidence: number;      // 0-1 (AI confidence in recommendation)
    reasoning?: string;      // Optional explanation of why recommended
  } | null;

  /**
   * Called when user selects a visualization type
   * Triggers Stage 3 → Stage 4 transition
   *
   * @param visualizationType - One of: 'list' | 'table' | 'cards' | 'metric' | 'chart'
   */
  onSelect: (visualizationType: LayoutType) => void;

  /**
   * Called when user clicks back button
   * Triggers Stage 3 → Stage 2 transition
   */
  onBack: () => void;
}
```

### Expected Behavior

1. **Display 5 visualization options:**
   - List (default for most data)
   - Table (for tabular data with many columns)
   - Cards (for rich content with images)
   - Metric (for single numerical values)
   - Chart (for time-series or aggregate data)

2. **AI Recommendation:**
   - If `inferredWidget` is provided, highlight the recommended type
   - Show confidence score (e.g., "Recommended (95% confidence)")
   - Show reasoning if available

3. **Visual Previews:**
   - Each option should show a small preview/icon
   - Descriptions of when to use each type
   - Example use cases

4. **Interaction:**
   - Click on option → call `onSelect(type)`
   - Back button in top-left → call `onBack()`

5. **Styling:**
   - Use Tailwind CSS (consistent with wizard)
   - Responsive layout (mobile-friendly)
   - Hover states on options
   - Active state for selected option (if allowing preview before confirm)

### Example Usage

```tsx
<VisualizationSelector
  inferredWidget={{
    provider: 'github',
    widgetType: 'pull-requests',
    confidence: 0.95,
    reasoning: 'List view is best for displaying PRs with status badges',
  }}
  onSelect={(type) => {
    console.log('User selected:', type);
    // Wizard will handle stage transition
  }}
  onBack={() => {
    console.log('User clicked back');
    // Wizard will return to Stage 2
  }}
/>
```

### Design Suggestions

**Option 1: Card Grid**
```
┌──────────────┬──────────────┬──────────────┐
│   📋 List    │   📊 Table   │   🗂️ Cards   │
│ (Recommended)│              │              │
│  95% conf.   │              │              │
└──────────────┴──────────────┴──────────────┘
┌──────────────┬──────────────┐
│   📈 Metric  │   📉 Chart   │
│              │              │
└──────────────┴──────────────┘
```

**Option 2: Vertical List with Previews**
```
┌─────────────────────────────────────────┐
│ ✅ List (Recommended - 95% confidence) │
│ ┌─────────────────────────────────────┐ │
│ │ • Item 1                            │ │
│ │ • Item 2                            │ │
│ └─────────────────────────────────────┘ │
│ Best for: Sequential data, status...   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Table                                   │
│ ┌─────────────────────────────────────┐ │
│ │ Col1 │ Col2 │ Col3                  │ │
│ │ ───────────────────────────────────  │ │
│ └─────────────────────────────────────┘ │
│ Best for: Many columns, sorting...     │
└─────────────────────────────────────────┘
```

---

## WidgetPreview Component

**File:** `components/wizard/WidgetPreview.tsx`

### Props Interface

```typescript
export interface WidgetPreviewProps {
  /**
   * Provider identifier from inferred widget
   * Used to fetch real data for preview
   */
  provider: string;  // 'github' | 'jira' | 'linear' | 'slack' | 'calendar'

  /**
   * Visualization type selected in Stage 3
   * Determines layout configuration
   */
  visualizationType: LayoutType;  // 'list' | 'table' | 'cards' | 'metric' | 'chart'

  /**
   * Called when widget schema is generated
   * Wizard stores this for deployment
   *
   * @param schema - Complete UniversalWidgetDefinition
   */
  onSchemaGenerated: (schema: UniversalWidgetDefinition) => void;

  /**
   * Called when user clicks "Deploy Widget" button
   * Wizard handles API call to deployment endpoint
   */
  onDeploy: () => void;

  /**
   * Called when user clicks back button
   * Triggers Stage 4 → Stage 3 transition
   */
  onBack: () => void;

  /**
   * Loading state during deployment
   * Button should show "Deploying..." when true
   */
  isDeploying: boolean;

  /**
   * Current widget schema (may be null initially)
   * Component should generate on mount if null
   */
  widgetSchema: UniversalWidgetDefinition | null;
}
```

### Expected Behavior

1. **Schema Generation:**
   - On mount, if `widgetSchema` is null:
     - Generate schema based on `provider` + `visualizationType`
     - Call `onSchemaGenerated(schema)`
   - Use provider adapters to get correct endpoint/fields

2. **Live Preview:**
   - Render `UniversalDataWidget` with generated schema
   - Fetch real data from provider (use credentials from store)
   - Show loading state while fetching
   - Show error state if fetch fails
   - Show empty state if no data

3. **Schema Display:**
   - Show widget metadata (name, description)
   - Show data source (provider, endpoint)
   - Show field mappings
   - Collapsible JSON view (for power users)

4. **Actions:**
   - Back button (top-left) → call `onBack()`
   - Deploy button (bottom-right) → call `onDeploy()`
   - Deploy button disabled if no schema or during deployment

5. **Deploy Button States:**
   - Default: "Deploy Widget"
   - Loading: "Deploying..." with spinner
   - Disabled: Opacity 50%, no hover effect

### Example Usage

```tsx
<WidgetPreview
  provider="github"
  visualizationType="list"
  onSchemaGenerated={(schema) => {
    console.log('Schema generated:', schema);
    // Wizard stores this for deployment
  }}
  onDeploy={() => {
    console.log('Deploy clicked');
    // Wizard calls API: POST /api/ai/widget-creation/deploy
  }}
  onBack={() => {
    console.log('Back clicked');
    // Wizard returns to Stage 3
  }}
  isDeploying={false}
  widgetSchema={null}  // Will auto-generate
/>
```

### Design Suggestions

**Layout:**
```
┌─────────────────────────────────────────────┐
│ ← Back                  Widget Preview       │
├─────────────────────────────────────────────┤
│                                             │
│  Widget Name: GitHub Pull Requests          │
│  Provider: github | Layout: list            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Live Preview (UniversalDataWidget)  │   │
│  │                                     │   │
│  │ • PR #123: Fix login bug            │   │
│  │   Status: Open | Author: Alice      │   │
│  │                                     │   │
│  │ • PR #124: Add dark mode            │   │
│  │   Status: Merged | Author: Bob      │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ▼ View Schema (JSON)                       │
│    { "metadata": { ... }, ... }             │
│                                             │
├─────────────────────────────────────────────┤
│                    [Deploy Widget] ────────►│
└─────────────────────────────────────────────┘
```

### Schema Generation Logic

```typescript
import { generateWidgetSchema } from '@/lib/widget-schema-generator';

useEffect(() => {
  if (!widgetSchema) {
    // Generate schema based on provider + visualization
    const schema = generateWidgetSchema({
      provider: provider,
      layoutType: visualizationType,
      // Optionally use extractedIntent for customization
    });

    onSchemaGenerated(schema);
  }
}, [provider, visualizationType, widgetSchema, onSchemaGenerated]);
```

**Note:** You may need to create `lib/widget-schema-generator.ts` or use existing provider templates.

### Error Handling

1. **Schema generation fails:**
   - Show error message
   - Offer retry button
   - Allow going back to Stage 3

2. **Data fetch fails:**
   - Show error in preview area
   - Widget is still deployable (will fetch again on dashboard)
   - Show "Preview unavailable - will work on dashboard"

3. **No credentials:**
   - Show "Connect provider to preview"
   - Link to provider connection page
   - Widget is still deployable

---

## Shared Types

### LayoutType

```typescript
export type LayoutType = 'list' | 'table' | 'cards' | 'metric' | 'chart';
```

### UniversalWidgetDefinition

```typescript
export interface UniversalWidgetDefinition {
  metadata: {
    name: string;           // e.g., "GitHub Pull Requests"
    description: string;    // e.g., "View open PRs assigned to you"
    category: string;       // e.g., "development"
    version: number;        // 1
  };

  dataSource: {
    provider: string;       // 'github', 'jira', etc.
    endpoint: string;       // API endpoint path
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, any>;
    pollInterval?: number;  // Refresh interval in seconds
    dataPath?: string;      // JSONPath to extract data
  };

  fields: FieldMapping[];   // How to map API response to display fields

  layout: Layout;           // Layout-specific configuration

  interactions?: {
    onSelect?: EventPublish;  // Event to publish on item click
  };

  subscriptions?: EventSubscription[];  // Events to listen for
}
```

See `/lib/universal-widget/schema.ts` for complete type definitions.

### InferredWidget

```typescript
export interface InferredWidget {
  provider: string;         // Provider identifier
  widgetType: string;       // Widget type within provider
  confidence: number;       // AI confidence score (0-1)
  reasoning?: string;       // Why this widget was recommended
}
```

---

## Testing Guidelines

### Unit Tests

**VisualizationSelector:**
- Renders all 5 options
- Highlights recommended option if provided
- Calls `onSelect` with correct type
- Calls `onBack` when back button clicked
- Shows confidence score for recommendation
- Handles null inferredWidget gracefully

**WidgetPreview:**
- Generates schema on mount if null
- Calls `onSchemaGenerated` with valid schema
- Renders UniversalDataWidget correctly
- Shows loading state during deploy
- Disables deploy button when appropriate
- Calls `onDeploy` when button clicked
- Calls `onBack` when back button clicked

### Integration Tests

**Stage 3 → 4 Flow:**
1. Start at Stage 3
2. Select visualization type
3. Verify Stage 4 renders
4. Verify schema generated
5. Verify preview shows

**Stage 4 → 5 Flow:**
1. Start at Stage 4 with valid schema
2. Click deploy button
3. Verify API called with correct payload
4. Verify success → Stage 5
5. Verify error → stay on Stage 4

**Back Navigation:**
1. Stage 3 → back → Stage 2
2. Stage 4 → back → Stage 3
3. Verify state cleared appropriately

---

## Import Paths

```typescript
// Types
import type {
  LayoutType,
  UniversalWidgetDefinition
} from '@/lib/universal-widget/schema';

import type {
  InferredWidget
} from '@/stores/conversation-store';

// Components (if needed)
import { UniversalDataWidget } from '@/components/universal-data-widget';

// Utilities
import { cn } from '@/lib/utils';
```

---

## Questions for Sub-Agents?

If you need clarification on:
- **Stage 3:** How should AI recommendation be displayed?
- **Stage 4:** Should users be able to edit schema before deploy?
- **Both:** What error states need special handling?

Refer to `/docs/WIZARD_STAGE_INTEGRATION.md` or ask orchestrator.

---

**Last Updated:** December 14, 2025
**For:** Month 5 Week 19 - Visualization UI
