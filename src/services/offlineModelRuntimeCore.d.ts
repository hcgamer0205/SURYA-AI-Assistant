import {
  OfflineModelManifest,
  DeviceHardwareSnapshot,
  ModelCompatibilityAssessment,
} from './offlineModelHelpers.js';

export type ModelDownloadStatus =
  | 'not_downloaded'
  | 'awaiting_confirmation'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'ready'
  | 'failed'
  | 'corrupted';

export interface ModelDownloadRecord {
  modelId: string;
  fileName?: string;
  status: ModelDownloadStatus;
  downloadedBytes: number;
  totalBytes: number;
  progressPercent: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  sha256: string | null;
  verificationStatus: string;
  localPath: string | null;
  error: string | null;
  updatedAt: string | null;
}

export class LocalRuntimeError extends Error {
  code: string;
  constructor(code: string, message: string);
}

export class ModelDownloadManager {
  constructor(options?: Record<string, any>);
  subscribe(listener: (states: Record<string, ModelDownloadRecord>) => void): () => void;
  getModel(modelId: string): OfflineModelManifest | null;
  getState(modelId: string): ModelDownloadRecord;
  getAllStates(): Record<string, ModelDownloadRecord>;
  getDownloadedModels(): ModelDownloadRecord[];
  getTotalDownloadedBytes(): number;
  requestDownloadConfirmation(modelId: string): {
    model: OfflineModelManifest;
    assessment: ModelCompatibilityAssessment;
    record: ModelDownloadRecord;
  };
  cancelConfirmation(modelId: string): void;
  confirmAndStartDownload(
    modelId: string,
    options: { explicitConfirmed: boolean }
  ): Promise<ModelDownloadRecord>;
  pauseDownload(modelId: string): void;
  resumeDownload(modelId: string): Promise<ModelDownloadRecord>;
  cancelDownload(modelId: string): Promise<void>;
  verifyDownloadedModel(modelId: string): Promise<{ valid: boolean; sha256?: string; reason?: string }>;
  deleteModel(modelId: string): Promise<boolean>;
  syncNativeDownloadEvent(detail: Partial<ModelDownloadRecord> & { modelId: string }): void;
  syncNativeModelInventory(nativeList: Partial<ModelDownloadRecord>[]): void;
}

export type LocalRuntimeStatus = 'unloaded' | 'loading' | 'ready' | 'generating' | 'error';

export interface LocalRuntimeState {
  status: LocalRuntimeStatus;
  activeModelId: string | null;
  activeModelName: string | null;
  executionBackend: string;
  loadedAt: string | null;
  lastError: string | null;
  estimatedMemoryMb: number;
}

export class LocalInferenceRuntime {
  constructor(options?: Record<string, any>);
  setWebEngine(engine: any): void;
  getState(): LocalRuntimeState;
  isModelActive(modelId: string): boolean;
  subscribe(listener: (state: LocalRuntimeState) => void): () => void;
  loadModel(modelId: string): Promise<LocalRuntimeState>;
  unloadModel(): Promise<void>;
  generateResponse(
    prompt: string,
    options?: {
      systemPrompt?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      onChunk?: (accumulatedText: string) => void;
    }
  ): Promise<{
    text: string;
    modelId: string;
    modelName: string;
    backend: string;
    latencyMs: number;
  }>;
  handleNativeTokenEvent(detail: {
    requestId: string;
    chunk?: string;
    done?: boolean;
    error?: string;
  }): void;
  cancelGeneration(): void;
}

export type IntelligenceMode = 'auto' | 'online' | 'offline';

export interface IntelligenceStatusSnapshot {
  mode: IntelligenceMode;
  networkOnline: boolean;
  localReady: boolean;
  activeLocalModelId: string | null;
  activeLocalModelName: string | null;
  activePath: 'on-device-llm' | 'offline-tools' | 'cloud-gemini' | 'offline-unavailable';
}

export interface RoutedResponse {
  text: string;
  source: 'on-device-llm' | 'local-tools' | 'cloud-gemini';
  modelLabel: string;
  latencyMs: number;
  ttftMs?: number;
  handledOffline: boolean;
}

export class IntelligenceRouter {
  constructor(options?: Record<string, any>);
  getMode(): IntelligenceMode;
  setMode(mode: IntelligenceMode): void;
  subscribe(listener: (status: IntelligenceStatusSnapshot) => void): () => void;
  getEffectiveStatus(): IntelligenceStatusSnapshot;
  routeMessage(input: string, context?: Record<string, any>): Promise<RoutedResponse>;
}
