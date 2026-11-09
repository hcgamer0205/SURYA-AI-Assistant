import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  Terminal,
  ArrowRight,
  RefreshCw,
  Cpu,
  Clock,
} from 'lucide-react';
import { ChatMessage, StarkActionPlan } from '../types/surya';
import { voiceService } from '../services/voiceService';
import { soundFx } from '../services/soundFx';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface StarkCommandCenterProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onExecutePlan: (plan: StarkActionPlan) => void;
  isProcessing: boolean;
  activeModel?: string;
  onOpenModelModal?: () => void;
}

export const StarkCommandCenter: React.FC<StarkCommandCenterProps> = ({
  messages,
  onSendMessage,
  onExecutePlan,
  isProcessing,
  activeModel = 'gemini-3.8-flash',
  onOpenModelModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = uiThemeEngine.subscribe((t) => setTheme(t));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    soundFx.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSpeak = (text: string) => {
    soundFx.playClick();
    voiceService.speak(text);
  };

  const tacticalShortcuts = [
    'Open YouTube',
    'SURYA, make your interface golden',
    'Organize my complete study environment',
    'SURYA, speak Hindi',
    'Run system diagnostics',
  ];

  const primaryCol = theme.palette.primary;

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-3 pb-20">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b pb-2"
        style={{ borderColor: `${primaryCol}33` }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" style={{ color: primaryCol }} />
          <div>
            <h2
              className="text-sm font-mono font-bold tracking-wider uppercase"
              style={{ color: primaryCol }}
            >
              SURYA TACTICAL CHAT
            </h2>
            <span className="text-[10px] text-slate-400">Deterministic local intents + Real-time SSE streaming</span>
          </div>
        </div>

        {onOpenModelModal && (
          <button
            onClick={onOpenModelModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border text-xs font-mono transition-colors"
            style={{ borderColor: `${primaryCol}44`, color: primaryCol }}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="truncate max-w-[110px]">{activeModel}</span>
          </button>
        )}
      </div>

      {/* Tactical Prompt Suggestions (Horizontal Carousel) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tacticalShortcuts.map((shortcut, i) => (
          <button
            key={i}
            onClick={() => {
              soundFx.playClick();
              onSendMessage(shortcut);
            }}
            disabled={isProcessing}
            className="min-h-[32px] px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 text-[11px] font-mono whitespace-nowrap transition-all active:scale-95"
          >
            {shortcut}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[54vh] min-h-[38vh]"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role !== 'user' && (
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 shadow-md"
                style={{
                  backgroundColor: `${primaryCol}15`,
                  borderColor: `${primaryCol}44`,
                }}
              >
                <Bot className="w-4 h-4" style={{ color: primaryCol }} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-600/30 border border-amber-500/40 text-slate-100 rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                <span className="font-semibold" style={{ color: primaryCol }}>
                  {msg.role === 'user' ? 'OPERATOR' : 'SURYA AI'}
                </span>
                <div className="flex items-center gap-2">
                  {msg.ttftMs && (
                    <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{msg.ttftMs}ms</span>
                    </span>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

              {/* Action Plan Trigger Card */}
              {msg.suggestedAction && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700/50">
                        {msg.suggestedAction.riskLevel} RISK
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-100 truncate">
                        {msg.suggestedAction.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                      Intent: {msg.suggestedAction.intent}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onExecutePlan(msg.suggestedAction!);
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-1 shrink-0 active:scale-95 transition-all text-slate-950 shadow-md"
                    style={{ backgroundColor: primaryCol }}
                  >
                    <span>EXECUTE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TTS Playback Icon */}
              {msg.role === 'assistant' && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleSpeak(msg.content)}
                    aria-label="Speak response aloud"
                    className="text-slate-400 hover:text-amber-300 transition-colors p-1"
                    title="Speak aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div
            className="flex items-center gap-2 text-xs font-mono p-2"
            style={{ color: primaryCol }}
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SURYA SYNTHESIZING RESPONSE...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 pt-1">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command SURYA (e.g. 'Open YouTube', 'Change theme to saffron')..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          style={{ borderColor: `${primaryCol}55` }}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          aria-label="Send directive"
          className="min-h-[44px] min-w-[44px] px-4 rounded-xl disabled:opacity-50 text-slate-950 flex items-center justify-center active:scale-95 transition-all shadow-md font-bold"
          style={{ backgroundColor: primaryCol }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
