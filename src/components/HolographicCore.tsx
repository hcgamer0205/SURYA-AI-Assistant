import React, { useState, useEffect } from 'react';
import { soundFx } from '../services/soundFx';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface HolographicCoreProps {
  isListening: boolean;
  isSpeaking: boolean;
  statusText?: string;
  onCoreTap?: () => void;
  audioLevel?: number;
}

export const HolographicCore: React.FC<HolographicCoreProps> = ({
  isListening,
  isSpeaking,
  statusText,
  onCoreTap,
  audioLevel = 0,
}) => {
  const [pulseActive, setPulseActive] = useState(false);
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());

  useEffect(() => {
    const unsub = uiThemeEngine.subscribe((t) => setTheme(t));
    return () => unsub();
  }, []);

  const handleTap = () => {
    soundFx.playCorePulse();
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 360);
    onCoreTap?.();
  };

  const primaryCol = theme.palette.primary || '#d4a84f';
  const accentCol = theme.palette.accent || '#60a5fa';
  const orbStyle = theme.orb.style;

  const isActive = isListening || isSpeaking;
  const reactiveScale = isSpeaking
    ? 1.03 + Math.min(0.08, audioLevel * 0.08)
    : isListening
    ? 1.04
    : pulseActive
    ? 0.97
    : 1;

  const ringColor = isListening ? accentCol : primaryCol;

  return (
    <div
      role="region"
      aria-label={statusText ? `SURYA Assistant Orb — ${statusText}` : 'SURYA Assistant Orb'}
      className="relative flex flex-col items-center justify-center py-3 select-none"
    >
      {/* Subtle ambient radial halo */}
      <div
        className="absolute w-40 h-40 rounded-full blur-2xl pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${ringColor}2e 0%, transparent 70%)`,
          opacity: isActive ? 0.9 : 0.45,
        }}
      />

      {/* Compact Assistant Orb */}
      <button
        type="button"
        onClick={handleTap}
        aria-label={
          isListening
            ? 'SURYA is listening. Tap to stop.'
            : isSpeaking
            ? 'SURYA is speaking. Tap to interrupt and listen.'
            : 'Tap to talk to SURYA'
        }
        className="relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        style={{ transform: `scale(${reactiveScale})` }}
      >
        <svg
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            isActive ? 'animate-spin-slow' : ''
          }`}
          viewBox="0 0 128 128"
        >
          <circle
            cx="64"
            cy="64"
            r="60"
            fill="none"
            stroke={ringColor}
            strokeWidth="1.25"
            strokeDasharray={orbStyle === 'minimal-ring' ? undefined : '10 8'}
            opacity={isActive ? 0.7 : 0.35}
          />
          <circle
            cx="64"
            cy="64"
            r="50"
            fill="none"
            stroke={accentCol}
            strokeWidth="1"
            opacity={isActive ? 0.55 : 0.22}
          />
        </svg>

        {/* Central Core Disk */}
        <div
          className={`w-[74px] h-[74px] rounded-full border flex items-center justify-center transition-all duration-300 ${
            isActive ? 'animate-core-pulse' : ''
          }`}
          style={{
            backgroundColor: '#121826',
            borderColor: `${ringColor}88`,
            boxShadow: isActive ? `0 0 24px ${ringColor}33` : '0 4px 16px rgba(0,0,0,0.35)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors duration-300"
            style={{
              borderColor: `${ringColor}66`,
              backgroundColor: `${ringColor}1f`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full transition-transform duration-300"
              style={{
                backgroundColor: ringColor,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          </div>
        </div>
      </button>
    </div>
  );
};
