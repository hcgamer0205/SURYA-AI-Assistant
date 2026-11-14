import {
  ChatMessage,
  StarkApp,
  AuditLog,
  WorldModelMemory,
  SystemHealthData,
  UpdateInfo,
  ScientificArticle,
  VisionAnalysisResult,
  GeneratedApp,
  GithubRepoSummary,
  ResponseMode,
} from '../types/surya';
import {
  STORAGE_KEY_BACKEND_URL,
  STORAGE_KEY_API_TOKEN,
  STORAGE_KEY_CLIENT_ID,
  GatewayHttpError,
  ConnectionState,
  UrlValidationResult,
  isAiStudioPreviewUrl,
  normalizeBackendUrl,
  joinApiUrl,
  validateBackendUrl,
  detectNativePlatform,
  resolveApiBaseUrl,
  looksLikeHtmlPayload,
  classifyResponseFailure,
  classifyNetworkException,
} from './gatewayHelpers.js';

export type { ConnectionState, UrlValidationResult };
export {
  GatewayHttpError,
  isAiStudioPreviewUrl,
  normalizeBackendUrl,
  joinApiUrl,
  validateBackendUrl,
  detectNativePlatform,
  resolveApiBaseUrl,
};

export interface VeronicaChallengeResponse {
  challengeId: string;
  actionId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresAuth: boolean;
  countdownSeconds: number;
  expiresAt: number;
}

export interface VeronicaAuthorizeResponse {
  success: boolean;
  authToken: string;
  challengeId: string;
  actionId: string;
  message: string;
}

export interface ClientChatContext {
  model?: string;
  fastMode?: boolean;
  responseMode?: ResponseMode;
  preferredLanguage?: string;
  userMemories?: { key: string; value: string; category?: string }[];
  deviceContext?: Record<string, any>;
  signal?: AbortSignal;
}

export interface ConnectionStatusSnapshot {
  state: ConnectionState;
  effectiveUrl: string;
  isConfigured: boolean;
  isNative: boolean;
  isPreviewUrl: boolean;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastHttpStatus: number | null;
  lastError: string | null;
  serverModel: string | null;
  authRequired: boolean;
  geminiConfigured: boolean | null;
}

const DEFAULT_TIMEOUT_MS = 25000;
const STREAM_TIMEOUT_MS = 65000;
const HEALTH_TIMEOUT_MS = 10000;

function readStorage(key: string): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  }
  return '';
}

function writeStorage(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (value && value.trim()) {
        window.localStorage.setItem(key, value.trim());
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage quota errors in restricted webviews
    }
  }
}

