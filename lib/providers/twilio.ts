/**
 * Twilio Provider Adapter
 *
 * Implements API interactions with Twilio REST API.
 * Supports Account SID + Auth Token (Basic Authentication).
 *
 * Documentation: https://www.twilio.com/docs/usage/api
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

/**
 * Extended credentials for Twilio
 * Requires Account SID and Auth Token instead of PAT
 */
export interface TwilioCredentials extends ProviderCredentials {
  accountSid?: string;  // Account SID (starts with 'AC')
  authToken?: string;   // Auth Token (32 character hex string)
}

export class TwilioAdapter implements ProviderAdapter {
  readonly name = 'twilio' as const;
  readonly baseUrl = 'https://api.twilio.com';

  /**
   * Get authentication headers for Twilio API
   * Uses HTTP Basic Authentication with Account SID as username and Auth Token as password
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    const twilioCredentials = credentials as TwilioCredentials;

    if (!twilioCredentials.accountSid || !twilioCredentials.authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    // Twilio uses Basic Auth: base64(AccountSid:AuthToken)
    const authString = `${twilioCredentials.accountSid}:${twilioCredentials.authToken}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    return {
      'Authorization': `Basic ${base64Auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };
  }

  /**
   * Validate Twilio credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    const twilioCredentials = credentials as TwilioCredentials;

    if (!twilioCredentials.accountSid) {
      return { valid: false, error: 'Twilio Account SID is required' };
    }

    if (!twilioCredentials.authToken) {
      return { valid: false, error: 'Twilio Auth Token is required' };
    }

    // Account SID validation: starts with 'AC' and is 34 characters
    if (!twilioCredentials.accountSid.startsWith('AC')) {
      return {
        valid: false,
        error: 'Invalid Account SID format. Account SID should start with "AC"',
      };
    }

    if (twilioCredentials.accountSid.length !== 34) {
      return {
        valid: false,
        error: 'Invalid Account SID length. Account SID should be 34 characters',
      };
    }

    // Auth Token validation: 32 character hex string
    if (twilioCredentials.authToken.length !== 32) {
      return {
        valid: false,
        error: 'Invalid Auth Token length. Auth Token should be 32 characters',
      };
    }

    // Check if Auth Token is valid hex
    if (!/^[a-f0-9]{32}$/i.test(twilioCredentials.authToken)) {
      return {
        valid: false,
        error: 'Invalid Auth Token format. Auth Token should be a 32 character hexadecimal string',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Twilio API
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
            provider: 'twilio',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      const twilioCredentials = credentials as TwilioCredentials;

      // Build URL with query parameters for GET requests
      const url = new URL(`${this.baseUrl}${options.endpoint}`);
      if (options.method === 'GET' && options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Prepare request body for POST/PUT requests
      let body: string | undefined;
      if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
        // Twilio uses application/x-www-form-urlencoded for POST requests
        const params = new URLSearchParams();
        Object.entries(options.body).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        body = params.toString();
      }

      // Make request
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          ...this.getAuthHeaders(credentials),
          ...options.headers,
        },
        body,
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
          provider: 'twilio',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Twilio API
   * Uses the GET /2010-04-01/Accounts/{AccountSid}.json endpoint
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const twilioCredentials = credentials as TwilioCredentials;

    if (!twilioCredentials.accountSid) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Account SID is required',
          provider: 'twilio',
          retryable: false,
          action: 'reconnect',
        },
      };
    }

    const result = await this.request<{
      friendly_name: string;
      status: string;
      type: string;
    }>(credentials, {
      endpoint: `/2010-04-01/Accounts/${twilioCredentials.accountSid}.json`,
      method: 'GET',
    });

    if (result.success && result.data) {
      return {
        success: true,
        username: result.data.friendly_name,
        metadata: {
          account_status: result.data.status,
          account_type: result.data.type,
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
   * Twilio doesn't expose rate limits in standard headers, but we can handle retry-after
   */
  parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    const retryAfter = headers.get('retry-after');

    if (!retryAfter) {
      return undefined;
    }

    // retry-after is in seconds
    const retryAfterSeconds = parseInt(retryAfter, 10);
    const resetDate = new Date(Date.now() + retryAfterSeconds * 1000);

    return {
      limit: 1, // Twilio doesn't expose rate limits
      remaining: 0,
      reset: resetDate,
    };
  }

  /**
   * Parse error from Twilio API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Twilio returns errors in format: { code: 20003, message: "...", more_info: "..." }
    const twilioErrorCode = errorData.code;
    const twilioMessage = errorData.message || errorData.error || response.statusText;

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    // Specific Twilio error handling
    const errorMessages: Record<string, string> = {
      '20003': 'Authentication failed - check your Account SID and Auth Token',
      '20404': 'The requested resource was not found',
      '21211': 'Invalid phone number',
      '21608': 'The message body is required',
      '21610': 'Message cannot be sent to landline',
    };

    const message = twilioErrorCode && errorMessages[twilioErrorCode]
      ? errorMessages[twilioErrorCode]
      : twilioMessage;

    return {
      code,
      message: message || `Twilio API error: ${response.status}`,
      provider: 'twilio',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: {
        ...errorData,
        twilioErrorCode,
      },
    };
  }
}

// Export singleton instance
export const twilioAdapter = new TwilioAdapter();
