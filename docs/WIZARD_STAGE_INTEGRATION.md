# Wizard Stage Integration Documentation

**Created:** December 14, 2025
**Week:** Month 5 Week 19 - Visualization UI
**Task:** Wire Stages 3-4 to Wizard Flow

---

## Overview

The `WidgetCreationWizard` component now integrates all 5 stages with proper routing, navigation, and data flow:

1. **Stage 1-2:** Chat interface (existing, fully functional)
2. **Stage 3:** Visualization selector (placeholder component)
3. **Stage 4:** Widget preview (placeholder component)
4. **Stage 5:** Success screen (fully implemented)

---

## Stage Routing Logic

### Stage-Based Content Rendering

The wizard uses conditional rendering to show different UI based on the current stage:

```tsx
{/* Stages 1-2: Chat interface */}
{(stage === 'problem_discovery' || stage === 'clarifying_questions') && (
  <ChatInterface />
)}

{/* Stage 3: Visualization selection */}
{stage === 'visualization' && (
  <VisualizationSelector />
)}

{/* Stage 4: Preview */}
{stage === 'preview' && (
  <WidgetPreview />
)}

{/* Stage 5: Success */}
{stage === 'deploy' && (
  <DeploySuccessScreen />
)}
```

### Stage Indicator

Visual progress bar shows current stage (1-5) with connected circles:
- Active stages: Primary color
- Inactive stages: Muted color
- Connected with lines showing progression

---

## Stage Transitions

### Stage 2 → 3: AI Inference Complete

**Trigger:** AI returns `inferredWidget` with provider and visualization recommendation

```tsx
// In handleSendMessage (Stage 2)
if (data.inferredWidget) {
  useConversationStore.getState().setInferredWidget(data.inferredWidget);
  // AI can trigger stage transition via nextStage field
}
```

**Data Flow:**
- `inferredWidget` stored in conversation store
- Contains: `provider`, `widgetType`, `confidence`, `reasoning`
- Stage 3 component receives this as prop

### Stage 3 → 4: Visualization Selected

**Trigger:** User clicks "Continue" after selecting visualization type

```tsx
const handleVisualizationSelected = (visualizationType: LayoutType) => {
  setSelectedVisualization(visualizationType);
  setStage('preview'); // Progress to Stage 4
};
```

**Data Flow:**
- `selectedVisualization` stored in local state
- Passed to Stage 4 component along with `inferredWidget.provider`
- Stage 4 generates widget schema based on provider + visualization

### Stage 4 → 5: Deploy Success

**Trigger:** Deploy API returns success

```tsx
const handleDeploy = async () => {
  const response = await fetch('/api/ai/widget-creation/deploy', {
    method: 'POST',
    body: JSON.stringify({
      widgetDefinition: widgetSchema,
      userIntent: extractedIntent,
    }),
  });

  const data = await response.json();
  if (data.success) {
    setDeployedWidgetId(data.widgetId);
    setStage('deploy'); // Progress to Stage 5
  }
};
```

**Data Flow:**
- Widget schema validated and sent to backend
- Backend inserts into `widget_instances` table
- Returns `widgetId` which is stored and displayed in success screen

---

## Navigation Flow

### Back Button Behavior

**Stage 3 → Stage 2:**
```tsx
const handleVisualizationBack = () => {
  setStage('clarifying_questions');
  setSelectedVisualization(null); // Clear selection
};
```

**Stage 4 → Stage 3:**
```tsx
const handlePreviewBack = () => {
  setStage('visualization');
  setWidgetSchema(null); // Clear generated schema
};
```

**Rules:**
- Users can navigate backwards but NOT skip forward
- Going back clears state from the current stage
- Previous stage data is preserved (e.g., inferredWidget remains when going 4→3→4)

### Forward Navigation

**Automatic transitions:**
- Stage 1→2: AI determines when enough information collected
- Stage 2→3: AI returns `nextStage: 'visualization'`
- Stage 3→4: User clicks "Continue"
- Stage 4→5: Deploy completes successfully

