/**
 * Provider Credentials API
 *
 * Manage credentials for a specific provider.
 *
 * GET    /api/credentials/[provider] - Check if credentials exist
 * POST   /api/credentials/[provider] - Save credentials
 * DELETE /api/credentials/[provider] - Remove credentials
 */

import {
  getAuthenticatedUser,
  getUserCredentials,
  saveUserCredentials,
  deleteUserCredentials,
  errorResponse,
} from '@/lib/api/auth';
import { getProvider, isProviderSupported } from '@/lib/providers/registry';
import type { ProviderCredentials } from '@/lib/providers/types';

/**
 * GET /api/credentials/[provider]
 *
 * Check if credentials exist for a provider
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // 2. Validate provider
    const { provider: providerName } = await params;
    if (!isProviderSupported(providerName)) {
      return errorResponse(`Unsupported provider: ${providerName}`, 'INVALID_PROVIDER', 400);
    }

    // 3. Check if credentials exist
    const credentials = await getUserCredentials(user.userId, providerName);

    return Response.json({
      success: true,
      data: {
        provider: providerName,
        connected: !!credentials,
      },
    });
  } catch (error) {
    console.error('[Credentials] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * POST /api/credentials/[provider]
 *
 * Save or update credentials for a provider
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // 2. Validate provider
    const { provider: providerName } = await params;
    if (!isProviderSupported(providerName)) {
      return errorResponse(`Unsupported provider: ${providerName}`, 'INVALID_PROVIDER', 400);
    }

    // 3. Parse credentials from request body
    let credentials: ProviderCredentials;
    try {
      credentials = await request.json();
    } catch {
      return errorResponse('Invalid request body', 'INVALID_REQUEST', 400);
    }

    // 4. Validate credentials format using provider adapter
    const adapter = getProvider(providerName);
    const validation = adapter.validateCredentials(credentials);

    if (!validation.valid) {
      return errorResponse(
        validation.error || 'Invalid credentials format',
        'INVALID_CREDENTIALS',
        400
      );
    }

    // 5. Test connection (optional but recommended)
    const testResult = await adapter.testConnection(credentials);
    if (!testResult.success) {
      return Response.json(
        {
          success: false,
          error: testResult.error,
        },
        { status: 401 }
      );
    }

    // 6. Save credentials
    let saved = await saveUserCredentials(user.userId, providerName, credentials);

    // DEV MODE: Fall back to in-memory storage if database save fails
    if (!saved && process.env.NODE_ENV === 'development') {
      console.log('[Credentials] DEV MODE: Database save failed, using in-memory storage');
      const { saveDevCredentials } = await import('@/lib/api/dev-credentials');
      saveDevCredentials(user.userId, providerName, credentials);
      saved = true;
    }

    if (!saved) {
      return errorResponse('Failed to save credentials', 'DATABASE_ERROR', 500);
    }

    // 7. Return success with connection info
    return Response.json({
      success: true,
      data: {
        provider: providerName,
        connected: true,
        username: testResult.username,
        metadata: testResult.metadata,
      },
    });
  } catch (error) {
    console.error('[Credentials] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE /api/credentials/[provider]
 *
 * Remove credentials for a provider
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return errorResponse('Authentication required', 'UNAUTHORIZED', 401);
    }

    // 2. Validate provider
    const { provider: providerName } = await params;
    if (!isProviderSupported(providerName)) {
      return errorResponse(`Unsupported provider: ${providerName}`, 'INVALID_PROVIDER', 400);
    }

    // 3. Delete credentials
    const deleted = await deleteUserCredentials(user.userId, providerName);

    if (!deleted) {
      return errorResponse('Failed to delete credentials', 'DATABASE_ERROR', 500);
    }

    return Response.json({
      success: true,
      data: {
        provider: providerName,
        connected: false,
      },
    });
  } catch (error) {
    console.error('[Credentials] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
