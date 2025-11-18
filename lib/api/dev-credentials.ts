/**
 * Dev Mode Credential Storage
 *
 * In development mode, credentials are stored in memory instead of the database.
 * This allows testing the full flow without requiring a real user account.
 *
 * WARNING: This is only for development! Credentials are lost on server restart.
 */

import type { ProviderName, ProviderCredentials } from '@/lib/providers/types';

// Use global to persist across hot reloads in development
declare global {
  var devCredentialsStore: Map<string, ProviderCredentials> | undefined;
}

// In-memory store for dev credentials (persists across hot reloads)
const devCredentialsStore = global.devCredentialsStore ?? new Map<string, ProviderCredentials>();

if (process.env.NODE_ENV === 'development') {
  global.devCredentialsStore = devCredentialsStore;
}

/**
 * Generate storage key for dev credentials
 */
function getStorageKey(userId: string, provider: ProviderName): string {
  return `${userId}:${provider}`;
}

/**
 * Save credentials in dev mode (memory only)
 */
export function saveDevCredentials(
  userId: string,
  provider: ProviderName,
  credentials: ProviderCredentials
): void {
  const key = getStorageKey(userId, provider);
  devCredentialsStore.set(key, credentials);
  console.log(`[DevCredentials] Saved ${provider} credentials for ${userId} (in memory)`);
}

/**
 * Get credentials in dev mode
 */
export function getDevCredentials(
  userId: string,
  provider: ProviderName
): ProviderCredentials | null {
  const key = getStorageKey(userId, provider);
  return devCredentialsStore.get(key) || null;
}

/**
 * Delete credentials in dev mode
 */
export function deleteDevCredentials(userId: string, provider: ProviderName): void {
  const key = getStorageKey(userId, provider);
  devCredentialsStore.delete(key);
  console.log(`[DevCredentials] Deleted ${provider} credentials for ${userId}`);
}

/**
 * List all connected providers in dev mode
 */
export function listDevCredentials(userId: string): ProviderName[] {
  const providers: ProviderName[] = [];

  for (const [key] of devCredentialsStore.entries()) {
    if (key.startsWith(`${userId}:`)) {
      const provider = key.split(':')[1] as ProviderName;
      providers.push(provider);
    }
  }

  return providers;
}

/**
 * Clear all dev credentials (useful for testing)
 */
export function clearAllDevCredentials(): void {
  devCredentialsStore.clear();
  console.log('[DevCredentials] Cleared all credentials');
}
