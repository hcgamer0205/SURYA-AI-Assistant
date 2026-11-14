import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Volume2,
  Square,
  ArrowRight,
  RefreshCw,
  Cpu,
  Settings,
  Mic,
  Trash2,
  Download,
  MoreHorizontal,
  SlidersHorizontal,
  Search,
  X,
} from 'lucide-react';
import { ChatMessage, ResponseMode, StarkActionPlan } from '../types/surya';
import { apiService, ConnectionStatusSnapshot } from '../services/apiService';
import { intelligenceRouter } from '../services/intelligenceRouter';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [connStatus, setConnStatus] = useState<ConnectionStatusSnapshot>(
    apiService.getConnectionStatus()
  );
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubTheme = uiThemeEngine.subscribe(setTheme);
    const unsubVoice = voiceService.subscribe(setVoiceState);
    const unsubConn = apiService.subscribeConnectionState(setConnStatus);
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);
    return () => {
      unsubTheme();
      unsubVoice();
      unsubConn();
      unsubRouter();
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    soundFx.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleExportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surya-conversation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const quickSuggestions = [
    'Summarize my day',
    'Open YouTube',
    'Add task Review Android APK build',
    'Remember that I prefer concise replies',
  ];

  const primaryCol = theme.palette.primary || '#d4a84f';
  const offlineHandledLocally =
    routerStatus.activePath === 'on-device-llm' ||
    (routerStatus.mode === 'offline' && routerStatus.localReady);
  const showGatewayBanner =
    !offlineHandledLocally &&
    routerStatus.mode !== 'offline' &&
    (connStatus.state === 'AUTHENTICATION_REQUIRED' ||
      connStatus.state === 'RATE_LIMITED' ||
      connStatus.state === 'SERVER_ERROR' ||
      !connStatus.isConfigured ||
      connStatus.isPreviewUrl);

  const visibleMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] w-full max-w-3xl mx-auto px-4 pt-3 pb-20">
      {/* Clean Chat Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-100">Chat</h2>
          <p className="text-xs text-slate-400 truncate">
            {routerStatus.mode === 'offline'
              ? routerStatus.localReady
                ? `Offline · ${routerStatus.activeLocalModelName}`
                : 'Offline mode · Local tools only'
              : routerStatus.activePath === 'on-device-llm'
              ? `On-device · ${routerStatus.activeLocalModelName}`
              : `${responseMode === 'concise' ? 'Concise' : 'Detailed'} · ${routerStatus.mode}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenModelModal && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onOpenModelModal();
              }}
              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-[#d4a84f]" />
              <span className="truncate max-w-[130px]">
                {routerStatus.activePath === 'on-device-llm' && routerStatus.activeLocalModelName
                  ? routerStatus.activeLocalModelName
                  : activeModel}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setShowSearch((prev) => !prev);
            }}
            aria-label="Search conversation history"
            className={`min-h-[36px] min-w-[36px] p-2 rounded-xl border flex items-center justify-center transition-colors ${
              showSearch
                ? 'bg-[#d4a84f] text-slate-950 border-[#d4a84f]'
                : 'bg-[#121826] border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Overflow Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="Conversation options"
              aria-expanded={menuOpen}
              className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#121826] border border-slate-800 shadow-xl py-1.5 z-30">
                <div className="px-3 py-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Response Mode</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#0b0f17] border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onChangeResponseMode('concise');
                      }}
                      className={`py-1 rounded-md text-xs font-medium transition-colors ${
                        responseMode === 'concise'
                          ? 'bg-[#d4a84f] text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Concise
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onChangeResponseMode('detailed');
                      }}
                      className={`py-1 rounded-md text-xs font-medium transition-colors ${
                        responseMode === 'detailed'
                          ? 'bg-[#d4a84f] text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Detailed
                    </button>
                  </div>
                </div>

                {onOpenTelemetry && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenTelemetry();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-800/60 flex items-center gap-2.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Backend &amp; Gemini Settings</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportChat}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-800/60 flex items-center gap-2.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export Conversation</span>
                </button>

                {onClearHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onClearHistory();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs text-rose-300 hover:bg-rose-950/30 flex items-center gap-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Conversation</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local History Search Bar */}
      {showSearch && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search local conversation history..."
            aria-label="Filter local conversation history"
            className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4a84f]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="min-h-[38px] px-2.5 rounded-xl bg-[#121826] border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Actionable Gateway Banner when needed */}
      {showGatewayBanner && (
        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-950/35 border border-amber-500/30 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-2">
          <span className="flex-1 min-w-[200px]">
            {connStatus.lastError ||
              `Connection issue (${connStatus.state.toLowerCase().replace(/_/g, ' ')}). Check Backend Settings.`}
          </span>
          {onOpenTelemetry && (
            <button
              type="button"
              onClick={onOpenTelemetry}
              className="px-3 py-1.5 rounded-lg bg-[#d4a84f] text-slate-950 font-medium text-xs shrink-0"
            >
              Open Settings
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
      >
        {visibleMessages.length === 0 && searchQuery.trim() && (
          <p className="text-xs text-slate-400 text-center py-6">
            No local messages matching &ldquo;{searchQuery.trim()}&rdquo;.
          </p>
        )}
        {visibleMessages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[86%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#1a2438] border border-slate-700/70 text-slate-100 rounded-br-sm'
                    : isSystem
                    ? 'bg-rose-950/35 border border-rose-500/30 text-rose-100 rounded-bl-sm'
                    : 'bg-[#121826] border border-slate-800/90 text-slate-100 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content || '...'}</div>

                {isSystem &&
                  (msg.content.includes('SURYA Backend Error') ||
                    msg.content.includes('HTML webpage') ||
                    msg.content.includes('Network connection failed') ||
                    msg.content.includes('not configured') ||
                    msg.content.includes('authentication failed') ||
                    msg.content.includes('Rate limit') ||
                    msg.content.includes('cookie challenge') ||
                    msg.content.includes('timed out')) &&
                  onOpenTelemetry && (
                    <button
                      type="button"
                      onClick={onOpenTelemetry}
                      className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#d4a84f] text-slate-950 text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configure Backend Gateway</span>
                    </button>
                  )}

                {msg.suggestedAction && (
                  <div className="mt-3 p-3 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-100 block truncate">
                        {msg.suggestedAction.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {msg.suggestedAction.riskLevel === 'HIGH' ? 'Requires confirmation · ' : ''}
                        {msg.suggestedAction.intent}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onExecutePlan(msg.suggestedAction!);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-950 flex items-center gap-1 shrink-0"
                      style={{ backgroundColor: primaryCol }}
                    >
                      <span>Run</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-1.5 flex items-center justify-between gap-4 text-[11px] text-slate-500">
                  <span className="tabular-nums">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {msg.role === 'assistant' && msg.content && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        voiceService.speak(msg.content);
                      }}
                      aria-label="Speak reply aloud"
                      className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                      title="Speak aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {messages.length <= 1 && !isProcessing && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onSendMessage(prompt);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#60a5fa]" />
            <span>SURYA is thinking...</span>
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <form onSubmit={handleSubmit} className="pt-2 flex items-center gap-2">
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
            aria-label={voiceState.isListening ? 'Stop voice input' : 'Voice input'}
            className={`min-h-[44px] min-w-[44px] rounded-2xl border flex items-center justify-center transition-colors ${
              voiceState.isListening
                ? 'bg-[#60a5fa] text-slate-950 border-[#60a5fa]'
                : 'bg-[#121826] text-slate-300 border-slate-800 hover:border-slate-700'
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
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-[#121826] border border-slate-700 text-[#d4a84f] flex items-center justify-center"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message SURYA..."
          aria-label="Message SURYA"
          className="flex-1 min-h-[44px] bg-[#121826] border border-slate-800 focus:border-[#d4a84f]/60 rounded-2xl px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          aria-label="Send message"
          className="min-h-[44px] min-w-[44px] px-4 rounded-2xl disabled:opacity-40 text-slate-950 flex items-center justify-center active:scale-95 transition-all"
          style={{ backgroundColor: primaryCol }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
