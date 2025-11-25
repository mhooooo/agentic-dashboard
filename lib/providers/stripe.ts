/**
 * Stripe Provider Adapter
 *
 * Implements API interactions with Stripe REST API v2024-06-20.
 * Supports API keys for authentication (test mode: sk_test_*, live mode: sk_live_*).
 *
 * Stripe uses form-encoded requests, not JSON.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  RateLimitInfo,
  ApiError,
} from './types';

export class StripeAdapter implements ProviderAdapter {
  readonly name = 'stripe' as const;
  readonly baseUrl = 'https://api.stripe.com/v1';

  /**
   * Get authentication headers for Stripe API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('Stripe API key is required');
    }

    return {
      'Authorization': `Bearer ${credentials.pat}`,
      'Stripe-Version': '2024-06-20',
    };
  }

  /**
   * Validate Stripe credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'Stripe API key is required' };
    }

    // Stripe API keys: sk_test_* (test mode), sk_live_* (live mode), or OAuth tokens (rk_*)
    const hasValidPrefix =
      credentials.pat.startsWith('sk_test_') ||
      credentials.pat.startsWith('sk_live_') ||
      credentials.pat.startsWith('rk_'); // Restricted keys (OAuth)

    const isOAuthToken = credentials.pat.length >= 32; // OAuth tokens are long

    if (!hasValidPrefix && !isOAuthToken) {
      return {
        valid: false,
        error: 'Invalid Stripe API key format. Key should start with "sk_test_", "sk_live_", or "rk_"',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Stripe API
   */
  async request<T = any>(
    credentials: ProviderCredentials,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      // Validate credentials
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: validation.error || 'Invalid credentials',
            provider: 'stripe',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}${options.endpoint}`);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Determine Content-Type based on method
      const isWriteOperation = options.method && ['POST', 'PUT', 'PATCH'].includes(options.method);
      const contentType = isWriteOperation ? 'application/x-www-form-urlencoded' : undefined;

      // Make request
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          ...this.getAuthHeaders(credentials),
          ...options.headers,
          ...(contentType ? { 'Content-Type': contentType } : {}),
        },
        body: options.body ? this.encodeFormData(options.body) : undefined,
      });

      // Stripe doesn't expose rate limits in headers
      const rateLimit = undefined;

      // Handle errors
      if (!response.ok) {
        const error = await this.parseError(response);
        return {
          success: false,
          error,
          rateLimit,
        };
      }

      // Parse response
      const data = await response.json();

      return {
        success: true,
        data: data as T,
        rateLimit,
      };
    } catch (error) {
      // Network or unexpected errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          provider: 'stripe',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Stripe API
   *
   * Uses /v1/charges endpoint with limit=1 to verify connectivity.
   * More reliable than /account which requires additional permissions.
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    // Use charges endpoint to test connectivity
    // This requires less permissions than /account
    const result = await this.request<{ data: any[] }>(credentials, {
      endpoint: '/charges',
      method: 'GET',
      params: { limit: 1 },
    });

    if (result.success) {
      return {
        success: true,
        username: 'stripe-user', // Stripe doesn't provide user info from charges endpoint
        metadata: {
          hasData: result.data?.data?.length ?? 0 > 0,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse rate limit information (Stripe doesn't provide this)
   */
  parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    return undefined;
  }

  /**
   * Parse error from Stripe API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Stripe returns errors in { error: { type, message, code } } format
    const stripeError = errorData.error || {};

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      402: 'INVALID_REQUEST', // Payment required
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    return {
      code,
      message: stripeError.message || `Stripe API error: ${response.status}`,
      provider: 'stripe',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: stripeError,
    };
  }

  /**
   * Encode body as form data (Stripe uses application/x-www-form-urlencoded)
   */
  private encodeFormData(data: any): string {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }
}

// Export singleton instance
export const stripeAdapter = new StripeAdapter();
