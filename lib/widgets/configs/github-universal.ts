/**
 * GitHub Widget Configuration (Universal)
 *
 * This is the same GitHub widget from Month 1-2, but expressed as
 * declarative JSON configuration instead of hardcoded React.
 *
 * Use this to test the UniversalDataWidget prototype.
 */

import { UniversalWidgetConfig } from '../universal-config';

export const githubUniversalConfig: UniversalWidgetConfig = {
  type: 'universal-data',
  version: 1,
  name: 'Pull Requests (Universal)',
  description: 'GitHub PRs rendered via UniversalDataWidget',

  // Data source (using static mock data for prototype)
  dataSource: {
    type: 'static',
    data: [
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
    ],
  },

  // Transform: Extract Jira ticket IDs, sort by date
  transform: {
    mapItem: {
      id: 'number',
      title: 'title',
      author: 'author',
      state: 'state',
      created_at: 'created_at',
      jiraTicket: 'title|extractJiraKey',
      repository: 'repository',
    },
    sort: {
      field: 'created_at',
      direction: 'desc',
    },
  },

  // Display: List view with fields
  display: {
    view: 'list',
    layout: {
      height: 'auto',
      emptyState: 'No pull requests found',
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
            condition: "state === 'merged'",
            className: 'bg-purple-100 text-purple-800',
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
        key: 'created_at',
        label: 'Created',
        type: 'date',
        format: 'relative-time',
      },
      {
        key: 'jiraTicket',
        label: 'Jira Ticket',
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

  // Events: Publish to Event Mesh on click
  events: {
    onItemClick: {
      eventName: 'github.pr.selected',
      payload: ['id', 'title', 'author', 'state', 'jiraTicket', 'repository'],
      source: 'github-universal-widget',
    },
  },
};

/**
 * Jira Widget Configuration (Universal)
 *
 * Test auto-filtering via Event Mesh subscriptions
 */
export const jiraUniversalConfig: UniversalWidgetConfig = {
  type: 'universal-data',
  version: 1,
  name: 'Jira Issues (Universal)',
  description: 'Jira issues rendered via UniversalDataWidget',

  // Data source (using static mock data for prototype)
  dataSource: {
    type: 'static',
    data: [
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
    ],
  },

  // Transform: Map fields
  transform: {
    mapItem: {
      id: 'key',
      key: 'key',
      summary: 'summary',
      status: 'status',
      priority: 'priority',
      assignee: 'assignee',
      created_at: 'created_at',
    },
    sort: {
      field: 'updated_at',
      direction: 'desc',
    },
  },

  // Display: List view
  display: {
    view: 'list',
    layout: {
      height: 'auto',
      emptyState: 'No Jira issues found',
    },
    fields: [
      {
        key: 'key',
        label: 'Issue',
        type: 'text',
      },
      {
        key: 'summary',
        label: 'Summary',
        type: 'text',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'badge',
        style: [
          {
            condition: "status === 'To Do'",
            className: 'bg-gray-100 text-gray-800',
          },
          {
            condition: "status === 'In Progress'",
            className: 'bg-blue-100 text-blue-800',
          },
          {
            condition: "status === 'In Review'",
            className: 'bg-yellow-100 text-yellow-800',
          },
          {
            condition: "status === 'Done'",
            className: 'bg-green-100 text-green-800',
          },
        ],
      },
      {
        key: 'assignee',
        label: 'Assignee',
        type: 'text',
      },
    ],
  },

  // Subscriptions: Auto-filter based on GitHub PR selection
  subscriptions: [
    {
      pattern: 'github.pr.*',
      action: 'filter',
      filterBy: {
        eventField: 'jiraTicket',
        widgetField: 'key',
      },
    },
  ],
};
