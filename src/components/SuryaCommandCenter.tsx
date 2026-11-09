import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Radio,
  Cpu,
  Layers,
  CheckSquare,
  FileText,
  Clock,
  Zap,
  Globe,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Activity,
  Play,
  RotateCcw,
  Eye,
  BookOpen,
} from 'lucide-react';
import { voiceProfileManager } from '../services/voiceProfileManager';
import { wakeWordService, WakeWordState } from '../services/wakeWordService';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { productivityService, TaskItem, NoteItem } from '../services/productivityService';
import { cognitiveEngine, MULTI_AGENTS, AIAgent } from '../services/cognitiveEngine';
import { soundFx } from '../services/soundFx';
import { TabType } from '../types/surya';

interface SuryaCommandCenterProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenVoiceModal: () => void;
  onOpenThemeModal: () => void;
  onOpenProductivityModal: (initialTab?: 'tasks' | 'notes' | 'focus' | 'vault' | 'automations') => void;
  onOpenAgentModal: () => void;
  onOpenModelModal: () => void;
}

export const SuryaCommandCenter: React.FC<SuryaCommandCenterProps> = ({
  onNavigateTab,
  onOpenVoiceModal,
  onOpenThemeModal,
  onOpenProductivityModal,
  onOpenAgentModal,
  onOpenModelModal,
}) => {
  const [voiceSettings, setVoiceSettings] = useState(voiceProfileManager.getSettings());
  const [wakeWordState, setWakeWordState] = useState<WakeWordState>(wakeWordService.getState());
  const [tasks, setTasks] = useState<TaskItem[]>(productivityService.getTasks().slice(0, 3));
  const [notes, setNotes] = useState<NoteItem[]>(productivityService.getNotes().slice(0, 2));
  const [currentTheme, setCurrentTheme] = useState(uiThemeEngine.getCurrentTheme());

  useEffect(() => {
    const unsubVoice = voiceProfileManager.subscribe((s) => setVoiceSettings(s));
    const unsubWake = wakeWordService.subscribe((s) => setWakeWordState(s));
    const unsubTheme = uiThemeEngine.subscribe((t) => setCurrentTheme(t));
    return () => {
      unsubVoice();
      unsubWake();
      unsubTheme();
    };
  }, []);

  const activeProfile = voiceProfileManager.getActiveProfile();
  const pendingTasksCount = productivityService.getTasks().filter((t) => t.status !== 'completed').length;

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* 1. JARVIS-Inspired Greeting & Telemetry Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                SURYA CENTRAL INTELLIGENCE
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {getGreeting()}, Operator.
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              All neural, vision, and local Android subsystems are standing by.
            </p>
          </div>

          {/* Assistant Orb Status Badge */}
          <button
            onClick={onOpenVoiceModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[10px] font-mono hover:bg-amber-500/20 transition-all"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[120px]">{activeProfile.name}</span>
          </button>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase">AI ENGINE</span>
            <span className="text-xs font-mono font-bold text-amber-300 truncate">gemini-3.8-flash</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase">WAKE WORD</span>
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{wakeWordState.isActive ? 'LISTENING' : 'TAP TO ARM'}</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-400 uppercase">PENDING TASKS</span>
            <span className="text-xs font-mono font-bold text-slate-200">{pendingTasksCount} items</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Dispatch Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            TACTICAL QUICK LAUNCH
          </span>
          <span className="text-[10px] font-mono text-amber-400">0ms Local Routing</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              onNavigateTab('chat');
            }}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex flex-col items-center text-center transition-all active:scale-95 shadow-sm"
          >
            <Radio className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-xs font-bold text-slate-200">TACTICAL CHAT</span>
            <span className="text-[9px] text-slate-400">Real-time SSE</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onNavigateTab('optics');
            }}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex flex-col items-center text-center transition-all active:scale-95 shadow-sm"
          >
            <Eye className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-xs font-bold text-slate-200">AR VISION HUD</span>
            <span className="text-[9px] text-slate-400">OCR & Scene AI</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onOpenProductivityModal('focus');
            }}
            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex flex-col items-center text-center transition-all active:scale-95 shadow-sm"
          >
            <Clock className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-xs font-bold text-slate-200">FOCUS MODE</span>
            <span className="text-[9px] text-slate-400">Study Session</span>
          </button>
        </div>
      </div>

      {/* 3. Multi-Agent AI Framework Status Row */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">
              MULTI-AGENT INTELLIGENCE MATRIX
            </span>
          </div>
          <button
            onClick={onOpenAgentModal}
            className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <span>DISPATCH GOAL</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {MULTI_AGENTS.slice(0, 6).map((agent) => (
            <div
              key={agent.id}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
            >
              <div className="truncate pr-1">
                <span className="text-[10px] font-bold text-slate-200 truncate block">
                  {agent.name.replace(' Agent', '')}
                </span>
                <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SYNCHRONIZED</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Daily Agenda & High-Priority Tasks Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase">
              AGENDA & PRIORITY TASKS
            </span>
          </div>
          <button
            onClick={() => onOpenProductivityModal('tasks')}
            className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <span>VIEW ALL ({pendingTasksCount})</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                soundFx.playAuthorize();
                productivityService.toggleTask(task.id);
                setTasks(productivityService.getTasks().slice(0, 3));
              }}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    task.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {task.status === 'completed' && <span className="text-[9px] font-bold">✓</span>}
                </div>
                <span
                  className={`text-xs ${
                    task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-200'
                  }`}
                >
                  {task.title}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                  task.priority === 'HIGH'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Personal Knowledge Vault & Quick Notes */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpenProductivityModal('vault')}
          className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all active:scale-95 space-y-1"
        >
          <div className="flex items-center justify-between">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </div>
          <span className="text-xs font-bold text-slate-100 block">KNOWLEDGE VAULT</span>
          <span className="text-[10px] text-slate-400 block line-clamp-1">
            Grounded Q&A & Research Docs
          </span>
        </button>

        <button
          onClick={onOpenThemeModal}
          className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all active:scale-95 space-y-1"
        >
          <div className="flex items-center justify-between">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </div>
          <span className="text-xs font-bold text-slate-100 block">THEME STUDIO</span>
          <span className="text-[10px] text-slate-400 block line-clamp-1">
            {currentTheme.name}
          </span>
        </button>
      </div>
    </div>
  );
};
