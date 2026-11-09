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
  statusText = 'ONLINE',
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
    setTimeout(() => setPulseActive(false), 500);
    if (onCoreTap) onCoreTap();
  };

  const primaryCol = theme.palette.primary;
  const primaryGlow = theme.palette.primaryGlow;
  const accentCol = theme.palette.accent;
  const orbStyle = theme.orb.style;

  // Audio-reactive scale factor
  const dynamicScale = isSpeaking ? 1.05 + audioLevel * 0.15 : isListening ? 1.05 : 1.0;

  return (
    <div
      role="region"
      aria-label="SURYA Neural Core"
      className="relative flex flex-col items-center justify-center py-6 select-none"
    >
      {/* Outer Solar Corona Glow Halo */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${primaryGlow} 0%, ${accentCol}22 50%, transparent 75%)`,
          opacity: isSpeaking || isListening || pulseActive ? 0.65 : 0.35,
          transform: pulseActive ? 'scale(1.25)' : `scale(${dynamicScale})`,
        }}
      />

      {/* Interactive Core Assembly */}
      <button
        onClick={handleTap}
        aria-label="SURYA Assistant Orb - Tap to Activate"
        className="relative w-56 h-56 flex items-center justify-center cursor-pointer transition-transform active:scale-95 focus:outline-none"
        style={{ transform: `scale(${theme.orb.scale * dynamicScale})` }}
      >
        {/* ORB STYLE 1: CORONAL SOLAR CORE (Suryadev Signature) */}
        {orbStyle === 'coronal-solar' && (
          <>
            {/* Outer Solar Flare Ring */}
            <svg
              className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none"
              viewBox="0 0 200 200"
            >
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke={primaryCol}
                strokeWidth="1.5"
                strokeDasharray="6 12"
                opacity="0.4"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke={accentCol}
                strokeWidth="1"
                opacity="0.25"
              />
              {/* Radiating 12 Solar Rays (Dvadashaditya / 12 Solar Adityas) */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1="100"
                  y1="6"
                  x2="100"
                  y2="16"
                  stroke={primaryCol}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 100 100)`}
                  opacity="0.75"
                />
              ))}
            </svg>

            {/* Inner Radiating Solar Corona */}
            <svg
              className="absolute inset-0 w-full h-full animate-spin-reverse-slow pointer-events-none"
              viewBox="0 0 200 200"
            >
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke={primaryCol}
                strokeWidth="2"
                strokeDasharray="24 18"
                opacity="0.6"
              />
              <circle
                cx="100"
                cy="100"
                r="64"
                fill="none"
                stroke={accentCol}
                strokeWidth="1"
                strokeDasharray="8 16"
                opacity="0.5"
              />
            </svg>
          </>
        )}

        {/* ORB STYLE 2: HOLOGRAPHIC ARC HUD */}
        {orbStyle === 'holographic-arc' && (
          <svg
            className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke={primaryCol}
              strokeWidth="2"
              strokeDasharray="30 15 10 15"
              opacity="0.6"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={accentCol}
              strokeWidth="1.5"
              strokeDasharray="12 12"
              opacity="0.5"
            />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="100"
                y1="3"
                x2="100"
                y2="10"
                stroke={primaryCol}
                strokeWidth="2"
                transform={`rotate(${deg} 100 100)`}
              />
            ))}
          </svg>
        )}

        {/* ORB STYLE 3: PULSE REACTOR */}
        {orbStyle === 'pulse-reactor' && (
          <div
            className="absolute w-48 h-48 rounded-full border-2 border-dashed pointer-events-none animate-pulse"
            style={{ borderColor: primaryCol }}
          />
        )}

        {/* ORB STYLE 4: MINIMAL RING */}
        {orbStyle === 'minimal-ring' && (
          <div
            className="absolute w-44 h-44 rounded-full border pointer-events-none"
            style={{ borderColor: `${primaryCol}55` }}
          />
        )}

        {/* Central Solar Plasma Core */}
        <div
          className={`w-32 h-32 rounded-full border flex items-center justify-center transition-all duration-300 ${
            isSpeaking ? 'animate-pulse scale-105' : isListening ? 'scale-110' : ''
          }`}
          style={{
            borderColor: primaryCol,
            boxShadow: `inset 0 0 28px ${primaryGlow}, 0 0 28px ${primaryGlow}`,
            backgroundColor: theme.palette.surface,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Inner Radiant Diamond Assembly */}
          <div className="relative flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl rotate-45 border flex items-center justify-center transition-all duration-300"
              style={{
                borderColor: primaryCol,
                backgroundColor: `${primaryCol}25`,
                boxShadow: `0 0 20px ${primaryGlow}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg -rotate-45 transition-colors duration-300"
                style={{
                  backgroundColor: isSpeaking ? accentCol : primaryCol,
                  boxShadow: `0 0 16px ${primaryCol}`,
                }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Telemetry Status Readout */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: primaryCol }}
          />
          <span
            className="text-xs font-mono tracking-widest uppercase font-bold"
            style={{ color: primaryCol }}
          >
            SURYA // {statusText}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          SURYADEV RADIANT CORONA · ANDROID SDK 36
        </span>
      </div>
    </div>
  );
};
