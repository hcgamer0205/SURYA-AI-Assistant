import React, { useEffect, useState } from 'react';
import { Mic, Square, Radio } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { wakeWordService, WakeWordState } from '../services/wakeWordService';
import { soundFx } from '../services/soundFx';

interface VoiceVisualizerProps {
  onTranscriptCaptured: (text: string) => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ onTranscriptCaptured }) => {
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [wakeState, setWakeState] = useState<WakeWordState>(wakeWordService.getState());
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(new Array(12).fill(6));

  useEffect(() => {
    const unsubVoice = voiceService.subscribe(setVoiceState);
    const unsubWake = wakeWordService.subscribe(setWakeState);
    return () => {
      unsubVoice();
      unsubWake();
    };
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (voiceState.isListening || voiceState.isSpeaking) {
      interval = setInterval(() => {
        const factor = voiceState.isSpeaking ? 22 : 18;
        setWaveAmplitudes(Array.from({ length: 12 }, () => 5 + Math.floor(Math.random() * factor)));
      }, 90);
    } else {
      setWaveAmplitudes(new Array(12).fill(5));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState.isListening, voiceState.isSpeaking]);

  const handleToggleTalk = () => {
    soundFx.playClick();
    if (voiceState.isListening) {
      voiceService.stopListening();
    } else if (voiceState.isSpeaking) {
      voiceService.interruptAndListen((transcript) => {
        if (transcript) onTranscriptCaptured(transcript);
      });
    } else {
      voiceService.startListening((transcript) => {
        if (transcript) onTranscriptCaptured(transcript);
      });
    }
  };

  const handleStopSpeaking = () => {
    soundFx.playClick();
    voiceService.stopSpeaking();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 flex flex-col items-center gap-3">
      {/* Live interim transcript or error */}
      {voiceState.transcript && (
        <div className="w-full px-3.5 py-2 rounded-xl bg-[#121826] border border-slate-800 text-center">
          <p className="text-xs text-slate-200 truncate">&ldquo;{voiceState.transcript}&rdquo;</p>
        </div>
      )}

      {voiceState.error && (
        <div className="w-full px-3.5 py-2 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-200 text-center">
          {voiceState.error}
        </div>
      )}

      {/* Subtle waveform only shown softly above control */}
      {(voiceState.isListening || voiceState.isSpeaking) && (
        <div className="flex items-center justify-center gap-1.5 h-8" aria-hidden="true">
          {waveAmplitudes.map((height, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-100 ${
                voiceState.isSpeaking ? 'bg-[#d4a84f]' : 'bg-[#60a5fa]'
              }`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      )}

      {/* Primary Action Controls */}
      <div className="flex items-center justify-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={handleToggleTalk}
          aria-label={voiceState.isListening ? 'Stop listening' : 'Talk to SURYA'}
          className={`min-h-[48px] px-6 py-2.5 rounded-full text-sm font-medium flex items-center gap-2.5 transition-all active:scale-95 ${
            voiceState.isListening
              ? 'bg-[#60a5fa] text-slate-950 shadow-md'
              : 'bg-[#d4a84f] hover:bg-[#e0b65f] text-slate-950 shadow-sm'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{voiceState.isListening ? 'Listening... Tap to stop' : 'Talk to SURYA'}</span>
        </button>

        {voiceState.isSpeaking && (
          <button
            type="button"
            onClick={handleStopSpeaking}
            aria-label="Stop speaking"
            className="min-h-[48px] px-4 py-2.5 rounded-full bg-[#121826] border border-slate-700 hover:border-slate-500 text-slate-200 text-sm font-medium flex items-center gap-2 transition-colors active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Visible hands-free mic indicator when enabled */}
      {wakeState.isActive && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300/90">
          <Radio className="w-3.5 h-3.5" />
          <span>Hands-free wake word active (&ldquo;Hey SURYA&rdquo;)</span>
        </div>
      )}
    </div>
  );
};
