/**
 * Credentials Expiry API
 *
 * Get expiry status for all connected providers.
 * Returns expiry timestamps, time remaining, and status (ok/warning/expired).
 *
 * GET /api/credentials/expiry
 */

import { getAuthenticatedUser, errorResponse } from '@/lib/api/auth';

export interface CredentialExpiryStatus {
  provider: string;
  expiresAt?: number; // Timestamp in milliseconds
  timeRemaining?: number; // Milliseconds until expiry
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  supportsRefresh: boolean;
}

/**
 * GET /api/credentials/expiry
 *
 * Get expiry status for all user credentials
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
      const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!restUrl || !serviceKey) {
        throw new Error('Missing Supabase configuration');
      }

      const endpoint = `/rest/v1/user_credentials?user_id=eq.${user.userId}&select=provider,credentials`;

      const response = await fetch(`${restUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch credentials: ${error}`);
      }

      const credentials = await response.json() as Array<{
        provider: string;
        credentials: {
          expires_at?: number;
          refresh_token?: string;
        };
      }>;

      const now = Date.now();
      const statuses: CredentialExpiryStatus[] = credentials.map(cred => {
        const expiresAt = cred.credentials.expires_at;
        const supportsRefresh = !!cred.credentials.refresh_token;

        if (!expiresAt) {
          return {
            provider: cred.provider,
            status: 'no-expiry',
            supportsRefresh,
          };
        }

        const timeRemaining = expiresAt - now;
        const expiresAtNum = typeof expiresAt === 'number' ? expiresAt : parseInt(expiresAt, 10);

        let status: 'ok' | 'warning' | 'expired';
        if (timeRemaining <= 0) {
          status = 'expired';
        } else if (timeRemaining <= 15 * 60 * 1000) { // 15 minutes
          status = 'warning';
        } else {
          status = 'ok';
        }

        return {
          provider: cred.provider,
          expiresAt: expiresAtNum,
          timeRemaining,
          status,
          supportsRefresh,
        };
      });

      return Response.json({
        success: true,
        data: statuses,
      });
    } catch (dbError) {
      console.warn('[CredentialsExpiry] Database connection failed:', dbError);
    }

    // 3. DEV MODE: Fall back to in-memory storage
    if (process.env.NODE_ENV === 'development') {
      console.log('[CredentialsExpiry] DEV MODE: Using mock expiry data');

      // Return mock data for development
      const mockStatuses: CredentialExpiryStatus[] = [
        {
          provider: 'github',
          status: 'no-expiry',
          supportsRefresh: false,
        },
        {
          provider: 'jira',
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
          timeRemaining: 5 * 60 * 1000,
          status: 'warning',
          supportsRefresh: true,
        },
      ];

      return Response.json({
        success: true,
        data: mockStatuses,
      });
    }

    // 4. Production: return error
    return errorResponse('Failed to fetch credential expiry data', 'DATABASE_ERROR', 500);
  } catch (error) {
    console.error('[CredentialsExpiry] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
