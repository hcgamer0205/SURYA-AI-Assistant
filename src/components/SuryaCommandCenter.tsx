import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Radio,
  Cpu,
  CheckSquare,
  Clock,
  Sliders,
  ChevronRight,
  Eye,
  BookOpen,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Bluetooth,
  Mic,
  MicOff,
  Send,
  Calendar,
  Zap,
  Bell,
  X,
  Code2,
  Shield,
  LayoutGrid,
  Info,
} from 'lucide-react';
import { voiceProfileManager } from '../services/voiceProfileManager';
import { wakeWordService, WakeWordState } from '../services/wakeWordService';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { productivityService, TaskItem, AgendaEvent, AutomationWorkflow } from '../services/productivityService';
import { MULTI_AGENTS } from '../services/cognitiveEngine';
import { deviceBridgeService } from '../services/deviceBridgeService';
import { proactiveService, ProactiveFrequency, ProactiveSuggestion } from '../services/proactiveService';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';
import { DeviceTelemetry, ResponseMode, TabType } from '../types/surya';

interface SuryaCommandCenterProps {
  activeModel: string;
  responseMode: ResponseMode;
  onChangeResponseMode: (mode: ResponseMode) => void;
  onSendQuickCommand: (text: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenVoiceModal: () => void;
  onOpenThemeModal: () => void;
  onOpenProductivityModal: (initialTab?: 'tasks' | 'notes' | 'focus' | 'vault' | 'automations') => void;
  onOpenAgentModal: () => void;
  onOpenModelModal: () => void;
}

type PanelId = 'telemetry' | 'handsfree' | 'proactive' | 'agenda_tasks' | 'automations' | 'agents';

const DEFAULT_VISIBLE_PANELS: Record<PanelId, boolean> = {
  telemetry: true,
  handsfree: true,
  proactive: true,
  agenda_tasks: true,
  automations: true,
  agents: true,
};

const PANEL_STORAGE_KEY = 'surya_dashboard_panels_v1';

export const SuryaCommandCenter: React.FC<SuryaCommandCenterProps> = ({
  activeModel,
  responseMode,
  onChangeResponseMode,
  onSendQuickCommand,
  onNavigateTab,
  onOpenVoiceModal,
  onOpenThemeModal,
  onOpenProductivityModal,
  onOpenAgentModal,
  onOpenModelModal,
}) => {
  const [voiceSettings, setVoiceSettings] = useState(voiceProfileManager.getSettings());
  const [wakeWordState, setWakeWordState] = useState<WakeWordState>(wakeWordService.getState());
  const [telemetry, setTelemetry] = useState<DeviceTelemetry>(deviceBridgeService.getTelemetry());
  const [tasks, setTasks] = useState<TaskItem[]>(productivityService.getTasks().slice(0, 3));
  const [agenda, setAgenda] = useState<AgendaEvent[]>(productivityService.getAgenda().slice(0, 3));
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(productivityService.getAutomations().slice(0, 3));
  const [currentTheme, setCurrentTheme] = useState(uiThemeEngine.getCurrentTheme());
  const [quickPrompt, setQuickPrompt] = useState('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [proactiveFreq, setProactiveFreq] = useState<ProactiveFrequency>(proactiveService.getFrequency());
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>(proactiveService.getSuggestions());
  const [showPanelCustomizer, setShowPanelCustomizer] = useState(false);
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) return { ...DEFAULT_VISIBLE_PANELS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_VISIBLE_PANELS;
  });

  useEffect(() => {
    const unsubVoice = voiceProfileManager.subscribe((s) => setVoiceSettings(s));
    const unsubWake = wakeWordService.subscribe((s) => setWakeWordState(s));
    const unsubTheme = uiThemeEngine.subscribe((t) => setCurrentTheme(t));
    const unsubTel = deviceBridgeService.subscribe((tel) => {
      setTelemetry(tel);
      setSuggestions(proactiveService.getSuggestions());
    });

    apiService
      .getSystemHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));

