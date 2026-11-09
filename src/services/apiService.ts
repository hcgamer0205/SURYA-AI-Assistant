import {
  ChatMessage,
  StarkApp,
  AuditLog,
  WorldModelMemory,
  SystemHealthData,
  UpdateInfo,
  ScientificArticle,
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

export const apiService = {
  // Chat & AI Assistant
  async sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    clientContext = {}
  ): Promise<{ text: string; suggestedAction?: any; timestamp: string }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, clientContext }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with status ${res.status}`);
    }
    return res.json();
  },

  // Standard Optics Multimodal Vision
  async analyzeOpticalScene(
    imageBase64: string,
    prompt?: string
  ): Promise<{ telemetry: string; timestamp: string }> {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process optical telemetry.');
    }
    return res.json();
  },

  // Veronica Security Challenge Workflow
  async requestVeronicaChallenge(actionId: string): Promise<VeronicaChallengeResponse> {
    const res = await fetch('/api/veronica/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initiate Veronica challenge.');
    return data;
  },

  async authorizeVeronicaChallenge(
    challengeId: string,
    authMethod: string,
    clientSignature?: string
  ): Promise<VeronicaAuthorizeResponse> {
    const res = await fetch('/api/veronica/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, authMethod, clientSignature }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification clearance rejected.');
    return data;
  },

  async abortVeronicaChallenge(challengeId?: string, reason?: string): Promise<{ success: boolean; aborted: boolean }> {
    const res = await fetch('/api/veronica/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, reason }),
    });
    return res.json();
  },

  // Stark App Link Hub
  async getStarkApps(): Promise<{ apps: StarkApp[]; count: number }> {
    const res = await fetch('/api/apps');
    if (!res.ok) throw new Error('Failed to load Stark App catalog.');
    return res.json();
  },

  async launchStarkApp(
    appId: string,
    customParam?: string,
    challengeId?: string,
    authToken?: string
  ): Promise<{ success: boolean; message: string; intentUrl: string; auditId?: string }> {
    const res = await fetch('/api/apps/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, customParam, challengeId, authToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Intent dispatch rejected.');
    }
    return data;
  },

  // Personal World Model
  async getMemories(): Promise<{ memories: WorldModelMemory[]; count: number }> {
    const res = await fetch('/api/memory');
    if (!res.ok) throw new Error('Failed to fetch World Model memories.');
    return res.json();
  },

  async addMemory(
    key: string,
    value: string,
    category: WorldModelMemory['category'] = 'fact'
  ): Promise<{ success: boolean; created?: WorldModelMemory }> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, category }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save memory.');
    return data;
  },

  async deleteMemory(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete memory.');
    return res.json();
  },

  async clearAllMemories(): Promise<{ success: boolean }> {
    const res = await fetch('/api/memory/clear', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear World Model.');
    return res.json();
  },

  // Veronica Security Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLog[]; totalCount: number }> {
    const res = await fetch('/api/veronica/audit');
    if (!res.ok) throw new Error('Failed to fetch Veronica audit logs.');
    return res.json();
  },

  async recordAuditLog(
    action: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    status: AuditLog['status'],
    details: string
  ): Promise<any> {
    const res = await fetch('/api/veronica/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, riskLevel, status, details }),
    });
    return res.json();
  },

  // System Health & Diagnostics
  async getSystemHealth(): Promise<SystemHealthData> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Failed to query system health telemetry.');
    return res.json();
  },

  async verifyGeminiConnection(): Promise<{ success: boolean; model: string; latencyMs: number; response: string }> {
    const res = await fetch('/api/config/api-key/verify', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gemini verification ping failed.');
    }
    return data;
  },

  // Auto-Update Check & Cryptographic Verification
  async checkForUpdates(): Promise<UpdateInfo> {
    const res = await fetch('/api/updates/check');
    if (!res.ok) throw new Error('Failed to check for APK updates.');
    return res.json();
  },

  async verifyApkChecksum(sha256: string, targetVersion = '1.2.1'): Promise<{ valid: boolean; status: string }> {
    const res = await fetch('/api/updates/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha256, targetVersion }),
    });
    return res.json();
  },

  // Scientific Knowledge
  async getScientificArticles(query?: string): Promise<{ articles: ScientificArticle[] }> {
    const url = query ? `/api/knowledge?query=${encodeURIComponent(query)}` : '/api/knowledge';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load scientific knowledge database.');
    return res.json();
  },

  // Controlled AI Self-Improvement
  async getSelfImprovementReport(): Promise<{ report: string; timestamp: string }> {
    const res = await fetch('/api/diagnostics/improve', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate diagnostic improvement report.');
    return res.json();
  },
};
