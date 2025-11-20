/**
 * Linear Provider Adapter
 *
 * Implements API interactions with Linear GraphQL API.
 * Supports Personal API Keys for authentication.
 *
 * Note: Linear uses GraphQL, not REST. The endpoint is always '/graphql',
 * and queries are passed in the request body.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  ApiError,
} from './types';

export class LinearAdapter implements ProviderAdapter {
  readonly name = 'linear' as const;
  readonly baseUrl = 'https://api.linear.app';

  /**
   * Get authentication headers for Linear API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('Linear API key is required');
    }

    return {
      'Authorization': credentials.pat,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate Linear credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'Linear API key is required' };
    }

    // Linear API keys start with 'lin_api_' (manual) or are OAuth tokens (different format)
    // OAuth tokens are typically longer hex strings
    // Accept both formats
    if (!credentials.pat.startsWith('lin_api_') && credentials.pat.length < 32) {
      return {
        valid: false,
        error: 'Invalid Linear API key format. Key should start with "lin_api_" or be an OAuth token',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Linear GraphQL API
   *
   * For GraphQL queries, pass the query in options.body.query
   * Example:
   * {
   *   endpoint: '/graphql',
   *   method: 'POST',
   *   body: {
   *     query: 'query { viewer { id name email } }'
   *   }
   * }
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
            provider: 'linear',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL
      const url = `${this.baseUrl}${options.endpoint || '/graphql'}`;

      // Make request
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          ...this.getAuthHeaders(credentials),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Handle errors
      if (!response.ok) {
        const error = await this.parseError(response);
        return {
          success: false,
          error,
        };
      }

      // Parse response
      const data = await response.json();

      // GraphQL returns errors in a special format
      if (data.errors && data.errors.length > 0) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: data.errors[0].message || 'Linear API error',
            provider: 'linear',
            retryable: false,
            action: 'retry',
            details: data.errors,
          },
        };
      }

      return {
        success: true,
        data: data.data as T,
      };
    } catch (error) {
      // Network or unexpected errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          provider: 'linear',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Linear API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;

    const result = await this.request<{ viewer: { id: string; name: string; email: string } }>(
      credentials,
      {
        endpoint: '/graphql',
        method: 'POST',
        body: { query },
      }
    );

    if (result.success && result.data?.viewer) {
      return {
        success: true,
        username: result.data.viewer.email,
        metadata: {
          name: result.data.viewer.name,
          id: result.data.viewer.id,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse error from Linear API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      400: 'INVALID_REQUEST',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    // Extract error message from GraphQL errors if present
    let message = `Linear API error: ${response.status}`;
    if (errorData.errors && errorData.errors.length > 0) {
      message = errorData.errors[0].message;
    } else if (errorData.message) {
      message = errorData.message;
    }

    return {
      code,
      message,
      provider: 'linear',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: errorData,
    };
  }
}

// Export singleton instance
export const linearAdapter = new LinearAdapter();
