import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Mic,
  Volume2,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Download,
  FileCheck,
  RefreshCw,
  Zap,
  Server,
  Lock,
  Smartphone,
} from 'lucide-react';
import { SystemHealthData, UpdateInfo, DeviceTelemetry } from '../types/surya';
import { apiService } from '../services/apiService';
import { deviceBridgeService } from '../services/deviceBridgeService';
import { soundFx } from '../services/soundFx';

interface SecurityReportData {
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
}

export const SystemHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [securityReport, setSecurityReport] = useState<SecurityReportData | null>(null);
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(deviceBridgeService.getTelemetry());
  const [isPingingGemini, setIsPingingGemini] = useState(false);
  const [geminiPingResult, setGeminiPingResult] = useState<{
    latencyMs: number;
    response: string;
  } | null>(null);
  const [installStatus, setInstallStatus] = useState<{ text: string; type: 'info' | 'ok' | 'err' } | null>(null);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState<string>(() => apiService.getApiBaseUrl());
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<string | null>(null);

  useEffect(() => {
    loadAllDiagnostics();
    const unsub = deviceBridgeService.subscribe(setTelemetry);
    return unsub;
  }, []);

  const loadAllDiagnostics = () => {
    loadHealth();
    checkUpdates();
    loadSecurityReport();
    deviceBridgeService.refreshTelemetry();
  };

  const handleSaveBackendUrl = async () => {
    soundFx.playClick();
    apiService.setApiBaseUrl(backendUrl);
    setIsSavingUrl(true);
    setUrlStatus('Verifying backend connectivity...');
    try {
      const data = await apiService.getSystemHealth();
      setHealth(data);
      await loadSecurityReport();
      soundFx.playAuthorize();
      setUrlStatus(`Connected to backend (${data.status}). Model: ${data.activeModel}`);
    } catch (err: any) {
      soundFx.playAbort();
      setUrlStatus(`Connection warning: ${err.message}`);
    } finally {
      setIsSavingUrl(false);
    }
  };

  const loadHealth = async () => {
    try {
      const data = await apiService.getSystemHealth();
      setHealth(data);
    } catch (e) {
      console.warn('Health check failed:', e);
    }
  };

  const checkUpdates = async () => {
    try {
      const info = await apiService.checkForUpdates();
      setUpdateInfo(info);
    } catch (e) {
      console.warn('Update check failed:', e);
    }
  };

  const loadSecurityReport = async () => {
    try {
      const rep = await apiService.getSecurityReport();
      setSecurityReport(rep);
    } catch (e) {
      console.warn('Security report fetch failed:', e);
    }
  };

  const handleTestGemini = async () => {
    soundFx.playClick();
    setIsPingingGemini(true);
    setGeminiPingResult(null);
    try {
      const res = await apiService.verifyGeminiConnection();
      soundFx.playAuthorize();
      setGeminiPingResult({
        latencyMs: res.latencyMs,
        response: res.response,
      });
    } catch (err: any) {
      soundFx.playAbort();
      setGeminiPingResult({
        latencyMs: 0,
        response: `Error: ${err.message}`,
      });
    } finally {
      setIsPingingGemini(false);
    }
  };

  const handleVerifyUpdateChecksum = async () => {
    if (!updateInfo) return;
    soundFx.playClick();
    setInstallStatus({ text: 'Cryptographically verifying SHA-256 package digest...', type: 'info' });
    try {
      const result = await apiService.verifyApkChecksum(updateInfo.sha256Checksum, updateInfo.latestVersion);
      if (result.valid) {
        soundFx.playAuthorize();
        setInstallStatus({
          text: `${result.status} Download signed release from GitHub Actions artifacts to install v${updateInfo.latestVersion} on Android.`,
          type: 'ok',
        });
      } else {
        soundFx.playAbort();
        setInstallStatus({
          text: `Checksum validation failed: ${result.status}. Package rejected by Veronica Guard.`,
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
      setPermissionNote('Android runtime permission dialog triggered for Microphone, Camera, and Notifications.');
    } else {
      setPermissionNote('Running in web mode — browser grants Mic/Camera individually when prompted by Optics or Voice.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            SYSTEM HEALTH & TELEMETRY
          </h2>
        </div>
        <button
          onClick={() => {
            soundFx.playClick();
            loadAllDiagnostics();
          }}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200"
          title="Refresh Telemetry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Diagnostics Cards */}
      <div className="grid grid-cols-2 gap-3 tabular-nums">
        {/* Core Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">AI CORE ENGINE</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100 truncate">
            {health?.activeModel || 'gemini-4-hydrogen'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span>{health ? 'ONLINE & READY' : 'CONNECTING...'}</span>
          </div>
        </div>

        {/* Target Platform */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">PLATFORM TARGET</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100">
            {telemetry.platform === 'android' ? `Android ${telemetry.deviceModel || 'SDK 36'}` : 'Web / SDK 36'}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-2">
            Java 21 · Gradle 8.11.1
          </div>
        </div>

        {/* Speech Pipeline */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">AUDIO & VOICE BUS</span>
            <Mic className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100">
            STT / TTS Active
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-cyan-400">
            <Volume2 className="w-3 h-3" />
            <span>INTERRUPTIBLE PIPELINE</span>
          </div>
        </div>

        {/* Veronica Security */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">VERONICA PROTOCOL</span>
            <ShieldCheck className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100">
            Risk Tiered Bus
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-2">
            {securityReport ? `${securityReport.auditLogCount} Audit Events` : '3s Auto Abort Active'}
          </div>
        </div>
      </div>

      {/* Security & Privacy Posture Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
              SECURITY & PRIVACY POSTURE
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
            {securityReport?.serverCredentialsIsolated ? 'SERVER-ISOLATED' : 'CHECKING'}
          </span>
        </div>

        {securityReport ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Gemini Credentials</span>
              <span className={securityReport.geminiKeyConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                {securityReport.geminiKeyConfigured ? 'Server-Only OK' : 'Not Configured'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">CORS Policy</span>
              <span className="text-cyan-300">{securityReport.corsPolicy}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">API Rate Limiting</span>
              <span className="text-emerald-400">{securityReport.rateLimitingActive ? 'Active' : 'Off'}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Covert Recording</span>
              <span className="text-emerald-400">
                {securityReport.noCovertRecordingGuarantee ? 'Strictly Blocked' : 'Unknown'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] font-mono text-slate-400">
            Fetching server security audit report...
          </p>
        )}

        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Runtime Permissions · Battery:{' '}
              {telemetry.batteryLevel !== null ? `${telemetry.batteryLevel}%` : 'N/A'} ·{' '}
              {telemetry.online ? `Online (${telemetry.networkType})` : 'Offline'}
            </span>
          </div>
          <button
            onClick={handleRequestPermissions}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 uppercase shrink-0"
          >
            CHECK PERMISSIONS
          </button>
        </div>
        {permissionNote && (
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300">
            {permissionNote}
          </div>
        )}
      </div>

      {/* Backend Server Gateway Configuration */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">
              BACKEND SERVER GATEWAY (MOBILE CONNECTIVITY)
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            {backendUrl ? 'REMOTE GATEWAY' : 'LOCAL / DEV PROXY'}
          </span>
        </div>

        <p className="text-[11px] font-mono text-slate-400">
          The Android APK uses this endpoint to communicate with the SURYA Gemini AI backend.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://... or empty for local relative proxy"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleSaveBackendUrl}
            disabled={isSavingUrl}
            className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSavingUrl ? 'animate-spin' : ''}`} />
            <span>SAVE & TEST</span>
          </button>
        </div>

        {urlStatus && (
          <div className="text-[11px] font-mono text-cyan-400 p-2 rounded bg-slate-950 border border-slate-800">
            {urlStatus}
          </div>
        )}
      </div>

      {/* Gemini Live Latency Ping Test */}
      <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
            LIVE GEMINI GATEWAY VERIFICATION
          </span>
          <button
            onClick={handleTestGemini}
            disabled={isPingingGemini}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase flex items-center gap-1.5 hover:bg-cyan-400 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPingingGemini ? 'animate-spin' : ''}`} />
            <span>PING GEMINI</span>
          </button>
        </div>

        {geminiPingResult ? (
          <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1 tabular-nums">
            <div className="flex items-center justify-between text-cyan-300 font-semibold">
              <span>ROUND-TRIP LATENCY:</span>
              <span>{geminiPingResult.latencyMs} ms</span>
            </div>
            <p className="text-slate-300 text-[11px] mt-1">{geminiPingResult.response}</p>
          </div>
        ) : (
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Execute a real-time roundtrip ping to test server-side Google GenAI SDK responsiveness.
          </p>
        )}
      </div>

      {/* Safe Auto-Update Section */}
      {updateInfo && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                SAFE APK UPDATE VERIFIER
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/50">
              v{updateInfo.latestVersion}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1 font-mono text-[11px]">
            <p>Current: v{updateInfo.currentVersion} · Target: v{updateInfo.latestVersion}</p>
            <p className="text-slate-400">{updateInfo.releaseNotes}</p>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] truncate pt-1">
              <FileCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">SHA-256: {updateInfo.sha256Checksum}</span>
            </div>
          </div>

          {installStatus && (
            <div
              className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                installStatus.type === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : installStatus.type === 'err'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
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
            onClick={handleVerifyUpdateChecksum}
            className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>VERIFY PACKAGE SHA-256 CHECKSUM</span>
          </button>
        </div>
      )}
    </div>
  );
};
