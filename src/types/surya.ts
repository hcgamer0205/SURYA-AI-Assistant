export type TabType = 'core' | 'chat' | 'optics' | 'more' | 'productivity' | 'studio' | 'system' | 'plugins' | 'hub' | 'security';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ResponseMode = 'concise' | 'detailed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  latencyMs?: number;
  ttftMs?: number;
  suggestedAction?: StarkActionPlan | null;
  telemetryData?: string;
  extensibilityPlan?: ExtensibilityPlan | null;
}

export interface StarkActionPlan {
  actionId: string;
  name: string;
  intent: string;
  package?: string;
  riskLevel: RiskLevel;
  param?: string;
  fallbackUrl?: string;
}

export interface StarkApp {
  id: string;
  name: string;
  package: string;
  scheme: string;
  action: string;
  category: string;
  icon: string;
  description: string;
  riskLevel: RiskLevel;
  fallbackUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  riskLevel: RiskLevel;
  status: 'AUTHORIZED' | 'REJECTED' | 'ABORTED' | 'EXECUTED';
  details: string;
  actor: string;
}

export interface WorldModelMemory {
  id: string;
  category: 'preference' | 'context' | 'fact' | 'directive';
  key: string;
  value: string;
  confidence: number;
  updatedAt: string;
}

export interface DeviceTelemetry {
  platform: 'android' | 'web';
  batteryLevel: number | null;
  isCharging: boolean | null;
  online: boolean;
  networkType: string;
  bluetoothAudioConnected: boolean;
  handsFreeServiceRunning: boolean;
  sdkVersion?: number;
  deviceModel?: string;
  updatedAt: string;
}

export interface SystemHealthData {
  status: string;
  version: string;
  targetPlatform: string;
  uptimeSeconds: number;
  geminiConfigured: boolean;
  authRequired?: boolean;
  activeModel: string;
  fallbackModel?: string;
  memoryRssMb: number;
  worldModelEntries: number;
  auditLogsCount: number;
  streamingSupported?: boolean;
  rateLimitingActive?: boolean;
  timestamp: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseDate: string;
  releaseNotes: string;
  apkName: string;
  downloadUrl: string;
  sha256Checksum: string;
  fileSizeMb: number;
  signingCertificate: string;
  packageProvider: string;
}

export interface ScientificArticle {
  id: string;
  domain: string;
  title: string;
  summary: string;
  principles: string[];
  telemetryFormula: string;
}

export interface VisionEntity {
  id: string;
  label: string;
  category: string;
  description: string;
  confidence: number;
  estimatedDistance: string;
  box: { ymin: number; xmin: number; ymax: number; xmax: number };
}

export interface VisionAnalysisResult {
  summary: string;
  entities: VisionEntity[];
  ocrText: string;
  ocrTranslation: string;
  qrPayloads?: string[];
  documentFields?: { label: string; value: string }[];
  hudAdvisory: string;
}

// ---------------- UNIVERSAL EXTENSIBILITY & PLUGIN TYPES ----------------

export type PluginCategory =
  | 'developer'
  | 'productivity'
  | 'entertainment'
  | 'smart_home'
  | 'ai_service'
  | 'communication';

export type PluginStatus = 'available' | 'installed' | 'configured' | 'active' | 'disabled';

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  version: string;
  status: PluginStatus;
  authType: 'none' | 'api_key' | 'oauth' | 'webhook';
  permissions: string[];
  config: Record<string, any>;
  endpoints?: string[];
  healthStatus?: 'healthy' | 'degraded' | 'unconfigured';
  createdAt: string;
}

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerKeywords: string[];
  instructions: string;
  tools: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface AppFile {
  path: string;
  content: string;
  language: string;
}

export interface StudioVersionSnapshot {
  id: string;
  version: string;
  note: string;
  timestamp: string;
  previewHtml: string;
}

export interface GeneratedApp {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  prompt: string;
  files: AppFile[];
  previewHtml: string;
  status: 'ready' | 'generating' | 'error';
  createdAt: string;
  lastModified: string;
}

export interface GithubRepoSummary {
  fullName: string;
  description: string;
  defaultBranch: string;
  stars: number;
  updatedAt: string;
  htmlUrl: string;
  recentCommits: { sha: string; message: string; author: string; date: string }[];
  recentBuilds: { id: number; runNumber: number; name: string; status: string; conclusion: string | null; htmlUrl: string }[];
}

export type ThemeColor = 'gold' | 'cyan' | 'emerald' | 'amber' | 'crimson' | 'purple';

export interface ThemeConfig {
  primaryColor: ThemeColor;
  mode: 'dark' | 'solar' | 'minimal' | 'cyber';
  density: 'compact' | 'comfortable';
  showReticle: boolean;
  showWaveform: boolean;
  voiceAccent: string;
  language: string;
}

export interface ExtensibilityPlan {
  type: 'app_creation' | 'plugin_install' | 'skill_creation' | 'ui_customization' | 'local_intent';
  title: string;
  targetId: string;
  parameters: Record<string, any>;
  summary: string;
  requiresConfirmation: boolean;
}