**No manual "Next" button** - progression is event-driven

---

## Data Flow

### Complete Flow Diagram

```
Stage 1: Problem Discovery
  ↓ (AI extracts intent)
  extractedIntent: UserIntent
  {
    problemSolved: string
    painPoint: string
    goal: string
    expectedOutcome: string
    impactMetric: string
  }
  ↓
Stage 2: Clarifying Questions
  ↓ (AI infers widget)
  inferredWidget: InferredWidget
  {
    provider: 'github' | 'jira' | 'linear' | 'slack' | 'calendar'
    widgetType: string
    confidence: number (0-1)
    reasoning?: string
  }
  ↓
Stage 3: Visualization Selection
  ↓ (User selects)
  selectedVisualization: LayoutType
  'list' | 'table' | 'cards' | 'metric' | 'chart'
  ↓
Stage 4: Preview
  ↓ (Schema generation)
  widgetSchema: UniversalWidgetDefinition
  {
    metadata: { name, description, category, version }
    dataSource: { provider, endpoint, method }
    fields: FieldMapping[]
    layout: Layout (type-specific)
  }
  ↓ (User clicks deploy)
Stage 5: Success
  deployedWidgetId: string
  'github_pull-requests_abc123_xyz'
```

### State Management

**Conversation Store (Zustand):**
- `stage`: Current wizard stage
- `messages`: Chat history (Stages 1-2)
- `extractedIntent`: User's problem description
- `inferredWidget`: AI recommendation

**Local Component State:**
- `selectedVisualization`: Chosen layout type (Stage 3)
- `widgetSchema`: Generated widget definition (Stage 4)
- `deployedWidgetId`: Created widget ID (Stage 5)
- `isDeploying`: Loading state during deployment

---

## Success State (Stage 5)

### Features

1. **Success Icon:** Green checkmark in circle
2. **Widget Name:** Display name from schema
3. **Widget ID:** Show unique identifier
4. **Two Actions:**
   - "View on Dashboard" → Navigate to `/dashboard`
   - "Create Another Widget" → Reset wizard to Stage 1

### Implementation

```tsx
function DeploySuccessScreen({
  widgetId,
  widgetName,
  onViewDashboard,
  onCreateAnother,
}: DeploySuccessScreenProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full">
        <CheckIcon />
      </div>

      {/* Message */}
      <h3>Widget Deployed Successfully!</h3>
      <p>{widgetName} has been added to your dashboard.</p>
      <p className="text-xs">Widget ID: {widgetId}</p>

      {/* Actions */}
      <button onClick={onViewDashboard}>View on Dashboard</button>
      <button onClick={onCreateAnother}>Create Another Widget</button>
    </div>
  );
}
```

### Navigation Handlers

```tsx
const handleViewDashboard = () => {
  onClose(); // Close wizard modal
  router.push('/dashboard'); // Navigate to dashboard
};

const handleCreateAnother = () => {
  reset(); // Reset conversation store
  setSelectedVisualization(null);
  setWidgetSchema(null);
  setDeployedWidgetId(null);
  setError(null);
  addMessage('assistant', 'Hi! I\'m here to help...');
};
```

---

## Error Handling

### Error Display Locations

**Stages 1-2 (Chat):** Error banner above input
```tsx
{error && (
  <div className="bg-destructive/10 border-destructive/20">
    <p>{error}</p>
    <button onClick={handleRetry}>Retry ({retryCount})</button>
  </div>
)}
```

**Stages 3-4 (UI Components):** Error banner at bottom
```tsx
{(stage === 'visualization' || stage === 'preview') && error && (
  <div className="p-4 bg-destructive/10">
    <p>{error}</p>
    <button onClick={() => setError(null)}>Dismiss</button>
  </div>
)}
```

### Retry Logic

**Chat stages (1-2):**
- Store `lastUserMessage`
- Increment `retryCount`
- Allow retry without re-typing

**Deploy stage (4→5):**
- If deploy fails, stay on Stage 4
- Show error message
- User can click "Deploy" again
- Schema is NOT lost on error

