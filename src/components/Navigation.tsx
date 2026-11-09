import React, { useState, useEffect } from 'react';
import {
  Cpu,
  MessageSquare,
  Crosshair,
  CheckSquare,
  Code2,
  Activity,
} from 'lucide-react';
import { TabType } from '../types/surya';
import { soundFx } from '../services/soundFx';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());

  useEffect(() => {
    const unsub = uiThemeEngine.subscribe((t) => setTheme(t));
    return () => unsub();
  }, []);

  const tabs = [
    { id: 'core' as TabType, label: 'CORE', icon: Cpu },
    { id: 'chat' as TabType, label: 'CHAT', icon: MessageSquare },
    { id: 'optics' as TabType, label: 'OPTICS', icon: Crosshair },
    { id: 'productivity' as TabType, label: 'TASKS', icon: CheckSquare },
    { id: 'studio' as TabType, label: 'STUDIO', icon: Code2 },
    { id: 'system' as TabType, label: 'SYSTEM', icon: Activity },
  ];

  const primaryCol = theme.palette.primary;

  return (
    <nav
      aria-label="SURYA Navigation Dock"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#070503]/95 backdrop-blur-xl border-t pb-safe shadow-2xl"
      style={{ borderColor: `${primaryCol}33` }}
    >
      <div className="max-w-2xl mx-auto grid grid-cols-6 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFx.playClick();
                onSelectTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all active:scale-90 ${
                isActive
                  ? 'font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ color: isActive ? primaryCol : undefined }}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: primaryCol, boxShadow: `0 0 6px ${primaryCol}` }}
                  />
                )}
              </div>
              <span className="text-[9px] font-mono tracking-tight mt-1 truncate">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
