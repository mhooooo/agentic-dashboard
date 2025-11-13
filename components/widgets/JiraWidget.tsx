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

/**
 * Mock data - will be replaced with real API calls via backend proxy
 */
const MOCK_ISSUES: JiraIssue[] = [
  {
    key: 'PROJ-123',
    summary: 'Fix login bug on mobile devices',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Alice',
    created_at: '2025-11-05T10:00:00Z',
    updated_at: '2025-11-10T14:30:00Z',
  },
  {
    key: 'PROJ-456',
    summary: 'Implement dark mode across application',
    status: 'To Do',
    priority: 'Medium',
    assignee: 'Bob',
    created_at: '2025-11-08T09:00:00Z',
    updated_at: '2025-11-09T10:15:00Z',
  },
  {
    key: 'PROJ-789',
    summary: 'Optimize database query performance',
    status: 'In Review',
    priority: 'High',
    assignee: 'Alice',
    created_at: '2025-11-03T14:00:00Z',
    updated_at: '2025-11-07T09:20:00Z',
  },
  {
    key: 'PROJ-234',
    summary: 'Add unit tests for authentication module',
    status: 'To Do',
    priority: 'Low',
    assignee: 'Charlie',
    created_at: '2025-11-01T11:00:00Z',
    updated_at: '2025-11-01T11:00:00Z',
  },
];

export function JiraWidget({ project_key, jira_url }: JiraWidgetProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [lastEventSource, setLastEventSource] = useState<string | null>(null);

  // TODO: Fetch real issues from backend proxy
  const issues = MOCK_ISSUES;

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
        {filteredIssues.length === 0 ? (
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
