import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, Eye, LayoutGrid } from 'lucide-react';
import { TabType } from '../types/surya';
import { soundFx } from '../services/soundFx';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

const MORE_CHILD_TABS: TabType[] = [
  'more',
  'productivity',
  'studio',
  'system',
  'hub',
  'plugins',
  'security',
];

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());

  useEffect(() => {
    const unsub = uiThemeEngine.subscribe((t) => setTheme(t));
    return () => unsub();
  }, []);

  const primaryCol = theme.palette.primary;

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'core', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'optics', label: 'Vision', icon: Eye },
    { id: 'more', label: 'More', icon: LayoutGrid },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-[#0d121d]/95 backdrop-blur-lg pb-safe"
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 items-center h-14 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.id === 'more'
              ? MORE_CHILD_TABS.includes(currentTab)
              : currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFx.playClick();
                onSelectTab(tab.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl transition-colors active:scale-95 ${
                isActive ? 'font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ color: isActive ? primaryCol : undefined }}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[11px] mt-1 tracking-tight leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
