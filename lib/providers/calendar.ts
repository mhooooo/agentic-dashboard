/**
 * Google Calendar Provider Adapter
 *
 * Implements API interactions with Google Calendar API v3.
 * Supports OAuth 2.0 tokens for authentication.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  ApiError,
} from './types';

export class CalendarAdapter implements ProviderAdapter {
  readonly name = 'calendar' as const;
  readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  /**
   * Get authentication headers for Google Calendar API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('Google Calendar OAuth token is required');
    }

    return {
      'Authorization': `Bearer ${credentials.pat}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate Google Calendar credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'Google Calendar OAuth token is required' };
    }

    // Google OAuth tokens start with 'ya29.'
    if (!credentials.pat.startsWith('ya29.')) {
      return {
        valid: false,
        error: 'Invalid Google Calendar token format. Token should start with "ya29."',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Google Calendar API
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
            provider: 'calendar',
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
          provider: 'calendar',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Google Calendar API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    // Test by fetching calendar list
    const result = await this.request<{ items: Array<{ id: string; summary: string }> }>(
      credentials,
      {
        endpoint: '/users/me/calendarList',
        method: 'GET',
        params: { maxResults: 1 },
      }
    );

    if (result.success && result.data) {
      const primaryCalendar = result.data.items?.[0];
      return {
        success: true,
        username: primaryCalendar?.summary || 'Primary Calendar',
        metadata: {
          calendarId: primaryCalendar?.id,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse error from Google Calendar API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
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

    // Extract error message from Google's error format
    let message = `Google Calendar API error: ${response.status}`;
    if (errorData.error?.message) {
      message = errorData.error.message;
    } else if (errorData.error?.errors?.[0]?.message) {
      message = errorData.error.errors[0].message;
    }

    return {
      code,
      message,
      provider: 'calendar',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: errorData,
    };
  }
}

// Export singleton instance
export const calendarAdapter = new CalendarAdapter();
