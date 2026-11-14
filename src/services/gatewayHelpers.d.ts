export const STORAGE_KEY_BACKEND_URL: string;
export const STORAGE_KEY_API_TOKEN: string;
export const STORAGE_KEY_CLIENT_ID: string;

export type GatewayErrorCode =
  | 'UNCONFIGURED'
  | 'COOKIE_GATEWAY_HTML'
  | 'HTML_RESPONSE'
  | 'INVALID_JSON'
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'AUTHENTICATION_REQUIRED'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED';

export class GatewayHttpError extends Error {
  code: GatewayErrorCode;
  status: number | null;
  connectionState: ConnectionState;
  retryable: boolean;
  url: string;
  constructor(
    message: string,
    opts?: {
      code?: GatewayErrorCode;
      status?: number | null;
      connectionState?: ConnectionState;
      retryable?: boolean;
      url?: string;
    }
  );
}

export interface UrlValidationResult {
  valid: boolean;
  normalized: string;
  isPreviewUrl: boolean;
  error?: string;
  warning?: string;
}

export function isAiStudioPreviewUrl(rawUrl: string): boolean;
export function normalizeBackendUrl(raw: string): string;
export function joinApiUrl(baseUrl: string, endpoint: string): string;
export function isLocalOrLanHost(hostname: string): boolean;
export function validateBackendUrl(raw: string, opts?: { isNative?: boolean }): UrlValidationResult;
export function detectNativePlatform(win?: any): boolean;
export function resolveApiBaseUrl(opts?: {
  storedUrl?: string;
  envUrl?: string;
  isNativePlatform?: boolean;
}): string;
export function looksLikeHtmlPayload(text: string, contentType?: string): boolean;
export function classifyResponseFailure(opts: {
  url: string;
  status: number;
  contentType?: string;
  bodyText?: string;
  redirected?: boolean;
  responseUrl?: string;
}): GatewayHttpError;
export function classifyNetworkException(
  err: unknown,
  url: string,
  opts?: { timedOut?: boolean; userAborted?: boolean }
): GatewayHttpError;
