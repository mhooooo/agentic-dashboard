# WidgetPreview Component - Integration Guide

## Overview

The `WidgetPreview` component is Stage 4 of the 5-stage widget creation wizard. It provides a two-panel interface for reviewing and editing widget schemas before deployment.

## Component Location

```
/components/wizard/WidgetPreview.tsx
```

## Features

### 1. Two-Panel Layout

**Left Panel: Schema Editor**
- Displays JSON schema with syntax highlighting
- "Edit Schema" button opens full-screen modal
- Read-only view (editable via modal)

**Right Panel: Live Preview**
- Renders UniversalDataWidget with current schema
- Shows loading/error states
- Updates in real-time when schema changes

### 2. Schema Editing Modal

- Full-screen editable textarea
- JSON syntax validation
- Inline error display
- "Apply Changes" saves and updates preview
- "Cancel" discards changes

### 3. Navigation Actions

- **Back button**: Returns to Stage 3 (Visualization)
- **Deploy to Dashboard**: Primary CTA with loading state

## Props Interface

```typescript
interface WidgetPreviewProps {
  /** Widget schema to preview */
  schema: UniversalWidgetDefinition;

  /** Called when schema is edited */
  onSchemaChange: (schema: UniversalWidgetDefinition) => void;

  /** Called when user clicks "Back" */
  onBack: () => void;

  /** Called when user clicks "Deploy to Dashboard" */
  onDeploy: () => void;

  /** Loading state during deployment */
  isDeploying: boolean;
}
```

## Integration Steps

### Step 1: Import Component

```typescript
import { WidgetPreview } from '@/components/wizard/WidgetPreview';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
```

### Step 2: Add State Management

```typescript
const [generatedSchema, setGeneratedSchema] = useState<UniversalWidgetDefinition | null>(null);
const [isDeploying, setIsDeploying] = useState(false);
```

### Step 3: Implement Handlers

```typescript
const handleSchemaChange = (newSchema: UniversalWidgetDefinition) => {
  setGeneratedSchema(newSchema);

  // Optional: Publish schema update event
  useEventMesh.getState().publish('wizard.schema.updated', {
    schema: newSchema,
  }, 'widget-wizard');
};

const handleBack = () => {
  // Navigate to Stage 3 (Visualization)
  useConversationStore.getState().setStage('visualization');
};

const handleDeploy = async () => {
  setIsDeploying(true);

  try {
    // 1. Save widget to database
    const response = await fetch('/api/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        definition: generatedSchema,
        userIntent: extractedIntent, // from conversation store
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to deploy widget');
    }

    // 2. Publish deployment event
    useEventMesh.getState().publish('wizard.widget.deployed', {
      widgetId: result.data.id,
      schema: generatedSchema,
      userIntent: extractedIntent,
    }, 'widget-wizard');

    // 3. Navigate to dashboard
    router.push('/dashboard');

    // 4. Show success notification
    toast.success('Widget deployed successfully!');

  } catch (error) {
    console.error('Deployment failed:', error);
    toast.error(error instanceof Error ? error.message : 'Deployment failed');
  } finally {
    setIsDeploying(false);
  }
};
```

### Step 4: Render in Wizard

```typescript
// In WidgetCreationWizard.tsx
const stage = useConversationStore((state) => state.stage);

return (
  <div className="wizard-container">
    {stage === 'preview' && generatedSchema && (
      <WidgetPreview
        schema={generatedSchema}
        onSchemaChange={handleSchemaChange}
        onBack={handleBack}
        onDeploy={handleDeploy}
        isDeploying={isDeploying}
      />
    )}
  </div>
);
```

## Example: Complete Integration

See `/components/wizard/WidgetPreview.example.tsx` for a complete working example.

To test:
1. Copy the example code to `/app/test-preview/page.tsx`
2. Run `npm run dev`
3. Navigate to `http://localhost:3000/test-preview`
4. You'll see:
   - Left panel: GitHub PR widget schema (editable)
   - Right panel: Live preview with sample data
   - Bottom: Back and Deploy buttons

## Schema Validation

The component uses `validateWidgetDefinition` from `/lib/universal-widget/schema.ts` to validate edited JSON:

```typescript
import { validateWidgetDefinition } from '@/lib/universal-widget/schema';

const validation = validateWidgetDefinition(parsedJson);

if (!validation.valid) {
  // Display validation.errors to user
  setValidationError(validation.errors.join('\n'));
}
```

### Common Validation Errors

1. **Missing required fields**: `metadata.name`, `dataSource.provider`, `dataSource.endpoint`, `layout.type`
2. **Invalid field mappings**: Missing `name`, `path`, or `type`
3. **Layout-specific errors**:
   - List layout requires `fields.title`
   - Table layout requires `columns` array
   - Metric layout requires `value` and `label`

