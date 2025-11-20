'use client';

/**
 * Backend API Proxy Test Page
 *
 * Tests the proxy endpoints with real GitHub and Jira APIs.
 * Verifies end-to-end functionality: credentials → proxy → external API → response
 */

import { useState } from 'react';

export default function TestProxyPage() {
  const [githubData, setGithubData] = useState<any>(null);
  const [jiraData, setJiraData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testGitHub = async () => {
    setLoading('github');
    setError(null);
    try {
      // Test 1: Get authenticated user info
      const userResponse = await fetch('/api/proxy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/user',
          method: 'GET',
        }),
      });

      const userResult = await userResponse.json();

      if (!userResult.success) {
        throw new Error(userResult.error?.message || 'GitHub API request failed');
      }

      // Test 2: Get user's repositories
      const reposResponse = await fetch('/api/proxy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/user/repos',
          method: 'GET',
          params: {
            sort: 'updated',
            per_page: 5,
          },
        }),
      });

      const reposResult = await reposResponse.json();

      if (!reposResult.success) {
        throw new Error(reposResult.error?.message || 'GitHub repos request failed');
      }

      setGithubData({
        user: userResult.data,
        repos: reposResult.data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub test failed');
    } finally {
      setLoading(null);
    }
  };

  const testJira = async () => {
    setLoading('jira');
    setError(null);
    try {
      // Test 1: Get current user info
      const myselfResponse = await fetch('/api/proxy/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/myself',
          method: 'GET',
        }),
      });

      const myselfResult = await myselfResponse.json();

      if (!myselfResult.success) {
        throw new Error(myselfResult.error?.message || 'Jira API request failed');
      }

      // Test 2: Get projects (limited to 5)
      const projectsResponse = await fetch('/api/proxy/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/project/search',
          method: 'GET',
          params: {
            maxResults: 5,
          },
        }),
      });

      const projectsResult = await projectsResponse.json();

      setJiraData({
        user: myselfResult.data,
        projects: projectsResult.success ? projectsResult.data : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jira test failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Backend API Proxy Test</h1>
      <p className="text-muted-foreground mb-8">
        Test the proxy endpoints with real GitHub and Jira APIs. Make sure you've connected your credentials first.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GitHub Test */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🐙 GitHub API Test
            </h2>
            <button
              onClick={testGitHub}
              disabled={loading === 'github'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              {loading === 'github' ? 'Loading...' : 'Test GitHub'}
            </button>
          </div>

          {githubData && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">👤 User Info</h3>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p><strong>Username:</strong> {githubData.user.login}</p>
                  <p><strong>Name:</strong> {githubData.user.name || 'N/A'}</p>
                  <p><strong>Public Repos:</strong> {githubData.user.public_repos}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">📦 Recent Repositories</h3>
                <div className="space-y-2">
                  {githubData.repos.slice(0, 5).map((repo: any) => (
                    <div key={repo.id} className="bg-muted p-3 rounded text-sm">
                      <p className="font-medium">{repo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {repo.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ⭐ {repo.stargazers_count} • 🍴 {repo.forks_count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!githubData && loading !== 'github' && (
            <p className="text-sm text-muted-foreground">
              Click "Test GitHub" to fetch your user info and repositories.
            </p>
          )}
        </div>

        {/* Jira Test */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📋 Jira API Test
            </h2>
            <button
              onClick={testJira}
              disabled={loading === 'jira'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              {loading === 'jira' ? 'Loading...' : 'Test Jira'}
            </button>
          </div>

          {jiraData && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">👤 User Info</h3>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p><strong>Email:</strong> {jiraData.user.emailAddress}</p>
                  <p><strong>Name:</strong> {jiraData.user.displayName}</p>
                  <p><strong>Account ID:</strong> {jiraData.user.accountId}</p>
                </div>
              </div>

              {jiraData.projects && (
                <div>
                  <h3 className="font-semibold mb-2">📁 Projects</h3>
                  <div className="space-y-2">
                    {jiraData.projects.values?.slice(0, 5).map((project: any) => (
                      <div key={project.id} className="bg-muted p-3 rounded text-sm">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Key: {project.key}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!jiraData && loading !== 'jira' && (
            <p className="text-sm text-muted-foreground">
              Click "Test Jira" to fetch your user info and projects.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">✅ What's Being Tested:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Credentials are retrieved from secure storage (in-memory dev mode)</li>
          <li>API calls are proxied through <code>/api/proxy/[provider]</code></li>
          <li>Authentication headers are added server-side (never exposed to client)</li>
          <li>Real data is fetched from GitHub and Jira APIs</li>
          <li>Responses are returned to the client</li>
        </ul>
      </div>
    </div>
  );
}
