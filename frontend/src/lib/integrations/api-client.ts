/**
 * 🌐 Base API Client
 *
 * Robust HTTP client for cross-service communication.
 *
 * Made by mbxarts.com The Moon in a Box property
 * Co-Author: Godez22
 */

import { RETRY_CONFIG, TIMEOUTS, generateRequestId } from './config';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  noRetry?: boolean;
  internalApiKey?: string;
  walletAddress?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    duration: number;
    retries: number;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

function isRetryableError(status: number): boolean {
  return (RETRY_CONFIG.retryableStatuses as readonly number[]).includes(status);
}

// =============================================================================
// MAIN API CLIENT
// =============================================================================

export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = TIMEOUTS.default,
    retries = RETRY_CONFIG.maxRetries,
    noRetry = false,
    internalApiKey,
    walletAddress,
  } = options;

  const requestId = generateRequestId();
  const startTime = Date.now();
  let lastError: Error | null = null;
  let attemptCount = 0;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...headers,
  };

  if (internalApiKey) {
    requestHeaders['X-API-Key'] = internalApiKey;
  }
  if (walletAddress) {
    requestHeaders['X-Wallet-Address'] = walletAddress;
  }

  const maxAttempts = noRetry ? 1 : retries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attemptCount = attempt + 1;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMessage = typeof responseData === 'object' && responseData !== null
          ? (responseData as Record<string, unknown>).error || (responseData as Record<string, unknown>).message || 'Request failed'
          : 'Request failed';

        if (isRetryableError(response.status) && attempt < maxAttempts - 1) {
          lastError = new Error(String(errorMessage));
          const backoff = calculateBackoff(attempt);
          await sleep(backoff);
          continue;
        }

        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: String(errorMessage),
            details: responseData,
          },
          meta: { requestId, duration, retries: attemptCount - 1 },
        };
      }

      return {
        success: true,
        data: responseData as T,
        meta: { requestId, duration, retries: attemptCount - 1 },
      };
    } catch (error) {
      lastError = error as Error;

      if ((error as Error).name === 'AbortError') {
        if (attempt < maxAttempts - 1) {
          await sleep(calculateBackoff(attempt));
          continue;
        }
        return {
          success: false,
          error: { code: 'TIMEOUT', message: `Request timed out after ${timeout}ms` },
          meta: { requestId, duration: Date.now() - startTime, retries: attemptCount - 1 },
        };
      }

      if (attempt < maxAttempts - 1) {
        await sleep(calculateBackoff(attempt));
        continue;
      }
    }
  }

  return {
    success: false,
    error: { code: 'MAX_RETRIES', message: lastError?.message || 'Max retries exceeded' },
    meta: { requestId, duration: Date.now() - startTime, retries: attemptCount - 1 },
  };
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

export async function apiGet<T = unknown>(
  url: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { ...options, method: 'GET' });
}

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { ...options, method: 'POST', body });
}

export async function apiPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { ...options, method: 'PATCH', body });
}
