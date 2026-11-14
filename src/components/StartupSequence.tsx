import React, { useEffect, useState } from 'react';
import { FastForward, Sun } from 'lucide-react';

interface StartupSequenceProps {
  primaryColor: string;
  onComplete: () => void;
}

export const StartupSequence: React.FC<StartupSequenceProps> = ({ primaryColor, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const stages = [
    'CALIBRATING SOLAR CORONA MATRIX',
    'SYNCHRONIZING 10-AGENT INTELLIGENCE CORE',
    'VERIFYING NATIVE ANDROID BRIDGE & VERONICA GUARD',
    'SURYA OPERATING ENVIRONMENT ONLINE',
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStepIndex(1), 450);
    const t2 = setTimeout(() => setStepIndex(2), 950);
    const t3 = setTimeout(() => setStepIndex(3), 1450);
    const t4 = setTimeout(() => onComplete(), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      role="dialog"
      aria-label="SURYA Boot Sequence"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070e] px-6 text-center select-none"
    >
      <div className="relative w-32 h-32 flex items-center justify-center mb-6">
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed animate-spin-slow"
          style={{ borderColor: `${primaryColor}88` }}
        />
        <div
          className="w-20 h-20 rounded-full border flex items-center justify-center shadow-2xl"
          style={{
            borderColor: primaryColor,
            backgroundColor: `${primaryColor}18`,
            boxShadow: `0 0 36px ${primaryColor}55`,
          }}
        >
          <Sun className="w-9 h-9" style={{ color: primaryColor }} />
        </div>
      </div>

      <h1
        className="text-xl font-mono font-bold tracking-[0.25em] uppercase mb-2"
        style={{ color: primaryColor }}
      >
        SURYA AI
      </h1>
      <p className="text-xs font-mono text-slate-300 tracking-wider mb-6 min-h-[1.25rem]">
        {stages[stepIndex]}
      </p>

      <div className="w-56 h-1 bg-slate-800 rounded-full overflow-hidden mb-8">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${((stepIndex + 1) / stages.length) * 100}%`,
            backgroundColor: primaryColor,
          }}
        />
      </div>

      <button
        onClick={onComplete}
        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors"
      >
        <FastForward className="w-3.5 h-3.5" />
        <span>SKIP SEQUENCE</span>
      </button>
    </div>
  );
};
