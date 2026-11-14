import React, { useState, useEffect } from 'react';
import {
  Server,
  Mic,
  Sliders,
  ShieldCheck,
  Lock,
  Smartphone,
  Database,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Save,
  Wifi,
  RotateCcw,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Download,
  FileCheck,
  Radio,
  Info,
} from 'lucide-react';
import { SystemHealthData, UpdateInfo, DeviceTelemetry } from '../types/surya';
import { apiService, ConnectionStatusSnapshot, ConnectionState } from '../services/apiService';
import { deviceBridgeService } from '../services/deviceBridgeService';
import { wakeWordService, WakeWordState } from '../services/wakeWordService';
import { voiceProfileManager } from '../services/voiceProfileManager';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { personalMemoryService } from '../services/personalMemoryService';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { modelDownloadManager } from '../services/modelDownloadManager';
import { OfflineModelStore } from './OfflineModelStore';
import { soundFx } from '../services/soundFx';

interface SecurityReportData {
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
}

export type SettingsSectionId =
  | 'offline'
  | 'backend'
  | 'voice'
  | 'appearance'
  | 'permissions'
  | 'security'
  | 'device'
  | 'memory';

interface SystemHealthDashboardProps {
  initialOpenSection?: SettingsSectionId | null;
  onOpenVoiceModal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenMemory?: () => void;
  onOpenAudit?: () => void;
}

const STATE_LABELS: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  CONNECTED: { label: 'Connected', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  CONNECTING: { label: 'Connecting', dot: 'bg-amber-400', text: 'text-amber-300' },
  DISCONNECTED: { label: 'Offline', dot: 'bg-rose-400', text: 'text-rose-300' },
  AUTHENTICATION_REQUIRED: { label: 'Auth Required', dot: 'bg-amber-400', text: 'text-amber-200' },
  SERVER_ERROR: { label: 'Server Error', dot: 'bg-rose-400', text: 'text-rose-200' },
  RATE_LIMITED: { label: 'Rate Limited', dot: 'bg-orange-400', text: 'text-orange-200' },
};

