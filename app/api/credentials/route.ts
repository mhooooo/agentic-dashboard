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

    // 2. Try getting credentials from database first
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('user_credentials')
        .select('provider, created_at, updated_at')
        .eq('user_id', user.userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return Response.json({
          success: true,
          data: data || [],
        });
      }

      console.warn('[Credentials] Database query failed:', error?.message);
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
