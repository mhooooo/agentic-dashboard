/**
 * Supabase Client Configuration
 *
 * This module provides Supabase clients for both browser and server environments.
 */

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Get Supabase URL from environment
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  return url;
}

/**
 * Get Supabase Anon Key from environment
 */
function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
  return key;
}

/**
 * Create a Supabase client for use in the browser
 *
 * This client automatically handles authentication and cookies.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  );
}

/**
 * Create a Supabase client for server-side use (API routes, Server Components)
 *
 * Note: For Server Components and Server Actions, you should use
 * the SSR-aware client from @supabase/ssr
 */
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey) {
    // Use service role key for admin operations (backend proxy)
    return createClient<Database>(getSupabaseUrl(), serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Fall back to anon key (for read operations)
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