## Styling

The component uses Tailwind CSS classes and respects the project's design system:

- **Primary button**: `bg-primary text-primary-foreground`
- **Border**: `border` (uses theme color)
- **Background**: `bg-background`, `bg-muted/30`
- **Text**: `text-foreground`, `text-muted-foreground`

All colors adapt to light/dark mode automatically.

## Accessibility

- Modal has proper ARIA labels (`aria-label="Close"`)
- Buttons are keyboard accessible
- Loading states prevent duplicate submissions
- Error messages are screen-reader friendly

## Performance

- Schema editing uses controlled textarea (no debouncing needed)
- UniversalDataWidget handles its own data fetching and caching
- Modal is conditionally rendered (not hidden) to reduce DOM size
- JSON.stringify formatting is done on-demand when modal opens

## Event Mesh Integration

The component integrates with the Event Mesh for observability:

```typescript
// When schema is changed
publish('wizard.schema.updated', { schema }, 'widget-wizard');

// When deployed (in handleDeploy)
publish('wizard.widget.deployed', { widgetId, schema }, 'widget-wizard');

// When navigating back (in handleBack)
publish('wizard.stage.changed', {
  previousStage: 'preview',
  newStage: 'visualization'
}, 'widget-wizard');
```

## Error Handling

The component handles three types of errors:

1. **JSON Parse Errors**: Shows "Invalid JSON: {message}" in modal
2. **Schema Validation Errors**: Shows field-specific errors (e.g., "metadata.name is required")
3. **Deployment Errors**: Handled by parent component (wizard)

## Dependencies

The component requires:

- `@/components/UniversalDataWidget` - For live preview rendering
- `@/lib/universal-widget/schema` - For types and validation
- `@/lib/utils` - For `cn()` helper
- React 18+ (for `useState`)

No external packages required.

## Testing

### Manual Testing Checklist

- [ ] Schema displays correctly in left panel
- [ ] Preview renders UniversalDataWidget in right panel
- [ ] "Edit Schema" button opens modal
- [ ] Modal displays current schema as JSON
- [ ] Can edit JSON in modal
- [ ] Invalid JSON shows error message
- [ ] Valid JSON updates preview
- [ ] "Cancel" discards changes
- [ ] "Apply Changes" saves and updates preview
- [ ] "Back" button navigates to previous stage
- [ ] "Deploy" button triggers deployment
- [ ] Loading state shows during deployment
- [ ] Deployment success navigates to dashboard

### Automated Testing

See `/components/wizard/WidgetPreview.example.tsx` for test scenarios.

## Troubleshooting

### Preview not rendering

**Issue**: Right panel shows "Loading..." forever

**Solution**: Check:
1. Widget schema has valid `dataSource.provider`
2. Provider credentials are configured in `/api/proxy/[provider]`
3. Network tab shows API calls succeeding
4. UniversalDataWidget error messages

### Schema validation errors

**Issue**: Modal shows validation errors even for valid JSON

**Solution**: Ensure schema matches `UniversalWidgetDefinition` interface:
- `metadata.name` is a string
- `dataSource.provider` matches supported providers
- `fields` is an array with valid `FieldMapping` objects
- `layout.type` is one of: 'list', 'table', 'cards', 'metric', 'chart'

### Deploy button not working

**Issue**: Clicking "Deploy to Dashboard" does nothing

**Solution**: Check:
1. `onDeploy` handler is provided
2. Handler sets `isDeploying` state
3. API route `/api/widgets` exists
4. Console for JavaScript errors

## Next Steps

After integrating this component:

1. **Stage 5: Deploy** - Create deployment confirmation screen
2. **Success state** - Show success animation and dashboard link
3. **Error recovery** - Add retry logic for failed deployments
4. **Schema versioning** - Track schema changes for undo/redo
5. **Advanced editing** - Add syntax highlighting and autocomplete to modal

## Related Files

- `/components/wizard/WidgetPreview.tsx` - Main component
- `/components/wizard/WidgetPreview.example.tsx` - Usage example
- `/components/UniversalDataWidget.tsx` - Preview rendering
- `/lib/universal-widget/schema.ts` - Schema types and validation
- `/stores/conversation-store.ts` - Wizard state management
- `/lib/event-mesh/mesh.ts` - Event publishing

## Support

For questions or issues:
1. Check example file: `/components/wizard/WidgetPreview.example.tsx`
2. Review this integration guide
3. Inspect browser console for errors
4. Verify schema validation with `validateWidgetDefinition`

---

**Last Updated**: December 14, 2025
**Component Version**: 1.0.0
**Author**: AI Widget Creation System
