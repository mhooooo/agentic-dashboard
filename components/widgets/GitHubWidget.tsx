'use client';

/**
 * GitHub Widget
 *
 * Displays pull requests from GitHub repositories.
 * When a PR is clicked, it publishes an event to the Event Mesh,
 * allowing other widgets (like Jira) to react.
 *
 * This is one half of the "magic" - the interconnection demo.
 */

import { useState } from 'react';
import { useEventMesh } from '@/lib/event-mesh/mesh';

export interface GitHubWidgetProps {
  repositories?: string[];
  filters?: string[];
}

/**
 * Pull Request type
 */
interface PullRequest {
  number: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  comments_count: number;
  approvals_count: number;
  repository: string;
}

/**
 * Mock data - will be replaced with real API calls via backend proxy
 */
const MOCK_PRS: PullRequest[] = [
  {
    number: 234,
    title: 'PROJ-123: Fix login bug',
    author: 'alice',
    state: 'open',
    created_at: '2025-11-10T14:30:00Z',
    comments_count: 3,
    approvals_count: 1,
    repository: 'acme/frontend',
  },
  {
    number: 231,
    title: 'PROJ-456: Add dark mode support',
    author: 'bob',
    state: 'open',
    created_at: '2025-11-09T10:15:00Z',
    comments_count: 0,
    approvals_count: 0,
    repository: 'acme/frontend',
  },
  {
    number: 228,
    title: 'Update dependencies',
    author: 'charlie',
    state: 'merged',
    created_at: '2025-11-08T16:45:00Z',
    comments_count: 2,
    approvals_count: 2,
    repository: 'acme/frontend',
  },
  {
    number: 142,
    title: 'PROJ-789: Optimize database queries',
    author: 'alice',
    state: 'open',
    created_at: '2025-11-07T09:20:00Z',
    comments_count: 5,
    approvals_count: 1,
    repository: 'acme/backend',
  },
];

export function GitHubWidget({ repositories, filters }: GitHubWidgetProps) {
  const [selectedPR, setSelectedPR] = useState<number | null>(null);
  const publish = useEventMesh((state) => state.publish);

  // TODO: Fetch real PRs from backend proxy
  const pullRequests = MOCK_PRS;

  /**
   * Handle PR click - This is where the magic happens!
   * Publishes an event to the Event Mesh that other widgets can react to.
   */
  const handlePRClick = (pr: PullRequest) => {
    setSelectedPR(pr.number);

    // Extract Jira ticket ID from title (e.g., "PROJ-123")
    const jiraTicketMatch = pr.title.match(/([A-Z]+-\d+)/);
    const jiraTicket = jiraTicketMatch ? jiraTicketMatch[1] : null;

    // Publish event to Event Mesh
    publish('github.pr.selected', {
      number: pr.number,
      title: pr.title,
      repository: pr.repository,
      author: pr.author,
      state: pr.state,
      jiraTicket, // This is the key for Jira integration!
      metadata: {
        comments: pr.comments_count,
        approvals: pr.approvals_count,
        created_at: pr.created_at,
      },
    }, 'github-widget');

    console.log(`[GitHub Widget] Published event: github.pr.selected`, {
      pr: pr.number,
      jiraTicket,
    });
  };

  /**
   * Format relative time (e.g., "2 days ago")
   */
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Pull Requests</h3>
        <span className="text-sm text-muted-foreground">
          {pullRequests.filter(pr => pr.state === 'open').length} open
        </span>
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-auto space-y-2">
        {pullRequests.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No pull requests found
          </div>
        ) : (
          pullRequests.map((pr) => (
            <button
              key={pr.number}
              onClick={() => handlePRClick(pr)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedPR === pr.number
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              {/* PR Title */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-sm line-clamp-1">
                  {pr.title}
                </span>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded ${
                    pr.state === 'open'
                      ? 'bg-green-100 text-green-800'
                      : pr.state === 'merged'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {pr.state}
                </span>
              </div>

              {/* PR Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>#{pr.number}</span>
                <span>•</span>
                <span>{pr.author}</span>
                <span>•</span>
                <span>{formatRelativeTime(pr.created_at)}</span>
              </div>

              {/* PR Stats */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                {pr.comments_count > 0 && (
                  <span className="flex items-center gap-1">
                    💬 {pr.comments_count}
                  </span>
                )}
                {pr.approvals_count > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    ✓ {pr.approvals_count} approval{pr.approvals_count > 1 ? 's' : ''}
                  </span>
                )}
                {pr.title.match(/([A-Z]+-\d+)/) && (
                  <span className="flex items-center gap-1 text-blue-600">
                    🎫 {pr.title.match(/([A-Z]+-\d+)/)![1]}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
        Click a PR to see the magic ✨
      </div>
    </div>
  );
}
