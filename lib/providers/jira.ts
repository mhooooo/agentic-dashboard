/**
 * Jira Provider Adapter
 *
 * Implements API interactions with Jira Cloud REST API.
 * Supports Personal Access Tokens or API tokens with email.
 *
 * Note: This is a basic implementation. Full Jira support will be added in Phase 5.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  ApiError,
} from './types';

export class JiraAdapter implements ProviderAdapter {
  readonly name = 'jira' as const;
  readonly baseUrl = ''; // Set per-user (instance URL)

  /**
   * Get authentication headers for Jira API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.email || !credentials.pat) {
      throw new Error('Jira email and API token are required');
    }

    // Jira uses Basic Auth with email:token
    const auth = Buffer.from(`${credentials.email}:${credentials.pat}`).toString('base64');

    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate Jira credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.url) {
      return { valid: false, error: 'Jira instance URL is required' };
    }

    if (!credentials.email) {
      return { valid: false, error: 'Jira email is required' };
    }

    if (!credentials.pat) {
      return { valid: false, error: 'Jira API token is required' };
    }

    // Validate URL format
    try {
      new URL(credentials.url);
    } catch {
      return { valid: false, error: 'Invalid Jira URL format' };
    }

    return { valid: true };
  }

  /**
   * Make a request to Jira API
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
            provider: 'jira',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL with query parameters
      const baseUrl = credentials.url!.replace(/\/$/, ''); // Remove trailing slash
      const url = new URL(`${baseUrl}/rest/api/3${options.endpoint}`);

      if (options.params) {
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

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      // Network or unexpected errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          provider: 'jira',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Jira API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const result = await this.request<{ displayName: string; emailAddress: string }>(
      credentials,
      {
        endpoint: '/myself',
        method: 'GET',
      }
    );

    if (result.success && result.data) {
      return {
        success: true,
        username: result.data.emailAddress,
        metadata: {
          displayName: result.data.displayName,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse error from Jira API response
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
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    return {
      code,
      message: errorData.errorMessages?.[0] || errorData.message || `Jira API error: ${response.status}`,
      provider: 'jira',
      retryable: code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: errorData,
    };
  }
}

// Export singleton instance
export const jiraAdapter = new JiraAdapter();
