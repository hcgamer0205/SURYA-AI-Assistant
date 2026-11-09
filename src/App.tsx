import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Shield,
  Radio,
  FileCode,
  Database,
  Atom,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Cpu,
  Mic,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { TabType, ChatMessage, StarkApp, StarkActionPlan } from './types/surya';
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

import { voiceService } from './services/voiceService';
import { soundFx } from './services/soundFx';
import { apiService } from './services/apiService';
import { uiThemeEngine } from './services/uiThemeEngine';
import { voiceProfileManager } from './services/voiceProfileManager';
import { voiceCommandParser } from './services/voiceCommandParser';
import { wakeWordService } from './services/wakeWordService';
import { SuryaThemeConfig } from './types/suryaTheme';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('core');
  const [soundMuted, setSoundMuted] = useState(false);
  const [voiceState, setVoiceState] = useState(voiceService.getState());
  const [systemSubTab, setSystemSubTab] = useState<'health' | 'world' | 'science' | 'improve'>('health');
  const [currentTheme, setCurrentTheme] = useState<SuryaThemeConfig>(uiThemeEngine.getCurrentTheme());
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(uiThemeEngine.isPreviewActive());
  const [activeModel, setActiveModel] = useState('gemini-3.8-flash');

  // Modals state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showProductivityModal, setShowProductivityModal] = useState(false);
  const [productivityInitialTab, setProductivityInitialTab] = useState<'tasks' | 'notes' | 'focus' | 'vault' | 'automations'>('tasks');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  // Chat message thread
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      role: 'assistant',
      content:
        'SURYA intelligence systems synchronized. Android SDK 36 native bridge active. Suryadev — Radiant Command voice profile standing by.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Veronica Modal Interception State
  const [veronicaTargetApp, setVeronicaTargetApp] = useState<{
    app: StarkApp;
    onAuthorized: () => void;
  } | null>(null);

  // Subscriptions to voice, theme, wake word
  useEffect(() => {
    const unsubVoice = voiceService.subscribe((state) => {
      setVoiceState(state);
    });

    const unsubTheme = uiThemeEngine.subscribe((theme, isPreview) => {
      setCurrentTheme(theme);
      setIsPreviewActive(isPreview);
    });

    // Register "Hey SURYA" Wake Word Trigger
    wakeWordService.setOnWakeWord((keyword) => {
      soundFx.playAuthorize();
      voiceService.startListening((transcript) => {
        handleTranscript(transcript);
      });
    });

    return () => {
      unsubVoice();
      unsubTheme();
    };
  }, []);

  // Handle voice transcript captured
  const handleTranscript = async (transcript: string) => {
    if (!transcript) return;
    soundFx.playClick();

    // 1. Intercept with local VoiceCommandParser
    // Guaranteed instant execution for UI redesign, theme preview/apply/undo,
    // voice profiles, language switches, stop speaking, and local Android apps!
    const localAction = voiceCommandParser.parse(transcript);

    if (localAction.handledLocally) {
      // Add user command to messages thread
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: transcript,
        timestamp: new Date().toISOString(),
      };

      // Add local execution confirmation
      const assistantMsg: ChatMessage = {
        id: `surya_${Date.now()}`,
        role: 'assistant',
        content: localAction.spokenResponse || localAction.actionSummary || 'Action completed locally.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      soundFx.playAuthorize();

      if (!soundMuted && localAction.spokenResponse) {
        voiceService.speak(localAction.spokenResponse);
      }
      return;
    }

    // 2. Not a local action — dispatch to Gemini AI model
    await handleSendMessage(transcript);
  };

  // Dispatch message to Gemini
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessingChat(true);

    const startTime = Date.now();

    try {
      const res = await apiService.sendChatMessage(text, messages);
      const latency = Date.now() - startTime;

      const assistantMsg: ChatMessage = {
        id: `surya_${Date.now()}`,
        role: 'assistant',
        content: res.text,
        timestamp: res.timestamp,
        suggestedAction: res.suggestedAction,
        ttftMs: latency,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      soundFx.playAuthorize();

      // Read response aloud via speech synthesis if not muted
      if (!soundMuted) {
        voiceService.speak(res.text);
      }
    } catch (err: any) {
      soundFx.playAbort();
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'system',
          content: `SURYA Telemetry Alert: ${err.message || 'Communication error.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessingChat(false);
    }
  };

  // Execute Action Plan
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

    // Direct dispatch
    apiService
      .launchStarkApp(plan.actionId, plan.param)
      .then(() => soundFx.playAuthorize())
      .catch((err) => {
        soundFx.playAbort();
        alert(err.message);
      });
  };

  const toggleSound = () => {
    const nextState = !soundMuted;
    setSoundMuted(nextState);
    soundFx.setSoundEnabled(!nextState);
    if (nextState) {
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
      {/* Top Bar (Wordmark, Status, Audio, Risk Badge) */}
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
          <span className="text-[10px] font-mono text-slate-400">
            v2.4.0
          </span>
        </div>

        {/* Action Zone */}
        <div className="flex items-center gap-2">
          {/* Quick Voice Settings Trigger */}
          <button
            onClick={() => {
              soundFx.playClick();
              setShowVoiceModal(true);
            }}
            aria-label="Voice settings"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono hover:border-amber-400 transition-colors"
          >
            <Mic className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[75px]">{voiceProfileManager.getActiveProfile().name.split(' ')[0]}</span>
          </button>

          {/* Quick Theme Studio Trigger */}
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

          {/* Veronica Protocol Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono text-rose-300">
            <Shield className="w-3 h-3 text-rose-400" />
            <span>VERONICA ON</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Live Spoken Theme Preview Notification Banner */}
      {isPreviewActive && (
        <ThemePreviewBanner
          previewTheme={currentTheme}
          onOpenCustomizer={() => setShowThemeModal(true)}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {/* TAB 1: CORE (JARVIS Command Center + Solar Core & Voice) */}
        {currentTab === 'core' && (
          <div className="flex flex-col items-center">
            {/* Holographic Solar Coronal Core */}
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
                } else {
                  voiceService.startListening(handleTranscript);
                }
              }}
            />

            {/* Voice Visualizer Waveform */}
            <VoiceVisualizer onTranscriptCaptured={handleTranscript} />

            {/* Full Personal Command Center Dashboard */}
            <SuryaCommandCenter
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

        {/* TAB 2: CHAT (SURYA Tactical Real-Time Chat) */}
        {currentTab === 'chat' && (
          <StarkCommandCenter
            messages={messages}
            onSendMessage={handleSendMessage}
            onExecutePlan={handleExecutePlan}
            isProcessing={isProcessingChat}
            activeModel={activeModel}
            onOpenModelModal={() => setShowModelModal(true)}
          />
        )}

        {/* TAB 3: OPTICS (SURYA Vision AR Camera HUD) */}
        {currentTab === 'optics' && <SuryaVisionHUD />}

        {/* TAB 4: PRODUCTIVITY (Tasks, Notes, Focus, Knowledge Vault, Automations) */}
        {currentTab === 'productivity' && (
          <div className="p-4">
            <PersonalProductivityModal
              onClose={() => setCurrentTab('core')}
              initialTab="tasks"
            />
          </div>
        )}

        {/* TAB 5: STUDIO (App Creator Workspace & Extensibility) */}
        {currentTab === 'studio' && <AppCreatorWorkspace />}

        {/* TAB 6: SYSTEM (Health Diagnostics, World Model Memory, Science, Self-Improvement) */}
        {currentTab === 'system' && (
          <div className="space-y-3 pb-20">
            {/* Sub-navigation Segmented Control */}
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

            {/* Sub-tab view switch */}
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
