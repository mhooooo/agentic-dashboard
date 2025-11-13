# Widget Versioning System

A robust versioning system for dashboard widgets that ensures backward compatibility and safe evolution of widget schemas.

## Why Widget Versioning?

As the dashboard evolves, widgets need to change:
- Add new configuration fields
- Rename or remove old fields
- Change data structures
- Update default values

**Without versioning:** Old widgets break when we update code. Users lose their dashboards.

**With versioning:** Old widgets automatically upgrade when loaded. Everything just works.

---

## Architecture

### 1. Widget Registry (`registry.ts`)

Central registry of all widget types with their current versions:

```typescript
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  github: {
    type: 'github',
    version: 1,  // Current version
    name: 'GitHub Pull Requests',
    description: 'Display pull requests from GitHub repositories',
    defaultConfig: {
      repositories: [],
      filters: [],
    },
  },
  // ... other widgets
};
```

### 2. Migrations (`migrations.ts`)

Define how to transform configs from old versions to new:

```typescript
export const WIDGET_MIGRATIONS: Record<string, Record<number, WidgetMigration>> = {
  github: {
    // v1 → v2 migration (when we update to v2)
    1: (config) => ({
      ...config,
      autoRefresh: false,  // Add new field
    }),
    // v2 → v3 migration (future)
    2: (config) => ({
      ...config,
      maxResults: 50,  // Add another field
    }),
  },
};
```

### 3. Versioning Utilities (`versioning.ts`)

Helper functions for working with versioned widgets:

- `createWidgetInstance()` - Create new widget with current version
- `normalizeWidgetInstance()` - Auto-upgrade old widget to latest version
- `normalizeWidgetInstances()` - Batch normalize (for checkpoint restoration)
- `ensureLatestVersion()` - Ensure widget is at latest version
- `getWidgetVersionInfo()` - Get version metadata for debugging

### 4. Widget Instance Schema

Every widget instance tracks its version:

```typescript
interface WidgetInstance {
  id: string;
  type: string;
  version: number;  // Version when widget was created
  config: Record<string, any>;
}
```

---

## How It Works

### Creating New Widgets

When a user adds a widget, it's created with the **current version**:

```typescript
// Dashboard.tsx
import { createWidgetInstance } from '@/lib/widgets';

const addWidget = (type: string, config: any) => {
  const widget = createWidgetInstance(type, config);
  // widget.version = 1 (current version from registry)
};
```

### Loading Old Widgets

When restoring from checkpoints or loading saved dashboards, old widgets are **automatically upgraded**:

```typescript
// Dashboard.tsx - Undo/Redo
const handleUndo = () => {
  const snapshot = undo();

  // Auto-upgrade widgets to latest version
  const normalizedWidgets = normalizeWidgetInstances(snapshot.widgets);

  setWidgets(normalizedWidgets);
};
```

**Migration flow:**
1. Widget has `version: 1`
2. Registry shows current version is `3`
3. Apply migrations: v1→v2, then v2→v3
4. Widget now has `version: 3` with updated config

### Backward Compatibility

The system handles widgets created **before versioning was added**:

```typescript
// Old widget (no version field)
const oldWidget = {
  id: 'w1',
  type: 'github',
  config: { repositories: [] },
  // No version field!
};

// Normalized widget (assumes v1)
const normalized = normalizeWidgetInstance(oldWidget);
// normalized.version = 1
```

---

## Usage Guide

### Adding a New Widget Type

1. Register in `registry.ts`:

```typescript
export const WIDGET_REGISTRY = {
  // ... existing widgets
  myNewWidget: {
    type: 'myNewWidget',
    version: 1,  // Start at v1
    name: 'My New Widget',
    description: 'Does cool things',
    defaultConfig: {
      enabled: true,
      limit: 10,
    },
  },
};
```

2. Add empty migration entry in `migrations.ts`:

```typescript
export const WIDGET_MIGRATIONS = {
  // ... existing migrations
  myNewWidget: {
    // No migrations yet (still on v1)
  },
};
```

3. Create the widget component:

```typescript
// components/widgets/MyNewWidget.tsx
export function MyNewWidget({ enabled, limit }: MyNewWidgetProps) {
  // Widget implementation
}
```

### Updating an Existing Widget (Breaking Change)

Example: GitHub widget needs a new `autoRefresh` field

1. **Update registry** - Increment version:

