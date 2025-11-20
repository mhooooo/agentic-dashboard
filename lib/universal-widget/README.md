# UniversalDataWidget System

**Declarative JSON-based widgets for the Agentic Dashboard**

Create powerful, interactive widgets using JSON configuration instead of writing React code. Covers 80% of widget use cases with zero security risk.

---

## Why?

**Before (Hardcoded):**
- Days to create a new widget
- Requires React knowledge
- Code review for every widget
- Security concerns with generated code

**After (Declarative JSON):**
- Hours to create a new widget
- No code required
- Auto-validated schema
- Zero security risk (no code execution)

---

## Quick Start

### 1. Define Your Widget (JSON)

```json
{
  "metadata": {
    "name": "My Widget",
    "description": "Shows data from an API",
    "category": "development",
    "version": 1
  },
  "dataSource": {
    "provider": "github",
    "endpoint": "/user/repos",
    "method": "GET",
    "pollInterval": 60
  },
  "fields": [
    {
      "name": "repoName",
      "path": "$.name",
      "type": "string"
    },
    {
      "name": "stars",
      "path": "$.stargazers_count",
      "type": "number"
    }
  ],
  "layout": {
    "type": "list",
    "fields": {
      "title": "repoName",
      "metadata": ["stars"]
    }
  }
}
```

### 2. Use in Dashboard

```typescript
import { UniversalDataWidget } from '@/components/UniversalDataWidget';
import { loadWidgetDefinition } from '@/lib/universal-widget';

const definition = loadWidgetDefinition('my-widget');

<UniversalDataWidget definition={definition} />
```

---

## Schema Reference

### Metadata

Basic information about the widget:

```json
{
  "metadata": {
    "name": "Widget Name",
    "description": "What this widget does",
    "category": "development | project-management | analytics",
    "version": 1
  }
}
```

### Data Source

Where to fetch data:

```json
{
  "dataSource": {
    "provider": "github | jira | slack",
    "endpoint": "/api/endpoint",
    "method": "GET | POST",
    "params": { "key": "value" },
    "pollInterval": 60,
    "dataPath": "$.data.items"
  }
}
```

**Fields:**
- `provider`: Which API to call (must have credentials configured)
- `endpoint`: API path (e.g., `/user/repos`)
- `method`: HTTP method
- `params`: Query parameters (optional)
- `pollInterval`: Auto-refresh interval in seconds (optional, 0 = no polling)
- `dataPath`: JSONPath to extract data from response (optional)

### Field Mappings

Transform API data to widget fields:

```json
{
  "fields": [
    {
      "name": "displayName",
      "path": "$.user.login",
      "type": "string",
      "label": "Author",
      "format": "{{value}}"
    }
  ]
}
```

**Types:**
- `string`: Text data
- `number`: Numeric data
- `boolean`: True/false
- `date`: Timestamps
- `url`: URLs
- `enum`: Fixed set of values (with optional label mapping)

**JSONPath Examples:**
- `$.field` - Top-level field
- `$.nested.field` - Nested field
- `$.user.login` - Deeply nested
- `$.items[0]` - Array access
- `$.items[*]` - All array items

**Format Templates:**
Use `{{variable}}` to create formatted strings:
- `"{{value}} days ago"`
- `"{{firstName}} {{lastName}}"`
- `"PR #{{number}}"`

### Layouts

#### List Layout

Display items in a vertical list:

```json
{
  "layout": {
    "type": "list",
    "fields": {
      "title": "fieldName",
      "subtitle": "anotherField",
      "metadata": ["field1", "field2"],
      "badge": {
        "field": "status",
        "colorMap": {
          "open": "bg-green-100 text-green-800",
          "closed": "bg-gray-100"
        }
      }
    }
  }
}
```

#### Table Layout

Display items in a table:

```json
{
  "layout": {
    "type": "table",
    "columns": [
      { "field": "name", "header": "Name", "width": "200px" },
      { "field": "status", "header": "Status", "sortable": true }
    ]
  }
}
```

#### Cards Layout

Display items as cards:

```json
{
  "layout": {
    "type": "cards",
    "card": {
      "title": "name",
      "description": "description",
      "image": "imageUrl",
      "metadata": ["date", "author"]
    },
    "columns": 2
  }
}
```

#### Metric Layout

Display a single metric value:

```json
{
  "layout": {
    "type": "metric",
    "value": "count",
    "label": "Total Issues",
    "format": "number"
  }
}
```

### Interactions

Publish events when user clicks an item:

```json
{
  "interactions": {
    "onSelect": {
      "eventName": "github.pr.selected",
      "payload": {
        "prNumber": "{{number}}",
        "title": "{{title}}",
        "jiraTicket": "{{jiraId}}"
      },
      "source": "my-widget"
    }
  }
}
```

### Event Subscriptions

React to events from other widgets:

```json
{
  "subscriptions": [
    {
      "pattern": "github.pr.*",
      "action": {
        "filter": {
          "field": "ticketId",
          "operator": "equals",
          "value": "{{event.jiraTicket}}"
        }
      }
    }
  ]
}
```

**Operators:**
- `equals`: Exact match
- `contains`: Substring match
- `startsWith`: Prefix match
- `in`: Match any in comma-separated list

---

## Complete Example: GitHub PRs

See `examples/github-prs.json` for a full working example.

---

## Security

**What's Safe:**
✅ JSONPath extraction (no code execution)
✅ Template strings (simple variable substitution)
✅ Enum mappings
✅ Filter operations

**What's NOT Supported (by design):**
❌ `eval()` or `Function()`
❌ Custom JavaScript
❌ File system access
❌ Network requests outside proxy

This ensures widgets are **safe by construction** - no security review needed.

---

## Performance

- **Data Fetching**: Automatic polling and caching
- **Rendering**: React memoization for list/table items
- **Event Mesh**: Efficient pub/sub with pattern matching
- **Bundle Size**: ~5KB for entire system (gzipped)

---

## Roadmap

### Phase 1: Core Layouts ✅
- List, Table, Cards, Metric

### Phase 2: Advanced Features (Month 4)
- Charts (line, bar, pie)
- Aggregations (count, sum, avg)
- Computed fields

### Phase 3: Visual Builder (Month 5+)
- Drag-and-drop JSON builder
- Live preview
- Template marketplace

---

## FAQ

**Q: Can I use custom React components?**
A: Not yet. Declarative JSON covers 80% of cases. For the other 20%, use hardcoded widgets.

**Q: How do I debug a widget?**
A: Check browser console for logs prefixed with `[UniversalWidget:name]`.

**Q: Can I transform data with JavaScript?**
A: No - use JSONPath and template strings. This is a security feature.

**Q: What if my API returns nested arrays?**
A: Use JSONPath like `$.data.items[*]` to extract arrays.

**Q: How do I add a new layout type?**
A: Edit `components/UniversalDataWidget.tsx` and add a new `render*` method.

---

## Contributing

1. Add new layout types in `UniversalDataWidget.tsx`
2. Extend schema in `schema.ts`
3. Add examples in `examples/`
4. Update this README

---

**Built with ❤️ for the Agentic Dashboard**
