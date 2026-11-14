import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Download,
  Pause,
  Play,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Mic,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Zap,
  Sparkles,
} from 'lucide-react';
import {
  DeviceHardwareSnapshot,
  OfflineModelManifest,
  ModelCompatibilityAssessment,
  RecommendedTiersResult,
  formatBytes,
} from '../services/offlineModelHelpers.js';
import {
  ModelDownloadRecord,
  LocalRuntimeState,
  IntelligenceMode,
  IntelligenceStatusSnapshot,
} from '../services/offlineModelRuntimeCore.js';
import { deviceCapabilityService } from '../services/deviceCapabilityService';
import { offlineModelRecommendationService } from '../services/offlineModelRecommendationService';
import { modelDownloadManager } from '../services/modelDownloadManager';
import { localInferenceRuntime } from '../services/localInferenceRuntime';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { voiceService } from '../services/voiceService';
import {
  OFFLINE_CAPABILITY_MATRIX,
  ONLINE_ONLY_FEATURES,
} from '../services/offlineCapabilities';
import { soundFx } from '../services/soundFx';

export const OfflineModelStore: React.FC = () => {
  const [device, setDevice] = useState<DeviceHardwareSnapshot>(() =>
    deviceCapabilityService.getSnapshot()
  );
  const [recommendations, setRecommendations] = useState<RecommendedTiersResult>(() =>
    offlineModelRecommendationService.getRecommendations()
  );
  const [downloadStates, setDownloadStates] = useState<Record<string, ModelDownloadRecord>>(() =>
    modelDownloadManager.getAllStates()
  );
  const [runtimeState, setRuntimeState] = useState<LocalRuntimeState>(() =>
    localInferenceRuntime.getState()
  );
  const [routerStatus, setRouterStatus] = useState<IntelligenceStatusSnapshot>(() =>
    intelligenceRouter.getEffectiveStatus()
  );
  const [voiceReadiness, setVoiceReadiness] = useState(() =>
    voiceService.getOfflineVoiceReadiness()
  );

  const [isRefreshingHw, setIsRefreshingHw] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    text: string;
    tone: 'ok' | 'warn' | 'err' | 'info';
  } | null>(null);
  const [selfTestResult, setSelfTestResult] = useState<{
    ok: boolean;
    text: string;
    latencyMs?: number;
  } | null>(null);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [showAuditMatrix, setShowAuditMatrix] = useState(false);
  const [activeCatalogFilter, setActiveCatalogFilter] = useState<'all' | 'recommended' | 'downloaded'>('all');

  useEffect(() => {
    const unsubDev = deviceCapabilityService.subscribe((snap) => {
      setDevice(snap);
      setRecommendations(offlineModelRecommendationService.getRecommendations());
    });
    const unsubDl = modelDownloadManager.subscribe(setDownloadStates);
    const unsubRt = localInferenceRuntime.subscribe(setRuntimeState);
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);

    return () => {
      unsubDev();
      unsubDl();
      unsubRt();
      unsubRouter();
    };
  }, []);

  const handleRefreshHardware = async () => {
    soundFx.playClick();
    setIsRefreshingHw(true);
    try {
      await deviceCapabilityService.refresh();
      setVoiceReadiness(voiceService.getOfflineVoiceReadiness());
      setActionNotice({ text: 'Hardware and speech telemetry refreshed.', tone: 'info' });
    } finally {
      setIsRefreshingHw(false);
    }
  };

  const handleModeChange = (mode: IntelligenceMode) => {
    soundFx.playClick();
    intelligenceRouter.setMode(mode);
    setActionNotice({
      text:
        mode === 'offline'
          ? 'Offline Only enabled. Cloud Gemini requests are blocked while offline mode is active.'
          : mode === 'online'
          ? 'Online Only enabled. SURYA routes chat directly to Cloud Gemini.'
          : 'Auto mode enabled. SURYA uses Cloud when connected and falls back cleanly when offline.',
      tone: 'info',
    });
  };

  const handleRequestDownload = (model: OfflineModelManifest) => {
    soundFx.playClick();
    setActionNotice(null);
    const res = modelDownloadManager.requestDownloadConfirmation(model.id);
    if (!res.assessment.canDownload) {
      soundFx.playAbort();
      setActionNotice({
        text: `${model.displayName}: ${res.assessment.blockers.join(' ')}`,
        tone: 'err',
      });
    }
  };

  const handleConfirmDownload = async (model: OfflineModelManifest) => {
    soundFx.playAuthorize();
    setActionNotice({ text: `Starting verified download for ${model.displayName}...`, tone: 'info' });
    try {
      const rec = await modelDownloadManager.confirmAndStartDownload(model.id, {
        explicitConfirmed: true,
      });
      if (rec.status === 'ready') {
        soundFx.playAuthorize();
        setActionNotice({ text: `${model.displayName} downloaded and SHA-256 verified.`, tone: 'ok' });
      }
    } catch (err: any) {
      soundFx.playAbort();
      setActionNotice({
        text: err?.message || `Download failed for ${model.displayName}.`,
        tone: 'err',
      });
    }
  };

  const handleLoadModel = async (model: OfflineModelManifest) => {
    soundFx.playClick();
    setActionNotice({ text: `Loading ${model.displayName} into local memory...`, tone: 'info' });
    setSelfTestResult(null);
    try {
      const nextState = await localInferenceRuntime.loadModel(model.id);
      soundFx.playAuthorize();
      setActionNotice({
        text: `${nextState.activeModelName} active via ${nextState.executionBackend}.`,
        tone: 'ok',
      });
    } catch (err: any) {
      soundFx.playAbort();
      setActionNotice({
        text: err?.message || `Unable to load ${model.displayName}.`,
        tone: 'err',
      });
    }
  };

  const handleUnloadModel = async () => {
    soundFx.playClick();
    await localInferenceRuntime.unloadModel();
    setSelfTestResult(null);
    setActionNotice({ text: 'Local model unloaded from memory.', tone: 'info' });
  };

  const handleDeleteModel = async (model: OfflineModelManifest) => {
    soundFx.playClick();
    try {
      await modelDownloadManager.deleteModel(model.id);
      setActionNotice({ text: `Deleted local weights for ${model.displayName}.`, tone: 'info' });
      deviceCapabilityService.refresh().catch(() => {});
    } catch (err: any) {
      soundFx.playAbort();
      setActionNotice({ text: err?.message || 'Cannot delete model.', tone: 'err' });
    }
  };

  const handleVerifyModel = async (model: OfflineModelManifest) => {
    soundFx.playClick();
    const res = await modelDownloadManager.verifyDownloadedModel(model.id);
    if (res.valid) {
      soundFx.playAuthorize();
      setActionNotice({
        text: `${model.displayName} verified (${res.sha256 ? res.sha256.slice(0, 12) + '...' : 'SHA-256 valid'}).`,
        tone: 'ok',
      });
    } else {
      soundFx.playAbort();
      setActionNotice({ text: `Integrity check failed: ${res.reason}`, tone: 'err' });
    }
  };

  const handleLocalInferenceSelfCheck = async () => {
    soundFx.playClick();
    setIsTestingLocal(true);
    setSelfTestResult(null);
    try {
      const out = await localInferenceRuntime.generateResponse(
        'Reply in one short plain sentence confirming offline local execution.',
        { timeoutMs: 20000 }
      );
      soundFx.playAuthorize();
      setSelfTestResult({
        ok: true,
        text: out.text,
        latencyMs: out.latencyMs,
      });
    } catch (err: any) {
      soundFx.playAbort();
      setSelfTestResult({
        ok: false,
        text: err?.message || 'Local runtime unavailable on this platform.',
      });
    } finally {
      setIsTestingLocal(false);
    }
  };

  const catalogItems = recommendations.assessments.filter(({ model, assessment }) => {
    const dl = downloadStates[model.id];
    if (activeCatalogFilter === 'recommended') {
      return assessment.status === 'recommended' || assessment.status === 'compatible';
    }
    if (activeCatalogFilter === 'downloaded') {
      return dl?.status === 'ready' || dl?.status === 'downloading' || dl?.status === 'paused';
    }
    return true;
  });

  const downloadedCount = Object.values(downloadStates).filter((d) => d.status === 'ready').length;
  const totalDownloadedBytes = modelDownloadManager.getTotalDownloadedBytes();

  const tierCards: {
    key: 'lightweight' | 'balanced' | 'advanced';
    label: string;
    subtitle: string;
  }[] = [
    { key: 'lightweight', label: 'Lightweight', subtitle: 'Fast response · low RAM' },
    { key: 'balanced', label: 'Balanced', subtitle: 'Best daily assistant fit' },
    { key: 'advanced', label: 'Advanced', subtitle: 'Higher reasoning capability' },
  ];

  const compatibilityColor = (status: ModelCompatibilityAssessment['status']) => {
    if (status === 'recommended') return 'text-emerald-300';
    if (status === 'compatible') return 'text-[#60a5fa]';
    if (status === 'tight') return 'text-[#d4a84f]';
    return 'text-rose-300';
  };

  return (
    <div className="space-y-4">
      {/* 1. Intelligence Routing Mode */}
      <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-slate-100 block">Intelligence Routing Mode</span>
            <span className="text-[11px] text-slate-400">
              {routerStatus.activePath === 'on-device-llm'
                ? `Active path: On-device (${routerStatus.activeLocalModelName})`
                : routerStatus.activePath === 'cloud-gemini'
                ? 'Active path: Cloud Gemini'
                : routerStatus.activePath === 'offline-tools'
                ? 'Active path: Offline Local Tools + Memory'
                : 'Active path: Offline (download & load a local model)'}
            </span>
          </div>
          {routerStatus.networkOnline && routerStatus.mode !== 'offline' ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#d4a84f] shrink-0" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#121826] border border-slate-800">
          {(
            [
              { id: 'auto', label: 'Auto' },
              { id: 'online', label: 'Online' },
              { id: 'offline', label: 'Offline' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleModeChange(opt.id)}
              className={`min-h-[38px] rounded-lg text-xs font-medium transition-colors ${
                routerStatus.mode === opt.id
                  ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Active Local Runtime Status & Genuine Self-Test */}
      <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-100 block">Local Inference Runtime</span>
            <span className="text-[11px] text-slate-400 block truncate">
              {runtimeState.activeModelName
                ? `${runtimeState.activeModelName} · ${runtimeState.executionBackend} · ~${runtimeState.estimatedMemoryMb} MB RAM`
                : 'No on-device model loaded'}
            </span>
          </div>
          {runtimeState.activeModelId && (
            <button
              type="button"
              onClick={handleUnloadModel}
              className="min-h-[34px] px-3 rounded-lg bg-[#121826] border border-slate-700 hover:border-slate-600 text-xs text-slate-200 shrink-0"
            >
              Unload
            </button>
          )}
        </div>

        {runtimeState.lastError && (
          <div className="p-2.5 rounded-lg bg-rose-950/35 border border-rose-500/30 text-[11px] text-rose-200">
            {runtimeState.lastError}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-400">
            Verify actual local generation on loaded weights
          </span>
          <button
            type="button"
            onClick={handleLocalInferenceSelfCheck}
            disabled={isTestingLocal}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-[#121826] border border-slate-700 hover:border-[#60a5fa] text-[#60a5fa] text-xs font-medium flex items-center gap-1.5 shrink-0"
          >
            <Zap className={`w-3.5 h-3.5 ${isTestingLocal ? 'animate-spin' : ''}`} />
            <span>{isTestingLocal ? 'Testing...' : 'Test Local Inference'}</span>
          </button>
        </div>

        {selfTestResult && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
              selfTestResult.ok
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between font-medium">
              <span>{selfTestResult.ok ? 'Local Inference Verified' : 'Runtime Notice'}</span>
              {typeof selfTestResult.latencyMs === 'number' && (
                <span className="tabular-nums">{selfTestResult.latencyMs} ms</span>
              )}
            </div>
            <p className="text-slate-200 leading-relaxed">{selfTestResult.text}</p>
          </div>
        )}
      </div>

      {/* 3. Device Hardware Intelligence Summary */}
      <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#60a5fa]" />
            <span className="text-xs font-medium text-slate-100">Device Hardware Analysis</span>
          </div>
          <button
            type="button"
            onClick={handleRefreshHardware}
            className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshingHw ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
          <div className="p-2 rounded-lg bg-[#121826] border border-slate-800/80">
            <span className="text-slate-400 block">Device &amp; OS</span>
            <span className="text-slate-100 font-medium block truncate">
              {device.platform === 'android'
                ? `${device.deviceModel} · Android ${device.androidRelease || '?'}`
                : `${device.deviceModel} (Web)`}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[#121826] border border-slate-800/80">
            <span className="text-slate-400 block">Memory (Free / Total)</span>
            <span className="text-slate-100 font-medium block">
              {device.availableRamMb ? `${(device.availableRamMb / 1024).toFixed(1)} GB` : '—'} /{' '}
              {device.totalRamMb ? `${(device.totalRamMb / 1024).toFixed(1)} GB` : 'Restricted'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[#121826] border border-slate-800/80">
            <span className="text-slate-400 block">Internal Storage Free</span>
            <span className="text-slate-100 font-medium block">
              {device.availableStorageMb !== null
                ? `${(device.availableStorageMb / 1024).toFixed(1)} GB`
                : 'Restricted'}
              {totalDownloadedBytes > 0 ? ` · ${formatBytes(totalDownloadedBytes)} used` : ''}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[#121826] border border-slate-800/80">
            <span className="text-slate-400 block">CPU &amp; Battery</span>
            <span className="text-slate-100 font-medium block truncate">
              {device.cpuAbis.length > 0 ? device.cpuAbis[0] : 'Web'} ·{' '}
              {device.cpuCores ? `${device.cpuCores} cores` : '?'} ·{' '}
              {device.batteryLevel !== null ? `${device.batteryLevel}%` : '—'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          {device.gpuAcceleration.summary}
          {device.thermalStatus !== 'unknown' && device.thermalStatus !== 'nominal'
            ? ` · Thermal: ${device.thermalStatus}`
            : ''}
        </p>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs ${
            actionNotice.tone === 'ok'
              ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-200'
              : actionNotice.tone === 'warn'
              ? 'bg-amber-950/35 border-amber-500/30 text-amber-200'
              : actionNotice.tone === 'err'
              ? 'bg-rose-950/35 border-rose-500/30 text-rose-200'
              : 'bg-[#0b0f17] border-slate-800 text-slate-300'
          }`}
        >
          {actionNotice.text}
        </div>
      )}

      {/* 4. Hardware-Matched Recommendations */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-[#d4a84f]" />
          <span>Recommended For Your Device</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {tierCards.map((tc) => {
            const pick = recommendations[tc.key];
            if (!pick) {
              return (
                <div
                  key={tc.key}
                  className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800/80 space-y-1"
                >
                  <span className="text-xs font-medium text-slate-200 block">{tc.label}</span>
                  <span className="text-[11px] text-slate-500 block">
                    No safe model fits device RAM/storage constraints.
                  </span>
                </div>
              );
            }
            const dl = downloadStates[pick.model.id];
            const isActive = runtimeState.activeModelId === pick.model.id;
            return (
              <div
                key={tc.key}
                className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-[#d4a84f]">{tc.label}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {formatBytes(pick.model.sizeBytes)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-100 block mt-0.5 truncate">
                    {pick.model.displayName}
                  </span>
                  <span className="text-[11px] text-slate-400 block">{tc.subtitle}</span>
                </div>

                {isActive ? (
                  <span className="text-[11px] font-medium text-emerald-300">Active On Device</span>
                ) : dl?.status === 'ready' ? (
                  <button
                    type="button"
                    onClick={() => handleLoadModel(pick.model)}
                    className="min-h-[34px] w-full rounded-lg bg-[#60a5fa] text-slate-950 text-xs font-semibold"
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestDownload(pick.model)}
                    disabled={!pick.assessment.canDownload || dl?.status === 'downloading'}
                    className="min-h-[34px] w-full rounded-lg bg-[#121826] border border-slate-700 hover:border-[#d4a84f] disabled:opacity-40 text-slate-200 text-xs font-medium"
                  >
                    {dl?.status === 'downloading' ? `Downloading ${dl.progressPercent}%` : 'Download'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Offline AI Model Store Catalog */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
            <HardDrive className="w-3.5 h-3.5 text-[#60a5fa]" />
            <span>Offline Model Catalog ({downloadedCount} installed)</span>
          </div>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'recommended', label: 'Compatible' },
                { id: 'downloaded', label: 'Installed' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveCatalogFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                  activeCatalogFilter === f.id
                    ? 'bg-[#d4a84f] text-slate-950'
                    : 'bg-[#0b0f17] text-slate-400 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {catalogItems.map(({ model, assessment }) => {
            const dl = downloadStates[model.id] || {
              modelId: model.id,
              status: 'not_downloaded',
              downloadedBytes: 0,
              totalBytes: model.sizeBytes,
              progressPercent: 0,
              speedBytesPerSec: 0,
              etaSeconds: null,
            };
            const isActive = runtimeState.activeModelId === model.id;
            const isLoading = runtimeState.status === 'loading';

            return (
              <div
                key={model.id}
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isActive
                    ? 'bg-[#121826] border-[#d4a84f]/60'
                    : 'bg-[#0b0f17] border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-100">
                        {model.displayName}
                      </span>
                      <span className={`text-[11px] font-medium capitalize ${compatibilityColor(assessment.status)}`}>
                        · {assessment.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {model.parameterCount} · {model.quantization} · {formatBytes(model.sizeBytes)} · Min{' '}
                      {(model.minDeviceRamMb / 1024).toFixed(0)} GB RAM · {model.contextLength} ctx ·{' '}
                      {model.license}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      {model.repoId}
                    </p>
                  </div>

                  {isActive && (
                    <span className="text-[11px] font-medium text-emerald-300 shrink-0">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{model.summary}</p>

                {assessment.blockers.length > 0 && (
                  <div className="text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{assessment.blockers.join(' ')}</span>
                  </div>
                )}

                {assessment.warnings.length > 0 && assessment.blockers.length === 0 && (
                  <div className="text-[11px] text-amber-200/90 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{assessment.warnings.join(' ')}</span>
                  </div>
                )}

                {/* Explicit Confirmation Prompt before starting download */}
                {dl.status === 'awaiting_confirmation' && (
                  <div className="p-3 rounded-xl bg-[#121826] border border-[#d4a84f]/50 space-y-2 text-xs">
                    <div className="font-medium text-[#d4a84f]">Confirm Model Download</div>
                    <p className="text-slate-300 leading-relaxed tabular-nums">
                      Download <strong className="text-slate-100">{model.displayName}</strong> ({formatBytes(model.sizeBytes)}) to device storage? Requires{' '}
                      {formatBytes(assessment.requiredStorageBytes)} free space (including verification buffer). License:{' '}
                      <span className="text-slate-100">{model.license}</span>. File integrity will be verified by SHA-256 on completion.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmDownload(model)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#d4a84f] text-slate-950 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Confirm Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => modelDownloadManager.cancelConfirmation(model.id)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-slate-700 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Active / Paused / Verifying Download Progress */}
                {(dl.status === 'downloading' || dl.status === 'paused' || dl.status === 'verifying') && (
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-[#121826] overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-[#60a5fa] transition-all duration-300"
                        style={{ width: `${Math.max(2, dl.progressPercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                      <span>
                        {dl.status === 'verifying'
                          ? 'Verifying SHA-256 checksum...'
                          : dl.status === 'paused'
                          ? `Paused · ${dl.progressPercent}%`
                          : `${dl.progressPercent}% · ${formatBytes(dl.downloadedBytes)} / ${formatBytes(
                              dl.totalBytes || model.sizeBytes
                            )}`}
                      </span>
                      <span>
                        {dl.status === 'downloading' && dl.speedBytesPerSec > 0
                          ? `${formatBytes(dl.speedBytesPerSec)}/s${
                              dl.etaSeconds !== null ? ` · ~${dl.etaSeconds}s` : ''
                            }`
                          : ''}
                      </span>
                    </div>
                  </div>
                )}

                {(dl.status === 'failed' || dl.status === 'corrupted') && dl.error && (
                  <div className="text-[11px] text-rose-300">
                    {dl.error}
                  </div>
                )}

                {/* Control Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {dl.status === 'not_downloaded' && (
                    <button
                      type="button"
                      onClick={() => handleRequestDownload(model)}
                      disabled={!assessment.canDownload}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#60a5fa] disabled:opacity-40 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download ({formatBytes(model.sizeBytes)})</span>
                    </button>
                  )}

                  {(dl.status === 'failed' || dl.status === 'corrupted') && (
                    <button
                      type="button"
                      onClick={() => handleRequestDownload(model)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Download</span>
                    </button>
                  )}

                  {dl.status === 'downloading' && (
                    <>
                      <button
                        type="button"
                        onClick={() => modelDownloadManager.pauseDownload(model.id)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-700 text-slate-200 text-xs flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => modelDownloadManager.cancelDownload(model.id)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-800 text-rose-300 text-xs flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {dl.status === 'paused' && (
                    <>
                      <button
                        type="button"
                        onClick={() => modelDownloadManager.resumeDownload(model.id)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#60a5fa] text-slate-950 font-semibold text-xs flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => modelDownloadManager.cancelDownload(model.id)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-800 text-rose-300 text-xs flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {dl.status === 'ready' && (
                    <>
                      {isActive ? (
                        <button
                          type="button"
                          onClick={handleUnloadModel}
                          className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-700 text-slate-200 text-xs font-medium"
                        >
                          Unload Model
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLoadModel(model)}
                          disabled={isLoading || !assessment.canLoadSafely}
                          className="min-h-[36px] px-3.5 rounded-lg bg-[#d4a84f] disabled:opacity-40 text-slate-950 text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Load &amp; Activate</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleVerifyModel(model)}
                        className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-800 text-slate-300 text-xs flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verify</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteModel(model)}
                        disabled={isActive}
                        title={isActive ? 'Unload model before deleting' : 'Delete downloaded weights'}
                        className="min-h-[36px] px-3 rounded-lg bg-[#121826] border border-slate-800 disabled:opacity-40 text-rose-300 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Offline Speech & Voice Packs */}
      <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#d4a84f]" />
            <span className="text-xs font-medium text-slate-100">Offline Speech &amp; Voice Packs</span>
          </div>
          <span className="text-[11px] text-slate-400">
            TTS: {voiceReadiness.ttsReady ? 'Ready' : 'Check device'} · STT:{' '}
            {voiceReadiness.onDeviceSttSupported ? 'On-device ready' : 'Requires OS pack'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{voiceReadiness.note}</p>
        {voiceReadiness.isNative && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              voiceService.openOfflineVoicePackInstaller();
            }}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#121826] border border-slate-700 hover:border-[#d4a84f] text-xs font-medium text-slate-200"
          >
            Manage Android Offline Voice Packs
          </button>
        )}
      </div>

      {/* 7. Offline Capability Audit Matrix */}
      <div className="rounded-xl bg-[#0b0f17] border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setShowAuditMatrix((v) => !v);
          }}
          className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-xs font-medium text-slate-100 block">
              Offline Capability Compatibility Matrix
            </span>
            <span className="text-[11px] text-slate-400">
              13 audited capabilities + explicit online-only boundaries
            </span>
          </div>
          {showAuditMatrix ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showAuditMatrix && (
          <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800 space-y-2">
            {OFFLINE_CAPABILITY_MATRIX.map((cap) => (
              <div
                key={cap.id}
                className="p-2.5 rounded-lg bg-[#121826] border border-slate-800/80 space-y-1 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">
                    {cap.number}. {cap.name}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      cap.status === 'OFFLINE'
                        ? 'text-emerald-300'
                        : cap.status === 'PARTIAL'
                        ? 'text-[#d4a84f]'
                        : 'text-slate-400'
                    }`}
                  >
                    {cap.status}
                  </span>
                </div>
                <p className="text-slate-300">{cap.offlineBehavior}</p>
                <p className="text-slate-500">
                  Engine: {cap.engine} · Note: {cap.limitations}
                </p>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[11px] font-medium text-slate-300 block">
                Online-Only Features
              </span>
              {ONLINE_ONLY_FEATURES.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-[#121826] border border-slate-800/60 flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-500 shrink-0">ONLINE</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
