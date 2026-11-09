/**
 * SURYA On-Device Wake-Word Service
 * Real-time continuous detection for "Hey SURYA", "Hi SURYA", "हे सूर्या".
 * Privacy-first: strictly user-controlled with visible indicators, never recording silently.
 */

export interface WakeWordState {
  isActive: boolean;
  isListening: boolean;
  detectedWord: string | null;
  error: string | null;
  sensitivity: number;
}

export type WakeWordCallback = (keyword: string) => void;

class WakeWordService {
  private recognition: any = null;
  private isActive = false;
  private isListening = false;
  private sensitivity = 0.75;
  private listeners: ((state: WakeWordState) => void)[] = [];
  private onWakeWordCallback: WakeWordCallback | null = null;
  private restartTimeout: any = null;

  constructor() {
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
        this.recognition.lang = 'en-IN'; // Good for both Indian English and Hindi phonetics

        this.recognition.onstart = () => {
          this.isListening = true;
          this.notify();
        };

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            this.evaluateTranscript(transcript);
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('[WakeWordService] Speech error:', e.error);
          }
          this.isListening = false;
          this.notify();
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.notify();
          // Auto-restart if still active
          if (this.isActive) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isActive) {
                this.startListening();
              }
            }, 350);
          }
        };
      } catch (err) {
        console.warn('[WakeWordService] Initialization error:', err);
      }
    }
  }

  private evaluateTranscript(text: string) {
    if (!text) return;

    // Recognize variations of "Hey SURYA", "Hi SURYA", "हे सूर्या", "SURYA AI"
    const isWakeWord =
      text.includes('hey surya') ||
      text.includes('hi surya') ||
      text.includes('हे सूर्य') ||
      text.includes('हे सूर्या') ||
      text.includes('हे सूरिया') ||
      text.includes('surya ai') ||
      (this.sensitivity > 0.8 && text.endsWith('surya'));

    if (isWakeWord && this.onWakeWordCallback) {
      const match = text.includes('hey surya')
        ? 'Hey SURYA'
        : text.includes('हे सूर्य')
        ? 'हे सूर्या'
        : 'SURYA';

      this.onWakeWordCallback(match);
      // Brief pause to prevent loop
      this.pauseTemporarily(2000);
    }
  }

  private pauseTemporarily(ms: number) {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.isActive) {
        this.startListening();
      }
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

  public enable() {
    this.isActive = true;
    this.startListening();
    this.notify();
  }

  public disable() {
    this.isActive = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
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
    } catch (e) {
      // Already running or permission needed
    }
  }

  public getState(): WakeWordState {
    return {
      isActive: this.isActive,
      isListening: this.isListening,
      detectedWord: null,
      error: null,
      sensitivity: this.sensitivity,
    };
  }
}

export const wakeWordService = new WakeWordService();
