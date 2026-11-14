/**
 * SURYA Unified Intelligence Router Singleton
 * Coordinates Online Cloud Gemini, On-Device Local LLM, and 0ms Local Tools across
 * AUTO / ONLINE / OFFLINE modes with zero silent cloud leakage and honest model attribution.
 */

import { IntelligenceRouter, IntelligenceMode } from './offlineModelRuntimeCore.js';
import { localInferenceRuntime } from './localInferenceRuntime';
import { apiService } from './apiService';
import { deviceBridgeService } from './deviceBridgeService';
import { knowledgeVaultService } from './knowledgeVaultService';
import { personalMemoryService } from './personalMemoryService';
import { productivityService } from './productivityService';

const STORAGE_MODE_KEY = 'surya_intelligence_mode_v1';

function readInitialMode(): IntelligenceMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_MODE_KEY);
    if (saved === 'auto' || saved === 'online' || saved === 'offline') {
      return saved;
    }
  }
  return 'auto';
}

export const intelligenceRouter = new IntelligenceRouter({
  initialMode: readInitialMode(),
  isOnlineCheck: () => {
    const tel = deviceBridgeService.getTelemetry();
    return typeof navigator !== 'undefined' ? navigator.onLine && tel.online !== false : true;
  },
  localRuntime: localInferenceRuntime,
  cloudHandler: async (input: string, context: any) => {
    const res = await apiService.sendChatMessageStream(
      input,
      context.history || [],
      (partial) => {
        context.onStreamChunk?.(partial);
      },
      {
        model: context.model,
        fastMode: context.responseMode === 'concise',
        responseMode: context.responseMode,
        preferredLanguage: context.language,
        userMemories: context.userMemories,
        deviceContext: context.deviceContext,
      }
    );
    return res;
  },
  localToolsHandler: async (input: string) => {
    const lower = input.toLowerCase();
    const vaultHits = knowledgeVaultService.searchDocuments(input).slice(0, 2);
    const vaultSnippet =
      vaultHits.length > 0
        ? vaultHits.map((d) => `${d.title}: ${d.summary}`).join(' | ')
        : '';

    // Deterministic offline answers when user explicitly queries tasks, agenda, memory, or vault
    if (/(list|show|summarize|my)\s+(tasks|agenda|schedule|reminders|day)/i.test(lower)) {
      const pending = productivityService.getTasks().filter((t) => t.status !== 'completed');
      const agenda = productivityService.getAgenda();
      const tasksLine =
        pending.length > 0
          ? pending.slice(0, 5).map((t) => `• ${t.title} (${t.priority})`).join('\n')
          : 'No pending tasks.';
      const agendaLine =
        agenda.length > 0
          ? agenda.slice(0, 3).map((e) => `• ${e.startTime}: ${e.title}`).join('\n')
          : 'No scheduled agenda items.';
      return {
        answeredLocally: true,
        vaultSnippet,
        modelLabel: 'Local Productivity Index',
        latencyMs: 3,
        text: `Here is your local schedule & tasks (${pending.length} open task(s)):\n\nTasks:\n${tasksLine}\n\nAgenda:\n${agendaLine}`,
      };
    }

    if (/(what do you remember|list memories|my memories|personal memory)/i.test(lower)) {
      const mems = personalMemoryService.getAllMemories();
      return {
        answeredLocally: true,
        vaultSnippet,
        modelLabel: 'Personal World Model (Local)',
        latencyMs: 2,
        text:
          mems.length > 0
            ? `Stored local memories (${mems.length}):\n` +
              mems.slice(0, 6).map((m) => `• ${m.key}: ${m.value}`).join('\n')
            : 'Your Personal World Model has no saved entries.',
      };
    }

    if (lower.includes('vault') && vaultHits.length > 0) {
      const qRes = knowledgeVaultService.queryKnowledge(input);
      return {
        answeredLocally: true,
        vaultSnippet,
        modelLabel: 'Knowledge Vault (Local)',
        latencyMs: 3,
        text: `${qRes.answer}\n\nSources: ${qRes.sources.join(', ')}`,
      };
    }

    return {
      answeredLocally: false,
      vaultSnippet,
    };
  },
});

// Persist mode updates and react immediately to OS connectivity / runtime changes
const origSetMode = intelligenceRouter.setMode.bind(intelligenceRouter);
intelligenceRouter.setMode = (mode: IntelligenceMode) => {
  origSetMode(mode);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_MODE_KEY, mode);
    } catch {}
  }
};

localInferenceRuntime.subscribe(() => {
  (intelligenceRouter as any).notify();
});

deviceBridgeService.subscribe(() => {
  (intelligenceRouter as any).notify();
});
