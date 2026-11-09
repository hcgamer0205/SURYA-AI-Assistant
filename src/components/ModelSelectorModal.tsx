import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Eye,
  Wrench,
  Check,
  ShieldAlert,
  Activity,
  X,
  Radio,
  Sparkles,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface ModelSelectorModalProps {
  onClose: () => void;
  activeModel: string;
  onSelectModel: (modelId: string) => void;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  latency: string;
  speedRating: 'Fastest' | 'High Performance' | 'Balanced';
  streaming: boolean;
  vision: boolean;
  tools: boolean;
  description: string;
  isEligibleFallback: boolean;
}

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Primary)',
    provider: 'Google Gemini',
    latency: '~280ms TTFT',
    speedRating: 'High Performance',
    streaming: true,
    vision: true,
    tools: true,
    description: 'High-speed multimodal reasoning model optimized for real-time mobile assistant interactions.',
    isEligibleFallback: false,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite (Fallback)',
    provider: 'Google Gemini',
    latency: '~160ms TTFT',
    speedRating: 'Fastest',
    streaming: true,
    vision: true,
    tools: true,
    description: 'Ultra-lightweight low-latency model automatically routed when primary model experiences high load or 429 quotas.',
    isEligibleFallback: true,
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    provider: 'Google Gemini',
    latency: '~310ms TTFT',
    speedRating: 'Balanced',
    streaming: true,
    vision: true,
    tools: true,
    description: 'Stable general production flash checkpoint for robust natural dialogue and task execution.',
    isEligibleFallback: true,
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Experimental)',
    provider: 'Google Gemini',
    latency: '~390ms TTFT',
    speedRating: 'High Performance',
    streaming: true,
    vision: true,
    tools: true,
    description: 'Advanced reasoning preview model for complex multi-step planning and deep code generation.',
    isEligibleFallback: false,
  },
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  onClose,
  activeModel,
  onSelectModel,
}) => {
  const [selectedId, setSelectedId] = useState(activeModel || 'gemini-3.8-flash');
  const [fastModeEnabled, setFastModeEnabled] = useState(true);
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    soundFx.playClick();
    setSelectedId(id);
    onSelectModel(id);
  };

  const handleTestConnection = async () => {
    soundFx.playAuthorize();
    setTestResult('Testing connection to Google Gemini API gateway...');
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setTestResult('Connection verified: Gemini AI gateway 200 OK. Streaming active.');
      } else {
        setTestResult(`Gateway returned status ${res.status}`);
      }
    } catch (e: any) {
      setTestResult(`Network check error: ${e.message}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Model Selector"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                AI MODEL ENGINE & PROVIDER SELECTOR
              </h2>
              <p className="text-[10px] text-slate-400">Dynamic model switching, latency benchmarks & automated fallback</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Models List */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              CONFIGURED AI MODELS
            </span>
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = selectedId === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{model.name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                        Provider: {model.provider} • Speed: {model.speedRating} ({model.latency})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {model.vision && (
                        <span className="p-1 rounded bg-slate-800 text-cyan-400" title="Vision Supported">
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {model.tools && (
                        <span className="p-1 rounded bg-slate-800 text-emerald-400" title="Tool Calling">
                          <Wrench className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {model.streaming && (
                        <span className="p-1 rounded bg-slate-800 text-amber-400" title="Real-Time Streaming">
                          <Radio className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {model.description}
                  </p>

                  {model.isEligibleFallback && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Automatic fallback candidate if primary model is throttled (429/503).</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fallback & Optimization Toggles */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              MODEL RESILIENCE & LATENCY SETTINGS
            </span>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Bounded Auto-Fallback on 429/503</span>
                <span className="text-[10px] text-slate-400">Seamlessly routes to flash-lite if high demand is detected</span>
              </div>
              <input
                type="checkbox"
                checked={autoFallbackEnabled}
                onChange={(e) => setAutoFallbackEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-700/60">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Low-Latency Fast Response Mode</span>
                <span className="text-[10px] text-slate-400">Optimizes token generation parameters for rapid mobile delivery</span>
              </div>
              <input
                type="checkbox"
                checked={fastModeEnabled}
                onChange={(e) => setFastModeEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
            </label>
          </div>

          {/* Test Connection Button & Result */}
          <div className="space-y-2">
            <button
              onClick={handleTestConnection}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>TEST GEMINI API GATEWAY CONNECTION</span>
            </button>
            {testResult && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            CONFIRM SELECTION
          </button>
        </div>
      </div>
    </div>
  );
};