```typescript
// lib/widgets/registry.ts
github: {
  type: 'github',
  version: 2,  // v1 → v2
  // ...
  defaultConfig: {
    repositories: [],
    filters: [],
    autoRefresh: false,  // NEW FIELD
  },
},
```

2. **Add migration** - Define v1→v2 transformation:

```typescript
// lib/widgets/migrations.ts
github: {
  1: (config) => ({
    ...config,
    autoRefresh: false,  // Add missing field with default
  }),
},
```

3. **Update component** - Use new field:

```typescript
// components/widgets/GitHubWidget.tsx
export interface GitHubWidgetProps {
  repositories?: string[];
  filters?: string[];
  autoRefresh?: boolean;  // NEW
}

export function GitHubWidget({ autoRefresh = false, ...props }) {
  // Use autoRefresh in implementation
}
```

4. **Test migration**:
   - Create a widget in dev (it will be v2)
   - Manually edit checkpoint to make it v1
   - Undo → should auto-upgrade to v2 with `autoRefresh: false`

---

## Migration Patterns

### Pattern: Add New Field

```typescript
// v1 → v2: Add field with default value
1: (config) => ({
  ...config,
  newField: 'default',
}),
```

### Pattern: Rename Field

```typescript
// v1 → v2: Rename oldName to newName
1: (config) => ({
  ...config,
  newName: config.oldName,
  // Don't include oldName
}),
```

### Pattern: Transform Data Structure

```typescript
// v1 → v2: Change array to object
1: (config) => ({
  ...config,
  repositories: config.repositories.reduce((acc, repo) => {
    acc[repo] = { enabled: true };
    return acc;
  }, {}),
}),
```

### Pattern: Remove Field

```typescript
// v1 → v2: Remove deprecated field
1: (config) => {
  const { deprecatedField, ...rest } = config;
  return rest;
},
```

---

## Testing Widget Versions

### Manual Testing

1. Add a widget in the UI
2. Check browser console for version:
   ```
   [Widget Versioning] Created github widget v1
   ```

3. Add widget to dashboard, then undo
4. Check console for migration logs:
   ```
   [Widget Versioning] Migrating github from v1 to v2
   ```

### Playwright E2E Test

See `tests/widget-versioning.spec.ts` for automated tests that verify:
- Widgets are created with current version
- Old checkpoints auto-upgrade on restore
- Migrations apply correctly
- Backward compatibility works

### Browser Console Debugging

The system logs all version operations:

```javascript
// In browser console
console.log('[Widget Versioning] Created github widget v2');
console.log('[Widget Versioning] Migrating jira from v1 to v2');
console.log('[Widget Versioning] No migration needed for welcome v1');
```

---

## Best Practices

### ✅ DO

- **Increment version** for any breaking change to widget config schema
- **Add migrations** for every version increment
- **Test migrations** by creating old versions manually
- **Keep migrations simple** - one transformation per migration
- **Use default values** when adding new required fields
- **Document breaking changes** in changelog.md

### ❌ DON'T

- **Skip version numbers** - Always go v1→v2→v3 (never v1→v3)
- **Modify old migrations** - Once deployed, migrations are immutable
- **Throw errors in migrations** - Fail gracefully and log warnings
- **Delete old migrations** - Keep migration history forever
- **Change semantics without version bump** - Even if config structure is same

---

## Troubleshooting

### Widget config is missing after upgrade

**Cause:** Migration didn't preserve all fields

**Fix:** Update migration to include all necessary fields:

```typescript
// BAD
1: (config) => ({ newField: 'value' }),  // Lost all old fields!

// GOOD
1: (config) => ({ ...config, newField: 'value' }),  // Preserved old fields
```

### Migration not applying

**Cause:** Version in registry doesn't match migration

**Fix:** Ensure version increments match migrations:

```typescript
// Registry
github: { version: 3, ... }  // Current version

// Migrations
github: {
  1: (config) => { ... },  // v1 → v2
  2: (config) => { ... },  // v2 → v3
}
```

### Widget shows as "unknown widget type"

**Cause:** Widget type not in registry

**Fix:** Add widget to `WIDGET_REGISTRY` in `registry.ts`

---

## Future Enhancements

- **Schema validation:** Validate configs match expected schema for version
- **Rollback support:** Downgrade widgets if needed (v2 → v1)
- **Migration testing:** Automated tests for all migrations
- **Version warnings:** UI indicator when widget needs upgrade
- **Migration analytics:** Track which migrations run most often

---

**Last Updated:** November 14, 2025
**Status:** ✅ Production ready (Month 2)
