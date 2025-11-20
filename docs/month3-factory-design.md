# Month 3: UniversalDataWidget Factory - Design Document

**Created:** November 14, 2025
**Status:** Design Phase
**Goal:** Enable 2-day widget creation through declarative JSON (vs weeks with hardcoded React)

---

## Executive Summary

The UniversalDataWidget factory is a **declarative JSON system** that generates widgets from configuration objects. It's the bridge between "hardcoded magic" (Month 1-2) and "scalable magic" (Month 3+).

**What it solves:**
- Creating GitHub widget took 3 days of React code
- Creating 10 more widgets (Slack, Linear, PagerDuty...) would take 30 days
- Users want custom widgets but we can't code each one manually

**What it enables:**
- New widgets in <2 days (via JSON config)
- 80% of widget use cases with 0% security risk
- Agent can help users create widgets conversationally
- Foundation for future conversational widget creation

**What it defers:**
- Custom visualizations (3D charts, WebGL) → Month 7+
- AI-generated React code → Security risk too high
- Complex widget logic → Use hardcoded React for edge cases

---

## Core Design Philosophy

### 1. Declarative Over Imperative
```typescript
// ❌ NOT THIS (Month 1-2: hardcoded React)
export function GitHubWidget() {
  const [selectedPR, setSelectedPR] = useState(null);
  const publish = useEventMesh(state => state.publish);
  // ... 200+ lines of React ...
}

// ✅ THIS (Month 3+: declarative JSON)
const githubWidgetConfig = {
  type: "universal-data",
  dataSource: {
    type: "api",
    endpoint: "/api/github/prs",
    refreshInterval: 60000
  },
  views: {
    default: "list",
    available: ["list", "table", "card"]
  },
  events: {
    onItemClick: {
      publish: "github.pr.selected",
      payload: ["number", "title", "jiraTicket"]
    }
  }
}
```

### 2. Security First
- All API calls through Next.js backend proxy (never expose keys to client)
- JSON config is parsed and validated, not executed
- No `eval()`, no `Function()`, no sandboxed code execution (yet)
- Data transformations use **whitelisted functions only**

### 3. Progressive Disclosure
- Start with simple list/table views
- Add complex views (charts, graphs) incrementally
- Falls back gracefully if config is invalid

---

## Widget Configuration Schema

### Top-Level Structure
```typescript
interface UniversalWidgetConfig {
  // Widget identity
  type: "universal-data";
  version: number;
  name: string;
  description: string;

  // Data source (how to fetch data)
  dataSource: DataSourceConfig;

  // Data transformation (optional)
  transform?: TransformConfig;

  // Display configuration
  display: DisplayConfig;

  // Event handling (Event Mesh integration)
  events?: EventConfig;

  // Subscriptions (listen to Event Mesh)
  subscriptions?: SubscriptionConfig[];
}
```

---

## 1. Data Source Configuration

**Goal:** Define where data comes from and how to fetch it.

```typescript
interface DataSourceConfig {
  type: "api" | "static" | "event-driven";

  // For type: "api"
  endpoint?: string;           // "/api/github/prs"
  method?: "GET" | "POST";     // Default: GET
  headers?: Record<string, string>;
  params?: Record<string, any>; // Query params or POST body
  refreshInterval?: number;     // Auto-refresh every N milliseconds

  // For type: "static"
  data?: any[];                // Hardcoded data (for demos/testing)

  // For type: "event-driven"
  listenTo?: string;           // Event pattern to listen for data
}
```

### Example: GitHub PRs
```json
{
  "dataSource": {
    "type": "api",
    "endpoint": "/api/github/prs",
    "method": "GET",
    "params": {
      "repo": "acme/frontend",
      "state": "open"
    },
    "refreshInterval": 60000
  }
}
```

### Example: Static Demo Data
```json
{
  "dataSource": {
    "type": "static",
    "data": [
      { "id": 1, "title": "Test PR", "state": "open" },
      { "id": 2, "title": "Another PR", "state": "merged" }
    ]
  }
}
```

---

## 2. Data Transformation (Optional)

