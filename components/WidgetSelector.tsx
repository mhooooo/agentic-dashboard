'use client';

/**
 * WidgetSelector Modal
 *
 * Shows available widgets that users can add to their dashboard.
 * Includes both hardcoded widgets (GitHub, Jira) and universal widgets (Linear, Slack, Calendar).
 */

import { useState } from 'react';

export interface WidgetOption {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'project-management' | 'communication' | 'productivity';
  icon: string;
  /** For universal widgets, this is the JSON filename. For hardcoded widgets, this is the widget type. */
  type: string;
  /** Whether this is a universal widget (JSON-based) or hardcoded widget */
  isUniversal: boolean;
}

const AVAILABLE_WIDGETS: WidgetOption[] = [
  // Hardcoded widgets (legacy)
  {
    id: 'github-legacy',
    name: 'GitHub Repositories',
    description: 'View your GitHub repositories (legacy widget)',
    category: 'development',
    icon: '🐙',
    type: 'github',
    isUniversal: false,
  },
  {
    id: 'jira-legacy',
    name: 'Jira Issues',
    description: 'Track Jira issues (legacy widget)',
    category: 'project-management',
    icon: '📋',
    type: 'jira',
    isUniversal: false,
  },
  // Universal widgets (new JSON-based)
  {
    id: 'github-prs',
    name: 'GitHub Pull Requests',
    description: 'View and track pull requests from your repositories',
    category: 'development',
    icon: '🔀',
    type: 'github-prs',
    isUniversal: true,
  },
  {
    id: 'linear-issues',
    name: 'Linear Issues',
    description: 'View and track issues assigned to you',
    category: 'project-management',
    icon: '📐',
    type: 'linear-issues',
    isUniversal: true,
  },
  {
    id: 'slack-messages',
    name: 'Slack Channels',
    description: 'View recent messages from your Slack channels',
    category: 'communication',
    icon: '💬',
    type: 'slack-messages',
    isUniversal: true,
  },
  {
    id: 'calendar-events',
    name: 'Calendar Events',
    description: 'View your upcoming calendar events',
    category: 'productivity',
    icon: '📅',
    type: 'calendar-events',
    isUniversal: true,
  },
];

const CATEGORY_COLORS = {
  development: 'bg-blue-50 text-blue-700 border-blue-200',
  'project-management': 'bg-purple-50 text-purple-700 border-purple-200',
  communication: 'bg-green-50 text-green-700 border-green-200',
  productivity: 'bg-orange-50 text-orange-700 border-orange-200',
};

export interface WidgetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidget: (widget: WidgetOption) => void;
}

export function WidgetSelector({ isOpen, onClose, onSelectWidget }: WidgetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter widgets by search query and category
  const filteredWidgets = AVAILABLE_WIDGETS.filter((widget) => {
    const matchesSearch =
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || widget.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group widgets by category
  const categories = Array.from(new Set(AVAILABLE_WIDGETS.map((w) => w.category)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Add Widget</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Category filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Widget list */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {filteredWidgets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No widgets found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWidgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => {
                    onSelectWidget(widget);
                    onClose();
                  }}
                  className="text-left p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{widget.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                        {widget.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {widget.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded border ${CATEGORY_COLORS[widget.category]}`}>
                          {widget.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                        {widget.isUniversal && (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                            Universal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