    return () => {
      unsubVoice();
      unsubWake();
      unsubTheme();
      unsubTel();
    };
  }, []);

  const togglePanel = (id: PanelId) => {
    soundFx.playClick();
    const updated = { ...visiblePanels, [id]: !visiblePanels[id] };
    setVisiblePanels(updated);
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    soundFx.playClick();
    onSendQuickCommand(quickPrompt.trim());
    setQuickPrompt('');
    onNavigateTab('chat');
  };

  const activeProfile = voiceProfileManager.getActiveProfile();
  const pendingTasksCount = productivityService.getTasks().filter((t) => t.status !== 'completed').length;
  const primaryCol = currentTheme.palette.primary;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 pt-2 pb-24 space-y-4">
      {/* 1. Command Greeting & Unified Conversation Entry */}
      <section className="p-4 rounded-2xl bg-slate-900/85 border border-amber-500/25 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: primaryCol }}
              />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: primaryCol }}>
                SURYA OPERATING ENVIRONMENT
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {getGreeting()}, Operator.
            </h2>
            <p className="text-xs text-slate-400">
              Voice-first intelligence, optics, studio, and Stark automations unified.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Response Concise/Detailed Switch */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono">
              <button
                onClick={() => {
                  soundFx.playClick();
                  onChangeResponseMode('concise');
                }}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  responseMode === 'concise' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                CONCISE
              </button>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onChangeResponseMode('detailed');
                }}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  responseMode === 'detailed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                DETAILED
              </button>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                setShowPanelCustomizer(!showPanelCustomizer);
              }}
              aria-label="Customize dashboard panels"
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-[10px] font-mono text-slate-300 flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>PANELS</span>
            </button>
          </div>
        </div>

        {/* Panel Customizer Bar */}
        {showPanelCustomizer && (
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Dashboard Widgets:</span>
            {(
              [
                { id: 'telemetry', label: 'Telemetry' },
                { id: 'handsfree', label: 'Hands-Free' },
                { id: 'proactive', label: 'Proactive' },
                { id: 'agenda_tasks', label: 'Agenda & Tasks' },
                { id: 'automations', label: 'Automations' },
                { id: 'agents', label: '10 Agents' },
              ] as { id: PanelId; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => togglePanel(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                  visiblePanels[p.id]
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {visiblePanels[p.id] ? '✓ ' : '+ '}
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick Command Input Bar */}
        <form onSubmit={handleQuickSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="Ask SURYA anything, or say 'Open Optics', 'Remember that...', 'Add task...'"
            className="flex-1 min-h-[44px] bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!quickPrompt.trim()}
            aria-label="Send command"
            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-amber-500 disabled:opacity-40 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">ASK</span>
          </button>
        </form>

        {/* Core Status Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
          <button onClick={onOpenModelModal} className="text-left p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/40">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">AI MODEL</span>
            <span className="text-xs font-mono font-bold text-amber-300 truncate block">{activeModel}</span>
          </button>
          <button onClick={() => onNavigateTab('system')} className="text-left p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/40">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">BACKEND HEALTH</span>
            <span
              className={`text-xs font-mono font-bold uppercase ${
                backendStatus === 'online'
                  ? 'text-emerald-400'
                  : backendStatus === 'checking'
                  ? 'text-amber-300'
                  : 'text-rose-400'
              }`}
            >
              {backendStatus}
            </span>
          </button>
          <button onClick={onOpenVoiceModal} className="text-left p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/40">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">VOICE PROFILE</span>
            <span className="text-xs font-mono font-bold text-slate-100 truncate block">
              {activeProfile.name} ({voiceSettings.language})
            </span>
          </button>
          <button onClick={() => onOpenProductivityModal('tasks')} className="text-left p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-amber-500/40">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">PENDING QUEUE</span>
            <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">{pendingTasksCount} task(s)</span>
          </button>
        </div>
      </section>

      {/* 2. Quick Subsystems Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => {
            soundFx.playClick();
            onNavigateTab('chat');
          }}
          className="min-h-[68px] p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex items-center gap-3 text-left transition-all active:scale-95"
        >
          <Radio className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-100 block">CHAT & STREAM</span>
            <span className="text-[10px] text-slate-400">Real-time SSE</span>
          </div>
        </button>

        <button
          onClick={() => {
            soundFx.playClick();
            onNavigateTab('optics');
          }}
          className="min-h-[68px] p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 flex items-center gap-3 text-left transition-all active:scale-95"
        >
          <Eye className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-100 block">SURYA VISION</span>
            <span className="text-[10px] text-slate-400">OCR · Docs · QR</span>
          </div>
        </button>

        <button
          onClick={() => {
            soundFx.playClick();
            onNavigateTab('studio');
          }}
          className="min-h-[68px] p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex items-center gap-3 text-left transition-all active:scale-95"
        >
          <Code2 className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-100 block">SURYA STUDIO</span>
            <span className="text-[10px] text-slate-400">Builder · GitHub</span>
          </div>
        </button>

        <button
          onClick={() => {
            soundFx.playClick();
            onOpenProductivityModal('vault');
          }}
          className="min-h-[68px] p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 flex items-center gap-3 text-left transition-all active:scale-95"
        >
          <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold text-slate-100 block">VAULT & NOTES</span>
            <span className="text-[10px] text-slate-400">Grounded Search</span>
          </div>
        </button>
      </section>

      {/* Desktop 2-Column Adaptive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 3. Device Telemetry & Hands-Free Controls */}
        {(visiblePanels.telemetry || visiblePanels.handsfree) && (
          <div className="space-y-4">
            {visiblePanels.telemetry && (
              <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                    DEVICE TELEMETRY
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {telemetry.platform === 'android' ? `ANDROID SDK ${telemetry.sdkVersion || 36}` : 'WEB RUNTIME'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1">
                      {telemetry.isCharging ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>BATTERY</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-100 tabular-nums">
                      {telemetry.batteryLevel !== null ? `${telemetry.batteryLevel}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1">
                      {telemetry.online ? (
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>NETWORK</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-100 uppercase truncate block">
                      {telemetry.networkType}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1">
                      <Bluetooth
                        className={`w-3.5 h-3.5 ${
                          telemetry.bluetoothAudioConnected ? 'text-cyan-400' : 'text-slate-500'
                        }`}
                      />
                      <span>AUDIO BT</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-slate-100">
                      {telemetry.bluetoothAudioConnected ? 'PAIRED' : 'DIRECT'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {visiblePanels.handsfree && (
              <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {wakeWordState.isActive ? (
                      <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ) : (
                      <MicOff className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase block">
                        HANDS-FREE WAKE MODE
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Triggers: &ldquo;Hey SURYA&rdquo;, &ldquo;Hi SURYA&rdquo;, &ldquo;हे सूर्या&rdquo;
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      wakeWordService.toggle();
                    }}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                      wakeWordState.isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {wakeWordState.isActive ? 'ARMED (STOP)' : 'ENABLE'}
                  </button>
                </div>

                {wakeWordState.isActive && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] font-mono text-emerald-200 flex items-center justify-between">
                    <span>VISIBLE MIC INDICATOR: ACTIVE LISTENING</span>
                    {wakeWordState.foregroundServiceActive && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px]">FG SERVICE</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>SENSITIVITY</span>
                      <span className="tabular-nums">{Math.round(wakeWordState.sensitivity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="0.95"
                      step="0.05"
                      value={wakeWordState.sensitivity}
                      onChange={(e) => wakeWordService.setSensitivity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                      aria-label="Wake-word sensitivity"
                    />
                  </div>
                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                    <span className="text-[11px] font-mono text-slate-300">Continuous Follow-up</span>
                    <input
                      type="checkbox"
                      checked={wakeWordState.continuousConversation}
                      onChange={(e) => wakeWordService.setContinuousConversation(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                  </label>
                </div>

                <div className="flex items-start gap-2 text-[10px] text-slate-400 leading-relaxed pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{wakeWordService.getBackgroundLimitationNote()}</span>
                </div>
              </section>
            )}
          </div>
        )}

        {/* 4. Proactive Personal Intelligence & Agenda/Tasks */}
        <div className="space-y-4">
          {visiblePanels.proactive && (
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                    PROACTIVE INTELLIGENCE
                  </span>
                </div>
                <select
                  aria-label="Proactive suggestion frequency"
                  value={proactiveFreq}
                  onChange={(e) => {
                    const next = e.target.value as ProactiveFrequency;
                    proactiveService.setFrequency(next);
                    setProactiveFreq(next);
                    setSuggestions(proactiveService.getSuggestions());
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-200"
                >
                  <option value="off">Off</option>
                  <option value="low">Low</option>
                  <option value="balanced">Balanced</option>
                  <option value="proactive">Proactive</option>
                </select>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-xs text-slate-400 font-mono py-2">
                  {proactiveFreq === 'off'
                    ? 'Proactive suggestions disabled.'
                    : 'No immediate advisories. All tracked items clear.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                        sug.priority === 'warning'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : sug.priority === 'attention'
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-100 block">{sug.title}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{sug.description}</span>
                        {sug.actionLabel && (
                          <button
                            onClick={() => {
                              soundFx.playClick();
                              if (sug.promptAction) {
                                onSendQuickCommand(sug.promptAction);
                                onNavigateTab('chat');
                              } else if (sug.targetTab) {
                                onNavigateTab(sug.targetTab);
                              }
                            }}
                            className="mt-2 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold"
                          >
                            {sug.actionLabel}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          proactiveService.dismiss(sug.id);
                          setSuggestions(proactiveService.getSuggestions());
                        }}
                        aria-label={`Dismiss ${sug.title}`}
                        className="p-1 text-slate-500 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {visiblePanels.agenda_tasks && (
            <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                    AGENDA & PRIORITY TASKS
                  </span>
                </div>
                <button
                  onClick={() => onOpenProductivityModal('tasks')}
                  className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <span>PLANNER ({pendingTasksCount})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {agenda.length > 0 && (
                <div className="space-y-1.5">
                  {agenda.map((evt) => (
                    <div
                      key={evt.id}
                      className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-200 truncate">{evt.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0 ml-2 tabular-nums">
                        {evt.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      soundFx.playAuthorize();
                      productivityService.toggleTask(task.id);
                      setTasks(productivityService.getTasks().slice(0, 3));
                      setSuggestions(proactiveService.getSuggestions());
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-left transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare
                        className={`w-4 h-4 shrink-0 ${
                          task.status === 'completed' ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span
                        className={`text-xs truncate ${
                          task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 ml-2 shrink-0">
                      {task.priority}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 5. Active Automations & 10-Agent Intelligence Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visiblePanels.automations && (
          <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  ACTIVE STARK AUTOMATIONS
                </span>
              </div>
              <button
                onClick={() => onOpenProductivityModal('automations')}
                className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>MANAGE</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block truncate">{auto.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Trigger: {auto.trigger} · {auto.actions.length} step(s)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      productivityService.toggleAutomation(auto.id);
                      setAutomations(productivityService.getAutomations().slice(0, 3));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 ${
                      auto.isEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {auto.isEnabled ? 'ENABLED' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {visiblePanels.agents && (
          <section className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  10-AGENT INTELLIGENCE MATRIX
                </span>
              </div>
              <button
                onClick={onOpenAgentModal}
                className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>ORCHESTRATE</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MULTI_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-[11px] font-semibold text-slate-200 truncate">
                    {agent.name.replace(' Agent', '')}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 6. Shortcut Row: Theme Studio, Security, Study Focus */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={onOpenThemeModal}
          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-xs font-bold text-slate-100 block">THEME STUDIO</span>
            <span className="text-[10px] text-slate-400">{currentTheme.name}</span>
          </div>
          <Sliders className="w-4 h-4 text-amber-400" />
        </button>

        <button
          onClick={() => onOpenProductivityModal('focus')}
          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-xs font-bold text-slate-100 block">STUDY & FOCUS</span>
            <span className="text-[10px] text-slate-400">25m Solar Timer</span>
          </div>
          <Clock className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => onNavigateTab('system')}
          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-xs font-bold text-slate-100 block">VERONICA & MEMORY</span>
            <span className="text-[10px] text-slate-400">Diagnostics & Audit</span>
          </div>
          <Shield className="w-4 h-4 text-rose-400" />
        </button>
      </section>
    </div>
  );
};