export const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({
  initialOpenSection = null,
  onOpenVoiceModal,
  onOpenThemeModal,
  onOpenMemory,
  onOpenAudit,
}) => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [securityReport, setSecurityReport] = useState<SecurityReportData | null>(null);
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(deviceBridgeService.getTelemetry());
  const [connStatus, setConnStatus] = useState<ConnectionStatusSnapshot>(
    apiService.getConnectionStatus()
  );
  const [wakeState, setWakeState] = useState<WakeWordState>(wakeWordService.getState());
  const [theme, setTheme] = useState(uiThemeEngine.getCurrentTheme());
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(personalMemoryService.isEnabled());
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());
  const [downloadedCount, setDownloadedCount] = useState(
    () => modelDownloadManager.getDownloadedModels().length
  );

  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(() => {
    if (initialOpenSection) return initialOpenSection;
    const snap = apiService.getConnectionStatus();
    if (!snap.isConfigured || snap.isPreviewUrl || snap.state !== 'CONNECTED') {
      return 'backend';
    }
    return null;
  });

  useEffect(() => {
    if (initialOpenSection) {
      setOpenSection(initialOpenSection);
    }
  }, [initialOpenSection]);

  const [isPingingGemini, setIsPingingGemini] = useState(false);
  const [geminiPingResult, setGeminiPingResult] = useState<{
    ok: boolean;
    model?: string;
    latencyMs: number;
    response: string;
  } | null>(null);

  const [installStatus, setInstallStatus] = useState<{
    text: string;
    type: 'info' | 'ok' | 'err';
  } | null>(null);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);

  const [backendUrl, setBackendUrl] = useState<string>(() => apiService.getApiBaseUrl());
  const [apiTokenInput, setApiTokenInput] = useState<string>(() => apiService.getApiToken());
  const [showToken, setShowToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [gatewayNotice, setGatewayNotice] = useState<{
    text: string;
    tone: 'ok' | 'warn' | 'err' | 'info';
  } | null>(null);

  useEffect(() => {
    const unsubConn = apiService.subscribeConnectionState(setConnStatus);
    const unsubTel = deviceBridgeService.subscribe(setTelemetry);
    const unsubWake = wakeWordService.subscribe(setWakeState);
    const unsubTheme = uiThemeEngine.subscribe((t) => setTheme(t));
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);
    const unsubDl = modelDownloadManager.subscribe(() => {
      setDownloadedCount(modelDownloadManager.getDownloadedModels().length);
    });
    loadAllDiagnostics();
    return () => {
      unsubConn();
      unsubTel();
      unsubWake();
      unsubTheme();
      unsubRouter();
      unsubDl();
    };
  }, []);

  const loadAllDiagnostics = () => {
    loadHealth();
    checkUpdates();
    loadSecurityReport();
    deviceBridgeService.refreshTelemetry();
  };

  const toggleSection = (id: SettingsSectionId) => {
    soundFx.playClick();
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const handleSaveUrlOnly = () => {
    soundFx.playClick();
    const validation = apiService.setApiBaseUrl(backendUrl);
    if (!validation.valid) {
      soundFx.playAbort();
      setGatewayNotice({ text: validation.error || 'Invalid backend URL.', tone: 'err' });
      return false;
    }

    apiService.setApiToken(apiTokenInput);
    setBackendUrl(apiService.getApiBaseUrl());

    if (validation.warning) {
      setGatewayNotice({ text: `Saved with notice: ${validation.warning}`, tone: 'warn' });
    } else {
      setGatewayNotice({
        text: 'Gateway saved. Click Test Connection to verify reachability.',
        tone: 'info',
      });
    }
    return true;
  };

  const handleTestConnection = async () => {
    soundFx.playClick();
    setIsTestingConnection(true);
    setGatewayNotice({ text: 'Testing /api/health endpoint...', tone: 'info' });
    try {
      const data = await apiService.checkBackendConnection();
      setHealth(data);
      await Promise.all([loadSecurityReport(), checkUpdates()]);
      soundFx.playAuthorize();
      setGatewayNotice({
        text: `Connected · Active model: ${data.activeModel} · Auth: ${
          data.authRequired ? 'Bearer Token Verified' : 'Open'
        }`,
        tone: 'ok',
      });
    } catch (err: any) {
      soundFx.playAbort();
      setGatewayNotice({
        text: err?.message || 'Backend connection failed.',
        tone: 'err',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveAndTest = async () => {
    const ok = handleSaveUrlOnly();
    if (!ok) return;
    await handleTestConnection();
  };

  const handleResetGateway = () => {
    soundFx.playClick();
    apiService.setApiBaseUrl('');
    apiService.setApiToken('');
    setBackendUrl(apiService.getApiBaseUrl());
    setApiTokenInput(apiService.getApiToken());
    setHealth(null);
    setSecurityReport(null);
    setGatewayNotice({
      text: connStatus.isNative
        ? 'Gateway reset. Enter your backend HTTPS URL for Android APK connectivity.'
        : 'Gateway reset to same-origin /api proxy.',
      tone: 'info',
    });
  };

  const loadHealth = async () => {
    try {
      const data = await apiService.checkBackendConnection();
      setHealth(data);
    } catch {}
  };

  const checkUpdates = async () => {
    try {
      const info = await apiService.checkForUpdates();
      setUpdateInfo(info);
    } catch {}
  };

  const loadSecurityReport = async () => {
    try {
      const rep = await apiService.getSecurityReport();
      setSecurityReport(rep);
    } catch {}
  };

  const handleTestGemini = async () => {
    soundFx.playClick();
    setIsPingingGemini(true);
    setGeminiPingResult(null);
    try {
      const res = await apiService.verifyGeminiConnection();
      soundFx.playAuthorize();
      setGeminiPingResult({
        ok: true,
        model: res.model,
        latencyMs: res.latencyMs,
        response: res.response,
      });
    } catch (err: any) {
      soundFx.playAbort();
      setGeminiPingResult({
        ok: false,
        latencyMs: 0,
        response: err?.message || 'Gemini verification request failed.',
      });
    } finally {
      setIsPingingGemini(false);
    }
  };

  const handleVerifyUpdateChecksum = async () => {
    if (!updateInfo) return;
    soundFx.playClick();
    setInstallStatus({ text: 'Verifying SHA-256 package digest...', type: 'info' });
    try {
      const result = await apiService.verifyApkChecksum(
        updateInfo.sha256Checksum,
        updateInfo.latestVersion
      );
      if (result.valid) {
        soundFx.playAuthorize();
        setInstallStatus({
          text: `${result.status} Release v${updateInfo.latestVersion} verified.`,
          type: 'ok',
        });
      } else {
        soundFx.playAbort();
        setInstallStatus({
          text: `Checksum validation failed: ${result.status}.`,
          type: 'err',
        });
      }
    } catch (err: any) {
      soundFx.playAbort();
      setInstallStatus({
        text: `Verification request failed: ${err?.message || 'Unknown error'}`,
        type: 'err',
      });
    }
  };

  const handleRequestPermissions = () => {
    soundFx.playClick();
    const sent = deviceBridgeService.requestNativePermissions();
    if (sent) {
      soundFx.playAuthorize();
      setPermissionNote(
        'Requested Android permissions for Microphone, Camera, and Notifications.'
      );
    } else {
      setPermissionNote(
        'Web mode: browser requests Microphone and Camera permissions when you start Voice or Vision.'
      );
    }
  };

  const connMeta = STATE_LABELS[connStatus.state];
  const activeVoiceProfile = voiceProfileManager.getActiveProfile();

  const SectionShell: React.FC<{
    id: SettingsSectionId;
    icon: React.ReactNode;
    title: string;
    summary: string;
    children: React.ReactNode;
  }> = ({ id, icon, title, summary, children }) => {
    const isOpen = openSection === id;
    return (
      <div className="rounded-2xl bg-[#121826] border border-slate-800/80 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          aria-expanded={isOpen}
          className="w-full min-h-[60px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/35 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-100 block">{title}</span>
              <span className="text-xs text-slate-400 block truncate">{summary}</span>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Settings Header & Honest Status */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">System Settings</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${connMeta.dot}`} />
            <span className={`text-xs ${connMeta.text}`}>{connMeta.label}</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 truncate">
              {health?.activeModel || connStatus.serverModel || 'gemini-4-hydrogen'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            loadAllDiagnostics();
          }}
          aria-label="Refresh connection and telemetry"
          className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 0. Offline AI & Local Models */}
      <SectionShell
        id="offline"
        icon={<Radio className="w-4 h-4 text-[#d4a84f]" />}
        title="Offline AI &amp; Local Models"
        summary={
          routerStatus.activeLocalModelName
            ? `Mode: ${routerStatus.mode} · Active: ${routerStatus.activeLocalModelName}`
            : `Mode: ${routerStatus.mode} · ${downloadedCount} downloaded model(s)`
        }
      >
        <OfflineModelStore />
      </SectionShell>

      {/* 1. Backend & Gemini */}
      <SectionShell
        id="backend"
        icon={<Server className="w-4 h-4 text-[#60a5fa]" />}
        title="Backend & Gemini"
        summary={
          connStatus.effectiveUrl ||
          (connStatus.isNative ? 'Backend URL setup required' : 'Same-origin /api proxy')
        }
      >
        <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Gateway URL</span>
            <span className="text-slate-200 font-mono truncate max-w-[220px]">
              {connStatus.effectiveUrl ||
                (connStatus.isNative ? 'Unconfigured' : 'Same-origin /api')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">Last Verified</span>
            <span className="text-slate-300 tabular-nums">
              {connStatus.lastSuccessAt
                ? new Date(connStatus.lastSuccessAt).toLocaleTimeString()
                : 'Not yet verified'}
            </span>
          </div>
          {connStatus.lastHttpStatus !== null && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">HTTP Status</span>
              <span className="text-slate-300 font-mono tabular-nums">
                {connStatus.lastHttpStatus}
              </span>
            </div>
          )}
        </div>

        {(connStatus.isPreviewUrl || !connStatus.isConfigured || connStatus.lastError) && (
          <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/30 text-xs text-amber-100 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-[#d4a84f]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {!connStatus.isConfigured
                  ? 'Android APK Backend URL Required'
                  : connStatus.isPreviewUrl
                  ? 'AI Studio Preview URL Detected'
                  : 'Connection Notice'}
              </span>
            </div>
            {connStatus.lastError && (
              <p className="text-amber-100/90 leading-relaxed">{connStatus.lastError}</p>
            )}
            {connStatus.isPreviewUrl && (
              <p className="text-slate-300 text-[11px] leading-relaxed">
                AI Studio preview hosts (<code className="text-[#d4a84f]">ais-dev-*</code>) redirect external requests to a browser cookie challenge. Deploy <code className="text-[#d4a84f]">server.ts</code> to Cloud Run and enter that HTTPS URL below.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-slate-300 block">Backend HTTPS Service Root URL</label>
          <input
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://your-service.run.app"
            className="w-full min-h-[42px] px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#60a5fa]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Access Token (Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="text-xs text-[#60a5fa] hover:underline"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showToken ? 'text' : 'password'}
            value={apiTokenInput}
            onChange={(e) => setApiTokenInput(e.target.value)}
            placeholder="SURYA_API_TOKEN"
            className="w-full min-h-[42px] px-3 py-2 bg-[#0b0f17] border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#60a5fa]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={handleSaveUrlOnly}
            className="min-h-[40px] px-3 py-2 bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="min-h-[40px] px-3 py-2 bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-[#60a5fa] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Test</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndTest}
            disabled={isTestingConnection}
            className="min-h-[40px] px-3 py-2 bg-[#60a5fa] hover:bg-blue-400 text-slate-950 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>Save &amp; Test</span>
          </button>

          <button
            type="button"
            onClick={handleResetGateway}
            className="min-h-[40px] px-3 py-2 bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {gatewayNotice && (
          <div
            className={`text-xs p-3 rounded-xl border ${
              gatewayNotice.tone === 'ok'
                ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-200'
                : gatewayNotice.tone === 'warn'
                ? 'bg-amber-950/35 border-amber-500/30 text-amber-200'
                : gatewayNotice.tone === 'err'
                ? 'bg-rose-950/35 border-rose-500/30 text-rose-200'
                : 'bg-[#0b0f17] border-slate-800 text-slate-300'
            }`}
          >
            {gatewayNotice.text}
          </div>
        )}

        {/* Gemini Roundtrip Ping */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200">Gemini Gateway Check</span>
            <button
              type="button"
              onClick={handleTestGemini}
              disabled={isPingingGemini}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPingingGemini ? 'animate-spin' : ''}`} />
              <span>Ping Gemini</span>
            </button>
          </div>
          {geminiPingResult && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 tabular-nums ${
                geminiPingResult.ok
                  ? 'bg-[#0b0f17] border-emerald-500/30 text-slate-200'
                  : 'bg-rose-950/35 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span>
                  {geminiPingResult.ok
                    ? `Verified (${geminiPingResult.model || 'Gemini'})`
                    : 'Verification failed'}
                </span>
                {geminiPingResult.ok && <span>{geminiPingResult.latencyMs} ms</span>}
              </div>
              <p className="text-slate-300">{geminiPingResult.response}</p>
            </div>
          )}
        </div>
      </SectionShell>

      {/* 2. Voice & Hands-Free */}
      <SectionShell
        id="voice"
        icon={<Mic className="w-4 h-4 text-[#d4a84f]" />}
        title="Voice & Hands-Free"
        summary={`${activeVoiceProfile.name} · ${wakeState.isActive ? 'Wake word on' : 'Wake word off'}`}
      >
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0f17] border border-slate-800">
          <div>
            <span className="text-xs font-medium text-slate-100 block">
              Hands-Free Wake Word
            </span>
            <span className="text-xs text-slate-400">
              Listen for &ldquo;Hey SURYA&rdquo; with active mic indicator
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              wakeWordService.toggle();
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border ${
              wakeState.isActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#121826] border-slate-700 text-slate-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{wakeState.isActive ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Wake Sensitivity</span>
              <span className="tabular-nums text-slate-200">
                {Math.round(wakeState.sensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={wakeState.sensitivity}
              onChange={(e) => wakeWordService.setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-[#d4a84f]"
              aria-label="Wake-word sensitivity"
            />
          </div>

          <label className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between cursor-pointer">
            <span className="text-xs text-slate-200">Continuous Follow-up</span>
            <input
              type="checkbox"
              checked={wakeState.continuousConversation}
              onChange={(e) => wakeWordService.setContinuousConversation(e.target.checked)}
              className="w-4 h-4 accent-[#d4a84f]"
            />
          </label>
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>{wakeWordService.getBackgroundLimitationNote()}</span>
        </div>

        {onOpenVoiceModal && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onOpenVoiceModal();
            }}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200"
          >
            Configure Voice Profile, Language &amp; Speed
          </button>
        )}
      </SectionShell>

      {/* 3. Appearance */}
      <SectionShell
        id="appearance"
        icon={<Sliders className="w-4 h-4 text-[#60a5fa]" />}
        title="Appearance"
        summary={`${theme.name} · ${theme.layout.density === 'compact' ? 'Compact' : 'Comfortable'}`}
      >
        <label className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs font-medium text-slate-200 block">Reduced Motion</span>
            <span className="text-xs text-slate-400">Minimize orb and transition animations</span>
          </div>
          <input
            type="checkbox"
            checked={theme.accessibility.reducedMotion}
            onChange={(e) =>
              uiThemeEngine.applyTheme({
                accessibility: { ...theme.accessibility, reducedMotion: e.target.checked },
              })
            }
            className="w-4 h-4 accent-[#d4a84f]"
          />
        </label>

        {onOpenThemeModal && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onOpenThemeModal();
            }}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200"
          >
            Open Theme &amp; Color Customizer
          </button>
        )}
      </SectionShell>

      {/* 4. Permissions */}
      <SectionShell
        id="permissions"
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        title="Permissions"
        summary="Microphone, camera, and notification access"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0f17] border border-slate-800">
          <p className="text-xs text-slate-300">
            Verify Android runtime permissions for voice input, vision camera, and alerts.
          </p>
          <button
            type="button"
            onClick={handleRequestPermissions}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#60a5fa] text-slate-950 text-xs font-semibold shrink-0"
          >
            Check Permissions
          </button>
        </div>
        {permissionNote && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-300">
            {permissionNote}
          </div>
        )}
      </SectionShell>

      {/* 5. Security & Privacy */}
      <SectionShell
        id="security"
        icon={<Lock className="w-4 h-4 text-emerald-400" />}
        title="Security & Privacy"
        summary={
          securityReport?.serverCredentialsIsolated
            ? 'Server-isolated credentials · Veronica active'
            : 'Veronica confirmation protocol active'
        }
      >
        {securityReport ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Gemini API Key</span>
              <span className={securityReport.geminiKeyConfigured ? 'text-emerald-300' : 'text-amber-300'}>
                {securityReport.geminiKeyConfigured ? 'Server-Only' : 'Not Configured'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">CORS Policy</span>
              <span className="text-slate-200">{securityReport.corsPolicy}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Auth &amp; Rate Limit</span>
              <span className="text-emerald-300">
                {securityReport.authTokenEnforced ? 'Token + ' : 'Open + '}
                {securityReport.rateLimitingActive ? 'Rate-Limited' : 'Unlimited'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Veronica Events</span>
              <span className="text-slate-200 tabular-nums">{securityReport.auditLogCount}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Connect to a verified SURYA backend to inspect live security status.
          </p>
        )}
      </SectionShell>

      {/* 6. Device Information */}
      <SectionShell
        id="device"
        icon={<Smartphone className="w-4 h-4 text-slate-300" />}
        title="Device Information"
        summary={`${
          telemetry.platform === 'android' ? telemetry.deviceModel || 'Android SDK 36' : 'Web Runtime'
        } · ${telemetry.online ? telemetry.networkType : 'Offline'}`}
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800">
            <span className="text-slate-400 block">Platform</span>
            <span className="text-slate-100 font-medium">
              {telemetry.platform === 'android'
                ? `Android ${telemetry.deviceModel || 'SDK 36'}`
                : 'Web Browser'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800">
            <span className="text-slate-400 block">Battery</span>
            <span className="text-slate-100 font-medium tabular-nums">
              {telemetry.batteryLevel !== null ? `${telemetry.batteryLevel}%` : 'Unavailable'}
            </span>
          </div>
        </div>

        {updateInfo && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-200">APK Build Verification</span>
              <span className="text-emerald-300">v{updateInfo.latestVersion}</span>
            </div>
            <p className="text-slate-400">{updateInfo.releaseNotes}</p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 truncate">
              <FileCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">SHA-256: {updateInfo.sha256Checksum}</span>
            </div>

            {installStatus && (
              <div
                className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                  installStatus.type === 'ok'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : installStatus.type === 'err'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                    : 'bg-[#121826] border-slate-700 text-slate-200'
                }`}
              >
                {installStatus.type === 'err' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{installStatus.text}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleVerifyUpdateChecksum}
              className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-[#121826] border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Verify Package Checksum</span>
            </button>
          </div>
        )}

        {onOpenAudit && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onOpenAudit();
            }}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200"
          >
            Run Controlled Self-Improvement Audit
          </button>
        )}
      </SectionShell>

      {/* 7. Memory & Personalization */}
      <SectionShell
        id="memory"
        icon={<Database className="w-4 h-4 text-[#d4a84f]" />}
        title="Memory & Personalization"
        summary={memoryEnabled ? 'Personal memory active' : 'Personal memory paused'}
      >
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0f17] border border-slate-800">
          <div>
            <span className="text-xs font-medium text-slate-100 block">Personal Memory</span>
            <span className="text-xs text-slate-400">
              Allow SURYA to recall user-approved facts and preferences
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              const next = !memoryEnabled;
              personalMemoryService.setEnabled(next);
              setMemoryEnabled(next);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium border ${
              memoryEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#121826] border-slate-700 text-slate-300'
            }`}
          >
            {memoryEnabled ? 'Active' : 'Paused'}
          </button>
        </div>

        {onOpenMemory && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onOpenMemory();
            }}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200"
          >
            Manage Personal World Model Entries
          </button>
        )}
      </SectionShell>
    </div>
  );
};
