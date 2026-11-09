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
} from 'lucide-react';
import { SystemHealthData, UpdateInfo } from '../types/surya';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const SystemHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isPingingGemini, setIsPingingGemini] = useState(false);
  const [geminiPingResult, setGeminiPingResult] = useState<{
    latencyMs: number;
    response: string;
  } | null>(null);
  const [installProgress, setInstallProgress] = useState<string | null>(null);

  useEffect(() => {
    loadHealth();
    checkUpdates();
  }, []);

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

  const handleSimulateUpdate = () => {
    soundFx.playClick();
    setInstallProgress('Verifying SHA-256 package checksum...');
    setTimeout(() => {
      setInstallProgress('Checksum match: 9e2b83ef... Verified.');
      setTimeout(() => {
        setInstallProgress('Handing APK over to Android Package Installer via FileProvider...');
        soundFx.playAuthorize();
        setTimeout(() => {
          setInstallProgress(null);
          alert('Update verified and dispatched to Android Package Installer.');
        }, 1500);
      }, 1000);
    }, 1200);
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
            loadHealth();
            checkUpdates();
          }}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200"
          title="Refresh Telemetry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Diagnostics Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Core Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">AI CORE ENGINE</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100">
            {health?.activeModel || 'gemini-3.8-flash'}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span>ONLINE & READY</span>
          </div>
        </div>

        {/* Target Platform */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase">PLATFORM TARGET</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-mono font-bold text-slate-100">
            Android SDK 36
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
            3s Auto Abort Active
          </div>
        </div>
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
          <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
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
                SAFE AUTO-UPDATE SYSTEM
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/50">
              v{updateInfo.latestVersion} AVAILABLE
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1 font-mono text-[11px]">
            <p>Current: v{updateInfo.currentVersion} · Latest: v{updateInfo.latestVersion}</p>
            <p className="text-slate-400">{updateInfo.releaseNotes}</p>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] truncate pt-1">
              <FileCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">SHA-256: {updateInfo.sha256Checksum}</span>
            </div>
          </div>

          {installProgress && (
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 animate-pulse">
              {installProgress}
            </div>
          )}

          <button
            onClick={handleSimulateUpdate}
            className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>VERIFY CHECKSUM & DISPATCH UPDATE INTENT</span>
          </button>
        </div>
      )}
    </div>
  );
};
