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
- Supabase account (for production) or dev mode for local development

### Installation

```bash
# Navigate to the project (already cloned)
cd agentic-dashboard

# Install dependencies (already done)
npm install

# Copy environment variables template
cp .env.example .env.local

# Configure environment variables (see below)
# For development, you can skip Supabase configuration - the app will use dev mode

# Start the development server
npm run dev
```

Visit **http://localhost:3000** (or check terminal for the actual port)

### Environment Setup

**Development Mode (No Supabase Required):**
- The app works in dev mode without Supabase
- Uses in-memory storage and bypasses authentication
- Perfect for testing the Event Mesh and widget interconnections

**Production Setup (Supabase Required):**

1. **Create a Supabase Project:**
   - Visit https://supabase.com/dashboard
   - Create a new project
   - Go to Settings → API to find your credentials

2. **Configure Environment Variables in `.env.local`:**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # Application URL (for OAuth callbacks)
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Cron Secret (for token refresh)
   CRON_SECRET=your-random-secret-here
   ```

3. **Run Database Migrations:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push
   ```

4. **Enable Realtime in Supabase:**
   - Go to Database → Replication
   - Enable replication for `widget_instances` table
   - This enables real-time updates across browser tabs

5. **Deploy to Vercel:**
   - Connect your GitHub repo to Vercel
   - Add environment variables in Vercel dashboard
   - The cron job will automatically run every 5 minutes to refresh OAuth tokens

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
- **Database:** Supabase (PostgreSQL + RLS + Vault for encrypted secrets)
- **Authentication:** Supabase Auth (email/password)
- **Real-time:** Supabase Realtime (live widget updates across sessions)
- **Cron Jobs:** Vercel Cron (OAuth token refresh every 5 minutes)
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

### Month 4: Infrastructure & Production Readiness 🚧 IN PROGRESS

**Completed:**
- ✅ Vercel Cron Job for OAuth token refresh
- ✅ Real Supabase Authentication (email/password)
- ✅ Real-time Supabase Subscriptions (live dashboard updates)
- ✅ Connection status indicator
- ✅ Middleware for route protection
- ✅ Logout functionality

**Next:**
- 🔄 AI Agent for conversational widget generation
- 🔄 Token expiry UI warnings
- 🔄 Production deployment guide

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