**Goal:** Transform API response into widget-friendly format.

```typescript
interface TransformConfig {
  // Select a nested path from response
  path?: string;               // "data.pull_requests"

  // Map each item (whitelisted transformations only)
  mapItem?: {
    [newKey: string]: string;  // "displayName": "author.login"
  };

  // Filter items (simple conditions only)
  filter?: {
    field: string;
    operator: "==" | "!=" | ">" | "<" | "contains";
    value: any;
  }[];

  // Sort
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
}
```

### Example: Transform GitHub API Response
```json
{
  "transform": {
    "path": "data.items",
    "mapItem": {
      "id": "number",
      "title": "title",
      "author": "user.login",
      "state": "state",
      "jiraTicket": "title|extractJiraKey"  // Custom transformer
    },
    "sort": {
      "field": "created_at",
      "direction": "desc"
    }
  }
}
```

**Security Note:** The `|extractJiraKey` syntax uses **whitelisted transformer functions** only. No arbitrary code execution.

---

## 3. Display Configuration

**Goal:** Define how data is rendered (list, table, card, etc.)

```typescript
interface DisplayConfig {
  // View type
  view: "list" | "table" | "card" | "stat" | "chart";

  // Layout options
  layout?: {
    columns?: number;          // For grid layouts
    height?: "auto" | "fixed"; // Widget height behavior
    emptyState?: string;       // Message when no data
  };

  // Field rendering (how to display each field)
  fields: FieldConfig[];

  // Item actions (click, hover, etc.)
  actions?: ActionConfig[];
}
```

### Field Configuration
```typescript
interface FieldConfig {
  key: string;                 // Data field key
  label?: string;              // Display label
  type?: "text" | "number" | "date" | "badge" | "icon" | "link";
  format?: string;             // e.g., "relative-time", "short-date"

  // Conditional styling
  style?: {
    condition?: string;        // Simple expression: "state === 'open'"
    className?: string;        // Tailwind classes
  }[];
}
```

### Example: List View (GitHub PRs)
```json
{
  "display": {
    "view": "list",
    "layout": {
      "height": "auto",
      "emptyState": "No pull requests found"
    },
    "fields": [
      {
        "key": "title",
        "label": "Title",
        "type": "text"
      },
      {
        "key": "state",
        "label": "Status",
        "type": "badge",
        "style": [
          {
            "condition": "state === 'open'",
            "className": "bg-green-100 text-green-800"
          },
          {
            "condition": "state === 'merged'",
            "className": "bg-purple-100 text-purple-800"
          }
        ]
      },
      {
        "key": "created_at",
        "label": "Created",
        "type": "date",
        "format": "relative-time"
      }
    ],
    "actions": [
      {
        "trigger": "click",
        "event": "item-selected"
      }
    ]
  }
}
```

### Example: Table View (Jira Issues)
```json
{
  "display": {
    "view": "table",
    "fields": [
      { "key": "key", "label": "Issue", "type": "link" },
      { "key": "summary", "label": "Summary" },
      { "key": "status", "label": "Status", "type": "badge" },
      { "key": "assignee", "label": "Assignee" }
    ]
  }
}
```

### Example: Stat View (Single Metric)
```json
{
  "display": {
    "view": "stat",
    "fields": [
      {
        "key": "open_count",
        "label": "Open PRs",
        "type": "number",
        "format": "large-number"
      }
    ]
  }
}
```

---

## 4. Event Configuration

**Goal:** Integrate with Event Mesh (publish events on user actions)

```typescript
interface EventConfig {
  // Publish event on item click
  onItemClick?: {
    eventName: string;         // "github.pr.selected"
    payload: string[];         // Fields to include in payload
    source?: string;           // Event source name
  };

  // Publish event on custom action
  onCustomAction?: {
    actionId: string;
    eventName: string;
    payload: Record<string, any>;
  }[];
}
```

### Example: GitHub PR Selection
```json
{
  "events": {
    "onItemClick": {
      "eventName": "github.pr.selected",
      "payload": ["number", "title", "author", "jiraTicket"],
      "source": "github-widget"
    }
  }
}
```

