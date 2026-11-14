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
}

/**
 * Returns the effective backend base URL for API requests.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem('surya_backend_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const isCapacitorNative =
    typeof window !== 'undefined' &&
    ((window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80')));

  if (isCapacitorNative) {
    return 'https://ais-dev-spa3isctk6gboolsd6lpzr-833118415389.asia-east1.run.app';
  }

  return '';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (url && url.trim()) {
      window.localStorage.setItem('surya_backend_url', url.trim().replace(/\/+$/, ''));
    } else {
      window.localStorage.removeItem('surya_backend_url');
    }
  }
}

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(
      `Network connection failed to ${url}. Verify network access and backend host in System Settings: ${netErr.message || 'Unknown network error'}`
    );
  }

  const text = await res.text();

  if (text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html')) {
    throw new Error(
      `SURYA Backend Error: Received HTML webpage instead of JSON API from ${url} (HTTP ${res.status}). Ensure the SURYA backend server is running.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON received from ${url} (HTTP ${res.status}): ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Server returned status ${res.status}`);
  }

  return data;
}

export const apiService = {
  getApiBaseUrl,
  setApiBaseUrl,

  async sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    clientContext: ClientChatContext = {}
  ): Promise<{ text: string; model?: string; latencyMs?: number; suggestedAction?: any; timestamp: string }> {
    return requestJson('/api/chat', {
      method: 'POST',
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
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/chat/stream`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
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

      if (!res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('<') || text.includes('<!doctype')) {
          throw new Error(`Received HTML from ${url} (HTTP ${res.status}).`);
        }
        let parsed: any = {};
        try {
          parsed = JSON.parse(text);
        } catch {}
        throw new Error(parsed.error || `Stream failed with HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported on this device');
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
            accumulatedText += event.text;
            onChunk(accumulatedText);
          } else if (typeof event.chunk === 'string') {
            accumulatedText += event.chunk;
            onChunk(accumulatedText);
          } else if (event.type === 'error' || event.error) {
            throw new Error(event.error || 'Stream error received from SURYA engine');
          } else if (event.type === 'done' || event.done) {
            if (event.model) metaModel = event.model;
            totalTimeMs = event.totalTimeMs ?? event.latencyMs;
            ttftMs = ttftMs ?? event.firstTokenMs;
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

      return {
        text: accumulatedText,
        model: metaModel,
        latencyMs: totalTimeMs,
        ttftMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('SSE streaming unavailable, falling back to standard chat endpoint:', err.message);
      return this.sendChatMessage(message, history, clientContext);
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
    return requestJson(`/api/memory/${id}`, { method: 'DELETE' });
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
    return requestJson('/api/health');
  },

  async verifyGeminiConnection(): Promise<{ success: boolean; model: string; latencyMs: number; response: string }> {
    return requestJson('/api/config/api-key/verify', { method: 'POST' });
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
