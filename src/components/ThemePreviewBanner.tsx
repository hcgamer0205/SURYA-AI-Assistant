import React from 'react';
import { Sparkles, Check, RotateCcw, Sliders, X } from 'lucide-react';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { soundFx } from '../services/soundFx';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface ThemePreviewBannerProps {
  previewTheme: SuryaThemeConfig;
  onOpenCustomizer?: () => void;
}

export const ThemePreviewBanner: React.FC<ThemePreviewBannerProps> = ({
  previewTheme,
  onOpenCustomizer,
}) => {
  const handleApply = () => {
    soundFx.playAuthorize();
    uiThemeEngine.commitPreview();
  };

  const handleDiscard = () => {
    soundFx.playClick();
    uiThemeEngine.discardPreview();
  };

  return (
    <div
      role="region"
      aria-label="Theme Preview Notification"
      className="sticky top-14 z-30 mx-3 my-2 p-3 rounded-2xl bg-slate-900/95 border-2 border-amber-500/60 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-300"
      style={{
        borderColor: previewTheme.palette.primary,
        boxShadow: `0 8px 30px ${previewTheme.palette.primaryGlow}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-ping"
            style={{ backgroundColor: previewTheme.palette.primary }}
          />
          <span className="text-xs font-mono font-bold tracking-wider text-amber-300 uppercase">
            LIVE THEME PREVIEW
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
            {previewTheme.name}
          </span>
        </div>
        <button
          onClick={handleDiscard}
          aria-label="Close preview and revert"
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
        {previewTheme.description}
        <span className="block mt-1 font-mono text-[10px] text-amber-400">
          💡 Voice hint: Say <span className="underline font-bold">"Apply it"</span> to lock in, or <span className="underline font-bold">"Undo that"</span> to cancel.
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handleApply}
          className="flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
          style={{ backgroundColor: previewTheme.palette.primary }}
        >
          <Check className="w-4 h-4" />
          <span>APPLY IT</span>
        </button>

        <button
          onClick={handleDiscard}
          className="py-2 px-3 rounded-xl font-mono text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>UNDO</span>
        </button>

        {onOpenCustomizer && (
          <button
            onClick={onOpenCustomizer}
            className="py-2 px-3 rounded-xl font-mono text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>TWEAK</span>
          </button>
        )}
      </div>
    </div>
  );
};
