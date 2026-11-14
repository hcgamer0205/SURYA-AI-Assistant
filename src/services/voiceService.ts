/**
 * SURYA Native Android & Web Voice Pipeline
 * Direct integration with AndroidSuryaBridge (SDK 36) and Web Speech API.
 * Supports true TTS completion callbacks, speech interruption, and endpointing.
 */

import { voiceProfileManager } from './voiceProfileManager';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  supported: boolean;
  isNative: boolean;
  audioLevel: number;
}

type VoiceStateCallback = (state: VoiceState) => void;

class VoiceService {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private state: VoiceState = {
    isListening: false,
    isSpeaking: false,
    transcript: '',
    error: null,
    supported: false,
    isNative: false,
    audioLevel: 0,
  };
  private listeners: VoiceStateCallback[] = [];
  private onResultCallback: ((text: string) => void) | null = null;
  private pendingNativeTtsDone: (() => void) | null = null;
  private nativeTtsSafetyTimer: any = null;
  private audioLevelInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const nativeBridge = (window as any).AndroidSuryaBridge;
      if (nativeBridge && typeof nativeBridge.startListening === 'function') {
        this.state.isNative = true;
        this.state.supported = true;

        window.addEventListener('onNativeSpeechReady', () => {
          this.state.isListening = true;
          this.state.error = null;
          this.startAudioSim();
          this.notify();
        });

        window.addEventListener('onNativeSpeechEnd', () => {
          this.state.isListening = false;
          this.stopAudioSim();
          this.notify();
        });

        window.addEventListener('onNativeSpeechResult', (e: any) => {
          const detail = e.detail || {};
          const text = detail.text || '';
          this.state.transcript = text;
          this.notify();

          if (detail.isFinal && this.onResultCallback && text.trim()) {
            this.state.isListening = false;
            this.stopAudioSim();
            this.notify();
            this.onResultCallback(text.trim());
          }
        });

        window.addEventListener('onNativeSpeechError', (e: any) => {
          const detail = e.detail || {};
          this.state.isListening = false;
          this.stopAudioSim();
          this.state.error = `Android Speech Error (code: ${detail.code || 'UNKNOWN'})`;
          this.notify();
        });

        window.addEventListener('onNativeTtsStart', () => {
          this.state.isSpeaking = true;
          this.startAudioSim();
          this.notify();
        });

        window.addEventListener('onNativeTtsDone', () => {
          clearTimeout(this.nativeTtsSafetyTimer);
          this.state.isSpeaking = false;
          this.stopAudioSim();
          this.notify();
          const cb = this.pendingNativeTtsDone;
          this.pendingNativeTtsDone = null;
          if (cb) cb();
        });
      } else {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.synth = window.speechSynthesis || null;

        if (SpeechRecognition) {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.lang = voiceProfileManager.getSettings().language || 'en-IN';

          this.recognition.onstart = () => {
            this.state.isListening = true;
            this.state.error = null;
            this.startAudioSim();
            this.notify();
          };

          this.recognition.onresult = (event: any) => {
            let currentTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const seg = event.results[i][0].transcript;
              currentTranscript += seg;
              if (event.results[i].isFinal) {
                finalTranscript += seg;
              }
            }
            this.state.transcript = currentTranscript;
            this.notify();

            if (finalTranscript.trim() && this.onResultCallback) {
              this.state.isListening = false;
              this.stopAudioSim();
              this.notify();
              this.onResultCallback(finalTranscript.trim());
            }
          };

          this.recognition.onerror = (event: any) => {
            this.state.isListening = false;
            this.stopAudioSim();
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              this.state.error = `Microphone: ${event.error}`;
            }
            this.notify();
          };

          this.recognition.onend = () => {
            this.state.isListening = false;
            this.stopAudioSim();
            this.notify();
          };

