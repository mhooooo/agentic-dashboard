/**
 * Test Provider Connection API
 *
 * Test credentials without saving them.
 *
 * POST /api/credentials/[provider]/test
 */

import { getAuthenticatedUser, errorResponse } from '@/lib/api/auth';
import { getProvider, isProviderSupported } from '@/lib/providers/registry';
import type { ProviderCredentials } from '@/lib/providers/types';

/**
 * POST /api/credentials/[provider]/test
 *
 * Test connection with provided credentials (without saving)
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

    // 4. Validate credentials format
    const adapter = getProvider(providerName);
    const validation = adapter.validateCredentials(credentials);

    if (!validation.valid) {
      return errorResponse(
        validation.error || 'Invalid credentials format',
        'INVALID_CREDENTIALS',
        400
      );
    }

    // 5. Test connection
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

    // 6. Return success
    return Response.json({
      success: true,
      data: {
        provider: providerName,
        username: testResult.username,
        metadata: testResult.metadata,
      },
    });
  } catch (error) {
    console.error('[Credentials] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
