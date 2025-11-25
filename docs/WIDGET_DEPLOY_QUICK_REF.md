# Widget Deployment API - Quick Reference

**Week 18 Deliverable** | December 7, 2025

---

## Endpoint

```
POST /api/ai/widget-creation/deploy
```

---

## Request

```json
{
  "widgetDefinition": {
    "metadata": { "name": "Widget Name", "version": 1, ... },
    "dataSource": { "provider": "github", "endpoint": "...", ... },
    "fields": [ { "name": "...", "path": "...", "type": "..." } ],
    "layout": { "type": "list", ... }
  },
  "userIntent": {
    "problemSolved": "...",
    "painPoint": "...",
    "goal": "...",
    "expectedOutcome": "..."
  }
}
```

---

## Response

### Success (200)
```json
{
  "widgetId": "github_pr-list_abc123_xyz",
  "success": true,
  "message": "Widget deployed successfully"
}
```

### Errors
- **400** - Validation failed
- **401** - Not authenticated
- **409** - Widget ID collision (retry)
- **500** - Server error

---

## Validation Rules

### Required Fields
- `metadata.name`
- `dataSource.provider` (github|jira|linear|slack|calendar)
- `dataSource.endpoint`
- `layout.type` (list|table|cards|metric|chart)
- `fields` (array, min 1)

### Field Structure
```typescript
{
  name: string,
  path: string,  // JSONPath (e.g., "$.user.login")
  type: string   // string|number|boolean|date|url|enum
}
```

---

## Usage Example

```typescript
const response = await fetch('/api/ai/widget-creation/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ widgetDefinition, userIntent })
});

const { widgetId } = await response.json();
```

---

## Event Mesh Integration

Publishes `widget.created` event with:
- Widget metadata
- User intent (problem solved, pain point, goal)
- Deployment context
- Enables self-documentation and knowledge graph

---

## Dev Mode

Works without Supabase:
- Validates input
- Logs would-be database insert
- Returns success response
- Publishes event to in-memory store

---

## Files

### Implementation
- `/app/api/ai/widget-creation/deploy/route.ts` - API route
- `/lib/universal-widget/schema.ts` - Widget schema + validation
- `/lib/event-mesh/persistence.ts` - Event publishing

### Documentation
- `/docs/API_WIDGET_DEPLOY.md` - Complete API docs
- `/docs/EVENT_MESH_V2.md` - Event schema

### Testing
- `/lib/ai/test-deploy-endpoint.ts` - Test suite (5 tests)

---

## Testing

```bash
# Run test suite
npx tsx lib/ai/test-deploy-endpoint.ts

# Manual test
curl -X POST http://localhost:3000/api/ai/widget-creation/deploy \
  -H "Content-Type: application/json" \
  -d @test-fixtures/sample-widget.json
```

---

## Status

✅ **Implementation Complete**
✅ **Build Passing (0 errors)**
✅ **Documentation Complete**
✅ **Test Suite Created**

**Next:** Week 19 - UI Integration
