import React, { useState, useEffect } from 'react';
import {
  Cpu,
  X,
  Activity,
  HardDrive,
  Download,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';
import { apiService } from '../services/apiService';
import { OFFLINE_MODEL_CATALOG, formatBytes } from '../services/offlineModelHelpers.js';
import { modelDownloadManager } from '../services/modelDownloadManager';
import { localInferenceRuntime } from '../services/localInferenceRuntime';
import { intelligenceRouter } from '../services/intelligenceRouter';

interface ModelSelectorModalProps {
  onClose: () => void;
  activeModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenOfflineStore?: () => void;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  latency: string;
  speedRating: 'Fastest' | 'High Performance' | 'Balanced';
  description: string;
}

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    provider: 'Cloud Gemini',
    latency: '~260ms TTFT',
    speedRating: 'High Performance',
    description: 'Primary multimodal reasoning model for fast everyday assistance.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'Cloud Gemini',
    latency: '~160ms TTFT',
    speedRating: 'Fastest',
    description: 'Low-latency lightweight cloud model with automatic fallback.',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    provider: 'Cloud Gemini',
    latency: '~390ms TTFT',
    speedRating: 'High Performance',
    description: 'Deeper reasoning model for complex multi-step planning and coding.',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    provider: 'Cloud Gemini',
    latency: '~310ms TTFT',
    speedRating: 'Balanced',
    description: 'Balanced multimodal model for code debugging and structured answers.',
  },
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  onClose,
  activeModel,
  onSelectModel,
  onOpenOfflineStore,
}) => {
  const [selectedId, setSelectedId] = useState(activeModel || 'gemini-4-hydrogen');
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());
  const [runtimeState, setRuntimeState] = useState(() => localInferenceRuntime.getState());
  const [downloadedIds, setDownloadedIds] = useState<string[]>(() =>
    modelDownloadManager.getDownloadedModels().map((d) => d.modelId)
  );
  const [testResult, setTestResult] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);
    const unsubRt = localInferenceRuntime.subscribe(setRuntimeState);
    const unsubDl = modelDownloadManager.subscribe(() => {
      setDownloadedIds(modelDownloadManager.getDownloadedModels().map((d) => d.modelId));
    });
    return () => {
      unsubRouter();
      unsubRt();
      unsubDl();
    };
  }, []);

  const handleSelectCloud = (id: string) => {
    soundFx.playClick();
    setSelectedId(id);
    onSelectModel(id);
  };

  const handleToggleLocalModel = async (modelId: string) => {
    soundFx.playClick();
    setLocalError(null);
    try {
      if (runtimeState.activeModelId === modelId) {
        await localInferenceRuntime.unloadModel();
      } else {
        await localInferenceRuntime.loadModel(modelId);
        soundFx.playAuthorize();
      }
    } catch (e: any) {
      soundFx.playAbort();
      setLocalError(e?.message || 'Unable to load offline model.');
    }
  };

  const handleTestConnection = async () => {
    soundFx.playClick();
    setTestResult('Checking Gemini backend gateway...');
    try {
      const health = await apiService.getSystemHealth();
      setTestResult(
        health?.status
          ? `Connected · Backend ${health.status} · Model: ${health.activeModel}`
          : 'Connected · Gemini backend active.'
      );
    } catch (e: any) {
      setTestResult(`Backend unreachable: ${e?.message || 'Check network or switch to Offline mode.'}`);
    }
  };

  const downloadedCatalogModels = OFFLINE_MODEL_CATALOG.filter((m) =>
    downloadedIds.includes(m.id)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Model Selector"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#05080f]/85 backdrop-blur-md"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#121826] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0b0f17] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#d4a84f]" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Model &amp; Routing Selector</h2>
              <p className="text-xs text-slate-400">
                Choose Cloud Gemini, On-Device AI, or automatic routing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] rounded-xl text-slate-400 hover:text-white bg-[#121826] border border-slate-800 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Routing Mode */}
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-slate-200 block">Intelligence Mode</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#121826] border border-slate-800">
              {(['auto', 'online', 'offline'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    intelligenceRouter.setMode(m);
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-medium capitalize transition-colors ${
                    routerStatus.mode === m
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Downloaded On-Device Models */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#60a5fa]" />
                <span>On-Device Offline Models</span>
              </span>
              {onOpenOfflineStore && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    onClose();
                    onOpenOfflineStore();
                  }}
                  className="text-xs text-[#d4a84f] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Open Model Store</span>
                </button>
              )}
            </div>

            {localError && (
              <div className="p-2.5 rounded-lg bg-rose-950/35 border border-rose-500/30 text-xs text-rose-200">
                {localError}
              </div>
            )}

            {downloadedCatalogModels.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-2">
                <span>No local models downloaded yet.</span>
                {onOpenOfflineStore && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onClose();
                      onOpenOfflineStore();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#60a5fa] text-slate-950 font-semibold text-xs shrink-0"
                  >
                    Download Model
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {downloadedCatalogModels.map((model) => {
                  const isActive = runtimeState.activeModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[#161f32] border-[#d4a84f]'
                          : 'bg-[#0b0f17] border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-100 block truncate">
                          {model.displayName}
                        </span>
                        <span className="text-[11px] text-slate-400 block tabular-nums">
                          {model.quantization} · {formatBytes(model.sizeBytes)} · Local
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleLocalModel(model.id)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-medium shrink-0 ${
                          isActive
                            ? 'bg-[#121826] border border-slate-700 text-slate-200'
                            : 'bg-[#d4a84f] text-slate-950 font-semibold'
                        }`}
                      >
                        {isActive ? 'Unload' : 'Activate'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cloud Gemini Models */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-300 block">Cloud Gemini Models</span>
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = selectedId === model.id;
              return (
                <button
                  type="button"
                  key={model.id}
                  onClick={() => handleSelectCloud(model.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-[#161f32] border-[#d4a84f]'
                      : 'bg-[#0b0f17] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">{model.name}</span>
                    <span className="text-[11px] text-[#d4a84f] tabular-nums">
                      {isSelected ? 'Selected' : model.latency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{model.description}</p>
                </button>
              );
            })}
          </div>

          {/* Gateway Test */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestConnection}
              className="w-full min-h-[40px] px-3 rounded-xl bg-[#0b0f17] hover:bg-slate-800 border border-slate-700 text-xs text-[#60a5fa] font-medium flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Test Cloud Gateway</span>
            </button>
            {testResult && (
              <div className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-xs text-slate-300">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0b0f17] border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold hover:bg-[#e0b65f]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
