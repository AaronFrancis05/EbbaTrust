import { Platform } from 'react-native';

/**
 * Typed client for the EbbaTrust backend API.
 *
 * This is the app's only route to data. The app does not query the database — it asks the
 * service, which owns the rules that decide money and verification state. AGENTS.md 4.1, 4.6.
 */

/**
 * Where the API lives. `EXPO_PUBLIC_API_URL` wins; otherwise we guess a local dev backend.
 *
 * The Android emulator reaches the host machine at 10.0.2.2, not localhost — localhost inside
 * the emulator is the emulator. This is the single most common "works on iOS, not Android"
 * cause in Expo development, so it is handled here rather than rediscovered later.
 */
function defaultBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.trim() !== '') return configured.replace(/\/+$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

export const API_BASE_URL = defaultBaseUrl();

/** Anything the API said no to, or that never reached it. */
export class ApiError extends Error {
  readonly status: number;
  /** A timeout or a dropped connection, rather than a refusal. Worth offering a retry. */
  readonly isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Supabase access token from phone OTP sign-in. The API verifies it on every request. */
  accessToken?: string;
  /** Assume a slow connection; 15s before we call it a failure. AGENTS.md 5.5. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken === undefined ? {} : { Authorization: `Bearer ${accessToken}` }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch (cause) {
    // A failed request is never swallowed or treated as an empty result: in this app that
    // reads as "nothing wrong with this title". AGENTS.md 4.5.
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError(
      aborted ? 'The request timed out.' : 'Could not reach the server.',
      0,
      true
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const payload: unknown = await response.json();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof (payload as { message: unknown }).message === 'string'
      ) {
        message = (payload as { message: string }).message;
      }
    } catch {
      // A non-JSON error body is not itself an error — keep the status-based message.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  adapterMode: 'mock' | 'live';
  /** True while adapters are mocked. Drives the "Demo data" notice. AGENTS.md 5.3. */
  demoData: boolean;
}

export function getHealth(options?: RequestOptions): Promise<HealthResponse> {
  return request<HealthResponse>('/health', options);
}
