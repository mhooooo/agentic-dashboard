/**
 * Provider Registry
 *
 * Central registry for all provider adapters.
 * Use this to access provider implementations by name.
 */

import type { ProviderAdapter, ProviderName } from './types';
import { githubAdapter } from './github';
import { jiraAdapter } from './jira';

/**
 * Provider adapter registry
 */
const providers = new Map<ProviderName, ProviderAdapter>([
  ['github', githubAdapter],
  ['jira', jiraAdapter],
  // 'slack' adapter will be added in Phase 5
]);

/**
 * Get a provider adapter by name
 *
 * @param name - Provider name ('github', 'jira', 'slack')
 * @returns Provider adapter instance
 * @throws Error if provider is not registered
 */
export function getProvider(name: ProviderName): ProviderAdapter {
  const provider = providers.get(name);

  if (!provider) {
    throw new Error(`Provider '${name}' is not registered`);
  }

  return provider;
}

/**
 * Check if a provider is supported
 *
 * @param name - Provider name
 * @returns True if provider is registered
 */
export function isProviderSupported(name: string): name is ProviderName {
  return providers.has(name as ProviderName);
}

/**
 * Get all registered provider names
 *
 * @returns Array of provider names
 */
export function getAllProviderNames(): ProviderName[] {
  return Array.from(providers.keys());
}

/**
 * Get all registered provider adapters
 *
 * @returns Array of provider adapters
 */
export function getAllProviders(): ProviderAdapter[] {
  return Array.from(providers.values());
}
