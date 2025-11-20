/**
 * Credentials Management API
 *
 * List all connected providers for the authenticated user.
 *
 * GET /api/credentials
 */

import { getAuthenticatedUser, errorResponse } from '@/lib/api/auth';
import { createServerSupabaseClient } from '@/lib/supabase/client';

/**
 * GET /api/credentials
 *
 * List all connected providers
 */
export async function GET() {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // 2. Try getting credentials from database first (using REST API)
    try {
      const { listCredentialsRest } = await import('@/lib/api/supabase-rest');
      const providers = await listCredentialsRest(user.userId);

      const credentialsList = providers.map(provider => ({
        provider,
        created_at: new Date().toISOString(), // We don't fetch timestamps to keep it simple
        updated_at: new Date().toISOString(),
      }));

      console.log('[Credentials] Retrieved credentials from database:', providers);
      return Response.json({
        success: true,
        data: credentialsList,
      });
    } catch (dbError) {
      console.warn('[Credentials] Database connection failed:', dbError);
    }

    // 3. DEV MODE: Fall back to in-memory storage
    if (process.env.NODE_ENV === 'development') {
      console.log('[Credentials] DEV MODE: Using in-memory storage for credentials list');
      const { listDevCredentials } = await import('@/lib/api/dev-credentials');
      const providers = listDevCredentials(user.userId);

      const credentialsList = providers.map(provider => ({
        provider,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      return Response.json({
        success: true,
        data: credentialsList,
      });
    }

    // 4. Production: return error
    return errorResponse('Failed to fetch credentials', 'DATABASE_ERROR', 500);
  } catch (error) {
    console.error('[Credentials] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
