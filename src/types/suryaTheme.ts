/**
 * SURYA AI Assistant — Dynamic UI Theme & Voice Configuration Types
 * Strict schema for full voice-controlled UI customization,
 * accessibility preservation, and Suryadev voice identity.
 */

export type OrbStyle = 'coronal-solar' | 'holographic-arc' | 'minimal-ring' | 'pulse-reactor';
export type OrbPosition = 'center' | 'top' | 'floating';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type GlassmorphismLevel = 'none' | 'subtle' | 'high' | 'radiant';
export type GlowIntensity = 'subtle' | 'radiant' | 'ultra';
export type ParticleType = 'solar-sparks' | 'hologram-nodes' | 'minimal-dust' | 'none';

export interface ThemePalette {
  primary: string;           // Main theme accent (hex/hsl)
  primaryGlow: string;       // Outer glow shadow color
  accent: string;            // Secondary accent (e.g. Saffron / Gold / Cyan)
  background: string;        // Main app background color
  surface: string;           // Card & panel surface background
  surfaceBorder: string;     // Border color for cards and panels
  textPrimary: string;       // Primary text color
  textSecondary: string;     // Muted / secondary text
  highlight: string;         // Focus / selection highlight
}

export interface SuryaThemeConfig {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  palette: ThemePalette;
  orb: {
    style: OrbStyle;
    position: OrbPosition;
    scale: number;            // 0.8 to 1.4
    glowIntensity: GlowIntensity;
    pulseSpeed: 'slow' | 'normal' | 'fast';
  };
  layout: {
    density: LayoutDensity;
    headerStyle: 'glass' | 'minimal' | 'solid' | 'transparent';
    navStyle: 'dock' | 'compact' | 'floating';
    sidebarTransparency: number; // 0.0 to 1.0
    borderRadius: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  };
  effects: {
    particles: boolean;
    particleType: ParticleType;
    particleSpeed: number;     // 0.5 to 2.0
    hudReticle: boolean;
    holographicGrid: boolean;
    glassmorphism: GlassmorphismLevel;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    fontScale: 'compact' | 'standard' | 'large';
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type VoiceProfileId =
  | 'suryadev-radiant'
  | 'calm-intelligence'
  | 'futuristic-ai'
  | 'natural-conversational'
  | 'indian-english'
  | 'hindi-command';

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  title: string;
  description: string;
  pitch: number;             // 0.5 to 1.5 (default ~0.92-1.0)
  rate: number;              // 0.75 to 1.5 (default ~1.05)
  preferredLang: string;     // Default locale code
  timbreDescription: string;
  samplePhrase: string;
}

export interface VoiceSettings {
  profileId: VoiceProfileId;
  language: string;          // e.g. 'en-IN', 'hi-IN', 'ja-JP'
  rate: number;
  pitch: number;
  wakeWordEnabled: boolean;
  sensitivity: number;       // 0.1 to 1.0
  autoStopSpeakingOnInterrupt: boolean;
}
