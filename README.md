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
- **For development:** Dev mode works without any setup
- **For production:** Supabase account + OAuth apps (see [Deployment Guide](docs/DEPLOYMENT.md))

### Local Development Setup

```bash
# 1. Clone the repository (if not already done)
git clone https://github.com/your-username/agentic-dashboard.git
cd agentic-dashboard

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. (Optional) Configure environment variables
# For development, you can skip Supabase configuration - the app will use dev mode
# See .env.example for all available options

# 5. Start the development server
npm run dev
# Or use the dev script to avoid environment variable conflicts:
./dev.sh
```

Visit **http://localhost:3000** to see the dashboard.

**First-time users:** The app will show a welcome widget by default. Click "+ Add GitHub Widget" or "+ Add Jira Widget" to experience the Event Mesh magic.

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

5. **Deploy to production:**
   - See our complete [Deployment Guide](docs/DEPLOYMENT.md) for Vercel + Supabase setup
   - OAuth token refresh runs automatically via Vercel Cron (every 5 minutes)
   - Realtime dashboard updates powered by Supabase subscriptions

### Try the Magic Demo

1. **Add widgets:** Click "+ Add GitHub Widget" and "+ Add Jira Widget"
2. **Connect providers:** Go to Settings → Credentials and connect your accounts (OAuth or manual token)
3. **Experience the magic:** Click any GitHub PR with a Jira ticket ID (e.g., "SCRUM-5: Feature")
4. **Watch auto-filtering:** The Jira widget instantly filters to that ticket - zero configuration needed!

The magic happens through the **Event Mesh** - a Zustand-based pub/sub system that lets widgets communicate in real-time without manual wiring.

**New to OAuth?** See our [OAuth Setup Guide](docs/OAUTH_SETUP.md) for step-by-step instructions.

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

## 🌐 Production Deployment

**Production URL:** *Not yet deployed* (See [Deployment Guide](docs/DEPLOYMENT.md) for setup instructions)

### Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete step-by-step production deployment to Vercel + Supabase
- **[OAuth Setup Guide](docs/OAUTH_SETUP.md)** - Configure OAuth 2.0 for all 5 providers
- **[OAuth Token Refresh](docs/OAUTH_TOKEN_REFRESH.md)** - Automatic token refresh system documentation
- **[Known Issues](docs/KNOWN_ISSUES.md)** - Troubleshooting guide and common errors
- **[Adding New Providers](docs/ADDING_NEW_PROVIDERS.md)** - How to add new integrations
- **[Architecture Decisions](CLAUDE.md)** - Complete project context and rationale

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/agentic-dashboard)

**After deployment:**
1. Configure environment variables (see [.env.example](.env.example))
2. Set up Supabase project and run migrations
3. Configure OAuth apps for providers you want to use
4. Update `NEXT_PUBLIC_APP_URL` with your Vercel deployment URL

---

## 🎯 Roadmap

### Month 1: The "Magic" POC ✅ COMPLETE

### Month 2: The "Safety Net" ✅ COMPLETE

### Month 3: The "Factory" ✅ COMPLETE

### Month 4: Infrastructure & Production Readiness ✅ COMPLETE

**Completed:**
- ✅ Vercel Cron Job for OAuth token refresh
- ✅ Real Supabase Authentication (email/password)
- ✅ Real-time Supabase Subscriptions (live dashboard updates)
- ✅ Connection status indicator
- ✅ Middleware for route protection
- ✅ Logout functionality
- ✅ Production deployment documentation
- ✅ Comprehensive troubleshooting guide

**Next (Month 5+):**
- 🔄 AI Agent for conversational widget generation
- 🔄 Token expiry UI warnings
- 🔄 Visual widget configuration builder

## 🐛 Troubleshooting

For comprehensive troubleshooting, see **[Known Issues & Troubleshooting Guide](docs/KNOWN_ISSUES.md)**.

### Quick Fixes

**Event not being received by subscriber:**
1. Check Safe Mode is **disabled** (should show "🔗 Mesh Enabled")
2. Open Event Debugger (🐛 button) to inspect event flow
3. Verify event pattern matches (e.g., `github.*` matches `github.pr.selected`)

**OAuth callback failing:**
1. Verify `NEXT_PUBLIC_APP_URL` matches your deployment URL exactly
2. Check OAuth app callback URLs match: `{APP_URL}/api/auth/{provider}/callback`
3. Clear browser cookies and try again

**Widget not rendering:**
1. Check browser console for errors
2. Verify provider credentials are connected (Settings → Credentials)
3. Test API access: Visit `/test-proxy` page to debug connection

**Database connection issues:**
1. Verify Supabase project is active (not paused)
2. Check environment variables in Vercel dashboard
3. Confirm database migrations were run successfully

For more issues, see the [full troubleshooting guide](docs/KNOWN_ISSUES.md).

## 📄 License

MIT

---

**Built with ❤️ for the Agentic Dashboard vision**

*"The future of dashboards is conversational, interconnected, and intelligent."*
