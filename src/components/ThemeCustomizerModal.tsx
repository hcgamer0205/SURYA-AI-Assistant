import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  RotateCcw,
  RotateCw,
  Download,
  Upload,
  Check,
  X,
  Sliders,
  Sun,
  Eye,
  Layers,
  Zap,
} from 'lucide-react';
import { uiThemeEngine, PRESET_THEMES } from '../services/uiThemeEngine';
import { soundFx } from '../services/soundFx';
import { SuryaThemeConfig, OrbStyle } from '../types/suryaTheme';

interface ThemeCustomizerModalProps {
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ onClose }) => {
  const [currentTheme, setCurrentTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'orb' | 'layout' | 'access'>('presets');
  const [customThemeName, setCustomThemeName] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const presets = uiThemeEngine.getPresetThemes();
  const customThemes = uiThemeEngine.getCustomThemes();

  const handleSelectPreset = (id: string) => {
    soundFx.playClick();
    uiThemeEngine.previewTheme(id);
    setCurrentTheme(uiThemeEngine.getCurrentTheme());
    setMessage(`Previewing ${PRESET_THEMES[id]?.name}`);
  };

  const handleApply = () => {
    soundFx.playAuthorize();
    uiThemeEngine.commitPreview();
    setCurrentTheme(uiThemeEngine.getCurrentTheme());
    setMessage('Theme applied and saved permanently.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUndo = () => {
    soundFx.playClick();
    if (uiThemeEngine.undo()) {
      setCurrentTheme(uiThemeEngine.getCurrentTheme());
      setMessage('Restored previous theme.');
    }
  };

  const handleRedo = () => {
    soundFx.playClick();
    if (uiThemeEngine.redo()) {
      setCurrentTheme(uiThemeEngine.getCurrentTheme());
      setMessage('Redone theme change.');
    }
  };

  const handleReset = () => {
    soundFx.playClick();
    uiThemeEngine.resetToDefault();
    setCurrentTheme(uiThemeEngine.getCurrentTheme());
    setMessage('Reset to Suryadev — Radiant Solar default.');
  };

  const handleSaveCustom = () => {
    if (!customThemeName.trim()) return;
    soundFx.playAuthorize();
    uiThemeEngine.saveAsCustomTheme(customThemeName.trim());
    setCurrentTheme(uiThemeEngine.getCurrentTheme());
    setCustomThemeName('');
    setMessage(`Saved personal theme "${customThemeName}".`);
  };

  const handleExport = () => {
    const json = uiThemeEngine.exportThemeJson();
    navigator.clipboard?.writeText(json);
    setMessage('Theme JSON copied to clipboard!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const res = uiThemeEngine.importThemeJson(importJsonText.trim());
    if (res.success) {
      setCurrentTheme(uiThemeEngine.getCurrentTheme());
      setShowImportBox(false);
      setImportJsonText('');
      setMessage('Theme imported successfully!');
    } else {
      setMessage(`Import error: ${res.error}`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="UI Theme Customizer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                SURYA UI THEME STUDIO
              </h2>
              <p className="text-[10px] text-slate-400">Dynamic theme engine & voice-controlled customization</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="Close customizer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: 'presets', label: 'PRESETS', icon: Sun },
            { id: 'colors', label: 'PALETTE', icon: Palette },
            { id: 'orb', label: 'ORB CORE', icon: Zap },
            { id: 'layout', label: 'LAYOUT', icon: Layers },
            { id: 'access', label: 'ACCESSIBILITY', icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notification feedback message */}
        {message && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono animate-in fade-in">
            {message}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-300 block mb-2 uppercase">
                  MASTER THEME PRESETS
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {presets.map((p) => {
                    const isSelected = currentTheme.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[90px] active:scale-95 ${
                          isSelected
                            ? 'bg-slate-800 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold text-slate-100 truncate">{p.name}</span>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"
                            style={{ backgroundColor: p.palette.primary }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Custom Themes */}
              {customThemes.length > 0 && (
                <div>
                  <span className="text-xs font-mono font-bold text-slate-300 block mb-2 uppercase">
                    MY SAVED THEMES
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {customThemes.map((ct) => (
                      <div
                        key={ct.id}
                        className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-slate-200 truncate">{ct.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              uiThemeEngine.applyTheme(ct);
                              setCurrentTheme(uiThemeEngine.getCurrentTheme());
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold"
                          >
                            LOAD
                          </button>
                          <button
                            onClick={() => {
                              uiThemeEngine.deleteCustomTheme(ct.id);
                              setCurrentTheme(uiThemeEngine.getCurrentTheme());
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save As Custom Theme Box */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-300 font-bold block uppercase">
                  Save Active Theme as Personal Preset
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    placeholder="e.g. My Solar HUD v1"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleSaveCustom}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PALETTE COLORS */}
          {activeTab === 'colors' && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
                Accent & Ambient Colors
              </span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'gold', name: 'Suryadev Gold', hex: '#f59e0b' },
                  { id: 'saffron', name: 'Sacred Saffron', hex: '#ea580c' },
                  { id: 'cyan', name: 'Cyber Hologram', hex: '#06b6d4' },
                  { id: 'crimson', name: 'Stark Crimson', hex: '#e11d48' },
                  { id: 'emerald', name: 'Tactical Emerald', hex: '#10b981' },
                  { id: 'purple', name: 'Royal Astral', hex: '#8b5cf6' },
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      uiThemeEngine.previewTheme({
                        palette: {
                          ...currentTheme.palette,
                          primary: col.hex,
                          primaryGlow: `${col.hex}66`,
                        },
                      });
                      setCurrentTheme(uiThemeEngine.getCurrentTheme());
                    }}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-500 flex items-center gap-3 text-left transition-all active:scale-95"
                  >
                    <div
                      className="w-5 h-5 rounded-full shadow-md shrink-0 border border-white/20"
                      style={{ backgroundColor: col.hex }}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{col.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{col.hex}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ASSISTANT ORB */}
          {activeTab === 'orb' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-300 block mb-2 uppercase">
                  Orb Core Visual Style
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'coronal-solar' as OrbStyle, label: 'Coronal Solar Core', desc: 'Suryadev radiating plasma corona' },
                    { id: 'holographic-arc' as OrbStyle, label: 'Holographic Arc', desc: 'Multi-ring gyroscope HUD' },
                    { id: 'pulse-reactor' as OrbStyle, label: 'Pulse Reactor', desc: 'High-intensity pulsing core' },
                    { id: 'minimal-ring' as OrbStyle, label: 'Minimalist Ring', desc: 'Subtle clean geometric orbit' },
                  ].map((style) => {
                    const active = currentTheme.orb.style === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => {
                          uiThemeEngine.previewTheme({
                            orb: { ...currentTheme.orb, style: style.id },
                          });
                          setCurrentTheme(uiThemeEngine.getCurrentTheme());
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-200 block mb-1">{style.label}</span>
                        <span className="text-[10px] text-slate-400">{style.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Effects Toggle */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
                  Visual Holographic Effects
                </span>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                    <span className="text-xs text-slate-200">Animated Solar Ember Particles</span>
                    <input
                      type="checkbox"
                      checked={currentTheme.effects.particles}
                      onChange={(e) => {
                        uiThemeEngine.previewTheme({
                          effects: { ...currentTheme.effects, particles: e.target.checked },
                        });
                        setCurrentTheme(uiThemeEngine.getCurrentTheme());
                      }}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                    <span className="text-xs text-slate-200">Cyber Hologram Grid Overlay</span>
                    <input
                      type="checkbox"
                      checked={currentTheme.effects.holographicGrid}
                      onChange={(e) => {
                        uiThemeEngine.previewTheme({
                          effects: { ...currentTheme.effects, holographicGrid: e.target.checked },
                        });
                        setCurrentTheme(uiThemeEngine.getCurrentTheme());
                      }}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LAYOUT & DENSITY */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-300 block mb-2 uppercase">
                  Interface Density
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'compact', label: 'Compact Mode', desc: 'Higher information density, reduced padding' },
                    { id: 'comfortable', label: 'Comfortable Mode', desc: 'Balanced ergonomic touch targets' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        uiThemeEngine.previewTheme({
                          layout: { ...currentTheme.layout, density: d.id as any },
                        });
                        setCurrentTheme(uiThemeEngine.getCurrentTheme());
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        currentTheme.layout.density === d.id
                          ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-200 block mb-1">{d.label}</span>
                      <span className="text-[10px] text-slate-400">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ACCESSIBILITY */}
          {activeTab === 'access' && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
                Accessibility Controls (Always Preserved)
              </span>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Reduced Motion</span>
                  <span className="text-[10px] text-slate-400">Minimizes orb spin, flaring, and particle transitions</span>
                </div>
                <input
                  type="checkbox"
                  checked={currentTheme.accessibility.reducedMotion}
                  onChange={(e) => {
                    uiThemeEngine.previewTheme({
                      accessibility: { ...currentTheme.accessibility, reducedMotion: e.target.checked },
                    });
                    setCurrentTheme(uiThemeEngine.getCurrentTheme());
                  }}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">High Contrast Mode</span>
                  <span className="text-[10px] text-slate-400">Elevates border luminosity and text readability</span>
                </div>
                <input
                  type="checkbox"
                  checked={currentTheme.accessibility.highContrast}
                  onChange={(e) => {
                    uiThemeEngine.previewTheme({
                      accessibility: { ...currentTheme.accessibility, highContrast: e.target.checked },
                    });
                    setCurrentTheme(uiThemeEngine.getCurrentTheme());
                  }}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
              </label>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-200 block">Text Font Scaling</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'standard', 'large'] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => {
                        uiThemeEngine.previewTheme({
                          accessibility: { ...currentTheme.accessibility, fontScale: scale },
                        });
                        setCurrentTheme(uiThemeEngine.getCurrentTheme());
                      }}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border capitalize ${
                        currentTheme.accessibility.fontScale === scale
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Import / Export JSON view */}
          {showImportBox && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
              <span className="text-xs font-mono font-bold text-amber-300 block uppercase">
                Paste Theme JSON
              </span>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                rows={4}
                placeholder="Paste exported SURYA theme JSON here..."
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportBox(false)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 text-xs font-mono font-bold"
                >
                  Import Theme
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls: Undo, Redo, Export, Reset, Apply */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={!uiThemeEngine.canUndo()}
              aria-label="Undo theme change"
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!uiThemeEngine.canRedo()}
              aria-label="Redo theme change"
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              title="Export theme JSON"
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-amber-400 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportBox(!showImportBox)}
              title="Import theme JSON"
              className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-amber-400 transition-colors"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              title="Reset to default theme"
              className="px-2 py-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700 text-[10px] font-mono font-bold transition-colors"
            >
              RESET
            </button>
          </div>

          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>APPLY THEME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
