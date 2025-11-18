'use client';

/**
 * Credentials Management Page
 *
 * Allows users to connect their external accounts (GitHub, Jira, Slack)
 * by providing API tokens. Credentials are securely stored and never exposed to the client.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Provider {
  name: 'github' | 'jira' | 'slack';
  displayName: string;
  description: string;
  icon: string;
  fields: CredentialField[];
}

interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'url';
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

const PROVIDERS: Provider[] = [
  {
    name: 'github',
    displayName: 'GitHub',
    description: 'Connect your GitHub account to track pull requests, issues, and commits.',
    icon: '🐙',
    fields: [
      {
        key: 'pat',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxx',
        required: true,
        helpText: 'Create a token at: Settings → Developer settings → Personal access tokens',
      },
    ],
  },
  {
    name: 'jira',
    displayName: 'Jira',
    description: 'Connect your Jira workspace to track issues and projects.',
    icon: '📋',
    fields: [
      {
        key: 'url',
        label: 'Jira URL',
        type: 'url',
        placeholder: 'https://yourcompany.atlassian.net',
        required: true,
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'you@company.com',
        required: true,
      },
      {
        key: 'pat',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your Jira API token',
        required: true,
        helpText: 'Create a token at: Account settings → Security → API tokens',
      },
    ],
  },
];

export default function CredentialsPage() {
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch connected providers on mount
  useEffect(() => {
    fetchConnectedProviders();
  }, []);

  const fetchConnectedProviders = async () => {
    try {
      const response = await fetch('/api/credentials');
      const result = await response.json();

      console.log('[CredentialsPage] Fetched credentials:', result);

      if (result.success) {
        const connected = new Set(result.data.map((c: any) => c.provider));
        console.log('[CredentialsPage] Connected providers:', Array.from(connected));
        setConnectedProviders(connected);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">API Credentials</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">API Credentials</h1>
      <p className="text-muted-foreground mb-8">
        Connect your external accounts to fetch real data. Your credentials are encrypted and never exposed to the client.
      </p>

      <div className="space-y-6">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.name}
            provider={provider}
            connected={connectedProviders.has(provider.name)}
            onUpdate={fetchConnectedProviders}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  connected,
  onUpdate,
}: {
  provider: Provider;
  connected: boolean;
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(`/api/credentials/${provider.name}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`✅ Connected as ${result.data.username}`);
        return true;
      } else {
        toast.error(result.error?.message || 'Connection test failed');
        return false;
      }
    } catch (error) {
      toast.error('Network error');
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/credentials/${provider.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`✅ ${provider.displayName} credentials saved`);
        setShowForm(false);
        setFormData({});
        onUpdate();
      } else {
        toast.error(result.error?.message || 'Failed to save credentials');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${provider.displayName}?`)) return;

    try {
      const response = await fetch(`/api/credentials/${provider.name}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Disconnected ${provider.displayName}`);
        onUpdate();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{provider.icon}</span>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {provider.displayName}
              {connected && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Connected</span>}
            </h3>
            <p className="text-sm text-muted-foreground">{provider.description}</p>
          </div>
        </div>

        {connected ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm px-3 py-1 border rounded hover:bg-accent"
            >
              Update
            </button>
            <button
              onClick={handleDisconnect}
              className="text-sm px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Connect
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {provider.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.key] || ''}
                onChange={(e) =>
                  setFormData({ ...formData, [field.key]: e.target.value })
                }
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {field.helpText && (
                <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 border rounded hover:bg-accent disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({});
              }}
              className="px-4 py-2 border rounded hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
