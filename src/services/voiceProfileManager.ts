/**
 * SURYA Voice Profile Manager
 * Powers the "Suryadev — Radiant Command" voice identity and multilingual voice system.
 * Inspired by the majestic, resonant, powerful qualities of Suryadev in Indian mythology.
 * Handles language-specific voices, speech rate, pitch controls, and hardware limitations.
 */

import { VoiceProfile, VoiceProfileId, VoiceSettings } from '../types/suryaTheme';

const VOICE_SETTINGS_STORAGE_KEY = 'surya_voice_settings_v2';

export const VOICE_PROFILES: Record<VoiceProfileId, VoiceProfile> = {
  'suryadev-radiant': {
    id: 'suryadev-radiant',
    name: 'Suryadev — Radiant Command',
    title: 'Majestic & Authoritative',
    description: 'Deep, resonant, commanding presence with calm confidence and respectful cadence.',
    pitch: 0.92,
    rate: 1.05,
    preferredLang: 'en-IN',
    timbreDescription: 'Resonant Baritone / Neural Command',
    samplePhrase: 'I am SURYA. Radiance and intelligence are online to serve you.',
  },
  'calm-intelligence': {
    id: 'calm-intelligence',
    name: 'Calm Intelligence',
    title: 'Composed & Analytical',
    description: 'Measured, serene, intellectual tone for deep problem solving and focus.',
    pitch: 0.98,
    rate: 0.95,
    preferredLang: 'en-US',
    timbreDescription: 'Smooth Neutral / Measured Pace',
    samplePhrase: 'Analyzing telemetry. All parameters are within optimal operational boundaries.',
  },
  'futuristic-ai': {
    id: 'futuristic-ai',
    name: 'Futuristic AI',
    title: 'Tactical & Crisp',
    description: 'Modern holographic AI assistant cadence with crisp, clear articulation.',
    pitch: 1.04,
    rate: 1.10,
    preferredLang: 'en-US',
    timbreDescription: 'Synthesized Clarity / Rapid Articulation',
    samplePhrase: 'SURYA neural subsystems synchronized. Tactical diagnostics ready.',
  },
  'natural-conversational': {
    id: 'natural-conversational',
    name: 'Natural Conversational',
    title: 'Warm & Fluid',
    description: 'Everyday human cadence, friendly and warm without artificial stiffness.',
    pitch: 1.0,
    rate: 1.0,
    preferredLang: 'en-US',
    timbreDescription: 'Warm Natural / Expressive Cadence',
    samplePhrase: 'Hello! I am right here. What would you like to accomplish today?',
  },
  'indian-english': {
    id: 'indian-english',
    name: 'Indian English',
    title: 'Distinctive Subcontinent Cadence',
    description: 'Articulate Indian English voice with natural regional rhythm and phonetics.',
    pitch: 0.96,
    rate: 1.05,
    preferredLang: 'en-IN',
    timbreDescription: 'Indian English Neural / Subcontinental Rhythm',
    samplePhrase: 'SURYA online. All local Android intents and services are standing by.',
  },
  'hindi-command': {
    id: 'hindi-command',
    name: 'Hindi Command',
    title: 'सूर्या — राजसी आज्ञा (Rajasi Agnya)',
    description: 'Strong, authoritative Devanagari Hindi voice for commanding natural interaction.',
    pitch: 0.94,
    rate: 1.05,
    preferredLang: 'hi-IN',
    timbreDescription: 'Authoritative Hindi / Devanagari Neural',
    samplePhrase: 'नमस्ते! मैं सूर्या हूँ। आपकी हर आज्ञा का पालन करने के लिए तैयार हूँ।',
  },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi (हिन्दी)', script: 'Devanagari', nativeSample: 'नमस्ते, मैं सूर्या हूँ।' },
  { code: 'en-IN', name: 'English (India)', script: 'Latin', nativeSample: 'SURYA systems active.' },
  { code: 'en-US', name: 'English (US)', script: 'Latin', nativeSample: 'SURYA systems ready.' },
  { code: 'sa-IN', name: 'Sanskrit (संस्कृतम्)', script: 'Devanagari', nativeSample: 'सूर्यः प्रकाशते।' },
  { code: 'mr-IN', name: 'Marathi (मराठी)', script: 'Devanagari', nativeSample: 'नमस्कार, मी सूर्या आहे.' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)', script: 'Tamil', nativeSample: 'வணக்கம், நான் சூர்யா.' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)', script: 'Telugu', nativeSample: 'నమస్కారం, నేను సూర్య.' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)', script: 'Kannada', nativeSample: 'ನಮಸ್ಕಾರ, ನಾನು ಸೂರ್ಯ.' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)', script: 'Malayalam', nativeSample: 'നമസ്കാരം, ഞാൻ സൂര്യ.' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)', script: 'Bengali', nativeSample: 'নমস্কার, আমি সূর্য।' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)', script: 'Gujarati', nativeSample: 'નમસ્તે, હું સૂર્ય છું.' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)', script: 'Gurmukhi', nativeSample: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਸੂਰਿਆ ਹਾਂ।' },
  { code: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)', script: 'Odia', nativeSample: 'ନମସ୍କାର, ମୁଁ ସୂର୍ଯ୍ୟ।' },
  { code: 'as-IN', name: 'Assamese (অসমীয়া)', script: 'Bengali', nativeSample: 'নমস্কাৰ, মই সূৰ্য।' },
  { code: 'ja-JP', name: 'Japanese (日本語)', script: 'Japanese', nativeSample: 'こんにちは、スーリヤです。' },
  { code: 'ko-KR', name: 'Korean (한국어)', script: 'Hangul', nativeSample: '안녕하세요, 수리야입니다.' },
  { code: 'zh-CN', name: 'Chinese (中文)', script: 'Han', nativeSample: '你好，我是苏利亚。' },
  { code: 'es-ES', name: 'Spanish (Español)', script: 'Latin', nativeSample: 'Hola, soy SURYA.' },
  { code: 'fr-FR', name: 'French (Français)', script: 'Latin', nativeSample: 'Bonjour, je suis SURYA.' },
  { code: 'de-DE', name: 'German (Deutsch)', script: 'Latin', nativeSample: 'Guten Tag, ich bin SURYA.' },
  { code: 'ar-SA', name: 'Arabic (العربية)', script: 'Arabic', nativeSample: 'مرحباً، أنا سُوريا.', rtl: true },
];