---

## 5. Subscription Configuration

**Goal:** Listen to Event Mesh and react to events from other widgets

```typescript
interface SubscriptionConfig {
  // Event pattern to listen for
  pattern: string;             // "github.pr.*"

  // Action to take when event received
  action: "filter" | "highlight" | "refresh" | "custom";

  // Filter configuration (for action: "filter")
  filterBy?: {
    eventField: string;        // Field in event payload
    widgetField: string;       // Field in widget data
  };

  // Custom transformation (whitelisted functions)
  transform?: string;
}
```

### Example: Jira Auto-Filter
```json
{
  "subscriptions": [
    {
      "pattern": "github.pr.*",
      "action": "filter",
      "filterBy": {
        "eventField": "jiraTicket",
        "widgetField": "key"
      }
    }
  ]
}
```

---

## Complete Example: GitHub Widget as JSON

```json
{
  "type": "universal-data",
  "version": 1,
  "name": "GitHub Pull Requests",
  "description": "Display and interact with pull requests",

  "dataSource": {
    "type": "api",
    "endpoint": "/api/github/prs",
    "method": "GET",
    "params": {
      "repo": "acme/frontend",
      "state": "all"
    },
    "refreshInterval": 60000
  },

  "transform": {
    "path": "data",
    "mapItem": {
      "id": "number",
      "title": "title",
      "author": "user.login",
      "state": "state",
      "created_at": "created_at",
      "jiraTicket": "title|extractJiraKey"
    },
    "sort": {
      "field": "created_at",
      "direction": "desc"
    }
  },

  "display": {
    "view": "list",
    "layout": {
      "height": "auto",
      "emptyState": "No pull requests found"
    },
    "fields": [
      {
        "key": "title",
        "label": "Title",
        "type": "text"
      },
      {
        "key": "state",
        "label": "Status",
        "type": "badge",
        "style": [
          {
            "condition": "state === 'open'",
            "className": "bg-green-100 text-green-800"
          },
          {
            "condition": "state === 'merged'",
            "className": "bg-purple-100 text-purple-800"
          }
        ]
      },
      {
        "key": "author",
        "label": "Author",
        "type": "text"
      },
      {
        "key": "created_at",
        "label": "Created",
        "type": "date",
        "format": "relative-time"
      }
    ],
    "actions": [
      {
        "trigger": "click",
        "event": "item-selected"
      }
    ]
  },

  "events": {
    "onItemClick": {
      "eventName": "github.pr.selected",
      "payload": ["id", "title", "author", "state", "jiraTicket"],
      "source": "github-widget"
    }
  }
}
```

---

## Implementation Architecture

### Component Structure
```
components/widgets/
├── UniversalDataWidget/
│   ├── index.tsx                  # Main component
│   ├── views/
│   │   ├── ListView.tsx           # List view renderer
│   │   ├── TableView.tsx          # Table view renderer
│   │   ├── CardView.tsx           # Card view renderer
│   │   ├── StatView.tsx           # Stat view renderer
│   │   └── ChartView.tsx          # Chart view (future)
│   ├── transformers/
│   │   ├── index.ts               # Whitelisted transformation functions
│   │   ├── jira.ts                # Jira-specific transformers
│   │   └── github.ts              # GitHub-specific transformers
│   └── config-validator.ts        # Validate JSON configs

lib/widgets/
├── factory.ts                     # Widget factory (JSON → React)
├── registry.ts                    # Updated registry with universal widgets
└── config-schema.ts               # TypeScript types for config
```

### Data Flow
```
1. JSON Config
   ↓
2. Config Validator (schema validation)
   ↓
3. Data Source Fetcher (API call via backend proxy)
   ↓
4. Data Transformer (apply mapItem, filter, sort)
   ↓
5. View Renderer (ListView, TableView, etc.)
   ↓
6. Event Publisher (onClick → Event Mesh)
```

