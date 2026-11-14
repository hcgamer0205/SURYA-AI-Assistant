import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Shield,
  FileCode,
  Database,
  Atom,
  Activity,
  Sliders,
  Mic,
  ExternalLink,
  X,
} from 'lucide-react';
import { TabType, ChatMessage, StarkApp, StarkActionPlan, ResponseMode } from './types/surya';
import { HolographicCore } from './components/HolographicCore';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { StarkCommandCenter } from './components/StarkCommandCenter';
import { SuryaCommandCenter } from './components/SuryaCommandCenter';
import { SuryaVisionHUD } from './components/SuryaVisionHUD';
import { AppCreatorWorkspace } from './components/AppCreatorWorkspace';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { ThemePreviewBanner } from './components/ThemePreviewBanner';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { PersonalProductivityModal } from './components/PersonalProductivityModal';
import { MultiAgentModal } from './components/MultiAgentModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { VeronicaSecurityModal } from './components/VeronicaSecurityModal';
import { WorldModelDashboard } from './components/WorldModelDashboard';
import { SystemHealthDashboard } from './components/SystemHealthDashboard';
import { ScientificKnowledge } from './components/ScientificKnowledge';
import { SelfImprovementReport } from './components/SelfImprovementReport';
import { Navigation } from './components/Navigation';
import { StartupSequence } from './components/StartupSequence';

import { voiceService } from './services/voiceService';
import { soundFx } from './services/soundFx';
import { apiService } from './services/apiService';
import { uiThemeEngine } from './services/uiThemeEngine';
import { voiceProfileManager } from './services/voiceProfileManager';
import { wakeWordService } from './services/wakeWordService';
import { deviceBridgeService } from './services/deviceBridgeService';
import { suryaOrchestrator } from './services/suryaOrchestrator';
import { SuryaThemeConfig } from './types/suryaTheme';

