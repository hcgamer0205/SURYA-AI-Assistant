/**
 * SURYA Unified Intelligence Orchestrator
 * Coordinates voice commands, local Android intents (0ms), UI customization,
 * personal long-term memory, Knowledge Vault lookups, multi-agent plans,
 * and streaming Gemini AI conversation into a single cohesive pipeline.
 */

import { ChatMessage, ResponseMode, TabType } from '../types/surya';
import { apiService } from './apiService';
import { deviceBridgeService } from './deviceBridgeService';
import { knowledgeVaultService } from './knowledgeVaultService';
import { personalMemoryService } from './personalMemoryService';
import { productivityService } from './productivityService';
import { voiceCommandParser } from './voiceCommandParser';

export interface OrchestrationCallbacks {
  onStreamChunk?: (partialText: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onStopSpeaking?: () => void;
  onSpeak?: (text: string) => void;
  activeTab: TabType;
  model: string;
  responseMode: ResponseMode;
  language: string;
  history: ChatMessage[];
}

export interface OrchestrationOutcome {
  responseText: string;
  model: string;
  latencyMs: number;
  ttftMs?: number;
  handledLocally: boolean;
  actionSummary?: string;
}

class SuryaOrchestrator {
  public async handleInput(
    rawInput: string,
    callbacks: OrchestrationCallbacks
  ): Promise<OrchestrationOutcome> {
    const startTime = Date.now();
    const clean = rawInput.trim();
    const lower = clean.toLowerCase();

    // 1. Voice & Local Device Commands (0ms local path)
    const parsedVoice = voiceCommandParser.parse(clean);
    if (parsedVoice.handledLocally) {
      if (parsedVoice.category === 'voice_control' && !parsedVoice.spokenResponse) {
        callbacks.onStopSpeaking?.();
      } else if (parsedVoice.spokenResponse) {
        callbacks.onSpeak?.(parsedVoice.spokenResponse);
      }

      return {
        responseText: parsedVoice.spokenResponse || parsedVoice.actionSummary || 'Done.',
        model: parsedVoice.category === 'local_app' ? 'Local Intent Router (0ms)' : 'SURYA Command Core',
        latencyMs: Date.now() - startTime,
        handledLocally: true,
        actionSummary: parsedVoice.actionSummary,
      };
    }

    // 2. Navigation voice shortcuts ("open optics", "open studio", "open tasks", "go home")
    if (/^(open|show|go to)\s+(optics|vision|camera hud)/i.test(lower)) {
      callbacks.onNavigateTab?.('optics');
      const reply = 'Opening SURYA Optics visual workspace.';
      callbacks.onSpeak?.(reply);
      return { responseText: reply, model: 'SURYA Navigator', latencyMs: 5, handledLocally: true };
    }
    if (/^(open|show|go to)\s+(studio|app creator|code)/i.test(lower)) {
      callbacks.onNavigateTab?.('studio');
      const reply = 'Opening SURYA Studio development workspace.';
      callbacks.onSpeak?.(reply);
      return { responseText: reply, model: 'SURYA Navigator', latencyMs: 5, handledLocally: true };
    }
    if (/^(open|show|go to)\s+(planner|tasks|productivity|agenda|automations)/i.test(lower)) {
      callbacks.onNavigateTab?.('productivity');
      const reply = 'Opening Tasks, Agenda, and Stark Automations.';
      callbacks.onSpeak?.(reply);
      return { responseText: reply, model: 'SURYA Navigator', latencyMs: 5, handledLocally: true };
    }

    // 3. Explicit User-Controlled Long-Term Memory Directives
    const rememberMatch = clean.match(/^(?:remember that|remember|याद रखो कि|याद रखो)\s+(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const fact = rememberMatch[1].trim();
      if (personalMemoryService.isEnabled()) {
        const mem = personalMemoryService.addMemory('fact', `user_directive_${Date.now().toString().slice(-4)}`, fact);
        const reply = `Noted in your Personal World Model: "${mem.value}". You can inspect or delete it anytime.`;
        callbacks.onSpeak?.(reply);
        return { responseText: reply, model: 'Personal World Model', latencyMs: Date.now() - startTime, handledLocally: true };
      } else {
        const reply = 'Personal Memory is currently paused. Enable it in the Memory panel if you want me to save facts.';
        callbacks.onSpeak?.(reply);
        return { responseText: reply, model: 'Personal World Model', latencyMs: Date.now() - startTime, handledLocally: true };
      }
    }

    const forgetMatch = clean.match(/^(?:forget|delete memory|भूल जाओ)\s+(.+)/i);
    if (forgetMatch && forgetMatch[1]) {
      const query = forgetMatch[1].trim();
      const matches = personalMemoryService.searchMemories(query);
      if (matches.length > 0) {
        matches.forEach((m) => personalMemoryService.deleteMemory(m.id));
        const reply = `Removed ${matches.length} matching item(s) from your Personal World Model.`;
        callbacks.onSpeak?.(reply);
        return { responseText: reply, model: 'Personal World Model', latencyMs: Date.now() - startTime, handledLocally: true };
      }
    }

    // 4. Quick Add Task ("add task ...", "remind me to ...")
    const addTaskMatch = clean.match(/^(?:add task|create task|remind me to)\s+(.+)/i);
    if (addTaskMatch && addTaskMatch[1]) {
      const title = addTaskMatch[1].trim();
      const task = productivityService.addTask(title, 'MEDIUM', 'Voice');
      const reply = `Added task "${task.title}" to your Productivity Planner.`;
      callbacks.onSpeak?.(reply);
      return { responseText: reply, model: 'Productivity Agent', latencyMs: Date.now() - startTime, handledLocally: true };
    }

    // 5. Gather Real Context & Memories for Cloud Gemini SSE Streaming
    const userMemories = personalMemoryService.isEnabled()
      ? personalMemoryService.getAllMemories().slice(0, 8).map((m) => ({
          key: m.key,
          value: m.value,
          category: m.category,
        }))
      : [];

    const telemetry = deviceBridgeService.getTelemetry();
    const vaultHits = knowledgeVaultService.searchDocuments(clean).slice(0, 2);
    const enrichedMessage =
      vaultHits.length > 0 && lower.includes('vault')
        ? `${clean}\n\n[Relevant Knowledge Vault Excerpt: ${vaultHits.map((d) => `${d.title}: ${d.summary}`).join(' | ')}]`
        : clean;

    const streamRes = await apiService.sendChatMessageStream(
      enrichedMessage,
      callbacks.history,
      (partial) => {
        callbacks.onStreamChunk?.(partial);
      },
      {
        model: callbacks.model,
        fastMode: callbacks.responseMode === 'concise',
        responseMode: callbacks.responseMode,
        preferredLanguage: callbacks.language,
        userMemories,
        deviceContext: {
          batteryLevel: telemetry.batteryLevel,
          online: telemetry.online,
          networkType: telemetry.networkType,
          activeTab: callbacks.activeTab,
        },
      }
    );

    if (streamRes.text) {
      callbacks.onSpeak?.(streamRes.text);
    }

    return {
      responseText: streamRes.text,
      model: streamRes.model || callbacks.model,
      latencyMs: streamRes.latencyMs || Date.now() - startTime,
      ttftMs: streamRes.ttftMs,
      handledLocally: false,
    };
  }
}

export const suryaOrchestrator = new SuryaOrchestrator();