export function getOrCreateClientId(): string {
  const existing = readStorage(STORAGE_KEY_CLIENT_ID);
  if (existing && /^[a-zA-Z0-9._:-]{8,80}$/.test(existing)) {
    return existing;
  }
  let generated = `surya_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    generated = `surya_${crypto.randomUUID()}`;
  }
  writeStorage(STORAGE_KEY_CLIENT_ID, generated);
  return generated;
}

export function getEnvBackendUrl(): string {
  try {
    const envUrl = import.meta?.env?.VITE_API_BASE_URL || '';
    return typeof envUrl === 'string' ? normalizeBackendUrl(envUrl) : '';
  } catch {
    return '';
  }
}

export function getApiBaseUrl(): string {
  const stored = readStorage(STORAGE_KEY_BACKEND_URL);
  const envUrl = getEnvBackendUrl();
  const isNative = detectNativePlatform(typeof window !== 'undefined' ? window : undefined);
  return resolveApiBaseUrl({ storedUrl: stored, envUrl, isNativePlatform: isNative });
}

export function isBackendConfigured(): boolean {
  const isNative = detectNativePlatform(typeof window !== 'undefined' ? window : undefined);
  const effective = getApiBaseUrl();
  if (!isNative) return true; // Browser / web build uses explicit baseUrl or relative /api proxy
  return Boolean(effective);
}

export function getApiToken(): string {
  const stored = readStorage(STORAGE_KEY_API_TOKEN);
  if (stored) return stored;
  try {
    const envToken = import.meta?.env?.VITE_SURYA_API_TOKEN;
    return typeof envToken === 'string' ? envToken.trim() : '';
  } catch {
    return '';
  }
}

export function getMaskedApiToken(): string {
  const tok = getApiToken();
  if (!tok) return '';
  if (tok.length <= 8) return '****';
  return `${tok.slice(0, 3)}••••${tok.slice(-3)}`;
}

// Connection State Machine Store
const listeners = new Set<(snapshot: ConnectionStatusSnapshot) => void>();

function buildInitialSnapshot(): ConnectionStatusSnapshot {
  const isNative = detectNativePlatform(typeof window !== 'undefined' ? window : undefined);
  const effectiveUrl = getApiBaseUrl();
  const configured = isNative ? Boolean(effectiveUrl) : true;
  const preview = isAiStudioPreviewUrl(effectiveUrl);

  let initialError: string | null = null;
  if (!configured) {
    initialError =
      'No SURYA backend URL configured. Deploy server.ts to Cloud Run or enter your backend URL in System Settings.';
  } else if (preview) {
    initialError =
      'Configured URL points to an AI Studio preview host that enforces browser cookie checks and blocks mobile APKs.';
  }

  return {
    state: 'DISCONNECTED',
    effectiveUrl,
    isConfigured: configured,
    isNative,
    isPreviewUrl: preview,
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastHttpStatus: null,
    lastError: initialError,
    serverModel: null,
    authRequired: false,
    geminiConfigured: null,
  };
}

let connectionSnapshot: ConnectionStatusSnapshot = buildInitialSnapshot();

function notifyListeners(): void {
  const copy = { ...connectionSnapshot };
  listeners.forEach((fn) => {
    try {
      fn(copy);
    } catch {
      // Ignore subscriber render errors
    }
  });
}

function updateSnapshot(patch: Partial<ConnectionStatusSnapshot>): void {
  connectionSnapshot = {
    ...connectionSnapshot,
    ...patch,
  };
  notifyListeners();
}

export function getConnectionStatus(): ConnectionStatusSnapshot {
  return { ...connectionSnapshot };
}

export function subscribeConnectionState(
  listener: (snapshot: ConnectionStatusSnapshot) => void
): () => void {
  listeners.add(listener);
  listener({ ...connectionSnapshot });
  return () => {
    listeners.delete(listener);
  };
}

export function setApiBaseUrl(url: string): UrlValidationResult {
  const isNative = detectNativePlatform(typeof window !== 'undefined' ? window : undefined);
  const trimmed = typeof url === 'string' ? url.trim() : '';

  if (!trimmed) {
    writeStorage(STORAGE_KEY_BACKEND_URL, '');
    const effectiveUrl = getApiBaseUrl();
    const configured = isNative ? Boolean(effectiveUrl) : true;
    const preview = isAiStudioPreviewUrl(effectiveUrl);
    updateSnapshot({
      state: 'DISCONNECTED',
      effectiveUrl,
      isConfigured: configured,
      isPreviewUrl: preview,
      lastHttpStatus: null,
      lastError: configured
        ? preview
          ? 'Build-time backend URL points to an AI Studio preview host.'
          : 'Custom gateway cleared — run Test Connection to verify backend.'
        : 'Backend URL cleared. Android APK requires a deployed HTTPS SURYA backend URL.',
    });
    return {
      valid: true,
      normalized: effectiveUrl,
      isPreviewUrl: preview,
    };
  }

  const validation = validateBackendUrl(trimmed, { isNative });
  if (!validation.valid) {
    return validation;
  }

  writeStorage(STORAGE_KEY_BACKEND_URL, validation.normalized);
  const effectiveUrl = getApiBaseUrl();
  updateSnapshot({
    // Saving alone must NOT mark CONNECTED; test/health check must succeed.
    state: 'DISCONNECTED',
    effectiveUrl,
    isConfigured: isNative ? Boolean(effectiveUrl) : true,
    isPreviewUrl: validation.isPreviewUrl,
    lastHttpStatus: null,
    lastError:
      validation.warning || 'Gateway URL saved. Run Test Connection to verify reachability.',
  });
  return validation;
}

export function setApiToken(token: string): void {
  writeStorage(STORAGE_KEY_API_TOKEN, token ? token.trim() : '');
  updateSnapshot({
    state: 'DISCONNECTED',
    lastError: 'Access token updated. Run Test Connection to verify authorization.',
  });
}

function buildRequestHeaders(extraHeaders?: HeadersInit, isJsonBody = false, accept = 'application/json'): Headers {
  const headers = new Headers(extraHeaders || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', accept);
  }
  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-Surya-Client-Id')) {
    headers.set('X-Surya-Client-Id', getOrCreateClientId());
  }
  const token = getApiToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function buildEndpointUrl(endpoint: string): { url: string; baseUrl: string } {
  const isNative = detectNativePlatform(typeof window !== 'undefined' ? window : undefined);
  const baseUrl = getApiBaseUrl();

  if (isNative && !baseUrl) {
    const err = new GatewayHttpError(
      'SURYA backend URL is not configured for this Android APK. Open System > Health > Backend Server Gateway and enter your deployed HTTPS backend URL.',
      {
        code: 'UNCONFIGURED',
        status: null,
        connectionState: 'DISCONNECTED',
        retryable: false,
        url: endpoint,
      }
    );
    updateSnapshot({
      state: 'DISCONNECTED',
      effectiveUrl: '',
      isConfigured: false,
      lastCheckedAt: new Date().toISOString(),
      lastHttpStatus: null,
      lastError: err.message,
    });
    throw err;
  }

  return {
    baseUrl,
    url: joinApiUrl(baseUrl, endpoint),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  let userAborted = false;

  const onExternalAbort = () => {
    userAborted = true;
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      userAborted = true;
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    throw classifyNetworkException(err, url, { timedOut, userAborted });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

async function requestJson<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const { url } = buildEndpointUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : isIdempotent ? 2 : 1;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const hasJsonBody = typeof options.body === 'string';
  const headers = buildRequestHeaders(options.headers, hasJsonBody, 'application/json');

  let attempt = 0;
  let lastError: GatewayHttpError | null = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          ...options,
          headers,
        },
        timeoutMs,
        options.signal ?? undefined
      );

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      if (looksLikeHtmlPayload(text, contentType)) {
        throw classifyResponseFailure({
          url,
          status: res.status,
          contentType,
          bodyText: text,
          redirected: res.redirected,
          responseUrl: res.url,
        });
      }

      if (!res.ok) {
        throw classifyResponseFailure({
          url,
          status: res.status,
          contentType,
          bodyText: text,
          redirected: res.redirected,
          responseUrl: res.url,
        });
      }

      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new GatewayHttpError(`Invalid JSON received from ${url} (HTTP ${res.status}): ${text.slice(0, 100)}`, {
          code: 'INVALID_JSON',
          status: res.status,
          connectionState: 'SERVER_ERROR',
          retryable: false,
          url,
        });
      }

      if (endpoint === '/api/health') {
        const now = new Date().toISOString();
        updateSnapshot({
          state: 'CONNECTED',
          effectiveUrl: getApiBaseUrl(),
          isConfigured: isBackendConfigured(),
          isPreviewUrl: isAiStudioPreviewUrl(getApiBaseUrl()),
          lastCheckedAt: now,
          lastSuccessAt: now,
          lastHttpStatus: res.status,
          lastError: null,
          serverModel: data?.activeModel || null,
          authRequired: Boolean(data?.authRequired),
          geminiConfigured: typeof data?.geminiConfigured === 'boolean' ? data.geminiConfigured : null,
        });
      } else if (connectionSnapshot.state !== 'CONNECTED') {
        const now = new Date().toISOString();
        updateSnapshot({
          state: 'CONNECTED',
          lastCheckedAt: now,
          lastSuccessAt: now,
          lastHttpStatus: res.status,
          lastError: null,
        });
      }

      return data as T;
    } catch (err: any) {
      const gwErr =
        err instanceof GatewayHttpError
          ? err
          : classifyNetworkException(err, url);
      lastError = gwErr;

      // Update connection state machine for non-abort failures
      if (gwErr.code !== 'ABORTED') {
        updateSnapshot({
          state: gwErr.connectionState,
          effectiveUrl: getApiBaseUrl(),
          isConfigured: isBackendConfigured(),
          isPreviewUrl: isAiStudioPreviewUrl(getApiBaseUrl()),
          lastCheckedAt: new Date().toISOString(),
          lastHttpStatus: gwErr.status,
          lastError: gwErr.message,
        });
      }

      // Only retry transient network/timeout/502/503/504 errors within bound
      if (!gwErr.retryable || attempt >= maxRetries) {
        throw gwErr;
      }

      const backoffMs = 300 * Math.pow(2, attempt);
      attempt += 1;
      await sleep(backoffMs);
    }
  }

  throw lastError || new GatewayHttpError('Unknown backend request error', { url });
}

export async function checkBackendConnection(): Promise<SystemHealthData> {
  updateSnapshot({
    state: 'CONNECTING',
    effectiveUrl: getApiBaseUrl(),
    isConfigured: isBackendConfigured(),
    isPreviewUrl: isAiStudioPreviewUrl(getApiBaseUrl()),
    lastCheckedAt: new Date().toISOString(),
    lastError: null,
  });

  return requestJson<SystemHealthData>('/api/health', {
    method: 'GET',
    timeoutMs: HEALTH_TIMEOUT_MS,
    maxRetries: 1,
  });
}

export const apiService = {
  getApiBaseUrl,
  setApiBaseUrl,
  getApiToken,
  setApiToken,
  getMaskedApiToken,
  getOrCreateClientId,
  isBackendConfigured,
  getConnectionStatus,
  subscribeConnectionState,
  checkBackendConnection,
  validateBackendUrl,
  normalizeBackendUrl,
  joinApiUrl,
  isAiStudioPreviewUrl,

  async sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    clientContext: ClientChatContext = {}
  ): Promise<{ text: string; model?: string; latencyMs?: number; suggestedAction?: any; timestamp: string }> {
    return requestJson('/api/chat', {
      method: 'POST',
      signal: clientContext.signal,
      body: JSON.stringify({
        message,
        history,
        model: clientContext?.model || 'gemini-4-hydrogen',
        fastMode: clientContext?.fastMode ?? (clientContext?.responseMode !== 'detailed'),
        responseMode: clientContext?.responseMode || 'concise',
        preferredLanguage: clientContext?.preferredLanguage || 'auto',
        userMemories: clientContext?.userMemories || [],
        deviceContext: clientContext?.deviceContext,
      }),
    });
  },

  /**
   * Real-time Server-Sent Events (SSE) chat streaming aligned cleanly with server.ts event frames
   * ({ type: 'start' | 'ttft' | 'chunk' | 'fallback' | 'done' | 'error' }).
   */
  async sendChatMessageStream(
    message: string,
    history: ChatMessage[] = [],
    onChunk: (accumulatedText: string) => void,
    clientContext: ClientChatContext = {}
  ): Promise<{ text: string; model?: string; latencyMs?: number; ttftMs?: number; timestamp: string }> {
    const { url } = buildEndpointUrl('/api/chat/stream');
    const headers = buildRequestHeaders(undefined, true, 'text/event-stream');

    let receivedAnyChunk = false;

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            history,
            model: clientContext?.model || 'gemini-4-hydrogen',
            fastMode: clientContext?.fastMode ?? (clientContext?.responseMode !== 'detailed'),
            responseMode: clientContext?.responseMode || 'concise',
            preferredLanguage: clientContext?.preferredLanguage || 'auto',
            userMemories: clientContext?.userMemories || [],
            deviceContext: clientContext?.deviceContext,
          }),
        },
        STREAM_TIMEOUT_MS,
        clientContext.signal
      );

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        const text = await res.text();
        const gwErr = classifyResponseFailure({
          url,
          status: res.status,
          contentType,
          bodyText: text,
          redirected: res.redirected,
          responseUrl: res.url,
        });
        updateSnapshot({
          state: gwErr.connectionState,
          lastCheckedAt: new Date().toISOString(),
          lastHttpStatus: gwErr.status,
          lastError: gwErr.message,
        });
        throw gwErr;
      }

      if (looksLikeHtmlPayload('', contentType)) {
        const gwErr = classifyResponseFailure({
          url,
          status: res.status,
          contentType,
          bodyText: '<!doctype html>',
          redirected: res.redirected,
          responseUrl: res.url,
        });
        updateSnapshot({
          state: gwErr.connectionState,
          lastCheckedAt: new Date().toISOString(),
          lastHttpStatus: gwErr.status,
          lastError: gwErr.message,
        });
        throw gwErr;
      }

      if (!res.body) {
        // Transport-level limitation (no ReadableStream) — fall back to /api/chat
        return this.sendChatMessage(message, history, clientContext);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let metaModel = clientContext?.model || 'gemini-4-hydrogen';
      let ttftMs: number | undefined;
      let totalTimeMs: number | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (event.type === 'start' && event.model) {
            metaModel = event.model;
          } else if (event.type === 'fallback' && event.fallbackModel) {
            metaModel = event.fallbackModel;
          } else if (event.type === 'ttft' && typeof event.ttftMs === 'number') {
            ttftMs = event.ttftMs;
          } else if (event.type === 'chunk' && typeof event.text === 'string') {
            receivedAnyChunk = true;
            accumulatedText += event.text;
            onChunk(accumulatedText);
          } else if (typeof event.chunk === 'string') {
            receivedAnyChunk = true;
            accumulatedText += event.chunk;
            onChunk(accumulatedText);
          } else if (event.type === 'error' || event.error) {
            throw new GatewayHttpError(event.error || 'Stream error received from SURYA engine', {
              code: 'SERVER_ERROR',
              connectionState: 'SERVER_ERROR',
              retryable: false,
              url,
            });
          } else if (event.type === 'done' || event.done) {
            if (event.model) metaModel = event.model;
            totalTimeMs = event.totalTimeMs ?? event.latencyMs;
            ttftMs = ttftMs ?? event.firstTokenMs;
            updateSnapshot({
              state: 'CONNECTED',
              lastSuccessAt: new Date().toISOString(),
              lastCheckedAt: new Date().toISOString(),
              lastHttpStatus: 200,
              lastError: null,
            });
            return {
              text: accumulatedText || event.fullText || '',
              model: metaModel,
              latencyMs: totalTimeMs || 0,
              ttftMs,
              timestamp: new Date().toISOString(),
            };
          }
        }
      }

      if (accumulatedText) {
        updateSnapshot({
          state: 'CONNECTED',
          lastSuccessAt: new Date().toISOString(),
          lastCheckedAt: new Date().toISOString(),
          lastHttpStatus: 200,
          lastError: null,
        });
      }

      return {
        text: accumulatedText,
        model: metaModel,
        latencyMs: totalTimeMs,
        ttftMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      // Never hide auth, rate-limit, cookie-gateway, HTML, unconfigured, or user-aborted errors
      if (err instanceof GatewayHttpError) {
        if (
          err.code === 'UNCONFIGURED' ||
          err.code === 'AUTH_REQUIRED' ||
          err.code === 'RATE_LIMITED' ||
          err.code === 'COOKIE_GATEWAY_HTML' ||
          err.code === 'HTML_RESPONSE' ||
          err.code === 'NOT_FOUND' ||
          err.code === 'ABORTED'
        ) {
          throw err;
        }
      }

      // If stream broke mid-way without chunks because SSE proxy wasn't supported, try single JSON chat request
      if (!receivedAnyChunk) {
        return this.sendChatMessage(message, history, clientContext);
      }

      throw err;
    }
  },

  // Optics & Multimodal Vision
  async analyzeOpticalScene(
    imageBase64: string,
    prompt?: string
  ): Promise<{ telemetry: string; timestamp: string }> {
    return requestJson('/api/vision', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, prompt }),
    });
  },

  async analyzeVisionStructured(
    imageBase64: string,
    mode: 'general' | 'ocr' | 'translate' | 'document' | 'qr' = 'general',
    targetLanguage = 'English'
  ): Promise<{ success: boolean; analysis: VisionAnalysisResult; timestamp: string }> {
    return requestJson('/api/vision/analyze', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mode, targetLanguage }),
    });
  },

  async askVisionQuestion(
    imageBase64: string | null,
    question: string,
    history: ChatMessage[] = []
  ): Promise<{ answer: string; timestamp: string }> {
    return requestJson('/api/vision/chat', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, question, history }),
    });
  },

  // Veronica Security
  async requestVeronicaChallenge(actionId: string): Promise<VeronicaChallengeResponse> {
    return requestJson('/api/veronica/challenge', {
      method: 'POST',
      body: JSON.stringify({ actionId }),
    });
  },

  async authorizeVeronicaChallenge(
    challengeId: string,
    authMethod: string,
    clientSignature?: string
  ): Promise<VeronicaAuthorizeResponse> {
    return requestJson('/api/veronica/authorize', {
      method: 'POST',
      body: JSON.stringify({ challengeId, authMethod, clientSignature }),
    });
  },

  async abortVeronicaChallenge(challengeId?: string, reason?: string): Promise<{ success: boolean; aborted: boolean }> {
    return requestJson('/api/veronica/abort', {
      method: 'POST',
      body: JSON.stringify({ challengeId, reason }),
    });
  },

  // Stark App Link Hub
  async getStarkApps(): Promise<{ apps: StarkApp[]; count: number }> {
    return requestJson('/api/apps');
  },

  async launchStarkApp(
    appId: string,
    customParam?: string,
    challengeId?: string,
    authToken?: string
  ): Promise<{ success: boolean; message: string; intentUrl: string; auditId?: string }> {
    return requestJson('/api/apps/launch', {
      method: 'POST',
      body: JSON.stringify({ appId, customParam, challengeId, authToken }),
    });
  },

  // SURYA Studio Apps & GitHub Monitor
  async getStudioApps(): Promise<{ apps: GeneratedApp[]; count: number }> {
    return requestJson('/api/studio/apps');
  },

  async generateStudioApp(
    prompt: string,
    appName = 'Solar Custom App',
    category = 'Productivity'
  ): Promise<{ success: boolean; app: GeneratedApp; message: string }> {
    return requestJson('/api/apps/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, appName, category }),
    });
  },

  async modifyStudioApp(id: string, prompt: string): Promise<{ success: boolean; app: GeneratedApp; message: string }> {
    return requestJson(`/api/apps/${encodeURIComponent(id)}/modify`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  async deleteStudioApp(id: string): Promise<{ success: boolean; remaining: number }> {
    return requestJson(`/api/apps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async debugStudioApp(
    html: string,
    errorLog = '',
    description = ''
  ): Promise<{ success: boolean; diagnosis: string; fixes: string[]; patchedHtml: string }> {
    return requestJson('/api/apps/debug', {
      method: 'POST',
      body: JSON.stringify({ html, errorLog, description }),
    });
  },

  async inspectGithubRepo(repo = 'hcgamer0205/SURYA-AI-Assistant'): Promise<GithubRepoSummary> {
    return requestJson(`/api/studio/github?repo=${encodeURIComponent(repo)}`);
  },

  // Multi-Agent Orchestration
  async orchestrateGoal(
    goal: string,
    userContext = ''
  ): Promise<{
    success: boolean;
    plan: {
      intent?: string;
      summary?: string;
      subtasks?: {
        order: number;
        title: string;
        agent: string;
        actionType?: string;
        actionPayload?: string;
        requiresApproval?: boolean;
      }[];
    };
    timestamp: string;
  }> {
    return requestJson('/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({ goal, userContext }),
    });
  },

  // Personal World Model
  async getMemories(): Promise<{ memories: WorldModelMemory[]; count: number }> {
    return requestJson('/api/memory');
  },

  async addMemory(
    key: string,
    value: string,
    category: WorldModelMemory['category'] = 'fact'
  ): Promise<{ success: boolean; created?: WorldModelMemory }> {
    return requestJson('/api/memory', {
      method: 'POST',
      body: JSON.stringify({ key, value, category }),
    });
  },

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    return requestJson(`/api/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async clearAllMemories(): Promise<{ success: boolean }> {
    return requestJson('/api/memory/clear', { method: 'POST' });
  },

  // Veronica Security Audit Logs & Posture
  async getAuditLogs(): Promise<{ logs: AuditLog[]; totalCount: number }> {
    return requestJson('/api/veronica/audit');
  },

  async recordAuditLog(
    action: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    status: AuditLog['status'],
    details: string
  ): Promise<any> {
    return requestJson('/api/veronica/audit', {
      method: 'POST',
      body: JSON.stringify({ action, riskLevel, status, details }),
    });
  },

  async getSecurityReport(): Promise<{
    serverCredentialsIsolated: boolean;
    geminiKeyConfigured: boolean;
    authTokenEnforced?: boolean;
    perUserMemoryIsolation?: boolean;
    corsPolicy: string;
    rateLimitingActive: boolean;
    veronicaChallengeCount: number;
    auditLogCount: number;
    sensitiveDataRedactionActive: boolean;
    noCovertRecordingGuarantee: boolean;
    sandboxedStudioIsolation: boolean;
    timestamp: string;
  }> {
    return requestJson('/api/security/report');
  },

  // System Health & Diagnostics
  async getSystemHealth(): Promise<SystemHealthData> {
    return checkBackendConnection();
  },

  async verifyGeminiConnection(): Promise<{
    success: boolean;
    model: string;
    fallbackUsed?: boolean;
    latencyMs: number;
    response: string;
  }> {
    return requestJson('/api/config/api-key/verify', { method: 'POST', timeoutMs: 25000 });
  },

  // Auto-Update Check & Cryptographic Verification
  async checkForUpdates(): Promise<UpdateInfo> {
    return requestJson('/api/updates/check');
  },

  async verifyApkChecksum(sha256: string, targetVersion = '1.3.1'): Promise<{ valid: boolean; status: string }> {
    return requestJson('/api/updates/verify', {
      method: 'POST',
      body: JSON.stringify({ sha256, targetVersion }),
    });
  },

  // Scientific Knowledge
  async getScientificArticles(query?: string): Promise<{ articles: ScientificArticle[] }> {
    const url = query ? `/api/knowledge?query=${encodeURIComponent(query)}` : '/api/knowledge';
    return requestJson(url);
  },

  async getSelfImprovementReport(): Promise<{ report: string; timestamp: string }> {
    return requestJson('/api/diagnostics/improve', { method: 'POST' });
  },
};
