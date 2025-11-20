/**
 * API Authentication Middleware
 *
 * Provides authentication utilities for API routes.
 * Validates Supabase sessions and retrieves user credentials.
 */

import { createServerSupabaseClient } from '@/lib/supabase/client';
import type { ProviderName, ProviderCredentials } from '@/lib/providers/types';

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: string;
  email: string | undefined;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Get authenticated user from request
 *
 * Validates the Supabase session and returns user context.
 * Returns null if user is not authenticated.
 *
 * DEV MODE: Falls back to test user if no session exists (for testing).
 */
export async function getAuthenticatedUser(): Promise<AuthContext | null> {
  try {
    const supabase = createServerSupabaseClient();

    // Get the current session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // DEV MODE: Fall back to test user in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] DEV MODE: No auth session, using test user');
        return {
          userId: '00000000-0000-0000-0000-000000000000',
          email: 'dev@localhost',
        };
      }

      console.log('[Auth] No authenticated user found');
      return null;
    }

    console.log('[Auth] Authenticated user:', user.email);
    return {
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('[Auth] Error getting authenticated user:', error);

    // DEV MODE: Fall back to test user on error in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] DEV MODE: Auth error, using test user');
      return {
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'dev@localhost',
      };
    }

    return null;
  }
}

/**
 * Get user credentials for a provider
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @returns Provider credentials or null if not found
 */
export async function getUserCredentials(
  userId: string,
  provider: ProviderName
): Promise<ProviderCredentials | null> {
  try {
    // DEV MODE: Check in-memory storage first
    if (process.env.NODE_ENV === 'development') {
      const { getDevCredentials } = await import('./dev-credentials');
      const devCreds = getDevCredentials(userId, provider);
      if (devCreds) {
        console.log(`[Auth] DEV MODE: Retrieved ${provider} credentials from memory`);
        return devCreds;
      }
    }

    // Use direct REST API to bypass Supabase JS client fetch issues
    const { getCredentialsRest } = await import('./supabase-rest');
    return await getCredentialsRest(userId, provider);
  } catch (error) {
    console.error(`[Auth] Error getting credentials for ${provider}:`, error);
    return null;
  }
}

/**
 * Save or update user credentials for a provider
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @param credentials - Provider credentials
 * @returns Success boolean
 */
export async function saveUserCredentials(
  userId: string,
  provider: ProviderName,
  credentials: ProviderCredentials
): Promise<boolean> {
  try {
    // Use direct REST API to bypass Supabase JS client fetch issues
    const { saveCredentialsRest } = await import('./supabase-rest');
    const success = await saveCredentialsRest(userId, provider, credentials);

    if (success) {
      console.log(`[Auth] Saved ${provider} credentials for user ${userId} (database)`);
    }

    return success;
  } catch (error) {
    console.error(`[Auth] Error saving credentials for ${provider}:`, error);
    return false;
  }
}

/**
 * Delete user credentials for a provider
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @returns Success boolean
 */
export async function deleteUserCredentials(
  userId: string,
  provider: ProviderName
): Promise<boolean> {
  try {
    // Use direct REST API to bypass Supabase JS client fetch issues
    const { deleteCredentialsRest } = await import('./supabase-rest');
    const success = await deleteCredentialsRest(userId, provider);

    if (success) {
      console.log(`[Auth] Deleted ${provider} credentials for user ${userId} (database)`);
    }

    return success;
  } catch (error) {
    console.error(`[Auth] Error deleting credentials for ${provider}:`, error);
    return false;
  }
}

/**
 * Helper: Create an unauthorized response
 */
export function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in.',
      },
    } as ApiErrorResponse,
    { status: 401 }
  );
}

/**
 * Helper: Create a missing credentials response
 */
export function missingCredentialsResponse(provider: ProviderName): Response {
  return Response.json(
    {
      error: {
        code: 'MISSING_CREDENTIALS',
        message: `No credentials found for ${provider}. Please connect your account.`,
        details: { provider },
      },
    } as ApiErrorResponse,
    { status: 400 }
  );
}

/**
 * Helper: Create a generic error response
 */
export function errorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  status: number = 500
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    } as ApiErrorResponse,
    { status }
  );
}

/**
 * Helper: Create a success response
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}
