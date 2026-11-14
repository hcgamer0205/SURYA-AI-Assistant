/**
 * SURYA Proactive Personal Intelligence Service
 * Synthesizes actionable, honest recommendations from real user tasks, agenda,
 * reminders, battery, connectivity, and Knowledge Vault. Supports configurable
 * suggestion frequency ('off' | 'low' | 'balanced' | 'proactive') and dismissal.
 */

import { TabType } from '../types/surya';
import { deviceBridgeService } from './deviceBridgeService';
import { knowledgeVaultService } from './knowledgeVaultService';
import { productivityService } from './productivityService';

export type ProactiveFrequency = 'off' | 'low' | 'balanced' | 'proactive';

export interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'agenda' | 'task' | 'battery' | 'connectivity' | 'knowledge' | 'briefing';
  priority: 'info' | 'attention' | 'warning';
  actionLabel?: string;
  targetTab?: TabType;
  promptAction?: string;
  timestamp: string;
}

const FREQ_STORAGE_KEY = 'surya_proactive_frequency_v1';

class ProactiveService {
  private frequency: ProactiveFrequency = 'balanced';
  private dismissedIds = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(FREQ_STORAGE_KEY) as ProactiveFrequency | null;
      if (saved && ['off', 'low', 'balanced', 'proactive'].includes(saved)) {
        this.frequency = saved;
      }
    }
  }

  public getFrequency(): ProactiveFrequency {
    return this.frequency;
  }

  public setFrequency(freq: ProactiveFrequency): void {
    this.frequency = freq;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(FREQ_STORAGE_KEY, freq);
    }
  }

  public dismiss(id: string): void {
    this.dismissedIds.add(id);
  }

  public clearDismissals(): void {
    this.dismissedIds.clear();
  }

  public getSuggestions(): ProactiveSuggestion[] {
    if (this.frequency === 'off') {
      return [];
    }

    const suggestions: ProactiveSuggestion[] = [];
    const now = new Date();
    const hour = now.getHours();
    const telemetry = deviceBridgeService.getTelemetry();
    const pendingTasks = productivityService.getTasks().filter((t) => t.status !== 'completed');
    const agenda = productivityService.getAgenda();
    const vaultDocs = knowledgeVaultService.getDocuments();

    // 1. Connectivity Warning
    if (!telemetry.online) {
      suggestions.push({
        id: 'pro_offline',
        title: 'Offline Network Detected',
        description: 'Local Android app shortcuts and Personal World Model remain ready, while Gemini cloud queries wait for reconnection.',
        category: 'connectivity',
        priority: 'warning',
        actionLabel: 'Open System Health',
        targetTab: 'system',
        timestamp: now.toISOString(),
      });
    }

    // 2. Low Battery Advisory
    if (telemetry.batteryLevel !== null && telemetry.batteryLevel <= 25 && !telemetry.isCharging) {
      suggestions.push({
        id: 'pro_battery_low',
        title: `Battery at ${telemetry.batteryLevel}%`,
        description: 'Consider switching Voice to Concise Mode or pausing continuous Hands-Free listening to conserve battery.',
        category: 'battery',
        priority: 'warning',
        actionLabel: 'Open Automations',
        targetTab: 'productivity',
        timestamp: now.toISOString(),
      });
    }

    // 3. Priority Task Follow-up
    const highTasks = pendingTasks.filter((t) => t.priority === 'HIGH' || t.priority === 'CRITICAL');
    if (highTasks.length > 0) {
      suggestions.push({
        id: 'pro_high_task',
        title: `Priority Task Due: ${highTasks[0].title}`,
        description: `${pendingTasks.length} pending task(s) remain in your queue. Ask SURYA to break this down or prepare a focus block.`,
        category: 'task',
        priority: 'attention',
        actionLabel: 'Review Tasks',
        targetTab: 'productivity',
        promptAction: `Prepare a step-by-step action plan for "${highTasks[0].title}"`,
        timestamp: now.toISOString(),
      });
    } else if (pendingTasks.length > 0) {
      suggestions.push({
        id: 'pro_pending_task',
        title: `${pendingTasks.length} Pending Task(s)`,
        description: `Next item: "${pendingTasks[0].title}".`,
        category: 'task',
        priority: 'info',
        actionLabel: 'Open Planner',
        targetTab: 'productivity',
        timestamp: now.toISOString(),
      });
    }

    // 4. Meeting / Agenda Prep
    if (agenda.length > 0) {
      suggestions.push({
        id: 'pro_agenda_prep',
        title: `Next Agenda Block: ${agenda[0].title}`,
        description: `${agenda[0].startTime} – ${agenda[0].endTime} (${agenda[0].location || 'Workspace'}).`,
        category: 'agenda',
        priority: 'info',
        actionLabel: 'Prepare Briefing',
        promptAction: `Prepare concise meeting briefing notes for "${agenda[0].title}"`,
        timestamp: now.toISOString(),
      });
    }

    // 5. Daily Summary / Knowledge Suggestion
    if (hour >= 17 || this.frequency === 'proactive') {
      suggestions.push({
        id: 'pro_daily_summary',
        title: 'Daily Intelligence Summary Ready',
        description: `Generate a concise synthesis across ${pendingTasks.length} active tasks and ${vaultDocs.length} Knowledge Vault entries.`,
        category: 'briefing',
        priority: 'info',
        actionLabel: 'Generate Summary',
        promptAction: 'Give me a concise end-of-day briefing on my tasks, agenda, and system health.',
        timestamp: now.toISOString(),
      });
    }

    if (vaultDocs.length > 0 && this.frequency === 'proactive') {
      suggestions.push({
        id: 'pro_knowledge_tip',
        title: `Knowledge Vault: ${vaultDocs[0].title}`,
        description: vaultDocs[0].summary,
        category: 'knowledge',
        priority: 'info',
        actionLabel: 'Explore Vault',
        promptAction: `Summarize "${vaultDocs[0].title}" from my Knowledge Vault`,
        timestamp: now.toISOString(),
      });
    }

    const filtered = suggestions.filter((s) => !this.dismissedIds.has(s.id));
    if (this.frequency === 'low') return filtered.slice(0, 1);
    if (this.frequency === 'balanced') return filtered.slice(0, 3);
    return filtered;
  }
}

export const proactiveService = new ProactiveService();
