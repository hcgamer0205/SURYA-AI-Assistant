/**
 * SURYA Advanced Hands-Free & Wake-Word Service
 * Supports "Hey SURYA", "Hi SURYA", and "हे सूर्या" with configurable sensitivity,
 * continuous conversation mode, Android Foreground Service notification, and
 * transparent OS screen-off limitation notice.
 */

import { deviceBridgeService } from './deviceBridgeService';

export interface WakeWordState {
  isActive: boolean;
  isListening: boolean;
  continuousConversation: boolean;
  foregroundServiceActive: boolean;
  detectedWord: string | null;
  error: string | null;
  sensitivity: number;
}

export type WakeWordCallback = (keyword: string) => void;

const STORAGE_SENSITIVITY_KEY = 'surya_wakeword_sensitivity';
const STORAGE_CONTINUOUS_KEY = 'surya_handsfree_continuous';

class WakeWordService {
  private recognition: any = null;
  private isActive = false;
  private isListening = false;
  private continuousConversation = true;
  private foregroundServiceActive = false;
  private detectedWord: string | null = null;
  private error: string | null = null;
  private sensitivity = 0.75;
  private listeners: ((state: WakeWordState) => void)[] = [];
  private onWakeWordCallback: WakeWordCallback | null = null;
  private restartTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedSens = Number(localStorage.getItem(STORAGE_SENSITIVITY_KEY));
      if (!Number.isNaN(savedSens) && savedSens >= 0.3 && savedSens <= 0.95) {
        this.sensitivity = savedSens;
      }
      const savedCont = localStorage.getItem(STORAGE_CONTINUOUS_KEY);
      if (savedCont !== null) {
        this.continuousConversation = savedCont === 'true';
      }

      window.addEventListener('onHandsFreeServiceState', (e: any) => {
        const running = Boolean(e?.detail?.running);
        this.foregroundServiceActive = running;
        if (!running && e?.detail?.stoppedByUserNotification) {
          this.disable();
        } else {
          this.notify();
        }
      });
    }
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.error = null;
          this.notify();
        };

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            this.evaluateTranscript(transcript);
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            this.error = `Wake-word listener: ${e.error}`;
          }
          this.isListening = false;
          this.notify();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.notify();
          if (this.isActive) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isActive) {
                this.startListening();
              }
            }, 450);
          }
        };
      } catch (err: any) {
        this.error = err?.message || 'Wake-word initialization error';
      }
    }
  }

  private evaluateTranscript(text: string) {
    if (!text) return;

    const strictMatch =
      text.includes('hey surya') ||
      text.includes('hi surya') ||
      text.includes('हे सूर्य') ||
      text.includes('हे सूर्या') ||
      text.includes('हे सूरिया') ||
      text.includes('surya ai');

    const relaxedMatch =
      this.sensitivity >= 0.7 &&
      (text.includes('ok surya') || text.includes('hello surya') || text.endsWith('surya'));

    const highSensitivityMatch = this.sensitivity >= 0.85 && text.includes('surya');

    if ((strictMatch || relaxedMatch || highSensitivityMatch) && this.onWakeWordCallback) {
      const match = text.includes('hey surya')
        ? 'Hey SURYA'
        : text.includes('hi surya')
        ? 'Hi SURYA'
        : text.includes('हे सूर्य')
        ? 'हे सूर्या'
        : 'SURYA';

      this.detectedWord = match;
      this.notify();
      this.onWakeWordCallback(match);
      this.pauseTemporarily(2500);
    }
  }

  public pauseTemporarily(ms: number) {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      this.detectedWord = null;
      if (this.isActive) {
        this.startListening();
      }
      this.notify();
    }, ms);
  }

  public subscribe(callback: (state: WakeWordState) => void): () => void {
    this.listeners.push(callback);
    callback(this.getState());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const s = this.getState();
    for (const cb of this.listeners) {
      cb(s);
    }
  }

  public setOnWakeWord(cb: WakeWordCallback) {
    this.onWakeWordCallback = cb;
  }

  public setSensitivity(val: number) {
    const clamped = Math.max(0.3, Math.min(0.95, val));
    this.sensitivity = Number(clamped.toFixed(2));
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_SENSITIVITY_KEY, String(this.sensitivity));
    }
    this.notify();
  }

  public setContinuousConversation(enabled: boolean) {
    this.continuousConversation = enabled;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_CONTINUOUS_KEY, String(enabled));
    }
    this.notify();
  }

  public enable() {
    this.isActive = true;
    this.error = null;
    if (deviceBridgeService.isNativeAndroid()) {
      this.foregroundServiceActive = deviceBridgeService.startHandsFreeService();
    }
    this.startListening();
    this.notify();
  }

  public disable() {
    this.isActive = false;
    this.detectedWord = null;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    if (deviceBridgeService.isNativeAndroid()) {
      deviceBridgeService.stopHandsFreeService();
      this.foregroundServiceActive = false;
    }
    this.isListening = false;
    this.notify();
  }

  public toggle(): boolean {
    if (this.isActive) {
      this.disable();
      return false;
    } else {
      this.enable();
      return true;
    }
  }

  private startListening() {
    if (!this.recognition || !this.isActive) return;
    try {
      this.recognition.start();
    } catch {
      // SpeechRecognition may already be starting
    }
  }

  public getBackgroundLimitationNote(): string {
    return 'Android restricts third-party apps from true screen-off DSP hotword wake-up reserved for OS-level assistants. When Hands-Free is enabled, SURYA displays a visible foreground notification and responds while active or in foreground without silent recording.';
  }

  public getState(): WakeWordState {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      continuousConversation: this.continuousConversation,
      foregroundServiceActive: this.foregroundServiceActive,
      detectedWord: this.detectedWord,
      error: this.error,
      sensitivity: this.sensitivity,
    };
  }
}

export const wakeWordService = new WakeWordService();
