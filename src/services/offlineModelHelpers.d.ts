export type ModelTier = 'lightweight' | 'balanced' | 'advanced';
export type ModelCompatibilityStatus = 'recommended' | 'compatible' | 'tight' | 'incompatible';

export interface OfflineModelManifest {
  id: string;
  displayName: string;
  family: string;
  publisher: string;
  version: string;
  parameterCount: string;
  quantization: string;
  runtimeFormat: 'litert-task' | 'gguf';
  tier: ModelTier;
  fileName: string;
  sizeBytes: number;
  minDeviceRamMb: number;
  estimatedRuntimeRamMb: number;
  contextLength: number;
  languages: string[];
  supportsToolCalling: boolean;
  speedTier: 'fast' | 'balanced' | 'quality';
  license: string;
  requiresLicenseAcceptance: boolean;
  repoId: string;
  sourceUrl: string;
  expectedSha256: string | null;
  summary: string;
}

export interface DeviceHardwareSnapshot {
  platform: 'android' | 'web';
  androidRelease: string | null;
  sdkVersion: number | null;
  deviceModel: string;
  cpuAbis: string[];
  cpuCores: number | null;
  totalRamMb: number | null;
  availableRamMb: number | null;
  lowMemory: boolean;
  totalStorageMb: number | null;
  availableStorageMb: number | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  powerSaveMode: boolean;
  thermalStatus: 'nominal' | 'light' | 'moderate' | 'severe' | 'critical' | 'unknown';
  gpuAcceleration: {
    vulkanSupported: boolean;
    nnapiSupported: boolean;
    openGlEsVersion: string | null;
    openClLikely: boolean;
    summary: string;
  };
  offlineVoice: {
    speechRecognizerAvailable: boolean;
    onDeviceSttSupported: boolean;
    ttsReady: boolean;
  };
  webRuntimeSupported?: boolean;
  detectedAt: string;
}

export interface ModelCompatibilityAssessment {
  modelId: string;
  status: ModelCompatibilityStatus;
  fitScore: number;
  canDownload: boolean;
  canLoadSafely: boolean;
  requiredStorageBytes: number;
  blockers: string[];
  warnings: string[];
  accelerationNote: string;
}

export interface TierSelectionItem {
  model: OfflineModelManifest;
  assessment: ModelCompatibilityAssessment;
}

export interface RecommendedTiersResult {
  lightweight: TierSelectionItem | null;
  balanced: TierSelectionItem | null;
  advanced: TierSelectionItem | null;
  assessments: TierSelectionItem[];
}

export const TRUSTED_MODEL_HOSTS: string[];
export const OFFLINE_MODEL_CATALOG: OfflineModelManifest[];

export function formatBytes(bytes: number): string;
export function isTrustedModelUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; reason?: string };
export function sanitizeModelFilename(fileName: string): string;
export function isValidSha256Hex(value: string): boolean;
export function verifyDigestMatch(
  actualSha256: string,
  expectedSha256?: string | null
): {
  valid: boolean;
  mode?: 'pinned_verified' | 'computed_recorded' | 'mismatch';
  sha256?: string;
  reason: string;
};
export function evaluateModelCompatibility(
  model: OfflineModelManifest,
  device: Partial<DeviceHardwareSnapshot>
): ModelCompatibilityAssessment;
export function buildRecommendedTiers(
  device: Partial<DeviceHardwareSnapshot>,
  catalog?: OfflineModelManifest[]
): RecommendedTiersResult;
