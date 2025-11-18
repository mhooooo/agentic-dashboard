'use client';

/**
 * Jira Widget
 *
 * Displays Jira issues from a project.
 * Listens to the Event Mesh for GitHub PR selections and
 * automatically filters to the related Jira ticket.
 *
 * This is the second half of the "magic" - the auto-filter demo.
 */

import { useState, useEffect } from 'react';
import { useEventMesh, useEventSubscription } from '@/lib/event-mesh/mesh';

export interface JiraWidgetProps {
  project_key?: string;
  jira_url?: string;
}

/**
 * Jira Issue type
 */
interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  created_at: string;
  updated_at: string;
}

export function JiraWidget({ project_key = 'SCRUM', jira_url }: JiraWidgetProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [lastEventSource, setLastEventSource] = useState<string | null>(null);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch real issues from Jira via backend proxy
   */
  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/proxy/jira', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: '/search/jql',
            method: 'POST',
            body: {
              jql: `project = "${project_key}" ORDER BY updated DESC`,
              maxResults: 50,
            },
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch Jira issues');
        }

        // Transform Jira API response to our format
        const jiraIssues: JiraIssue[] = result.data.issues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name || 'Medium',
          assignee: issue.fields.assignee?.displayName || 'Unassigned',
          created_at: issue.fields.created,
          updated_at: issue.fields.updated,
        }));

        setIssues(jiraIssues);
      } catch (err) {
        console.error('[JiraWidget] Error fetching issues:', err);
        setError(err instanceof Error ? err.message : 'Failed to load Jira issues');
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchIssues, 60000);
    return () => clearInterval(interval);
  }, [project_key]);

  /**
   * Subscribe to GitHub PR selection events
   * This is where the MAGIC happens!
   */
  useEventSubscription('github.pr.*', (data) => {
    console.log('[Jira Widget] Received event from GitHub:', data);

    // Extract Jira ticket from the event
    const jiraTicket = data.jiraTicket;

    if (jiraTicket) {
      // Auto-filter to the Jira ticket mentioned in the PR
      setFilter(jiraTicket);
      setSelectedIssue(jiraTicket);
      setLastEventSource('GitHub PR #' + data.number);

      console.log(`[Jira Widget] ✨ MAGIC: Auto-filtered to ${jiraTicket} from PR #${data.number}`);
    } else {
      // No Jira ticket found, clear filter
      setFilter(null);
      setSelectedIssue(null);
      setLastEventSource(null);
    }
  }, 'jira-widget');

  /**
   * Clear the filter
   */
  const clearFilter = () => {
    setFilter(null);
    setSelectedIssue(null);
    setLastEventSource(null);
  };

  /**
   * Filter issues based on current filter
   */
  const filteredIssues = filter
    ? issues.filter((issue) => issue.key === filter)
    : issues;

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'to do':
        return 'bg-gray-100 text-gray-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'in review':
        return 'bg-yellow-100 text-yellow-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get priority icon
   */
  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Jira Issues</h3>
        <span className="text-sm text-muted-foreground">
          {project_key || 'PROJ'}
        </span>
      </div>

      {/* Active Filter Indicator - The "Magic" Indicator */}
      {filter && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div className="text-sm">
                <div className="font-medium text-blue-900">Auto-filtered to {filter}</div>
                <div className="text-blue-700 text-xs">
                  Triggered by {lastEventSource}
                </div>
              </div>
            </div>
            <button
              onClick={clearFilter}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Issue List */}
      <div className="flex-1 overflow-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading Jira issues...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm">
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-muted-foreground text-xs">
              Make sure you've connected your Jira credentials in Settings
            </p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
            {filter ? (
              <>
                <span>No issue found for {filter}</span>
                <button
                  onClick={clearFilter}
                  className="mt-2 text-primary hover:underline"
                >
                  Show all issues
                </button>
              </>
            ) : (
              <span>No issues found</span>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.key}
              className={`p-3 rounded-lg border transition-all ${
                selectedIssue === issue.key
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              {/* Issue Key & Summary */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-medium text-blue-600">
                      {issue.key}
                    </span>
                    <span className="text-xs">{getPriorityIcon(issue.priority)}</span>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">
                    {issue.summary}
                  </p>
                </div>
              </div>

              {/* Issue Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  Assignee: {issue.assignee}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {!filter && (
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          Waiting for events from other widgets...
        </div>
      )}
    </div>
  );
}