export type VoiceChangeListener = (settings: VoiceSettings) => void;

class VoiceProfileManager {
  private settings: VoiceSettings;
  private listeners: VoiceChangeListener[] = [];

  constructor() {
    this.settings = {
      profileId: 'suryadev-radiant',
      language: 'en-IN',
      rate: 1.05,
      pitch: 0.92,
      wakeWordEnabled: false,
      sensitivity: 0.75,
      autoStopSpeakingOnInterrupt: true,
    };
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profileId && VOICE_PROFILES[parsed.profileId as VoiceProfileId]) {
          this.settings = { ...this.settings, ...parsed };
        }
      }
    } catch (e) {
      console.warn('[VoiceProfileManager] Failed to load voice settings:', e);
    }
  }

  public subscribe(listener: VoiceChangeListener): () => void {
    this.listeners.push(listener);
    listener(this.getSettings());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.getSettings());
    }
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public getActiveProfile(): VoiceProfile {
    return VOICE_PROFILES[this.settings.profileId] || VOICE_PROFILES['suryadev-radiant'];
  }

  public getAllProfiles(): VoiceProfile[] {
    return Object.values(VOICE_PROFILES);
  }

  public setProfile(profileId: VoiceProfileId) {
    const profile = VOICE_PROFILES[profileId];
    if (!profile) return;

    this.settings.profileId = profileId;
    this.settings.pitch = profile.pitch;
    this.settings.rate = profile.rate;
    // Auto-switch default language if language isn't explicitly set to another custom language
    if (profile.preferredLang && (this.settings.language === 'en-US' || this.settings.language === 'en-IN' || profileId === 'hindi-command')) {
      this.settings.language = profile.preferredLang;
    }

    this.persist();
    this.syncNativeBridge();
    this.notify();
  }

  public setLanguage(langCode: string) {
    this.settings.language = langCode;
    // If switching to Hindi, switch to Hindi Command profile if currently on generic
    if (langCode === 'hi-IN' && this.settings.profileId === 'futuristic-ai') {
      this.settings.profileId = 'hindi-command';
    }
    this.persist();
    this.syncNativeBridge();
    this.notify();
  }

  public setRate(rate: number) {
    this.settings.rate = Math.max(0.75, Math.min(1.5, rate));
    this.persist();
    this.syncNativeBridge();
    this.notify();
  }

  public setPitch(pitch: number) {
    this.settings.pitch = Math.max(0.5, Math.min(1.5, pitch));
    this.persist();
    this.syncNativeBridge();
    this.notify();
  }

  public setWakeWordEnabled(enabled: boolean) {
    this.settings.wakeWordEnabled = enabled;
    this.persist();
    this.notify();
  }

  public setSensitivity(val: number) {
    this.settings.sensitivity = Math.max(0.1, Math.min(1.0, val));
    this.persist();
    this.notify();
  }

  public setAutoStopSpeaking(val: boolean) {
    this.settings.autoStopSpeakingOnInterrupt = val;
    this.persist();
    this.notify();
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  /**
   * Sync voice settings with native Android TextToSpeech if running inside Android WebView
   */
  public syncNativeBridge() {
    if (typeof window === 'undefined') return;
    const bridge = (window as any).AndroidSuryaBridge;
    if (bridge) {
      try {
        if (typeof bridge.setVoiceLanguage === 'function') {
          bridge.setVoiceLanguage(this.settings.language);
        }
      } catch (e) {
        console.warn('[VoiceProfileManager] Android bridge voice sync:', e);
      }
    }
  }

  /**
   * Honest check about device TTS capabilities
   */
  public getHardwareCapabilityNotice(): { hasPitchControl: boolean; message: string } {
    if (typeof window === 'undefined') return { hasPitchControl: false, message: 'Server environment' };

    const isNative = !!(window as any).AndroidSuryaBridge;
    if (isNative) {
      return {
        hasPitchControl: true,
        message: 'Native Android TextToSpeech engine with locale-specific neural timbre rendering.',
      };
    }

    const hasSynth = typeof window.speechSynthesis !== 'undefined';
    if (!hasSynth) {
      return {
        hasPitchControl: false,
        message: 'Speech synthesis not supported in this browser.',
      };
    }

    // Browsers support pitch parameter, but neural web voices may ignore pitch in favor of natural timbre
    return {
      hasPitchControl: true,
      message: 'Web Speech API active. Pitch and rate are dynamically modulated; timbre depends on browser neural voice.',
    };
  }
}

export const voiceProfileManager = new VoiceProfileManager();
