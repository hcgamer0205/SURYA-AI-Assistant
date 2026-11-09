import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  Globe,
  Sliders,
  Play,
  Square,
  Sparkles,
  Info,
  X,
  Radio,
  Check,
} from 'lucide-react';
import {
  voiceProfileManager,
  VOICE_PROFILES,
  SUPPORTED_LANGUAGES,
} from '../services/voiceProfileManager';
import { voiceService } from '../services/voiceService';
import { wakeWordService } from '../services/wakeWordService';
import { soundFx } from '../services/soundFx';
import { VoiceProfileId } from '../types/suryaTheme';

interface VoiceSettingsModalProps {
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState(voiceProfileManager.getSettings());
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const profiles = voiceProfileManager.getAllProfiles();
  const activeProfile = voiceProfileManager.getActiveProfile();
  const hardwareNotice = voiceProfileManager.getHardwareCapabilityNotice();

  const handleSelectProfile = (id: VoiceProfileId) => {
    soundFx.playClick();
    voiceProfileManager.setProfile(id);
    setSettings(voiceProfileManager.getSettings());
  };

  const handleSelectLanguage = (code: string) => {
    soundFx.playClick();
    voiceProfileManager.setLanguage(code);
    setSettings(voiceProfileManager.getSettings());
  };

  const handleRateChange = (newRate: number) => {
    voiceProfileManager.setRate(newRate);
    setSettings(voiceProfileManager.getSettings());
  };

  const handlePitchChange = (newPitch: number) => {
    voiceProfileManager.setPitch(newPitch);
    setSettings(voiceProfileManager.getSettings());
  };

  const handleToggleWakeWord = () => {
    soundFx.playClick();
    const nextVal = !settings.wakeWordEnabled;
    voiceProfileManager.setWakeWordEnabled(nextVal);
    if (nextVal) {
      wakeWordService.enable();
    } else {
      wakeWordService.disable();
    }
    setSettings(voiceProfileManager.getSettings());
  };

  const handleAudition = () => {
    if (isPlayingSample) {
      voiceService.stopSpeaking();
      setIsPlayingSample(false);
      return;
    }

    soundFx.playAuthorize();
    setIsPlayingSample(true);
    voiceService.speak(activeProfile.samplePhrase, () => {
      setIsPlayingSample(false);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice & Personality Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                SURYA VOICE IDENTITY & WAKE-WORD
              </h2>
              <p className="text-[10px] text-slate-400">Suryadev — Radiant Command & Multilingual Neural Voice</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              voiceService.stopSpeaking();
              onClose();
            }}
            aria-label="Close voice settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Active Voice Profile Card & Audition */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                  ACTIVE VOICE PROFILE
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100">{activeProfile.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{activeProfile.timbreDescription}</p>
            </div>

            <button
              onClick={handleAudition}
              className={`px-3 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                isPlayingSample
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              {isPlayingSample ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingSample ? 'STOP' : 'AUDITION'}</span>
            </button>
          </div>

          {/* Voice Profiles Grid */}
          <div>
            <span className="text-xs font-mono font-bold text-slate-300 block mb-2 uppercase">
              SELECT VOICE PROFILE
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {profiles.map((prof) => {
                const isSelected = settings.profileId === prof.id;
                return (
                  <button
                    key={prof.id}
                    onClick={() => handleSelectProfile(prof.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[90px] active:scale-95 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 ring-1 ring-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-100 truncate">{prof.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 block mb-1">
                        {prof.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {prof.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multilingual Language Selector */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                MULTILINGUAL LANGUAGE (20+ SUPPORTED)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const active = settings.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors flex items-center justify-between ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{lang.name}</span>
                    <span className="text-[9px] opacity-75 font-mono">{lang.code.slice(0, 2).toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speech Rate & Pitch Controls */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              SPEECH RATE & PITCH CALIBRATION
            </span>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Speech Rate ({settings.rate.toFixed(2)}x)</span>
                <span className="text-[10px] font-mono text-amber-400">
                  {settings.rate > 1.1 ? 'Fast' : settings.rate < 0.95 ? 'Slow' : 'Optimal'}
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.45"
                step="0.05"
                value={settings.rate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Pitch Tone ({settings.pitch.toFixed(2)})</span>
                <span className="text-[10px] font-mono text-amber-400">
                  {settings.pitch < 0.95 ? 'Resonant Baritone' : settings.pitch > 1.05 ? 'Crisp Tenor' : 'Neutral'}
                </span>
              </div>
              <input
                type="range"
                min="0.65"
                max="1.35"
                step="0.05"
                value={settings.pitch}
                onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* "Hey SURYA" Wake Word Activation */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${settings.wakeWordEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">"Hey SURYA" Voice Activation</span>
                  <span className="text-[10px] text-slate-400">Continuously listen for "Hey SURYA" / "हे सूर्या"</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.wakeWordEnabled}
                onChange={handleToggleWakeWord}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {settings.wakeWordEnabled && (
              <div className="pt-2 border-t border-slate-700/60 text-[11px] text-emerald-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Wake-word listener online. Microphone active with visible indicator.</span>
              </div>
            )}
          </div>

          {/* Hardware Capability Notice */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-300 block mb-0.5">Device Telemetry & Limitations:</span>
              <span>{hardwareNotice.message}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              voiceService.stopSpeaking();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
