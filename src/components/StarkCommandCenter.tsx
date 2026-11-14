import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Volume2,
  Square,
  Terminal,
  ArrowRight,
  RefreshCw,
  Cpu,
  Clock,
  Settings,
  Mic,
  Trash2,
  Download,
} from 'lucide-react';
import { ChatMessage, ResponseMode, StarkActionPlan } from '../types/surya';
import { voiceService } from '../services/voiceService';
import { soundFx } from '../services/soundFx';
import { uiThemeEngine } from '../services/uiThemeEngine';
import { SuryaThemeConfig } from '../types/suryaTheme';

interface StarkCommandCenterProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onVoiceCapture?: (transcript: string) => void;
  onClearHistory?: () => void;
  onExecutePlan: (plan: StarkActionPlan) => void;
  isProcessing: boolean;
  activeModel?: string;
  responseMode: ResponseMode;
  onChangeResponseMode: (mode: ResponseMode) => void;
  onOpenModelModal?: () => void;
  onOpenTelemetry?: () => void;
}

export const StarkCommandCenter: React.FC<StarkCommandCenterProps> = ({
  messages,
  onSendMessage,
  onVoiceCapture,
  onClearHistory,
  onExecutePlan,
  isProcessing,
  activeModel = 'gemini-4-hydrogen',
  responseMode,
  onChangeResponseMode,
  onOpenModelModal,
  onOpenTelemetry,
}) => {
  const [inputText, setInputText] = useState('');
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubTheme = uiThemeEngine.subscribe((t) => setTheme(t));
    const unsubVoice = voiceService.subscribe((v) => setVoiceState(v));
    return () => {
      unsubTheme();
      unsubVoice();
    };
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

  const handleExportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surya-conversation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tacticalShortcuts = [
    'Open YouTube',
    'Remember that my workspace prefers concise updates',
    'SURYA, make your interface holographic blue',
    'Add task Review Android APK build',
    'SURYA, speak Hindi',
  ];

  const primaryCol = theme.palette.primary;

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 space-y-3 pb-24">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5"
        style={{ borderColor: `${primaryCol}33` }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" style={{ color: primaryCol }} />
          <div>
            <h2
              className="text-sm font-mono font-bold tracking-wider uppercase"
              style={{ color: primaryCol }}
            >
              SURYA CONVERSATION CORE
            </h2>
            <span className="text-[10px] text-slate-400">
              0ms Local Intents · Memory Context · Real-Time SSE Streaming
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => onChangeResponseMode('concise')}
              className={`px-2 py-1 rounded ${
                responseMode === 'concise' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              CONCISE
            </button>
            <button
              onClick={() => onChangeResponseMode('detailed')}
              className={`px-2 py-1 rounded ${
                responseMode === 'detailed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              DETAILED
            </button>
          </div>

          {onOpenModelModal && (
            <button
              onClick={onOpenModelModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border text-[11px] font-mono transition-colors"
              style={{ borderColor: `${primaryCol}44`, color: primaryCol }}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{activeModel}</span>
            </button>
          )}

          <button
            onClick={handleExportChat}
            aria-label="Export conversation history"
            title="Export JSON"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onClearHistory && (
            <button
              onClick={onClearHistory}
              aria-label="Clear conversation history"
              title="Clear conversation"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tacticalShortcuts.map((shortcut, i) => (
          <button
            key={i}
            onClick={() => {
              soundFx.playClick();
              onSendMessage(shortcut);
            }}
            disabled={isProcessing}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 text-[11px] font-mono whitespace-nowrap transition-all active:scale-95"
          >
            {shortcut}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[56vh] min-h-[42vh]"
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
                className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5"
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
                  ? 'bg-amber-600/25 border border-amber-500/40 text-slate-100 rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-mono text-slate-400">
                <span className="font-semibold" style={{ color: primaryCol }}>
                  {msg.role === 'user' ? 'OPERATOR' : `SURYA AI${msg.model ? ` · ${msg.model}` : ''}`}
                </span>
                <div className="flex items-center gap-2 tabular-nums">
                  {(msg.ttftMs || msg.latencyMs) && (
                    <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{msg.ttftMs || msg.latencyMs}ms</span>
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

              <div className="whitespace-pre-wrap font-sans">{msg.content || '...'}</div>

              {msg.role === 'system' &&
                (msg.content.includes('SURYA Backend Error') ||
                  msg.content.includes('HTML webpage') ||
                  msg.content.includes('Network connection failed')) &&
                onOpenTelemetry && (
                  <button
                    onClick={onOpenTelemetry}
                    className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>CONFIGURE BACKEND GATEWAY IN SETTINGS</span>
                  </button>
                )}

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

              {msg.role === 'assistant' && msg.content && (
                <div className="mt-2 flex justify-end gap-2">
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
            <span>SURYA STREAMING RESPONSE...</span>
          </div>
        )}
      </div>

      {/* Input Bar with Inline Mic & Interrupt */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 pt-1">
        {onVoiceCapture && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              if (voiceState.isSpeaking) {
                voiceService.interruptAndListen(onVoiceCapture);
              } else if (voiceState.isListening) {
                voiceService.stopListening();
              } else {
                voiceService.startListening(onVoiceCapture);
              }
            }}
            aria-label={voiceState.isListening ? 'Stop listening' : 'Speak command'}
            className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-all ${
              voiceState.isListening
                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                : 'bg-slate-900 text-amber-400 border-slate-700 hover:border-amber-400'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {voiceState.isSpeaking && (
          <button
            type="button"
            onClick={() => voiceService.stopSpeaking()}
            aria-label="Stop speaking"
            className="min-h-[44px] px-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-mono font-bold flex items-center gap-1"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command SURYA (e.g. 'Open YouTube', 'Remember that...', 'Explain...')..."
          className="flex-1 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-4 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
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
