1# Agentic Dashboard

> **An AI-powered dashboard where widgets are interconnected and context-aware.**

The core thesis: **A dashboard where widgets communicate through an Event Mesh provides a 10x "magical" experience that static, UI-first builders like Retool cannot replicate.**

## ✨ The Magic

**Click a GitHub PR → Jira widget auto-filters to that ticket. Instantly. Zero configuration.**

This is our differentiator. Widgets aren't isolated—they talk to each other through a real-time Event Mesh.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Navigate to the project (already cloned)
cd agentic-dashboard

# Install dependencies (already done)
npm install

# Start the development server
npm run dev
```

Visit **http://localhost:3001** (or check terminal for the actual port)

### Try the Magic Demo

1. Click "+ Add GitHub Widget"
2. Click "+ Add Jira Widget"
3. Click any GitHub PR with "PROJ-123" in the title
4. **Watch the Jira widget instantly auto-filter to that ticket!** ✨

The magic is happening through the **Event Mesh** - a Zustand-based pub/sub system that allows widgets to broadcast and subscribe to events in real-time.

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│           Dashboard (Main)              │
│  - react-grid-layout (drag & drop)      │
│  - Widget lifecycle management          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Event Mesh (The Magic)          │
│  - Zustand-based pub/sub                │
│  - Pattern matching (github.*)          │
│  - Event log & replay                   │
│  - Safe Mode toggle                     │
└─────────────────────────────────────────┘
                  ↓
┌──────────────────┐  ┌──────────────────┐
│  GitHub Widget   │  │   Jira Widget    │
│  - Publishes:    │  │  - Subscribes:   │
│    pr.selected   │→ │    github.pr.*   │
└──────────────────┘  └──────────────────┘
```

### Tech Stack

- **Framework:** Next.js 15 (App Router + Turbopack)
- **UI:** shadcn/ui + Radix UI + Tailwind CSS
- **State & Event Mesh:** Zustand
- **Layout:** react-grid-layout (drag-and-drop widgets)
- **Database:** Supabase (PostgreSQL + Vault for encrypted secrets)
- **AI:** Claude API (for future conversational interface)
- **TypeScript:** Full type safety

## 📂 Project Structure

```
agentic-dashboard/
├── app/
│   ├── page.tsx                    # Main entry point
│   └── api/                        # API routes (future: backend proxy)
├── components/
│   ├── Dashboard.tsx               # Main dashboard layout
│   ├── widgets/
│   │   ├── GitHubWidget.tsx        # GitHub PR widget
│   │   └── JiraWidget.tsx          # Jira issues widget
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── event-mesh/
│   │   └── mesh.ts                 # Event Mesh implementation
│   └── supabase/
│       ├── client.ts               # Supabase client setup
│       └── types.ts                # Database TypeScript types
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Database schema
│   └── README.md                   # Supabase setup guide
└── .env.example                    # Environment variables template
```

## 🔌 Event Mesh API

### Publishing Events

```typescript
import { useEventMesh } from '@/lib/event-mesh/mesh';

function MyWidget() {
  const publish = useEventMesh((state) => state.publish);

  const handleAction = () => {
    publish('widget.action.completed', {
      data: 'some data',
      metadata: { ... }
    }, 'my-widget');
  };
}
```

### Subscribing to Events

```typescript
import { useEventSubscription } from '@/lib/event-mesh/mesh';

function MyWidget() {
  useEventSubscription('github.*', (data) => {
    console.log('GitHub event:', data);
    // React to the event
  }, 'my-widget');
}
```

### Event Patterns

- `*` - Match all events
- `github.*` - Match all GitHub events (pr.selected, commit.pushed, etc.)
- `github.pr.selected` - Match specific event only

### Safe Mode

Users can toggle "Safe Mode" to disable the Event Mesh if a buggy widget is causing issues.

## 🧩 Adding New Widgets

### 1. Create Widget Component

```tsx
// components/widgets/MyWidget.tsx
'use client';

import { useEventMesh, useEventSubscription } from '@/lib/event-mesh/mesh';

export function MyWidget({ config }: MyWidgetProps) {
  const publish = useEventMesh((state) => state.publish);

  // Subscribe to events from other widgets
  useEventSubscription('some.event.*', (data) => {
    // React to events
  }, 'my-widget');

  return <div>{/* Your widget UI */}</div>;
}
```

### 2. Register in Dashboard

```tsx
// components/Dashboard.tsx
import { MyWidget } from './widgets/MyWidget';

const renderWidget = (widget: WidgetInstance) => {
  switch (widget.type) {
    case 'my-widget':
      return <MyWidget {...widget.config} />;
    // ...
  }
};
```

## 🎯 Roadmap

### Month 1: The "Magic" POC ✅ COMPLETE

### Month 2: The "Safety Net" ✅ COMPLETE

### Month 3: The "Factory" ✅ COMPLETE

### Month 4: The "AI Agent" 🚧 CURRENT

## 🐛 Troubleshooting

### "Event not being received by subscriber"

1. Check Safe Mode is **disabled** (should show "🔗 Mesh Enabled")
2. Open browser console and look for `[Event Mesh]` logs
3. Verify event pattern matches (e.g., `github.*` matches `github.pr.selected`)

### "Widget not rendering"

1. Check `components/Dashboard.tsx` `renderWidget` function
2. Ensure widget type matches in the switch statement
3. Check browser console for React errors

## 📄 License

MIT

---

**Built with ❤️ for the Agentic Dashboard vision**

*"The future of dashboards is conversational, interconnected, and intelligent."*
