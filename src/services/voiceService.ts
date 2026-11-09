/**
 * SURYA Native Android & Web Voice Pipeline
 * Direct integration with AndroidSuryaBridge (SDK 36) and Web Speech API.
 * Powered by VoiceProfileManager ("Suryadev — Radiant Command") and interruptible speech.
 */

import { voiceProfileManager } from './voiceProfileManager';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  supported: boolean;
  isNative: boolean;
  audioLevel: number; // 0.0 to 1.0 for holographic visualizer
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
  private audioLevelInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check for native Android bridge
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

        window.addEventListener('onNativeSpeechResult', (e: any) => {
          const detail = e.detail || {};
          const text = detail.text || '';
          this.state.transcript = text;
          this.notify();

          if (detail.isFinal && this.onResultCallback && text.trim()) {
            this.stopAudioSim();
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
      } else {
        // Standard Web Speech API
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
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              currentTranscript += event.results[i][0].transcript;
            }
            this.state.transcript = currentTranscript;
            this.notify();

            if (event.results[0] && event.results[0].isFinal) {
              const final = event.results[0][0].transcript.trim();
              if (this.onResultCallback && final) {
                this.stopAudioSim();
                this.onResultCallback(final);
              }
            }
          };

          this.recognition.onerror = (event: any) => {
            this.state.isListening = false;
            this.stopAudioSim();
            if (event.error !== 'no-speech') {
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
      // Simulate realistic speech RMS level between 0.2 and 0.85
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
    callback(this.state);
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

    // Native Android bridge check
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.startListening === 'function') {
      try {
        nativeBridge.startListening(currentLang);
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
    } catch (err: any) {
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 150);
      } catch (retryErr) {
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
      } catch (e) {}
    }

    if (this.recognition && this.state.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {}
    }
    this.stopAudioSim();
    this.state.isListening = false;
    this.notify();
  }

  /**
   * Speak response using "Suryadev — Radiant Command" parameters
   */
  public speak(text: string, onEnd?: () => void) {
    this.stopSpeaking();

    // Clean formatting and links
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

    // Native Android TextToSpeech check
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.speakText === 'function') {
      try {
        nativeBridge.speakText(cleanText);
        this.state.isSpeaking = true;
        this.startAudioSim();
        this.notify();

        const durationMs = Math.min(18000, Math.max(1600, cleanText.split(' ').length * 280));
        setTimeout(() => {
          if (this.state.isSpeaking) {
            this.state.isSpeaking = false;
            this.stopAudioSim();
            this.notify();
            if (onEnd) onEnd();
          }
        }, durationMs);
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

    // Pick best neural voice for selected language
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
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.stopSpeaking === 'function') {
      try {
        nativeBridge.stopSpeaking();
      } catch (e) {}
    }

    if (this.synth) {
      this.synth.cancel();
    }
    this.state.isSpeaking = false;
    this.stopAudioSim();
    this.currentUtterance = null;
    this.notify();
  }

  public getState(): VoiceState {
    return { ...this.state };
  }
}

export const voiceService = new VoiceService();
