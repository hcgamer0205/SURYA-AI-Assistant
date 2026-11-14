import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Code2,
  BookOpen,
  Zap,
  Cpu,
  Database,
  Navigation,
  Mic,
  Sliders,
  Settings,
  Atom,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { TabType } from '../types/surya';
import { productivityService } from '../services/productivityService';
import { wakeWordService, WakeWordState } from '../services/wakeWordService';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { modelDownloadManager } from '../services/modelDownloadManager';
import { soundFx } from '../services/soundFx';

interface MoreWorkspaceProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenProductivity: (initialTab: 'tasks' | 'notes' | 'focus' | 'vault' | 'automations') => void;
  onOpenSystemSection: (subTab: 'health' | 'world' | 'science' | 'improve') => void;
  onOpenOfflineAI: () => void;
  onOpenAgents: () => void;
  onOpenVoiceModal: () => void;
  onOpenThemeModal: () => void;
}

export const MoreWorkspace: React.FC<MoreWorkspaceProps> = ({
  onNavigateTab,
  onOpenProductivity,
  onOpenSystemSection,
  onOpenOfflineAI,
  onOpenAgents,
  onOpenVoiceModal,
  onOpenThemeModal,
}) => {
  const [pendingTasks, setPendingTasks] = useState(
    () => productivityService.getTasks().filter((t) => t.status !== 'completed').length
  );
  const [wakeState, setWakeState] = useState<WakeWordState>(wakeWordService.getState());
  const [themeName, setThemeName] = useState(uiThemeEngine.getCurrentTheme().name);
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());
  const [downloadedCount, setDownloadedCount] = useState(
    () => modelDownloadManager.getDownloadedModels().length
  );

  useEffect(() => {
    const unsubWake = wakeWordService.subscribe(setWakeState);
    const unsubTheme = uiThemeEngine.subscribe((t) => setThemeName(t.name));
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);
    const unsubDl = modelDownloadManager.subscribe(() => {
      setDownloadedCount(modelDownloadManager.getDownloadedModels().length);
    });
    setPendingTasks(productivityService.getTasks().filter((t) => t.status !== 'completed').length);
    return () => {
      unsubWake();
      unsubTheme();
      unsubRouter();
      unsubDl();
    };
  }, []);

  const ItemRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge?: string;
    onClick: () => void;
  }> = ({ icon, title, subtitle, badge, onClick }) => (
    <button
      type="button"
      onClick={() => {
        soundFx.playClick();
        onClick();
      }}
      className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/40 transition-colors border-b border-slate-800/70 last:border-b-0"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-100 block truncate">{title}</span>
          <span className="text-xs text-slate-400 block truncate">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="text-xs font-medium text-[#d4a84f] tabular-nums">{badge}</span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </div>
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">More</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Tools, personal intelligence, and system preferences
        </p>
      </div>

      {/* Productivity & Workspace */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400 px-1">Workspace</h3>
        <div className="rounded-2xl bg-[#121826] border border-slate-800/80 overflow-hidden">
          <ItemRow
            icon={<CheckSquare className="w-4 h-4 text-[#d4a84f]" />}
            title="Tasks & Agenda"
            subtitle="Today's tasks, reminders, and focus timer"
            badge={pendingTasks > 0 ? `${pendingTasks} open` : undefined}
            onClick={() => onOpenProductivity('tasks')}
          />
          <ItemRow
            icon={<Code2 className="w-4 h-4 text-[#60a5fa]" />}
            title="SURYA Studio"
            subtitle="Create apps, edit code, and inspect builds"
            onClick={() => onNavigateTab('studio')}
          />
          <ItemRow
            icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
            title="Knowledge Vault & Notes"
            subtitle="Personal notes and grounded document search"
            onClick={() => onOpenProductivity('vault')}
          />
          <ItemRow
            icon={<Zap className="w-4 h-4 text-amber-300" />}
            title="Automations"
            subtitle="Scheduled routines and approval-gated triggers"
            onClick={() => onOpenProductivity('automations')}
          />
        </div>
      </section>

      {/* Intelligence & Device */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400 px-1">Intelligence &amp; Device</h3>
        <div className="rounded-2xl bg-[#121826] border border-slate-800/80 overflow-hidden">
          <ItemRow
            icon={<Cpu className="w-4 h-4 text-[#60a5fa]" />}
            title="Offline AI &amp; Models"
            subtitle={
              routerStatus.activeLocalModelName
                ? `Active: ${routerStatus.activeLocalModelName} (${routerStatus.mode})`
                : `Download on-device models (${downloadedCount} ready)`
            }
            badge={routerStatus.mode.toUpperCase()}
            onClick={onOpenOfflineAI}
          />
          <ItemRow
            icon={<Cpu className="w-4 h-4 text-[#d4a84f]" />}
            title="10-Agent Orchestrator"
            subtitle="Multi-step task planning and verification"
            onClick={onOpenAgents}
          />
          <ItemRow
            icon={<Database className="w-4 h-4 text-[#60a5fa]" />}
            title="Personal Memory"
            subtitle="Inspect, edit, or pause learned context"
            onClick={() => onOpenSystemSection('world')}
          />
          <ItemRow
            icon={<Navigation className="w-4 h-4 text-emerald-400" />}
            title="App Link Hub"
            subtitle="Launch Android apps and deep-link actions"
            onClick={() => onNavigateTab('hub')}
          />
          <ItemRow
            icon={<Atom className="w-4 h-4 text-slate-300" />}
            title="Scientific Archive"
            subtitle="Reference equations and AI deep dives"
            onClick={() => onOpenSystemSection('science')}
          />
        </div>
      </section>

      {/* Preferences & Settings */}
      <section className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400 px-1">Preferences &amp; System</h3>
        <div className="rounded-2xl bg-[#121826] border border-slate-800/80 overflow-hidden">
          <div className="w-full px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-800/70">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenVoiceModal();
              }}
              className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-[#d4a84f]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-slate-100 block truncate">
                  Voice &amp; Hands-Free
                </span>
                <span className="text-xs text-slate-400 block truncate">
                  Voice profile, language, and wake word
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                wakeWordService.toggle();
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors shrink-0 ${
                wakeState.isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0b0f17] border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{wakeState.isActive ? 'Wake On' : 'Wake Off'}</span>
            </button>
          </div>

          <ItemRow
            icon={<Sliders className="w-4 h-4 text-[#60a5fa]" />}
            title="Appearance"
            subtitle={themeName}
            onClick={onOpenThemeModal}
          />
          <ItemRow
            icon={<Settings className="w-4 h-4 text-slate-300" />}
            title="System Settings"
            subtitle="Backend & Gemini, Permissions, Security, Device Info"
            onClick={() => onOpenSystemSection('health')}
          />
        </div>
      </section>
    </div>
  );
};
