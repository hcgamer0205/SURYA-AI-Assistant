import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  FileCode,
  Database,
  Atom,
  Activity,
  Mic,
  ExternalLink,
  X,
  ArrowLeft,
} from 'lucide-react';
import { TabType, ChatMessage, StarkApp, StarkActionPlan, ResponseMode } from './types/surya';
import { HolographicCore } from './components/HolographicCore';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { StarkCommandCenter } from './components/StarkCommandCenter';
import { SuryaCommandCenter } from './components/SuryaCommandCenter';
import { SuryaVisionHUD } from './components/SuryaVisionHUD';
import { AppCreatorWorkspace } from './components/AppCreatorWorkspace';
import { MoreWorkspace } from './components/MoreWorkspace';
import { StarkAppLinkHub } from './components/StarkAppLinkHub';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { ThemePreviewBanner } from './components/ThemePreviewBanner';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { PersonalProductivityModal } from './components/PersonalProductivityModal';
import { MultiAgentModal } from './components/MultiAgentModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { VeronicaSecurityModal } from './components/VeronicaSecurityModal';
import { WorldModelDashboard } from './components/WorldModelDashboard';
import { SystemHealthDashboard, SettingsSectionId } from './components/SystemHealthDashboard';
import { ScientificKnowledge } from './components/ScientificKnowledge';
import { SelfImprovementReport } from './components/SelfImprovementReport';
import { Navigation } from './components/Navigation';

import { voiceService } from './services/voiceService';
import { soundFx } from './services/soundFx';
import { apiService, ConnectionStatusSnapshot } from './services/apiService';
import { uiThemeEngine } from './services/uiThemeEngine';
import { voiceProfileManager } from './services/voiceProfileManager';
import { wakeWordService } from './services/wakeWordService';
import { deviceBridgeService } from './services/deviceBridgeService';
import { suryaOrchestrator } from './services/suryaOrchestrator';
import { productivityService } from './services/productivityService';
import { intelligenceRouter } from './services/intelligenceRouter';
import { SuryaThemeConfig } from './types/suryaTheme';

const CHAT_STORAGE_KEY = 'surya_chat_history_v1';

const WELCOME_MESSAGE = (): ChatMessage => ({
  id: 'init_1',
  role: 'assistant',
  content:
    'SURYA ready. Ask a question, issue a voice command, manage tasks, or switch between Cloud Gemini and On-Device Offline AI anytime.',
  timestamp: new Date().toISOString(),
  model: 'SURYA Command Core',
});