          this.state.supported = true;
        }
      }
    }
  }

  private startAudioSim() {
    this.stopAudioSim();
    this.audioLevelInterval = setInterval(() => {
      this.state.audioLevel = 0.2 + Math.random() * 0.65;
      this.notify();
    }, 80);
  }

  private stopAudioSim() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    this.state.audioLevel = 0;
  }

  public subscribe(callback: VoiceStateCallback): () => void {
    this.listeners.push(callback);
    callback({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public startListening(onResult: (text: string) => void) {
    this.stopSpeaking();
    this.onResultCallback = onResult;
    this.state.transcript = '';
    this.state.error = null;

    const currentLang = voiceProfileManager.getSettings().language || 'en-IN';
    const preferOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;

    if (nativeBridge && typeof nativeBridge.startListening === 'function') {
      try {
        if (nativeBridge.startListening.length >= 2) {
          nativeBridge.startListening(currentLang, preferOffline);
        } else {
          nativeBridge.startListening(currentLang);
        }
        this.state.isListening = true;
        this.startAudioSim();
        this.notify();
        return;
      } catch (err) {
        console.warn('Native speech error, falling back to web:', err);
      }
    }

    if (!this.recognition) {
      this.state.error = 'Speech Recognition not supported in this browser.';
      this.notify();
      return;
    }

    try {
      this.recognition.lang = currentLang;
      this.recognition.start();
    } catch {
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 180);
      } catch {
        this.state.error = 'Could not access microphone.';
        this.notify();
      }
    }
  }

  public stopListening() {
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.stopListening === 'function') {
      try {
        nativeBridge.stopListening();
      } catch {}
    }

    if (this.recognition && this.state.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.stopAudioSim();
    this.state.isListening = false;
    this.notify();
  }

  public speak(text: string, onEnd?: () => void) {
    this.stopSpeaking();

    const cleanText = text
      .replace(/[*_#`[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const settings = voiceProfileManager.getSettings();
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;

    if (nativeBridge && typeof nativeBridge.speakText === 'function') {
      try {
        if (typeof nativeBridge.setVoiceLanguage === 'function') {
          nativeBridge.setVoiceLanguage(settings.language);
        }
        this.pendingNativeTtsDone = onEnd || null;
        this.state.isSpeaking = true;
        this.startAudioSim();
        this.notify();

        nativeBridge.speakText(cleanText);

        // Safety timeout fallback in case UtteranceProgressListener is suppressed on an OEM ROM
        const safetyMs = Math.min(24000, Math.max(3000, cleanText.split(' ').length * 420));
        clearTimeout(this.nativeTtsSafetyTimer);
        this.nativeTtsSafetyTimer = setTimeout(() => {
          if (this.state.isSpeaking) {
            this.state.isSpeaking = false;
            this.stopAudioSim();
            this.notify();
            const cb = this.pendingNativeTtsDone;
            this.pendingNativeTtsDone = null;
            if (cb) cb();
          }
        }, safetyMs);
        return;
      } catch (e) {
        console.warn('Native TTS error, using Web Speech fallback:', e);
      }
    }

    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.lang = settings.language;

    const voices = this.synth.getVoices();
    const langPrefix = settings.language.slice(0, 2);

    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().replace('_', '-').startsWith(settings.language.toLowerCase().replace('_', '-')) &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
      ) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.state.isSpeaking = true;
      this.startAudioSim();
      this.notify();
    };

    utterance.onend = () => {
      this.state.isSpeaking = false;
      this.stopAudioSim();
      this.currentUtterance = null;
      this.notify();
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.state.isSpeaking = false;
      this.stopAudioSim();
      this.currentUtterance = null;
      this.notify();
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    clearTimeout(this.nativeTtsSafetyTimer);
    this.pendingNativeTtsDone = null;

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.stopSpeaking === 'function') {
      try {
        nativeBridge.stopSpeaking();
      } catch {}
    }

    if (this.synth) {
      this.synth.cancel();
    }
    this.state.isSpeaking = false;
    this.stopAudioSim();
    this.currentUtterance = null;
    this.notify();
  }

  public interruptAndListen(onResult: (text: string) => void) {
    this.stopSpeaking();
    this.startListening(onResult);
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public getOfflineVoiceReadiness(langCode?: string): {
    isNative: boolean;
    ttsReady: boolean;
    onDeviceSttSupported: boolean;
    localeSupportedOffline: boolean;
    note: string;
  } {
    const lang = langCode || voiceProfileManager.getSettings().language || 'en-IN';
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.checkOfflineVoiceReadiness === 'function') {
      try {
        const parsed = JSON.parse(bridge.checkOfflineVoiceReadiness(lang));
        return {
          isNative: true,
          ttsReady: Boolean(parsed.ttsReady),
          onDeviceSttSupported: Boolean(parsed.onDeviceSttSupported),
          localeSupportedOffline: Boolean(parsed.localeSupportedOffline),
          note: parsed.note || 'Android speech readiness checked.',
        };
      } catch {}
    }
    return {
      isNative: false,
      ttsReady: Boolean(this.synth),
      onDeviceSttSupported: false,
      localeSupportedOffline: Boolean(this.synth && this.synth.getVoices().some((v) => v.localService)),
      note: 'Offline Android voice packs can be managed natively inside the SURYA Android APK.',
    };
  }

  public openOfflineVoicePackInstaller(): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.openOfflineVoiceDataSettings === 'function') {
      try {
        return Boolean(bridge.openOfflineVoiceDataSettings());
      } catch {}
    }
    return false;
  }
}

export const voiceService = new VoiceService();
