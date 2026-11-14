import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Eye,
  Code2,
  Settings,
  Send,
  AlertCircle,
} from 'lucide-react';
import { apiService, ConnectionState } from '../services/apiService';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { soundFx } from '../services/soundFx';
import { ResponseMode, TabType } from '../types/surya';

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

export const SuryaCommandCenter: React.FC<SuryaCommandCenterProps> = ({
  onSendQuickCommand,
  onNavigateTab,
  onOpenProductivityModal,
}) => {
  const [quickPrompt, setQuickPrompt] = useState('');
  const [backendStatus, setBackendStatus] = useState<ConnectionState>(
    apiService.getConnectionStatus().state
  );
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());

  useEffect(() => {
    const unsubConn = apiService.subscribeConnectionState((snap) => {
      setBackendStatus(snap.state);
    });
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);
    apiService.checkBackendConnection().catch(() => {
      // Handled via connection state subscription
    });
    return () => {
      unsubConn();
      unsubRouter();
    };
  }, []);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    soundFx.playClick();
    onSendQuickCommand(quickPrompt.trim());
    setQuickPrompt('');
    onNavigateTab('chat');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const shortcuts = [
    {
      label: 'Tasks',
      icon: CheckSquare,
      accent: 'text-[#d4a84f]',
      onClick: () => onOpenProductivityModal('tasks'),
    },
    {
      label: 'Vision',
      icon: Eye,
      accent: 'text-[#60a5fa]',
      onClick: () => onNavigateTab('optics'),
    },
    {
      label: 'Studio',
      icon: Code2,
      accent: 'text-[#d4a84f]',
      onClick: () => onNavigateTab('studio'),
    },
    {
      label: 'Settings',
      icon: Settings,
      accent: 'text-slate-300',
      onClick: () => onNavigateTab('system'),
    },
  ];

  const needsSetup =
    routerStatus.mode !== 'offline' &&
    routerStatus.activePath !== 'on-device-llm' &&
    backendStatus !== 'CONNECTED' &&
    backendStatus !== 'CONNECTING';

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col items-center space-y-5">
      {/* Friendly Greeting */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          {getGreeting()}
        </h2>
        <p className="text-sm text-slate-400">
          How can I help you today?
        </p>
      </div>

      {/* Subtle Offline / Setup Banner only when disconnected */}
      {needsSetup && (
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            onNavigateTab('system');
          }}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#121826] border border-amber-500/30 hover:border-amber-400/50 flex items-center justify-between gap-2 text-left transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-[#d4a84f] shrink-0" />
            <span className="text-xs text-slate-300 truncate">
              Backend {backendStatus.toLowerCase().replace(/_/g, ' ')}. Tap to configure.
            </span>
          </div>
          <span className="text-xs font-medium text-[#d4a84f] shrink-0">Setup</span>
        </button>
      )}

      {/* Simple Text Command Input */}
      <form onSubmit={handleQuickSubmit} className="w-full flex items-center gap-2">
        <input
          type="text"
          value={quickPrompt}
          onChange={(e) => setQuickPrompt(e.target.value)}
          placeholder="Type a message or command..."
          aria-label="Command SURYA"
          className="flex-1 min-h-[46px] bg-[#121826] border border-slate-800 focus:border-[#d4a84f]/60 rounded-2xl px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!quickPrompt.trim()}
          aria-label="Send message"
          className="min-h-[46px] min-w-[46px] rounded-2xl bg-[#121826] border border-slate-800 hover:border-[#d4a84f]/60 disabled:opacity-40 text-[#d4a84f] flex items-center justify-center transition-colors active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Four Compact Feature Shortcuts */}
      <section aria-label="Quick Shortcuts" className="w-full grid grid-cols-4 gap-2.5 pt-1">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                soundFx.playClick();
                item.onClick();
              }}
              className="min-h-[68px] p-2.5 rounded-2xl bg-[#121826] border border-slate-800/80 hover:border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <Icon className={`w-5 h-5 ${item.accent}`} />
              <span className="text-xs font-medium text-slate-200">{item.label}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
};
