/**
 * GitHub Provider Adapter
 *
 * Implements API interactions with GitHub REST API v3.
 * Supports Personal Access Tokens (PATs) for authentication.
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

export class GitHubAdapter implements ProviderAdapter {
  readonly name = 'github' as const;
  readonly baseUrl = 'https://api.github.com';

  /**
   * Get authentication headers for GitHub API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('GitHub PAT is required');
    }

    return {
      'Authorization': `Bearer ${credentials.pat}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /**
   * Validate GitHub credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'GitHub Personal Access Token is required' };
    }

    // GitHub PATs start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    if (!credentials.pat.startsWith('ghp_') && !credentials.pat.startsWith('github_pat_')) {
      return {
        valid: false,
        error: 'Invalid GitHub token format. Token should start with "ghp_" or "github_pat_"',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to GitHub API
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
            provider: 'github',
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
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
          provider: 'github',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with GitHub API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const result = await this.request<{ login: string; name: string }>(credentials, {
      endpoint: '/user',
      method: 'GET',
    });

    if (result.success && result.data) {
      return {
        success: true,
        username: result.data.login,
        metadata: {
          name: result.data.name,
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
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (!limit || !remaining || !reset) {
      return undefined;
    }

    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: new Date(parseInt(reset, 10) * 1000),
    };
  }

  /**
   * Parse error from GitHub API response
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
      422: 'INVALID_REQUEST',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';
    const isRateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';

    return {
      code: isRateLimited ? 'RATE_LIMITED' : code,
      message: errorData.message || `GitHub API error: ${response.status}`,
      provider: 'github',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: errorData,
    };
  }
}

// Export singleton instance
export const githubAdapter = new GitHubAdapter();