### Security Boundaries
```
┌─────────────────────────────────────────┐
│  Client (Browser)                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ UniversalDataWidget             │   │
│  │ - Renders JSON config           │   │
│  │ - NO access to secrets          │   │
│  │ - NO arbitrary code execution   │   │
│  └─────────────────────────────────┘   │
│             ↓ API call                  │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Server (Next.js API Routes)            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Backend Proxy                   │   │
│  │ - Validates request             │   │
│  │ - Adds secrets from Vault       │   │
│  │ - Calls external API            │   │
│  │ - Returns sanitized response    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  External API (GitHub, Jira, etc.)      │
└─────────────────────────────────────────┘
```

---

## Migration Path: Hardcoded → Universal

### Phase 1: Build UniversalDataWidget (Week 1)
1. Create `UniversalDataWidget` component
2. Implement ListView and TableView
3. Build data source fetcher
4. Build config validator
5. Add Event Mesh integration

### Phase 2: Rebuild GitHub Widget with JSON (Week 1)
1. Convert existing GitHubWidget to JSON config
2. Test side-by-side (hardcoded vs universal)
3. Validate "magic" still works
4. Performance comparison

### Phase 3: Rebuild Jira Widget with JSON (Week 2)
1. Convert JiraWidget to JSON config
2. Test auto-filter behavior
3. Ensure backward compatibility with checkpoints

### Phase 4: Create New Widgets (Week 2+)
1. Add Slack widget (new!)
2. Add Linear widget (new!)
3. Measure <2 day development time
4. Document widget creation process

---

## Success Metrics (Month 3)

**Development Speed:**
- New widget in <2 days (vs weeks)
- 50%+ of new widgets use factory

**Security:**
- Zero incidents from widget configs
- All API calls through backend proxy
- No client-side secret exposure

**Adoption:**
- GitHub & Jira successfully migrated to JSON
- 2+ new widgets created with factory
- Users understand how to configure widgets

---

## Known Limitations & Future Work

### What JSON Factory CANNOT Do:
1. **Custom visualizations** (3D charts, WebGL, complex D3.js)
   - Solution: Use hardcoded React for edge cases
2. **Complex business logic** (multi-step workflows, state machines)
   - Solution: Use hardcoded React or defer to Month 7+
3. **Custom interaction patterns** (drag-and-drop, canvas drawing)
   - Solution: Use hardcoded React
4. **Real-time streaming data** (WebSockets, Server-Sent Events)
   - Solution: Add in Month 4 if needed

### Future Enhancements (Month 4+):
- **Chart views** (bar, line, pie via Recharts)
- **Advanced filtering** (multi-condition, date ranges)
- **Data aggregation** (group by, sum, average)
- **Custom actions** (buttons, forms, modals)
- **Conditional rendering** (show/hide fields based on data)
- **Conversational widget creation** (Claude helps write JSON)

---

## Decision Log

**2025-11-14:** Chose declarative JSON over code generation
- **Why:** 80% of use cases, 0% security risk
- **Trade-off:** Cannot support custom visualizations yet
- **Revisit:** When users consistently request features JSON cannot express

**2025-11-14:** Chose whitelisted transformers over arbitrary expressions
- **Why:** No eval(), no Function(), no AST parsing needed
- **Trade-off:** Less flexibility, but safer
- **Revisit:** If transformer library becomes too large (>50 functions)

**2025-11-14:** Chose server-side API calls over client-side
- **Why:** Never expose API keys to client
- **Trade-off:** Slightly higher latency, but worth it for security
- **Revisit:** Never (this is a hard constraint)

---

## Questions to Validate with Users

1. **Does JSON config feel approachable?** (or too technical?)
2. **What widgets do you want that this CANNOT build?** (identify gaps)
3. **Is 2 days fast enough?** (or do you need hours?)
4. **Would you edit JSON directly or prefer a form/UI?** (interface preference)

---

## Next Steps

1. **Review this design** with team/stakeholders
2. **Validate assumptions** with users (show example configs)
3. **Begin implementation** (Phase 1: Build UniversalDataWidget)
4. **Update CLAUDE.md** with finalized decisions
5. **Create implementation plan** (detailed task breakdown)

---

**Last Updated:** November 14, 2025
**Next Review:** After Phase 1 completion (Week 1)
