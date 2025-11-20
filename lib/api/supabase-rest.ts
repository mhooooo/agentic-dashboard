/**
 * Direct Supabase REST API Client
 *
 * Bypasses the Supabase JS client to avoid fetch compatibility issues
 * in Next.js 16 + Turbopack environment.
 *
 * Uses native fetch with proper headers and auth.
 */

import type { ProviderName, ProviderCredentials } from '@/lib/providers/types';

/**
 * Get Supabase REST API base URL
 */
function getRestUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return `${url}/rest/v1`;
}

/**
 * Get service role key for admin operations
 */
function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return key;
}

/**
 * Make a REST API request to Supabase
 */
async function restRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getRestUrl()}${endpoint}`;
  const serviceKey = getServiceRoleKey();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase REST API error: ${response.status} - ${error}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return [] as T;

    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`[REST] Fetch failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Get user credentials for a provider
 */
export async function getCredentialsRest(
  userId: string,
  provider: ProviderName
): Promise<ProviderCredentials | null> {
  try {
    const endpoint = `/user_credentials?user_id=eq.${userId}&provider=eq.${provider}&select=credentials`;
    const result = await restRequest<Array<{ credentials: ProviderCredentials }>>(endpoint);

    if (!result || result.length === 0) {
      return null;
    }

    return result[0].credentials;
  } catch (error) {
    console.error(`[REST] Error getting credentials for ${provider}:`, error);
    return null;
  }
}

/**
 * List all credentials for a user
 */
export async function listCredentialsRest(userId: string): Promise<ProviderName[]> {
  try {
    const endpoint = `/user_credentials?user_id=eq.${userId}&select=provider`;
    const result = await restRequest<Array<{ provider: ProviderName }>>(endpoint);

    return result.map(row => row.provider);
  } catch (error) {
    console.error('[REST] Error listing credentials:', error);
    return [];
  }
}

/**
 * Save or update user credentials
 * Uses UPSERT to handle both INSERT and UPDATE cases
 */
export async function saveCredentialsRest(
  userId: string,
  provider: ProviderName,
  credentials: ProviderCredentials
): Promise<boolean> {
  try {
    const data = {
      user_id: userId,
      provider,
      credentials,
      updated_at: new Date().toISOString(),
    };

    // PostgREST UPSERT: POST with resolution=merge-duplicates
    // This will INSERT or UPDATE if (user_id, provider) already exists
    // Reference: https://postgrest.org/en/stable/api.html#upsert
    await restRequest('/user_credentials', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        // resolution=merge-duplicates handles conflicts on unique constraints
        // In our case: user_credentials_user_id_provider_key (user_id, provider)
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
    });

    return true;
  } catch (error) {
    console.error(`[REST] Error saving credentials for ${provider}:`, error);

    // If merge-duplicates fails, try UPDATE directly
    try {
      console.log(`[REST] Attempting UPDATE fallback for ${provider}...`);
      const endpoint = `/user_credentials?user_id=eq.${userId}&provider=eq.${provider}`;
      await restRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({
          credentials,
          updated_at: new Date().toISOString(),
        }),
      });
      console.log(`[REST] UPDATE successful for ${provider}`);
      return true;
    } catch (updateError) {
      console.error(`[REST] UPDATE fallback also failed for ${provider}:`, updateError);
      return false;
    }
  }
}

/**
 * Delete user credentials
 */
export async function deleteCredentialsRest(
  userId: string,
  provider: ProviderName
): Promise<boolean> {
  try {
    const endpoint = `/user_credentials?user_id=eq.${userId}&provider=eq.${provider}`;
    await restRequest(endpoint, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error(`[REST] Error deleting credentials for ${provider}:`, error);
    return false;
  }
}
