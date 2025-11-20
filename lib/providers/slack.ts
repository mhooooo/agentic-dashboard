/**
 * Slack Provider Adapter
 *
 * Implements API interactions with Slack Web API.
 * Supports OAuth tokens (Bot or User tokens) for authentication.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  ApiError,
  RateLimitInfo,
} from './types';

export class SlackAdapter implements ProviderAdapter {
  readonly name = 'slack' as const;
  readonly baseUrl = 'https://slack.com/api';

  /**
   * Get authentication headers for Slack API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('Slack token is required');
    }

    return {
      'Authorization': `Bearer ${credentials.pat}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  /**
   * Validate Slack credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'Slack token is required' };
    }

    // Slack tokens start with 'xoxb-' (bot) or 'xoxp-' (user)
    if (!credentials.pat.startsWith('xoxb-') && !credentials.pat.startsWith('xoxp-')) {
      return {
        valid: false,
        error: 'Invalid Slack token format. Token should start with "xoxb-" (bot) or "xoxp-" (user)',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Slack API
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
            provider: 'slack',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL with query parameters for GET requests
      const url = new URL(`${this.baseUrl}${options.endpoint}`);
      if (options.method === 'GET' && options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Make request
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          ...this.getAuthHeaders(credentials),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Parse rate limit
      const rateLimit = this.parseRateLimit(response.headers);

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

      // Slack returns ok: false for API errors
      if (!data.ok) {
        return {
          success: false,
          error: {
            code: this.mapSlackErrorToCode(data.error),
            message: data.error || 'Slack API error',
            provider: 'slack',
            retryable: data.error === 'rate_limited',
            action: data.error === 'invalid_auth' || data.error === 'token_revoked' ? 'reconnect' : 'retry',
            details: data,
          },
          rateLimit,
        };
      }

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
          provider: 'slack',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Slack API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const result = await this.request<{ ok: boolean; user?: string; user_id?: string }>(
      credentials,
      {
        endpoint: '/auth.test',
        method: 'GET',
      }
    );

    if (result.success && result.data?.ok) {
      return {
        success: true,
        username: result.data.user,
        metadata: {
          user_id: result.data.user_id,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse rate limit information from response headers
   */
  parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    const retryAfter = headers.get('retry-after');

    if (!retryAfter) {
      return undefined;
    }

    // Slack returns retry-after in seconds
    const retryAfterSeconds = parseInt(retryAfter, 10);
    const resetDate = new Date(Date.now() + retryAfterSeconds * 1000);

    return {
      limit: 1, // Slack doesn't expose rate limits in headers
      remaining: 0,
      reset: resetDate,
    };
  }

  /**
   * Map Slack error codes to our standardized error codes
   */
  private mapSlackErrorToCode(slackError?: string): ApiError['code'] {
    const errorMap: Record<string, ApiError['code']> = {
      'invalid_auth': 'UNAUTHORIZED',
      'token_revoked': 'UNAUTHORIZED',
      'token_expired': 'UNAUTHORIZED',
      'not_authed': 'UNAUTHORIZED',
      'account_inactive': 'FORBIDDEN',
      'org_login_required': 'FORBIDDEN',
      'ekm_access_denied': 'FORBIDDEN',
      'not_allowed_token_type': 'FORBIDDEN',
      'missing_scope': 'FORBIDDEN',
      'rate_limited': 'RATE_LIMITED',
      'channel_not_found': 'NOT_FOUND',
      'user_not_found': 'NOT_FOUND',
      'team_not_found': 'NOT_FOUND',
      'invalid_arguments': 'INVALID_REQUEST',
      'invalid_array_arg': 'INVALID_REQUEST',
      'invalid_charset': 'INVALID_REQUEST',
    };

    return errorMap[slackError || ''] || 'PROVIDER_ERROR';
  }

  /**
   * Parse error from Slack API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText };
    }

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    return {
      code,
      message: errorData.error || `Slack API error: ${response.status}`,
      provider: 'slack',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: errorData,
    };
  }
}

// Export singleton instance
export const slackAdapter = new SlackAdapter();
