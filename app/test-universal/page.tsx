'use client';

/**
 * Test Page for UniversalDataWidget
 *
 * Demonstrates the declarative JSON widget system with live examples.
 */

import { UniversalDataWidget } from '@/components/UniversalDataWidget';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import { useState } from 'react';

export default function TestUniversalPage() {
  const [selectedExample, setSelectedExample] = useState<string>('github-repos');

  // Example 1: GitHub Repositories (Simple List)
  const githubReposWidget: UniversalWidgetDefinition = {
    metadata: {
      name: 'GitHub Repositories',
      description: 'Your most recently updated repositories',
      category: 'development',
      version: 1,
    },
    dataSource: {
      provider: 'github',
      endpoint: '/user/repos',
      method: 'GET',
      params: {
        sort: 'updated',
        per_page: 10,
        affiliation: 'owner,collaborator',
      },
      pollInterval: 0,
    },
    fields: [
      { name: 'name', path: '$.name', type: 'string' },
      { name: 'description', path: '$.description', type: 'string' },
      { name: 'stars', path: '$.stargazers_count', type: 'number', format: '⭐ {{value}}' },
      { name: 'language', path: '$.language', type: 'string' },
    ],
    layout: {
      type: 'list',
      fields: {
        title: 'name',
        subtitle: 'description',
        metadata: ['stars', 'language'],
      },
    },
    emptyMessage: 'No repositories found',
    errorMessage: 'Please connect your GitHub account in Settings',
  };

  // Example 2: Table Layout
  const githubTableWidget: UniversalWidgetDefinition = {
    metadata: {
      name: 'GitHub Repositories (Table)',
      description: 'Your repositories in table format',
      category: 'development',
      version: 1,
    },
    dataSource: {
      provider: 'github',
      endpoint: '/user/repos',
      method: 'GET',
      params: { sort: 'updated', per_page: 10 },
      pollInterval: 0,
    },
    fields: [
      { name: 'name', path: '$.name', type: 'string' },
      { name: 'language', path: '$.language', type: 'string' },
      { name: 'stars', path: '$.stargazers_count', type: 'number' },
      { name: 'forks', path: '$.forks_count', type: 'number' },
    ],
    layout: {
      type: 'table',
      columns: [
        { field: 'name', header: 'Repository', width: 'auto' },
        { field: 'language', header: 'Language', width: '150px' },
        { field: 'stars', header: '⭐ Stars', width: '100px' },
        { field: 'forks', header: '🍴 Forks', width: '100px' },
      ],
    },
    emptyMessage: 'No repositories',
    errorMessage: 'Please connect GitHub in Settings',
  };

  const examples: Record<string, { widget: UniversalWidgetDefinition; json: string }> = {
    'github-repos': { widget: githubReposWidget, json: JSON.stringify(githubReposWidget, null, 2) },
    'github-table': { widget: githubTableWidget, json: JSON.stringify(githubTableWidget, null, 2) },
  };

  const currentExample = examples[selectedExample];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">UniversalDataWidget Test</h1>
          <p className="text-muted-foreground">
            Declarative JSON-based widgets - no code required!
          </p>
          <a href="/" className="text-sm text-primary hover:underline inline-block">
            ← Back to Dashboard
          </a>
        </div>

        {/* Example Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedExample('github-repos')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedExample === 'github-repos'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            List Layout
          </button>
          <button
            onClick={() => setSelectedExample('github-table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedExample === 'github-table'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Table Layout
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Live Preview */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
            <div className="border rounded-lg p-4 bg-background min-h-[400px]">
              <UniversalDataWidget definition={currentExample.widget} />
            </div>
          </div>

          {/* Right: JSON Config */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">JSON Configuration</h2>
            <pre className="border rounded-lg p-4 bg-background overflow-auto text-xs max-h-[500px]">
              {currentExample.json}
            </pre>
          </div>
        </div>

        {/* Capabilities */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold mb-4">Capabilities & Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">✨ What It Can Do</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• List, Table, Cards, Metric layouts</li>
                <li>• JSONPath data extraction</li>
                <li>• Template strings</li>
                <li>• Event Mesh integration</li>
                <li>• Auto-refresh/polling</li>
                <li>• Type conversion & formatting</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">🎯 Use Cases</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• API data viewers</li>
                <li>• Custom dashboards</li>
                <li>• Reports & analytics</li>
                <li>• Interconnected widgets</li>
                <li>• Rapid prototyping</li>
                <li>• No-code widget creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
