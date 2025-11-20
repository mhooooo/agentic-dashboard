/**
 * Universal API Proxy Endpoint
 *
 * Securely proxies requests to external providers (GitHub, Jira, Slack).
 * Ensures API keys never reach the client.
 *
 * POST /api/proxy/[provider]
 * Body: { endpoint, method, params, body }
 */

import { getAuthenticatedUser, getUserCredentials, errorResponse } from '@/lib/api/auth';
import { getProvider, isProviderSupported } from '@/lib/providers/registry';
import type { ApiRequestOptions } from '@/lib/providers/types';

interface ProxyRequestBody {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
}

/**
 * POST /api/proxy/[provider]
 *
 * Proxy requests to external provider APIs
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
      return errorResponse(
        `Unsupported provider: ${providerName}`,
        'INVALID_PROVIDER',
        400
      );
    }

    // 3. Get user credentials for provider
    const credentials = await getUserCredentials(user.userId, providerName);
    if (!credentials) {
      return errorResponse(
        `No credentials found for ${providerName}. Please connect your account in settings.`,
        'MISSING_CREDENTIALS',
        400
      );
    }

    // 4. Parse request body
    let requestBody: ProxyRequestBody;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse('Invalid request body', 'INVALID_REQUEST', 400);
    }

    // Validate required fields
    if (!requestBody.endpoint) {
      return errorResponse('Missing required field: endpoint', 'INVALID_REQUEST', 400);
    }

    // 5. Get provider adapter
    const adapter = getProvider(providerName);

    // 6. Make request to external API
    const options: ApiRequestOptions = {
      endpoint: requestBody.endpoint,
      method: requestBody.method || 'GET',
      params: requestBody.params,
      body: requestBody.body,
    };

    const result = await adapter.request(credentials, options);

    // 7. Return response
    if (result.success) {
      return Response.json({
        success: true,
        data: result.data,
        rateLimit: result.rateLimit,
      });
    } else {
      // Return error with appropriate status code
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INVALID_REQUEST: 400,
        RATE_LIMITED: 429,
        MISSING_CREDENTIALS: 400,
        INVALID_CREDENTIALS: 401,
      };

      return Response.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusMap[result.error!.code] || 500 }
      );
    }
  } catch (error) {
    console.error('[Proxy] Unexpected error:', error);
    return errorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * GET /api/proxy/[provider]
 *
 * Not supported - use POST instead
 */
export async function GET() {
  return errorResponse(
    'GET requests are not supported. Use POST with request body.',
    'METHOD_NOT_ALLOWED',
    405
  );
}
