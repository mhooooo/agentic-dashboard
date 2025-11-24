/**
 * OAuth Token Refresh Endpoint
 *
 * POST /api/auth/refresh-tokens
 *
 * Triggers the token refresh job to refresh all expiring OAuth tokens.
 * Can be called:
 * 1. By a cron job (e.g., Vercel Cron, GitHub Actions)
 * 2. Manually for testing/debugging
 * 3. On-demand when user experiences auth errors
 *
 * SECURITY:
 * - Protected by authorization header (cron secret or admin key)
 * - Only allows POST requests
 * - Returns summary without exposing sensitive token data
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeRefreshJob } from '@/lib/oauth/refresh-job';

/**
 * POST /api/auth/refresh-tokens
 *
 * Execute the token refresh job
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify authorization
    // In production, use a cron secret or admin API key
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.OAUTH_REFRESH_SECRET;

    // In development, allow without auth for easy testing
    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || !cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized - missing auth credentials' },
          { status: 401 }
        );
      }

      // Check Bearer token or direct comparison
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (token !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized - invalid credentials' },
          { status: 401 }
        );
      }
    } else {
      console.log('[RefreshTokens] DEV MODE: Skipping auth check');
    }

    // Execute the refresh job
    console.log('[RefreshTokens] Starting token refresh job...');
    const summary = await executeRefreshJob();

    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        totalChecked: summary.totalChecked,
        successfulRefreshes: summary.successfulRefreshes,
        failedRefreshes: summary.failedRefreshes,
        executedAt: summary.executedAt,
        // Include results for debugging (without sensitive data)
        results: summary.results.map(r => ({
          provider: r.provider,
          userId: r.userId.slice(0, 8) + '...', // Truncate user ID for privacy
          success: r.success,
          error: r.error,
        })),
      },
    });
  } catch (error) {
    console.error('[RefreshTokens] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/refresh-tokens
 *
 * Return information about the refresh job (for health checks)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/auth/refresh-tokens',
    method: 'POST',
    description: 'Triggers OAuth token refresh job for expiring tokens',
    authentication: process.env.NODE_ENV === 'production' ? 'required' : 'optional (dev mode)',
    schedule: 'Run every 5 minutes via cron or on-demand',
  });
}