---

## Deploy API Integration

### Endpoint

**POST** `/api/ai/widget-creation/deploy`

### Request

```typescript
{
  widgetDefinition: UniversalWidgetDefinition;
  userIntent: UserIntent;
}
```

### Response (Success)

```typescript
{
  widgetId: string;
  success: true;
  message: "Widget 'GitHub Pull Requests' deployed successfully";
}
```

### Response (Error)

```typescript
{
  success: false;
  error: string;
  details?: string[];
}
```

### Error Handling

```tsx
try {
  const response = await fetch('/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgetDefinition, userIntent }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Deploy failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Deployment failed');
  }

  // Success
  setDeployedWidgetId(data.widgetId);
  setStage('deploy');
} catch (error) {
  setError(error.message);
  // Stay on Stage 4
}
```

---

## Placeholder Components

### VisualizationSelectorPlaceholder

**Purpose:** Temporary component until Sub-Agent 1 creates full version

**Props:**
```typescript
interface VisualizationSelectorPlaceholderProps {
  inferredWidget: InferredWidget | null;
  onSelect: (visualizationType: LayoutType) => void;
  onBack: () => void;
}
```

**Behavior:**
- Shows 5 visualization options as buttons
- Calls `onSelect` when user clicks
- Shows "TODO" note indicating placeholder status
- Back button returns to Stage 2

**To Replace:**
Create `components/wizard/VisualizationSelector.tsx` with:
- AI-recommended visualization highlighted
- Visual previews of each layout type
- Descriptions of when to use each type
- Same prop interface

### WidgetPreviewPlaceholder

**Purpose:** Temporary component until Sub-Agent 2 creates full version

**Props:**
```typescript
interface WidgetPreviewPlaceholderProps {
  provider: string;
  visualizationType: LayoutType;
  onSchemaGenerated: (schema: UniversalWidgetDefinition) => void;
  onDeploy: () => void;
  onBack: () => void;
  isDeploying: boolean;
  widgetSchema: UniversalWidgetDefinition | null;
}
```

**Behavior:**
- Auto-generates placeholder schema on mount
- Calls `onSchemaGenerated` with schema
- Shows basic preview (metadata, provider, layout type)
- Schema JSON in collapsible `<details>`
- Deploy button calls `onDeploy`
- Back button returns to Stage 3

**To Replace:**
Create `components/wizard/WidgetPreview.tsx` with:
- Live rendering using `UniversalDataWidget`
- Fetches real data from provider
- Shows exact appearance on dashboard
- Same prop interface

---

## Testing

### Test Page

**Location:** `/app/test-wizard-stages/page.tsx`

**Features:**
- Current state display (stage, inferred widget)
- Stage navigation buttons (jump to any stage)
- Expected behavior documentation
- Integration notes

**Usage:**
```bash
npm run dev
# Navigate to http://localhost:3000/test-wizard-stages
```

### Manual Testing Checklist

**Stage 1-2 (Chat):**
- [ ] Welcome message displays on open
- [ ] User can type and send messages
- [ ] AI responses stream with typewriter effect
- [ ] Loading indicator shows correct stage message
- [ ] Retry button works on errors
- [ ] Stage indicator highlights Stage 1/2

**Stage 3 (Visualization):**
- [ ] All 5 options displayed (list, table, cards, metric, chart)
- [ ] Clicking option progresses to Stage 4
- [ ] Back button returns to Stage 2
- [ ] Inferred widget provider shown
- [ ] Stage indicator highlights Stage 3

**Stage 4 (Preview):**
- [ ] Widget schema auto-generates
- [ ] Provider and layout type displayed
- [ ] JSON schema visible in details
- [ ] Deploy button enabled when schema ready
- [ ] Back button returns to Stage 3
- [ ] Stage indicator highlights Stage 4
- [ ] Deploy button shows "Deploying..." during API call

