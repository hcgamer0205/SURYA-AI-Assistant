import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Square, Volume2 } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { soundFx } from '../services/soundFx';

interface VoiceVisualizerProps {
  onTranscriptCaptured: (text: string) => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ onTranscriptCaptured }) => {
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(new Array(18).fill(8));

  useEffect(() => {
    const unsubscribe = voiceService.subscribe((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  // Animate waveform bars when speaking or listening
  useEffect(() => {
    let interval: any = null;
    if (voiceState.isListening || voiceState.isSpeaking) {
      interval = setInterval(() => {
        const factor = voiceState.isSpeaking ? 34 : 26;
        const newAmps = Array.from({ length: 18 }, () => {
          return 6 + Math.floor(Math.random() * factor);
        });
        setWaveAmplitudes(newAmps);
      }, 70);
    } else {
      setWaveAmplitudes(new Array(18).fill(6));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState.isListening, voiceState.isSpeaking]);

  const toggleMic = () => {
    soundFx.playClick();
    if (voiceState.isListening) {
      voiceService.stopListening();
    } else {
      voiceService.startListening((transcript) => {
        if (transcript) {
          onTranscriptCaptured(transcript);
        }
      });
    }
  };

  const handleInterrupt = () => {
    soundFx.playClick();
    voiceService.stopSpeaking();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 flex flex-col items-center">
      {/* Live Transcript / Status Toast */}
      {voiceState.transcript && (
        <div className="mb-2 w-full max-w-sm px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-center animate-fade-in">
          <p className="text-xs font-mono text-cyan-200 truncate">
            &ldquo;{voiceState.transcript}&rdquo;
          </p>
        </div>
      )}

      {/* Mic error message */}
      {voiceState.error && (
        <div className="mb-2 px-3 py-1 rounded bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300">
          {voiceState.error}
        </div>
      )}

      {/* Audio Waveform Display */}
      <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs mb-3">
        {waveAmplitudes.map((height, idx) => (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-75 ${
              voiceState.isSpeaking
                ? 'bg-amber-400 shadow-amber-400/50'
                : voiceState.isListening
                ? 'bg-cyan-400 shadow-cyan-400/50'
                : 'bg-slate-700/60'
            }`}
            style={{
              height: `${height}px`,
              boxShadow:
                voiceState.isListening || voiceState.isSpeaking
                  ? '0 0 6px currentColor'
                  : 'none',
            }}
          />
        ))}
      </div>

      {/* Touch Action Controls */}
      <div className="flex items-center gap-4">
        {/* Primary Voice Mic Button */}
        <button
          onClick={toggleMic}
          aria-label={voiceState.isListening ? 'Stop listening' : 'Start voice command'}
          className={`relative min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-full font-mono text-xs font-semibold flex items-center gap-2.5 transition-all duration-200 active:scale-95 ${
            voiceState.isListening
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300'
              : 'bg-slate-900 border border-cyan-500/40 text-cyan-400 hover:border-cyan-400/80 hover:bg-cyan-950/30'
          }`}
        >
          {voiceState.isListening ? (
            <>
              <Mic className="w-4 h-4 animate-bounce" />
              <span>LISTENING...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>VOICE COMMAND</span>
            </>
          )}
        </button>

        {/* Interrupt Speech Button */}
        {voiceState.isSpeaking && (
          <button
            onClick={handleInterrupt}
            aria-label="Interrupt SURYA speech"
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center gap-1.5 text-xs font-mono font-medium hover:bg-amber-500/30 active:scale-95 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>INTERRUPT</span>
          </button>
        )}
      </div>
    </div>
  );
};
