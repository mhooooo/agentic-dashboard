/**
 * Provider Adapter Types
 *
 * Defines the interface for external API providers (GitHub, Jira, Slack).
 * Each provider implements this interface to standardize API interactions.
 */

/**
 * Supported provider names
 */
export type ProviderName = 'github' | 'jira' | 'slack';

/**
 * Stored credentials for a provider
 */
export interface ProviderCredentials {
  pat?: string; // Personal Access Token
  email?: string; // User email (for Jira)
  url?: string; // Instance URL (for Jira)
  [key: string]: any; // Additional provider-specific fields
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  endpoint: string; // API endpoint path (e.g., '/repos/owner/repo/pulls')
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, any>; // Query parameters
  body?: any; // Request body (for POST/PUT/PATCH)
  headers?: Record<string, string>; // Additional headers
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  rateLimit?: RateLimitInfo;
}

/**
 * Standardized API error
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  provider: ProviderName;
  retryable: boolean;
  action?: 'reconnect' | 'retry' | 'contact-support';
  details?: any;
}

/**
 * Error codes for consistent error handling
 */
export type ErrorCode =
  | 'MISSING_CREDENTIALS'
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  username?: string;
  error?: ApiError;
  metadata?: Record<string, any>;
}

/**
 * Provider Adapter Interface
 *
 * All provider adapters must implement this interface.
 */
export interface ProviderAdapter {
  /**
   * Provider name
   */
  readonly name: ProviderName;

  /**
   * Base URL for the provider API
   */
  readonly baseUrl: string;

  /**
   * Get authentication headers for requests
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string>;

  /**
   * Make an API request to the provider
   */
  request<T = any>(
    credentials: ProviderCredentials,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>>;

  /**
   * Test connection with the provider
   */
  testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult>;

  /**
   * Parse rate limit information from response headers
   */
  parseRateLimit?(headers: Headers): RateLimitInfo | undefined;

  /**
   * Validate credentials format before making requests
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string };
}

/**
 * Webhook payload from provider
 */
export interface WebhookPayload {
  provider: ProviderName;
  eventType: string;
  payload: any;
  signature?: string;
  deliveryId?: string;
}

/**
 * Webhook verification result
 */
export interface WebhookVerification {
  valid: boolean;
  error?: string;
}