const WELCOME_MESSAGE = (): ChatMessage => ({
  id: 'init_1',
  role: 'assistant',
  content:
    'SURYA intelligence systems synchronized. Android SDK 36 native bridge active. Suryadev — Radiant Command voice profile standing by.',
  timestamp: new Date().toISOString(),
  model: 'SURYA Command Core',
});

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('core');
  const [soundMuted, setSoundMuted] = useState(false);
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [systemSubTab, setSystemSubTab] = useState<'health' | 'world' | 'science' | 'improve'>('health');
  const [currentTheme, setCurrentTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(uiThemeEngine.isPreviewActive());
  const [activeModel, setActiveModel] = useState('gemini-4-hydrogen');
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('surya_response_mode');
      if (saved === 'detailed' || saved === 'concise') return saved;
    }
    return 'concise';
  });
  const [showStartup, setShowStartup] = useState<boolean>(
    () => !uiThemeEngine.getCurrentTheme().accessibility.reducedMotion
  );

  // Modals state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showProductivityModal, setShowProductivityModal] = useState(false);
  const [productivityInitialTab, setProductivityInitialTab] = useState<
    'tasks' | 'notes' | 'focus' | 'vault' | 'automations'
  >('tasks');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Non-blocking toast banner (replaces alert / window.open)
  const [appBanner, setAppBanner] = useState<{
    message: string;
    linkUrl?: string;
    linkLabel?: string;
    tone?: 'info' | 'warn';
  } | null>(null);

  // Chat message thread
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE()]);
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Veronica Modal Interception State
  const [veronicaTargetApp, setVeronicaTargetApp] = useState<{
    app: StarkApp;
    onAuthorized: () => void;
  } | null>(null);

  // Latest state refs for async voice/bridge callbacks
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

      if (outcome.handledLocally) {
        soundFx.playAuthorize();
      } else {
        soundFx.playAuthorize();
      }
    } catch (err: any) {
      soundFx.playAbort();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                role: 'system',
                content: `SURYA Telemetry Alert: ${err?.message || 'Communication error.'}`,
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
    setMessages([WELCOME_MESSAGE()]);
  }, []);

  // Subscriptions: voice, theme, wake-word, native Android deep actions, safe link fallback
  useEffect(() => {
    const unsubVoice = voiceService.subscribe((state) => {
      setVoiceState(state);
    });

    const unsubTheme = uiThemeEngine.subscribe((theme, isPreview) => {
      setCurrentTheme(theme);
      setIsPreviewActive(isPreview);
    });

    wakeWordService.setOnWakeWord((_keyword) => {
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

    return () => {
      unsubVoice();
      unsubTheme();
      unsubDeepAction();
      window.removeEventListener('suryaExternalFallback', handleExternalFallback);
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
          await apiService.launchStarkApp(mockApp.id, plan.param, 'challenge_auth', 'token_auth');
          soundFx.playAuthorize();
        },
      });
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

  const primaryCol = currentTheme.palette.primary;

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col font-sans transition-colors duration-500 selection:bg-amber-500/30"
      style={{
        backgroundColor: currentTheme.palette.background,
        color: currentTheme.palette.textPrimary,
      }}
    >
      {showStartup && (
        <StartupSequence primaryColor={primaryCol} onComplete={() => setShowStartup(false)} />
      )}

      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-md border-b pt-safe"
        style={{
          backgroundColor: `${currentTheme.palette.surface}`,
          borderColor: `${primaryCol}33`,
        }}
      >
        {/* Brand Zone */}
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
            style={{ backgroundColor: primaryCol, boxShadow: `0 0 8px ${primaryCol}` }}
          />
          <h1
            className="text-base font-mono font-bold tracking-wider uppercase"
            style={{ color: primaryCol }}
          >
            SURYA AI
          </h1>
          <span className="text-[10px] font-mono text-slate-400">v2.5</span>
        </div>

        {/* Action Zone */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              setShowVoiceModal(true);
            }}
            aria-label="Voice settings"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono hover:border-amber-400 transition-colors"
          >
            <Mic className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[75px]">
              {voiceProfileManager.getActiveProfile().name.split(' ')[0]}
            </span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setShowThemeModal(true);
            }}
            aria-label="Theme settings"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono text-rose-300">
            <Shield className="w-3 h-3 text-rose-400" />
            <span>VERONICA ON</span>
          </div>

          <button
            onClick={toggleSound}
            aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition-colors"
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </header>

      {/* Non-blocking System / Fallback Banner */}
      {appBanner && (
        <div
          className={`mx-auto w-full max-w-2xl px-4 pt-2`}
        >
          <div
            className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-2 ${
              appBanner.tone === 'warn'
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-200'
            }`}
          >
            <span className="flex-1">{appBanner.message}</span>
            {appBanner.linkUrl && (
              <a
                href={appBanner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{appBanner.linkLabel || 'OPEN'}</span>
              </a>
            )}
            <button
              onClick={() => setAppBanner(null)}
              aria-label="Dismiss notification"
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Live Spoken Theme Preview Notification Banner */}
      {isPreviewActive && (
        <ThemePreviewBanner
          previewTheme={currentTheme}
          onOpenCustomizer={() => setShowThemeModal(true)}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {/* TAB 1: CORE (Unified Stark Command Center + Solar Core & Voice) */}
        {currentTab === 'core' && (
          <div className="flex flex-col items-center">
            <HolographicCore
              isListening={voiceState.isListening}
              isSpeaking={voiceState.isSpeaking}
              statusText={
                voiceState.isSpeaking ? 'SPEAKING' : voiceState.isListening ? 'LISTENING' : 'ONLINE'
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
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenVoiceModal={() => setShowVoiceModal(true)}
              onOpenThemeModal={() => setShowThemeModal(true)}
              onOpenProductivityModal={(initialTab) => {
                setProductivityInitialTab(initialTab || 'tasks');
                setShowProductivityModal(true);
              }}
              onOpenAgentModal={() => setShowAgentModal(true)}
              onOpenModelModal={() => setShowModelModal(true)}
            />
          </div>
        )}

        {/* TAB 2: CHAT (SURYA Tactical Real-Time Streaming Chat) */}
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
              setCurrentTab('system');
              setSystemSubTab('health');
            }}
          />
        )}

        {/* TAB 3: OPTICS (SURYA Vision AR Camera HUD) */}
        {currentTab === 'optics' && <SuryaVisionHUD />}

        {/* TAB 4: PRODUCTIVITY (Agenda, Tasks, Notes, Focus, Vault, Automations) */}
        {currentTab === 'productivity' && (
          <div className="p-4 pb-24">
            <PersonalProductivityModal
              onClose={() => setCurrentTab('core')}
              initialTab={productivityInitialTab}
            />
          </div>
        )}

        {/* TAB 5: STUDIO (App Creator Workspace & GitHub Monitor) */}
        {currentTab === 'studio' && <AppCreatorWorkspace />}

        {/* TAB 6: SYSTEM (Health Diagnostics, World Model Memory, Science, Self-Improvement) */}
        {currentTab === 'system' && (
          <div className="space-y-3 pb-24">
            <div className="max-w-2xl mx-auto px-4 pt-2">
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('health');
                  }}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    systemSubTab === 'health'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>HEALTH</span>
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('world');
                  }}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    systemSubTab === 'world'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>MEMORY</span>
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('science');
                  }}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    systemSubTab === 'science'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Atom className="w-3.5 h-3.5" />
                  <span>SCIENCE</span>
                </button>
                <button
                  onClick={() => {
                    soundFx.playClick();
                    setSystemSubTab('improve');
                  }}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    systemSubTab === 'improve'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>DIAGNOSTICS</span>
                </button>
              </div>
            </div>

            {systemSubTab === 'health' && <SystemHealthDashboard />}
            {systemSubTab === 'world' && <WorldModelDashboard />}
            {systemSubTab === 'science' && <ScientificKnowledge />}
            {systemSubTab === 'improve' && <SelfImprovementReport />}
          </div>
        )}
      </main>

      {/* Floating Modals */}
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

      {/* Fixed Bottom Ergonomic Touch Navigation */}
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}