function loadPersistedMessages(): ChatMessage[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return [WELCOME_MESSAGE()];
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('core');
  const [soundMuted, setSoundMuted] = useState(false);
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [systemSubTab, setSystemSubTab] = useState<'health' | 'world' | 'science' | 'improve'>('health');
  const [systemOpenSection, setSystemOpenSection] = useState<SettingsSectionId | null>(null);
  const [currentTheme, setCurrentTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(uiThemeEngine.isPreviewActive());
  const [activeModel, setActiveModel] = useState('gemini-4-hydrogen');
  const [connStatus, setConnStatus] = useState<ConnectionStatusSnapshot>(() =>
    apiService.getConnectionStatus()
  );
  const [routerStatus, setRouterStatus] = useState(() => intelligenceRouter.getEffectiveStatus());

  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('surya_response_mode');
      if (saved === 'detailed' || saved === 'concise') return saved;
    }
    return 'concise';
  });

  // Modals state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showProductivityModal, setShowProductivityModal] = useState(false);
  const [productivityInitialTab, setProductivityInitialTab] = useState<
    'tasks' | 'notes' | 'focus' | 'vault' | 'automations'
  >('tasks');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Non-blocking toast banner
  const [appBanner, setAppBanner] = useState<{
    message: string;
    linkUrl?: string;
    linkLabel?: string;
    tone?: 'info' | 'warn';
  } | null>(null);

  // Persistent Chat Thread
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadPersistedMessages());
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Veronica Modal Interception State
  const [veronicaTargetApp, setVeronicaTargetApp] = useState<{
    app: StarkApp;
    onAuthorized: () => void;
  } | null>(null);

  // Latest state refs for async callbacks
  const soundMutedRef = useRef(soundMuted);
  soundMutedRef.current = soundMuted;
  const activeModelRef = useRef(activeModel);
  activeModelRef.current = activeModel;
  const responseModeRef = useRef(responseMode);
  responseModeRef.current = responseMode;
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const lastInputWasVoiceRef = useRef(false);

  // Persist local chat history cleanly
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100)));
      } catch {}
    }
  }, [messages]);

  const handleChangeResponseMode = useCallback((mode: ResponseMode) => {
    setResponseMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('surya_response_mode', mode);
    }
  }, []);

  const processInput = useCallback(async (rawText: string, fromVoice: boolean) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    lastInputWasVoiceRef.current = fromVoice;
    soundFx.playClick();

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: `user_${now}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const assistantId = `surya_${now + 1}`;
    const placeholderMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      model: activeModelRef.current,
    };

    const historySnapshot = [...messagesRef.current];
    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    setIsProcessingChat(true);

    try {
      const outcome = await suryaOrchestrator.handleInput(trimmed, {
        activeTab: currentTabRef.current,
        model: activeModelRef.current,
        responseMode: responseModeRef.current,
        language: voiceProfileManager.getSettings().language || 'auto',
        history: historySnapshot,
        onNavigateTab: (tab) => setCurrentTab(tab),
        onStopSpeaking: () => {
          lastInputWasVoiceRef.current = false;
          voiceService.stopSpeaking();
        },
        onStreamChunk: (partialText) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: partialText } : m))
          );
        },
        onSpeak: (text) => {
          if (!soundMutedRef.current && text.trim()) {
            voiceService.speak(text, () => {
              const ww = wakeWordService.getState();
              if (
                lastInputWasVoiceRef.current &&
                ww.isActive &&
                ww.continuousConversation &&
                !voiceService.getState().isListening
              ) {
                lastInputWasVoiceRef.current = false;
                voiceService.startListening((followUp) => {
                  processInput(followUp, true);
                });
              }
            });
          }
        },
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: outcome.responseText || 'Operation completed.',
                model: outcome.model,
                ttftMs: outcome.ttftMs ?? outcome.latencyMs,
              }
            : m
        )
      );

      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                role: 'system',
                content: `SURYA Notice: ${err?.message || 'Communication error.'}`,
              }
            : m
        )
      );
    } finally {
      setIsProcessingChat(false);
    }
  }, []);

  const handleTranscript = useCallback(
    (transcript: string) => {
      processInput(transcript, true);
    },
    [processInput]
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      processInput(text, false);
    },
    [processInput]
  );

  const handleSendQuickCommand = useCallback(
    (text: string) => {
      setCurrentTab('chat');
      processInput(text, false);
    },
    [processInput]
  );

  const handleClearHistory = useCallback(() => {
    soundFx.playClick();
    voiceService.stopSpeaking();
    const fresh = [WELCOME_MESSAGE()];
    setMessages(fresh);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(CHAT_STORAGE_KEY);
      } catch {}
    }
  }, []);

  // Subscriptions + offline reminder ticker
  useEffect(() => {
    const unsubVoice = voiceService.subscribe((state) => {
      setVoiceState(state);
    });

    const unsubTheme = uiThemeEngine.subscribe((theme, isPreview) => {
      setCurrentTheme(theme);
      setIsPreviewActive(isPreview);
    });

    const unsubConn = apiService.subscribeConnectionState(setConnStatus);
    const unsubRouter = intelligenceRouter.subscribe(setRouterStatus);

    wakeWordService.setOnWakeWord(() => {
      soundFx.playAuthorize();
      voiceService.startListening((transcript) => {
        processInput(transcript, true);
      });
    });

    const unsubDeepAction = deviceBridgeService.onDeepAction((tab, action) => {
      setCurrentTab(tab);
      if (action === 'voice') {
        voiceService.startListening((transcript) => {
          processInput(transcript, true);
        });
      }
    });

    const handleExternalFallback = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      if (detail.message || detail.url) {
        setAppBanner({
          message: detail.message || 'Android native bridge unavailable in web preview.',
          linkUrl: detail.url,
          linkLabel: 'OPEN WEB FALLBACK',
          tone: 'info',
        });
      }
    };

    window.addEventListener('suryaExternalFallback', handleExternalFallback);

    // Offline local reminder watcher
    productivityService.checkDueReminders();
    const reminderTicker = setInterval(() => {
      productivityService.checkDueReminders();
    }, 30000);

    return () => {
      unsubVoice();
      unsubTheme();
      unsubConn();
      unsubRouter();
      unsubDeepAction();
      window.removeEventListener('suryaExternalFallback', handleExternalFallback);
      clearInterval(reminderTicker);
    };
  }, [processInput]);

  // Execute Action Plan with Veronica Guard
  const handleExecutePlan = (plan: StarkActionPlan) => {
    if (plan.riskLevel === 'HIGH') {
      const mockApp: StarkApp = {
        id: plan.actionId,
        name: plan.name,
        package: plan.package || 'com.surya.assistant',
        scheme: plan.intent,
        action: plan.intent,
        category: 'Security',
        icon: 'ShieldAlert',
        description: `Intent ${plan.intent}`,
        riskLevel: 'HIGH',
      };

      setVeronicaTargetApp({
        app: mockApp,
        onAuthorized: async () => {
          setVeronicaTargetApp(null);
          const sentLocal = deviceBridgeService.launchApp(mockApp.package, mockApp.action);
          if (!sentLocal) {
            await apiService.launchStarkApp(mockApp.id, plan.param, 'challenge_auth', 'token_auth');
          }
          soundFx.playAuthorize();
        },
      });
      return;
    }

    const sentLocal = plan.package ? deviceBridgeService.launchApp(plan.package, plan.intent) : false;
    if (sentLocal) {
      soundFx.playAuthorize();
      return;
    }

    apiService
      .launchStarkApp(plan.actionId, plan.param)
      .then(() => soundFx.playAuthorize())
      .catch((err) => {
        soundFx.playAbort();
        setAppBanner({
          message: `Action dispatch warning: ${err?.message || 'Unable to execute intent'}`,
          tone: 'warn',
        });
      });
  };

  const toggleSound = () => {
    const nextState = !soundMuted;
    setSoundMuted(nextState);
    soundFx.setSoundEnabled(!nextState);
    if (nextState) {
      lastInputWasVoiceRef.current = false;
      voiceService.stopSpeaking();
    }
  };

  const primaryCol = currentTheme.palette.primary || '#d4a84f';
  const isChildWorkspace =
    currentTab === 'productivity' ||
    currentTab === 'studio' ||
    currentTab === 'system' ||
    currentTab === 'hub';

  const headerStatusText =
    routerStatus.activePath === 'on-device-llm'
      ? `On-device · ${routerStatus.activeLocalModelName}`
      : routerStatus.mode === 'offline'
      ? 'Offline mode'
      : connStatus.state === 'CONNECTED'
      ? 'Connected'
      : connStatus.state === 'CONNECTING'
      ? 'Connecting'
      : 'Offline';

  const headerStatusDot =
    routerStatus.activePath === 'on-device-llm'
      ? 'bg-[#60a5fa]'
      : routerStatus.mode === 'offline'
      ? 'bg-[#d4a84f]'
      : connStatus.state === 'CONNECTED'
      ? 'bg-emerald-400'
      : connStatus.state === 'CONNECTING'
      ? 'bg-amber-400'
      : 'bg-slate-500';

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-300 selection:bg-amber-500/30"
      style={{
        backgroundColor: currentTheme.palette.background,
        color: currentTheme.palette.textPrimary,
      }}
    >
      {/* Clean Top Bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-md border-b border-slate-800/80 pt-safe"
        style={{ backgroundColor: `${currentTheme.palette.surface}f2` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isChildWorkspace && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setCurrentTab('more');
              }}
              aria-label="Back to More"
              className="min-h-[34px] min-w-[34px] rounded-xl bg-[#0b0f17] border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 leading-tight">
              SURYA
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${headerStatusDot}`} />
              <span className="truncate max-w-[180px]">{headerStatusText}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setShowVoiceModal(true);
            }}
            aria-label="Voice settings"
            className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0b0f17] border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-[#d4a84f]" />
            <span className="truncate max-w-[78px]">
              {voiceProfileManager.getActiveProfile().name.split(' ')[0]}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="min-h-[36px] min-w-[36px] rounded-xl bg-[#0b0f17] border border-slate-800 text-slate-300 hover:text-[#d4a84f] flex items-center justify-center transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#d4a84f]" />}
          </button>
        </div>
      </header>

      {/* Non-blocking System Banner */}
      {appBanner && (
        <div className="mx-auto w-full max-w-2xl px-4 pt-2">
          <div
            className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              appBanner.tone === 'warn'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-[#121826] border-slate-800 text-slate-200'
            }`}
          >
            <span className="flex-1">{appBanner.message}</span>
            {appBanner.linkUrl && (
              <a
                href={appBanner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#60a5fa] text-slate-950 font-semibold text-xs flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{appBanner.linkLabel || 'OPEN'}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setAppBanner(null)}
              aria-label="Dismiss notification"
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isPreviewActive && (
        <ThemePreviewBanner
          previewTheme={currentTheme}
          onOpenCustomizer={() => setShowThemeModal(true)}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'core' && (
          <div className="flex flex-col items-center">
            <HolographicCore
              isListening={voiceState.isListening}
              isSpeaking={voiceState.isSpeaking}
              statusText={
                voiceState.isSpeaking
                  ? 'Speaking'
                  : voiceState.isListening
                  ? 'Listening'
                  : routerStatus.activePath === 'on-device-llm'
                  ? 'On-Device'
                  : routerStatus.mode === 'offline'
                  ? 'Offline'
                  : 'Ready'
              }
              audioLevel={voiceState.audioLevel}
              onCoreTap={() => {
                if (voiceState.isListening) {
                  voiceService.stopListening();
                } else if (voiceState.isSpeaking) {
                  voiceService.interruptAndListen(handleTranscript);
                } else {
                  voiceService.startListening(handleTranscript);
                }
              }}
            />

            <VoiceVisualizer onTranscriptCaptured={handleTranscript} />

            <SuryaCommandCenter
              activeModel={activeModel}
              responseMode={responseMode}
              onChangeResponseMode={handleChangeResponseMode}
              onSendQuickCommand={handleSendQuickCommand}
              onNavigateTab={(tab) => {
                if (tab === 'system') {
                  setSystemSubTab('health');
                  setSystemOpenSection(null);
                }
                setCurrentTab(tab);
              }}
              onOpenVoiceModal={() => setShowVoiceModal(true)}
              onOpenThemeModal={() => setShowThemeModal(true)}
              onOpenProductivityModal={(initialTab) => {
                setProductivityInitialTab(initialTab || 'tasks');
                setCurrentTab('productivity');
              }}
              onOpenAgentModal={() => setShowAgentModal(true)}
              onOpenModelModal={() => setShowModelModal(true)}
            />
          </div>
        )}

        {currentTab === 'chat' && (
          <StarkCommandCenter
            messages={messages}
            onSendMessage={handleSendMessage}
            onVoiceCapture={handleTranscript}
            onClearHistory={handleClearHistory}
            onExecutePlan={handleExecutePlan}
            isProcessing={isProcessingChat}
            activeModel={activeModel}
            responseMode={responseMode}
            onChangeResponseMode={handleChangeResponseMode}
            onOpenModelModal={() => setShowModelModal(true)}
            onOpenTelemetry={() => {
              setSystemSubTab('health');
              setSystemOpenSection('backend');
              setCurrentTab('system');
            }}
          />
        )}

        {currentTab === 'optics' && <SuryaVisionHUD />}

        {currentTab === 'more' && (
          <MoreWorkspace
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenProductivity={(initialTab) => {
              setProductivityInitialTab(initialTab);
              setCurrentTab('productivity');
            }}
            onOpenSystemSection={(subTab) => {
              setSystemSubTab(subTab);
              setSystemOpenSection(null);
              setCurrentTab('system');
            }}
            onOpenOfflineAI={() => {
              setSystemSubTab('health');
              setSystemOpenSection('offline');
              setCurrentTab('system');
            }}
            onOpenAgents={() => setShowAgentModal(true)}
            onOpenVoiceModal={() => setShowVoiceModal(true)}
            onOpenThemeModal={() => setShowThemeModal(true)}
          />
        )}

        {currentTab === 'productivity' && (
          <PersonalProductivityModal
            variant="page"
            onClose={() => setCurrentTab('more')}
            initialTab={productivityInitialTab}
          />
        )}

        {currentTab === 'studio' && <AppCreatorWorkspace />}

        {currentTab === 'hub' && (
          <StarkAppLinkHub
            onRequestVeronicaAuth={(app, onAuthorized) => {
              setVeronicaTargetApp({ app, onAuthorized });
            }}
          />
        )}

        {currentTab === 'system' && (
          <div className="space-y-3 pb-24">
            <div className="max-w-2xl mx-auto px-4 pt-3">
              <div className="flex items-center gap-1 p-1 bg-[#121826] rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('health');
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    systemSubTab === 'health'
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('world');
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    systemSubTab === 'world'
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Memory</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('science');
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    systemSubTab === 'science'
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Atom className="w-3.5 h-3.5" />
                  <span>Science</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('improve');
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    systemSubTab === 'improve'
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Audit</span>
                </button>
              </div>
            </div>

            {systemSubTab === 'health' && (
              <SystemHealthDashboard
                initialOpenSection={systemOpenSection}
                onOpenVoiceModal={() => setShowVoiceModal(true)}
                onOpenThemeModal={() => setShowThemeModal(true)}
                onOpenMemory={() => setSystemSubTab('world')}
                onOpenAudit={() => setSystemSubTab('improve')}
              />
            )}
            {systemSubTab === 'world' && <WorldModelDashboard />}
            {systemSubTab === 'science' && <ScientificKnowledge />}
            {systemSubTab === 'improve' && <SelfImprovementReport />}
          </div>
        )}
      </main>

      {/* Modals */}
      {showThemeModal && <ThemeCustomizerModal onClose={() => setShowThemeModal(false)} />}
      {showVoiceModal && <VoiceSettingsModal onClose={() => setShowVoiceModal(false)} />}
      {showProductivityModal && (
        <PersonalProductivityModal
          onClose={() => setShowProductivityModal(false)}
          initialTab={productivityInitialTab}
        />
      )}
      {showAgentModal && <MultiAgentModal onClose={() => setShowAgentModal(false)} />}
      {showModelModal && (
        <ModelSelectorModal
          onClose={() => setShowModelModal(false)}
          activeModel={activeModel}
          onSelectModel={(id) => setActiveModel(id)}
          onOpenOfflineStore={() => {
            setSystemSubTab('health');
            setSystemOpenSection('offline');
            setCurrentTab('system');
          }}
        />
      )}

      {/* Veronica Security Interception Modal */}
      {veronicaTargetApp && (
        <VeronicaSecurityModal
          app={veronicaTargetApp.app}
          onAuthorized={veronicaTargetApp.onAuthorized}
          onAbort={() => setVeronicaTargetApp(null)}
        />
      )}

      {/* Fixed 4-Tab Bottom Navigation */}
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}