**Stage 5 (Success):**
- [ ] Success icon displays (green checkmark)
- [ ] Widget name shown
- [ ] Widget ID shown
- [ ] "View on Dashboard" navigates to `/dashboard`
- [ ] "Create Another Widget" resets to Stage 1
- [ ] Stage indicator highlights Stage 5

**Error Handling:**
- [ ] Chat errors show above input with retry button
- [ ] Deploy errors keep user on Stage 4
- [ ] Error messages are clear and actionable
- [ ] Retry button increments counter

**Navigation:**
- [ ] Can go back 3→2
- [ ] Can go back 4→3
- [ ] Cannot skip stages forward
- [ ] State preserved when going back

---

## Integration with Sub-Agent Components

### When Sub-Agent 1 Delivers VisualizationSelector

1. **Update imports:**
   ```tsx
   // Uncomment this line
   import { VisualizationSelector } from '@/components/wizard/VisualizationSelector';
   ```

2. **Replace placeholder:**
   ```tsx
   // Change this
   <VisualizationSelectorPlaceholder {...props} />

   // To this
   <VisualizationSelector {...props} />
   ```

3. **Verify props match:**
   - `inferredWidget: InferredWidget | null`
   - `onSelect: (visualizationType: LayoutType) => void`
   - `onBack: () => void`

### When Sub-Agent 2 Delivers WidgetPreview

1. **Update imports:**
   ```tsx
   // Uncomment this line
   import { WidgetPreview } from '@/components/wizard/WidgetPreview';
   ```

2. **Replace placeholder:**
   ```tsx
   // Change this
   <WidgetPreviewPlaceholder {...props} />

   // To this
   <WidgetPreview {...props} />
   ```

3. **Verify props match:**
   - `provider: string`
   - `visualizationType: LayoutType`
   - `onSchemaGenerated: (schema: UniversalWidgetDefinition) => void`
   - `onDeploy: () => void`
   - `onBack: () => void`
   - `isDeploying: boolean`
   - `widgetSchema: UniversalWidgetDefinition | null`

---

## Files Modified

### Components
- `/components/WidgetCreationWizard.tsx` (465 lines → 890 lines)
  - Added Stage 3-5 routing logic
  - Added navigation handlers
  - Added deploy logic
  - Added placeholder components
  - Added success screen

### Testing
- `/app/test-wizard-stages/page.tsx` (NEW, 173 lines)
  - Test page for stage integration
  - Stage navigation controls
  - Current state display
  - Expected behavior documentation

### Documentation
- `/docs/WIZARD_STAGE_INTEGRATION.md` (NEW, this file)

---

## Next Steps

**Sub-Agent 1: VisualizationSelector**
- Create `/components/wizard/VisualizationSelector.tsx`
- Match `VisualizationSelectorPlaceholderProps` interface
- Add visual previews of each layout type
- Highlight AI-recommended option

**Sub-Agent 2: WidgetPreview**
- Create `/components/wizard/WidgetPreview.tsx`
- Match `WidgetPreviewPlaceholderProps` interface
- Implement live widget rendering
- Fetch real data from provider
- Show exact dashboard appearance

**Sub-Agent 3: E2E Testing**
- Write Playwright tests for full wizard flow
- Test all stage transitions
- Test error handling
- Test navigation (back buttons)
- Test deploy success flow

---

## Known Issues

### Placeholder Limitations

1. **Stage 3 placeholder:**
   - No visual previews of layout types
   - No AI recommendation highlight
   - Minimal styling

2. **Stage 4 placeholder:**
   - No live widget rendering
   - Schema auto-generation is simplistic
   - No real data fetching

These will be resolved when sub-agents deliver full components.

### Future Enhancements

1. **Stage 2→3 transition:**
   - AI could automatically select visualization type with high confidence
   - Skip Stage 3 if confidence >95%

2. **Stage 4 editing:**
   - Allow users to tweak schema before deploy
   - Edit field mappings, layout options

3. **Stage 5 social sharing:**
   - "Share widget" button
   - Generate screenshot of widget
   - Copy shareable link

---

**Last Updated:** December 14, 2025
**Next Review:** After Sub-Agent 1-2 deliver components
