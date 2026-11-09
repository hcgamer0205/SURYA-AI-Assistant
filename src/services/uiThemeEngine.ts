/**
 * SURYA UI Customization Engine
 * Manages dynamic theme generation, color palettes, assistant orb variations,
 * layout density, glassmorphism, undo/redo history, and safe persistence.
 */

import { SuryaThemeConfig, OrbStyle, OrbPosition, LayoutDensity, GlassmorphismLevel } from '../types/suryaTheme';

const THEME_STORAGE_KEY = 'surya_active_theme_v2';
const CUSTOM_THEMES_STORAGE_KEY = 'surya_custom_themes_v2';

export const PRESET_THEMES: Record<string, SuryaThemeConfig> = {
  'suryadev-radiant': {
    id: 'suryadev-radiant',
    name: 'Suryadev — Radiant Solar',
    description: 'Majestic golden corona, sacred saffron glow, and commanding cosmic solar presence.',
    isPreset: true,
    palette: {
      primary: '#f59e0b',
      primaryGlow: 'rgba(245, 158, 11, 0.45)',
      accent: '#ea580c',
      background: '#070503',
      surface: 'rgba(24, 15, 6, 0.88)',
      surfaceBorder: 'rgba(245, 158, 11, 0.28)',
      textPrimary: '#fef3c7',
      textSecondary: '#d97706',
      highlight: '#fbbf24',
    },
    orb: {
      style: 'coronal-solar',
      position: 'center',
      scale: 1.05,
      glowIntensity: 'radiant',
      pulseSpeed: 'normal',
    },
    layout: {
      density: 'comfortable',
      headerStyle: 'glass',
      navStyle: 'dock',
      sidebarTransparency: 0.85,
      borderRadius: 'lg',
    },
    effects: {
      particles: true,
      particleType: 'solar-sparks',
      particleSpeed: 1.0,
      hudReticle: false,
      holographicGrid: true,
      glassmorphism: 'high',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'futuristic-hologram': {
    id: 'futuristic-hologram',
    name: 'Holographic Cyber HUD',
    description: 'Futuristic JARVIS-style holographic blue UI with target reticles and glowing cyber nodes.',
    isPreset: true,
    palette: {
      primary: '#06b6d4',
      primaryGlow: 'rgba(6, 182, 212, 0.45)',
      accent: '#3b82f6',
      background: '#040814',
      surface: 'rgba(6, 17, 36, 0.88)',
      surfaceBorder: 'rgba(6, 182, 212, 0.3)',
      textPrimary: '#e0f2fe',
      textSecondary: '#38bdf8',
      highlight: '#22d3ee',
    },
    orb: {
      style: 'holographic-arc',
      position: 'center',
      scale: 1.0,
      glowIntensity: 'radiant',
      pulseSpeed: 'normal',
    },
    layout: {
      density: 'comfortable',
      headerStyle: 'glass',
      navStyle: 'dock',
      sidebarTransparency: 0.8,
      borderRadius: 'lg',
    },
    effects: {
      particles: true,
      particleType: 'hologram-nodes',
      particleSpeed: 1.1,
      hudReticle: true,
      holographicGrid: true,
      glassmorphism: 'high',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'iron-man-hud': {
    id: 'iron-man-hud',
    name: 'Iron Man — Armor HUD',
    description: 'Crimson battle-plate and Stark Arc Reactor gold with high-contrast tactical telemetry.',
    isPreset: true,
    palette: {
      primary: '#e11d48',
      primaryGlow: 'rgba(225, 29, 72, 0.45)',
      accent: '#fbbf24',
      background: '#0b0406',
      surface: 'rgba(28, 8, 14, 0.9)',
      surfaceBorder: 'rgba(225, 29, 72, 0.35)',
      textPrimary: '#ffe4e6',
      textSecondary: '#fb7185',
      highlight: '#fbbf24',
    },
    orb: {
      style: 'pulse-reactor',
      position: 'center',
      scale: 1.1,
      glowIntensity: 'ultra',
      pulseSpeed: 'fast',
    },
    layout: {
      density: 'compact',
      headerStyle: 'glass',
      navStyle: 'dock',
      sidebarTransparency: 0.9,
      borderRadius: 'md',
    },
    effects: {
      particles: true,
      particleType: 'solar-sparks',
      particleSpeed: 1.3,
      hudReticle: true,
      holographicGrid: true,
      glassmorphism: 'high',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'solar-saffron': {
    id: 'solar-saffron',
    name: 'Sacred Saffron',
    description: 'Deep radiant saffron and warm amber tones inspired by sacred Vedic solar energy.',
    isPreset: true,
    palette: {
      primary: '#f97316',
      primaryGlow: 'rgba(249, 115, 22, 0.45)',
      accent: '#eab308',
      background: '#080402',
      surface: 'rgba(25, 12, 4, 0.88)',
      surfaceBorder: 'rgba(249, 115, 22, 0.3)',
      textPrimary: '#ffedd5',
      textSecondary: '#fdba74',
      highlight: '#facc15',
    },
    orb: {
      style: 'coronal-solar',
      position: 'center',
      scale: 1.0,
      glowIntensity: 'radiant',
      pulseSpeed: 'slow',
    },
    layout: {
      density: 'comfortable',
      headerStyle: 'glass',
      navStyle: 'dock',
      sidebarTransparency: 0.85,
      borderRadius: 'lg',
    },
    effects: {
      particles: true,
      particleType: 'solar-sparks',
      particleSpeed: 0.8,
      hudReticle: false,
      holographicGrid: false,
      glassmorphism: 'high',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'minimalist-dark': {
    id: 'minimalist-dark',
    name: 'Minimalist Obsidian',
    description: 'Distraction-free deep monochrome obsidian with razor-sharp micro-borders and zero fluff.',
    isPreset: true,
    palette: {
      primary: '#cbd5e1',
      primaryGlow: 'rgba(203, 213, 225, 0.25)',
      accent: '#64748b',
      background: '#030508',
      surface: 'rgba(11, 15, 22, 0.95)',
      surfaceBorder: 'rgba(71, 85, 105, 0.35)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      highlight: '#e2e8f0',
    },
    orb: {
      style: 'minimal-ring',
      position: 'center',
      scale: 0.9,
      glowIntensity: 'subtle',
      pulseSpeed: 'slow',
    },
    layout: {
      density: 'compact',
      headerStyle: 'minimal',
      navStyle: 'compact',
      sidebarTransparency: 0.95,
      borderRadius: 'sm',
    },
    effects: {
      particles: false,
      particleType: 'none',
      particleSpeed: 0.5,
      hudReticle: false,
      holographicGrid: false,
      glassmorphism: 'none',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  'cyber-emerald': {
    id: 'cyber-emerald',
    name: 'Tactical Cyber Emerald',
    description: 'High-contrast emerald matrix on deep obsidian carbon for tactical operations.',
    isPreset: true,
    palette: {
      primary: '#10b981',
      primaryGlow: 'rgba(16, 185, 129, 0.45)',
      accent: '#06b6d4',
      background: '#020b06',
      surface: 'rgba(5, 25, 15, 0.88)',
      surfaceBorder: 'rgba(16, 185, 129, 0.3)',
      textPrimary: '#d1fae5',
      textSecondary: '#34d399',
      highlight: '#6ee7b7',
    },
    orb: {
      style: 'holographic-arc',
      position: 'center',
      scale: 1.0,
      glowIntensity: 'radiant',
      pulseSpeed: 'normal',
    },
    layout: {
      density: 'comfortable',
      headerStyle: 'glass',
      navStyle: 'dock',
      sidebarTransparency: 0.85,
      borderRadius: 'lg',
    },
    effects: {
      particles: true,
      particleType: 'hologram-nodes',
      particleSpeed: 1.0,
      hudReticle: true,
      holographicGrid: true,
      glassmorphism: 'high',
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontScale: 'standard',
    },
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

export type ThemeChangeListener = (theme: SuryaThemeConfig, isPreview: boolean) => void;

class UIThemeEngine {
  private activeTheme: SuryaThemeConfig;
  private previewThemeConfig: SuryaThemeConfig | null = null;
  private undoStack: SuryaThemeConfig[] = [];
  private redoStack: SuryaThemeConfig[] = [];
  private customThemes: Record<string, SuryaThemeConfig> = {};
  private listeners: ThemeChangeListener[] = [];

  constructor() {
    this.activeTheme = PRESET_THEMES['suryadev-radiant'];
    this.loadPersistedState();
    this.applyCssVariables(this.activeTheme);
  }

  private loadPersistedState() {
    if (typeof window === 'undefined') return;

    try {
      // Load custom themes
      const savedCustom = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
      if (savedCustom) {
        this.customThemes = JSON.parse(savedCustom);
      }

      // Load active theme
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        if (this.isValidTheme(parsed)) {
          this.activeTheme = parsed;
        }
      }
    } catch (err) {
      console.warn('[UIThemeEngine] Error loading theme from storage:', err);
      this.activeTheme = PRESET_THEMES['suryadev-radiant'];
    }
  }

  public subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.push(listener);
    listener(this.getCurrentTheme(), this.isPreviewActive());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const current = this.getCurrentTheme();
    const isPreview = this.isPreviewActive();
    for (const listener of this.listeners) {
      listener(current, isPreview);
    }
  }

  public getCurrentTheme(): SuryaThemeConfig {
    return this.previewThemeConfig || this.activeTheme;
  }

  public getActiveTheme(): SuryaThemeConfig {
    return this.activeTheme;
  }

  public isPreviewActive(): boolean {
    return this.previewThemeConfig !== null;
  }

  public getPresetThemes(): SuryaThemeConfig[] {
    return Object.values(PRESET_THEMES);
  }

  public getCustomThemes(): SuryaThemeConfig[] {
    return Object.values(this.customThemes);
  }

  public getAllThemes(): SuryaThemeConfig[] {
    return [...Object.values(PRESET_THEMES), ...Object.values(this.customThemes)];
  }

  /**
   * Preview a theme or theme adjustments without immediately committing to permanent storage
   */
  public previewTheme(themeOrId: string | Partial<SuryaThemeConfig>) {
    let resolved: SuryaThemeConfig;

    if (typeof themeOrId === 'string') {
      resolved = PRESET_THEMES[themeOrId] || this.customThemes[themeOrId];
      if (!resolved) {
        console.warn(`[UIThemeEngine] Unknown theme id: ${themeOrId}`);
        return;
      }
    } else {
      resolved = this.mergeWithActive(themeOrId);
    }

    this.previewThemeConfig = resolved;
    this.applyCssVariables(resolved);
    this.notify();
  }

  /**
   * Commit the current preview to active theme
   */
  public commitPreview(): SuryaThemeConfig {
    if (!this.previewThemeConfig) return this.activeTheme;

    this.pushUndo(this.activeTheme);
    this.activeTheme = {
      ...this.previewThemeConfig,
      updatedAt: new Date().toISOString(),
    };
    this.previewThemeConfig = null;
    this.redoStack = [];
    this.persistActiveTheme();
    this.applyCssVariables(this.activeTheme);
    this.notify();
    return this.activeTheme;
  }

  /**
   * Discard preview and revert to active theme
   */
  public discardPreview(): SuryaThemeConfig {
    this.previewThemeConfig = null;
    this.applyCssVariables(this.activeTheme);
    this.notify();
    return this.activeTheme;
  }

  /**
   * Apply a theme directly, pushing current state to undo stack
   */
  public applyTheme(themeOrId: string | Partial<SuryaThemeConfig>): SuryaThemeConfig {
    let target: SuryaThemeConfig;

    if (typeof themeOrId === 'string') {
      target = PRESET_THEMES[themeOrId] || this.customThemes[themeOrId];
      if (!target) {
        console.warn(`[UIThemeEngine] Theme ${themeOrId} not found, staying on current`);
        return this.activeTheme;
      }
    } else {
      target = this.mergeWithActive(themeOrId);
    }

    if (!this.isValidTheme(target)) {
      console.warn('[UIThemeEngine] Proposed theme failed validation, aborting.');
      return this.activeTheme;
    }

    this.pushUndo(this.activeTheme);
    this.activeTheme = {
      ...target,
      updatedAt: new Date().toISOString(),
    };
    this.previewThemeConfig = null;
    this.redoStack = [];
    this.persistActiveTheme();
    this.applyCssVariables(this.activeTheme);
    this.notify();
    return this.activeTheme;
  }

  /**
   * Undo last UI redesign
   */
  public undo(): boolean {
    if (this.previewThemeConfig) {
      this.discardPreview();
      return true;
    }

    if (this.undoStack.length === 0) return false;

    const previous = this.undoStack.pop()!;
    this.redoStack.push(this.activeTheme);
    this.activeTheme = previous;
    this.persistActiveTheme();
    this.applyCssVariables(this.activeTheme);
    this.notify();
    return true;
  }

  /**
   * Redo last undone UI change
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const next = this.redoStack.pop()!;
    this.undoStack.push(this.activeTheme);
    this.activeTheme = next;
    this.persistActiveTheme();
    this.applyCssVariables(this.activeTheme);
    this.notify();
    return true;
  }

  public canUndo(): boolean {
    return this.previewThemeConfig !== null || this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Restore default Suryadev Radiant theme
   */
  public resetToDefault(): SuryaThemeConfig {
    return this.applyTheme('suryadev-radiant');
  }

  /**
   * Save current configuration as user-created personal theme
   */
  public saveAsCustomTheme(name: string, description = 'Personal custom theme'): SuryaThemeConfig {
    const customId = `custom_${Date.now()}`;
    const newTheme: SuryaThemeConfig = {
      ...this.getCurrentTheme(),
      id: customId,
      name,
      description,
      isPreset: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customThemes[customId] = newTheme;
    this.persistCustomThemes();
    this.applyTheme(newTheme);
    return newTheme;
  }

  public deleteCustomTheme(id: string): boolean {
    if (!this.customThemes[id]) return false;
    delete this.customThemes[id];
    this.persistCustomThemes();
    if (this.activeTheme.id === id) {
      this.resetToDefault();
    } else {
      this.notify();
    }
    return true;
  }

  /**
   * Export current theme as clean JSON string
   */
  public exportThemeJson(): string {
    return JSON.stringify(this.getCurrentTheme(), null, 2);
  }

  /**
   * Import theme from JSON
   */
  public importThemeJson(jsonString: string): { success: boolean; error?: string; theme?: SuryaThemeConfig } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!this.isValidTheme(parsed)) {
        return { success: false, error: 'Invalid theme schema or missing essential properties.' };
      }

      parsed.id = `imported_${Date.now()}`;
      parsed.isPreset = false;
      this.customThemes[parsed.id] = parsed;
      this.persistCustomThemes();
      this.previewTheme(parsed);
      return { success: true, theme: parsed };
    } catch (e: any) {
      return { success: false, error: e.message || 'JSON parse error.' };
    }
  }

  private mergeWithActive(partial: Partial<SuryaThemeConfig>): SuryaThemeConfig {
    const base = this.getCurrentTheme();
    return {
      ...base,
      ...partial,
      palette: { ...base.palette, ...(partial.palette || {}) },
      orb: { ...base.orb, ...(partial.orb || {}) },
      layout: { ...base.layout, ...(partial.layout || {}) },
      effects: { ...base.effects, ...(partial.effects || {}) },
      accessibility: { ...base.accessibility, ...(partial.accessibility || {}) },
      updatedAt: new Date().toISOString(),
    };
  }

  private pushUndo(theme: SuryaThemeConfig) {
    this.undoStack.push(JSON.parse(JSON.stringify(theme)));
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }

  private persistActiveTheme() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.activeTheme));
    } catch (e) {
      console.warn('[UIThemeEngine] Could not persist theme:', e);
    }
  }

  private persistCustomThemes() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(this.customThemes));
    } catch (e) {
      console.warn('[UIThemeEngine] Could not persist custom themes:', e);
    }
  }

  /**
   * Strict validation: Ensures themes do not break layout or hide navigation
   */
  public isValidTheme(theme: any): boolean {
    if (!theme || typeof theme !== 'object') return false;
    if (!theme.palette || typeof theme.palette !== 'object') return false;
    if (!theme.palette.primary || !theme.palette.background) return false;
    if (!theme.orb || !['coronal-solar', 'holographic-arc', 'minimal-ring', 'pulse-reactor'].includes(theme.orb.style)) return false;
    if (!theme.layout || !['compact', 'comfortable', 'spacious'].includes(theme.layout.density)) return false;
    return true;
  }

  /**
   * Apply CSS Variables to Document Root for live Tailwind / CSS reactivity
   */
  public applyCssVariables(theme: SuryaThemeConfig) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--color-surya-primary', theme.palette.primary);
    root.style.setProperty('--color-surya-glow', theme.palette.primaryGlow);
    root.style.setProperty('--color-surya-accent', theme.palette.accent);
    root.style.setProperty('--color-surya-bg', theme.palette.background);
    root.style.setProperty('--color-surya-surface', theme.palette.surface);
    root.style.setProperty('--color-surya-border', theme.palette.surfaceBorder);
    root.style.setProperty('--color-surya-text', theme.palette.textPrimary);
    root.style.setProperty('--color-surya-muted', theme.palette.textSecondary);
    root.style.setProperty('--color-surya-highlight', theme.palette.highlight);

    // Font Scale
    if (theme.accessibility.fontScale === 'large') {
      root.style.setProperty('--surya-font-multiplier', '1.15');
    } else if (theme.accessibility.fontScale === 'compact') {
      root.style.setProperty('--surya-font-multiplier', '0.9');
    } else {
      root.style.setProperty('--surya-font-multiplier', '1.0');
    }

    // High Contrast attribute
    if (theme.accessibility.highContrast) {
      root.setAttribute('data-surya-high-contrast', 'true');
    } else {
      root.removeAttribute('data-surya-high-contrast');
    }

    // Reduced motion attribute
    if (theme.accessibility.reducedMotion) {
      root.setAttribute('data-surya-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-surya-reduced-motion');
    }
  }
}

export const uiThemeEngine = new UIThemeEngine();
