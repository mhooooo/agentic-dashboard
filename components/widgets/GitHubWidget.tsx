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

import { useState, useEffect } from 'react';
import { useEventMesh } from '@/lib/event-mesh/mesh';

export interface GitHubWidgetProps {
  owner?: string;
  repo?: string;
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

export function GitHubWidget({ owner, repo, repositories, filters }: GitHubWidgetProps) {
  const [selectedPR, setSelectedPR] = useState<number | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const publish = useEventMesh((state) => state.publish);

  /**
   * Fetch real PRs from GitHub via backend proxy
   * First, fetch user's repositories to find repos with open PRs
   */
  useEffect(() => {
    const fetchPRs = async () => {
      setLoading(true);
      setError(null);

      try {
        // If owner and repo are specified, fetch from that repo
        if (owner && repo) {
          const response = await fetch('/api/proxy/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: `/repos/${owner}/${repo}/pulls`,
              method: 'GET',
              params: {
                state: 'all',
                sort: 'updated',
                direction: 'desc',
                per_page: 20,
              },
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch pull requests');
          }

          const prs: PullRequest[] = result.data.map((pr: any) => ({
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            state: pr.merged_at ? 'merged' : pr.state,
            created_at: pr.created_at,
            comments_count: pr.comments,
            approvals_count: pr.requested_reviewers?.length || 0,
            repository: `${owner}/${repo}`,
          }));

          setPullRequests(prs);
        } else {
          // Otherwise, fetch user's repositories and aggregate their PRs
          const reposResponse = await fetch('/api/proxy/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: '/user/repos',
              method: 'GET',
              params: {
                sort: 'updated',
                per_page: 10,
                affiliation: 'owner,collaborator',
              },
            }),
          });

          const reposResult = await reposResponse.json();

          if (!reposResult.success) {
            throw new Error(reposResult.error?.message || 'Failed to fetch repositories');
          }

          // Fetch PRs from first 3 repos that have open PRs
          const allPRs: PullRequest[] = [];
          for (const repoData of reposResult.data.slice(0, 3)) {
            try {
              const prResponse = await fetch('/api/proxy/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  endpoint: `/repos/${repoData.full_name}/pulls`,
                  method: 'GET',
                  params: {
                    state: 'open',
                    per_page: 10,
                  },
                }),
              });

              const prResult = await prResponse.json();
              if (prResult.success && prResult.data.length > 0) {
                const prs: PullRequest[] = prResult.data.map((pr: any) => ({
                  number: pr.number,
                  title: pr.title,
                  author: pr.user.login,
                  state: pr.merged_at ? 'merged' : pr.state,
                  created_at: pr.created_at,
                  comments_count: pr.comments,
                  approvals_count: pr.requested_reviewers?.length || 0,
                  repository: repoData.full_name,
                }));
                allPRs.push(...prs);
              }
            } catch (err) {
              console.warn(`Failed to fetch PRs for ${repoData.full_name}:`, err);
            }
          }

          setPullRequests(allPRs);
        }
      } catch (err) {
        console.error('[GitHubWidget] Error fetching PRs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pull requests');
      } finally {
        setLoading(false);
      }
    };

    fetchPRs();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchPRs, 60000);
    return () => clearInterval(interval);
  }, [owner, repo]);

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
        <h3 className="text-lg font-semibold">
          {owner && repo ? `${owner}/${repo}` : 'Your Pull Requests'}
        </h3>
        {!loading && !error && (
          <span className="text-sm text-muted-foreground">
            {pullRequests.filter(pr => pr.state === 'open').length} open
          </span>
        )}
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading pull requests...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm">
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-muted-foreground text-xs">
              Make sure you've connected your GitHub credentials in Settings
            </p>
          </div>
        ) : pullRequests.length === 0 ? (
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
