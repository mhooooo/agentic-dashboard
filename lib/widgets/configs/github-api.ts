/**
 * GitHub Widget Configuration (Real API)
 *
 * Uses the backend API proxy to fetch real pull request data from GitHub.
 * This demonstrates Month 3 functionality: real API integration with security.
 *
 * Prerequisites:
 * 1. User must add GitHub PAT in /settings/credentials
 * 2. PAT should have 'repo' scope for private repos
 */

import { UniversalWidgetConfig } from '../universal-config';

/**
 * GitHub Pull Requests Widget - Real API
 *
 * Fetches PRs from a GitHub repository using the secure backend proxy.
 */
export function createGitHubApiConfig(owner: string, repo: string): UniversalWidgetConfig {
  return {
    type: 'universal-data',
    version: 1,
    name: `${owner}/${repo} PRs`,
    description: 'Live pull requests from GitHub API',

    // Real API data source via backend proxy
    dataSource: {
      type: 'api',
      endpoint: '/api/proxy/github',
      method: 'POST',
      params: {
        endpoint: `/repos/${owner}/${repo}/pulls`,
        method: 'GET',
        params: {
          state: 'open',
          sort: 'updated',
          direction: 'desc',
          per_page: 20,
        },
      },
      refreshInterval: 30000, // Refresh every 30 seconds
    },

    // Transform GitHub API response to widget format
    transform: {
      // GitHub API returns array directly (no nested path)
      mapItem: {
        id: 'number',
        number: 'number',
        title: 'title',
        state: 'state',
        author: 'user.login',
        created_at: 'created_at',
        updated_at: 'updated_at',
        comments_count: 'comments',
        repository: `${owner}/${repo}`, // Add repository name
        url: 'html_url',
        // Extract Jira ticket from title (e.g., "PROJ-123: Fix bug")
        jiraTicket: 'title|extractJiraKey',
      },
      sort: {
        field: 'updated_at',
        direction: 'desc',
      },
    },

    // Display configuration
    display: {
      view: 'list',
      layout: {
        height: 'auto',
        emptyState: 'No open pull requests',
      },
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
        },
        {
          key: 'state',
          label: 'Status',
          type: 'badge',
          style: [
            {
              condition: "state === 'open'",
              className: 'bg-green-100 text-green-800',
            },
            {
              condition: "state === 'closed'",
              className: 'bg-red-100 text-red-800',
            },
          ],
        },
        {
          key: 'author',
          label: 'Author',
          type: 'text',
        },
        {
          key: 'updated_at',
          label: 'Updated',
          type: 'date',
          format: 'relative-time',
        },
        {
          key: 'jiraTicket',
          label: 'Jira',
          type: 'badge',
          style: [
            {
              className: 'bg-blue-100 text-blue-800',
            },
          ],
        },
      ],
      actions: [
        {
          trigger: 'click',
          event: 'item-selected',
        },
      ],
    },

    // Event Mesh: Publish PR selection
    events: {
      onItemClick: {
        eventName: 'github.pr.selected',
        payload: ['id', 'number', 'title', 'author', 'state', 'jiraTicket', 'repository', 'url'],
        source: 'github-api-widget',
      },
    },
  };
}

/**
 * GitHub Issues Widget - Real API
 *
 * Fetches issues from a GitHub repository.
 */
export function createGitHubIssuesConfig(owner: string, repo: string): UniversalWidgetConfig {
  return {
    type: 'universal-data',
    version: 1,
    name: `${owner}/${repo} Issues`,
    description: 'Live issues from GitHub API',

    dataSource: {
      type: 'api',
      endpoint: '/api/proxy/github',
      method: 'POST',
      params: {
        endpoint: `/repos/${owner}/${repo}/issues`,
        method: 'GET',
        params: {
          state: 'open',
          sort: 'updated',
          per_page: 20,
        },
      },
      refreshInterval: 60000, // Refresh every minute
    },

    transform: {
      mapItem: {
        id: 'number',
        number: 'number',
        title: 'title',
        state: 'state',
        author: 'user.login',
        created_at: 'created_at',
        labels: 'labels',
        comments_count: 'comments',
        repository: `${owner}/${repo}`,
        url: 'html_url',
      },
      sort: {
        field: 'updated_at',
        direction: 'desc',
      },
    },

    display: {
      view: 'list',
      layout: {
        height: 'auto',
        emptyState: 'No open issues',
      },
      fields: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
        },
        {
          key: 'state',
          label: 'Status',
          type: 'badge',
          style: [
            {
              condition: "state === 'open'",
              className: 'bg-green-100 text-green-800',
            },
          ],
        },
        {
          key: 'author',
          label: 'Author',
          type: 'text',
        },
        {
          key: 'comments_count',
          label: 'Comments',
          type: 'number',
        },
      ],
    },

    events: {
      onItemClick: {
        eventName: 'github.issue.selected',
        payload: ['id', 'number', 'title', 'author', 'state', 'repository', 'url'],
        source: 'github-issues-widget',
      },
    },
  };
}

/**
 * Preset: Common repositories
 */
export const GITHUB_PRESETS = {
  // Example repositories (users should configure their own)
  'next.js': createGitHubApiConfig('vercel', 'next.js'),
  'react': createGitHubApiConfig('facebook', 'react'),
  'typescript': createGitHubApiConfig('microsoft', 'TypeScript'),
};
