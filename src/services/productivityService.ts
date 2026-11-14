/**
 * SURYA Personal Productivity Suite & Stark Automation Engine
 * Real data engine for Tasks, Notes, Reminders, Calendar Agenda,
 * Personal Projects, and Trigger-Condition-Action Automations with History,
 * Preview/Approval, Pause, and Cancel controls.
 */

import { deviceBridgeService } from './deviceBridgeService';
import { localIntentRouter } from './localIntentRouter';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'in_progress' | 'completed';
  category: string;
  dueDate?: string;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
  createdAt: string;
  completedAt?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  isPinned: boolean;
  isVoiceNote?: boolean;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTime: string;
  isTriggered: boolean;
  category: string;
  repeat?: 'none' | 'daily' | 'weekly';
}

export interface AgendaEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  category: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  status: 'active' | 'completed' | 'on_hold';
  milestones: { id: string; title: string; done: boolean }[];
  updatedAt: string;
}

export type AutomationTriggerType =
  | 'morning_greeting'
  | 'study_start'
  | 'at_time'
  | 'on_wake_word'
  | 'system_start'
  | 'battery_low'
  | 'offline_mode';

export interface AutomationActionStep {
  type: 'open_app' | 'speak_greeting' | 'show_tasks' | 'prepare_study' | 'send_notification' | 'add_task';
  target: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: AutomationTriggerType;
  triggerParam?: string;
  condition?: {
    minBatteryPercent?: number;
    onlyWhenOnline?: boolean;
  };
  actions: AutomationActionStep[];
  requiresApproval?: boolean;
  isEnabled: boolean;
  isPaused?: boolean;
  lastExecuted?: string;
}

export interface AutomationHistoryEntry {
  id: string;
  automationId: string;
  automationName: string;
  status: 'completed' | 'skipped_condition' | 'cancelled' | 'awaiting_approval';
  details: string;
  timestamp: string;
}

const STORAGE_KEYS = {
  TASKS: 'surya_productivity_tasks_v2',
  NOTES: 'surya_productivity_notes_v2',
  REMINDERS: 'surya_productivity_reminders_v2',
  AGENDA: 'surya_productivity_agenda_v2',
  PROJECTS: 'surya_productivity_projects_v2',
  AUTOMATIONS: 'surya_productivity_automations_v2',
  AUTOMATION_HISTORY: 'surya_productivity_auto_history_v2',
};

class ProductivityService {
  private tasks: TaskItem[] = [];
  private notes: NoteItem[] = [];
  private reminders: ReminderItem[] = [];
  private agenda: AgendaEvent[] = [];
  private projects: ProjectItem[] = [];
  private automations: AutomationWorkflow[] = [];
  private automationHistory: AutomationHistoryEntry[] = [];
  private activeRunCancelled = false;

  constructor() {
    this.loadAll();
  }

  private loadAll() {
    if (typeof window === 'undefined') return;
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      } else {
        this.tasks = [
          {
            id: 'task_1',
            title: 'Verify SURYA Voice & Native Intent Dispatch',
            description: 'Ensure local app launches bypass Gemini with zero latency.',
            priority: 'HIGH',
            status: 'completed',
            category: 'Engineering',
            dueDate: 'Today',
            tags: ['Android', 'Voice', 'Optimization'],
            subtasks: [
              { id: 'sub_1', title: 'Local intent router for YouTube', completed: true },
              { id: 'sub_2', title: 'Suryadev Radiant voice profile test', completed: true },
            ],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task_2',
            title: 'Complete Autonomous Study & Research Workflow',
            description: 'Organize research materials for AI architecture review.',
            priority: 'MEDIUM',
            status: 'pending',
            category: 'Research',
            dueDate: 'Tomorrow',
            tags: ['AI', 'Study', 'Architecture'],
            subtasks: [
              { id: 'sub_3', title: 'Knowledge Vault indexing', completed: false },
              { id: 'sub_4', title: 'Task plan generation check', completed: false },
            ],
            createdAt: new Date().toISOString(),
          },
        ];
        this.saveTasks();
      }

      const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (savedNotes) {
        this.notes = JSON.parse(savedNotes);
      } else {
        this.notes = [
          {
            id: 'note_1',
            title: 'SURYA Architectural Principles',
            content:
              '1. Local deterministic execution for Android actions.\n2. Suryadev majestic resonant voice.\n3. Universal UI customization via natural voice.\n4. Zero silent recordings, privacy by design.',
            tags: ['Architecture', 'Core'],
            folder: 'Directives',
            isPinned: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        this.saveNotes();
      }

      const savedReminders = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (savedReminders) {
        this.reminders = JSON.parse(savedReminders);
      } else {
        this.reminders = [
          {
            id: 'rem_1',
            title: 'Evening Daily Telemetry Review',
            dueTime: '19:00',
            isTriggered: false,
            category: 'System',
            repeat: 'daily',
          },
        ];
        this.saveReminders();
      }

      const savedAgenda = localStorage.getItem(STORAGE_KEYS.AGENDA);
      if (savedAgenda) {
        this.agenda = JSON.parse(savedAgenda);
      } else {
        this.agenda = [
          {
            id: 'evt_1',
            title: 'Daily AI Architecture Briefing',
            startTime: '09:00 AM',
            endTime: '09:30 AM',
            location: 'Command Center',
            category: 'Briefing',
          },
          {
            id: 'evt_2',
            title: 'Android Mobile Verification Session',
            startTime: '02:00 PM',
            endTime: '03:00 PM',
            location: 'SURYA Studio Lab',
            category: 'Engineering',
          },
        ];
        this.saveAgenda();
      }

      const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (savedProjects) {
        this.projects = JSON.parse(savedProjects);
      } else {
        this.projects = [
          {
            id: 'proj_1',
            title: 'SURYA Stark Operating Environment',
            description: 'Unified voice-first personal AI ecosystem for Android with optics, multi-agent reasoning, and studio.',
            progressPercent: 92,
            status: 'active',
            milestones: [
              { id: 'm1', title: 'Dynamic UI Theme Engine', done: true },
              { id: 'm2', title: 'Suryadev Radiant Voice', done: true },
              { id: 'm3', title: 'Local Intent Routing (0ms)', done: true },
              { id: 'm4', title: '10-Agent Verification Core', done: true },
            ],
            updatedAt: new Date().toISOString(),
          },
        ];
        this.saveProjects();
      }

      const savedAutomations = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
      if (savedAutomations) {
        this.automations = JSON.parse(savedAutomations);
      } else {
        this.automations = [
          {
            id: 'auto_1',
            name: 'Study Environment Preparation',
            trigger: 'study_start',
            condition: { onlyWhenOnline: true },
            actions: [
              { type: 'prepare_study', target: 'Solar Focus Mode (25 min)' },
              { type: 'add_task', target: 'Review active study research notes' },
              { type: 'speak_greeting', target: 'Study environment prepared. Focus queue active.' },
            ],
            requiresApproval: false,
            isEnabled: true,
            isPaused: false,
          },
          {
            id: 'auto_2',
            name: 'Morning Radiance Briefing',
            trigger: 'morning_greeting',
            triggerParam: '08:00',
            actions: [
              { type: 'show_tasks', target: 'High priority agenda & tasks' },
              { type: 'send_notification', target: 'Morning Command Briefing Ready' },
              { type: 'speak_greeting', target: 'Good morning. All SURYA subsystems are operational.' },
            ],
            requiresApproval: false,
            isEnabled: true,
            isPaused: false,
          },
          {
            id: 'auto_3',
            name: 'Low Battery Power Conservation Alert',
            trigger: 'battery_low',
            condition: { minBatteryPercent: 20 },
            actions: [
              { type: 'send_notification', target: 'Battery below 20%. Consider pausing continuous wake-word listening.' },
            ],
            requiresApproval: true,
            isEnabled: true,
            isPaused: false,
          },
        ];
        this.saveAutomations();
      }

      const savedHistory = localStorage.getItem(STORAGE_KEYS.AUTOMATION_HISTORY);
      if (savedHistory) {
        this.automationHistory = JSON.parse(savedHistory);
      }
    } catch (e) {
      console.warn('[ProductivityService] Load error:', e);
    }
  }

  public getTasks(): TaskItem[] {
    return [...this.tasks];
  }

  public addTask(title: string, priority: TaskItem['priority'] = 'MEDIUM', category = 'General', tags: string[] = []): TaskItem {
    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title,
      priority,
      status: 'pending',
      category,
      tags,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(newTask);
    this.saveTasks();
    return newTask;
  }

  public toggleTask(id: string): TaskItem | null {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.completedAt = task.status === 'completed' ? new Date().toISOString() : undefined;
    this.saveTasks();
    return task;
  }

  public deleteTask(id: string): boolean {
    const len = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    if (this.tasks.length !== len) {
      this.saveTasks();
      return true;
    }
    return false;
  }

  private saveTasks() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks));
    } catch {}
  }

  public getNotes(): NoteItem[] {
    return [...this.notes];
  }

  public addNote(title: string, content: string, folder = 'Quick Notes', tags: string[] = []): NoteItem {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      title,
      content,
      tags,
      folder,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.notes.unshift(newNote);
    this.saveNotes();
    return newNote;
  }

  public deleteNote(id: string): boolean {
    const len = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length !== len) {
      this.saveNotes();
      return true;
    }
    return false;
  }

  private saveNotes() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(this.notes));
    } catch {}
  }

  public getReminders(): ReminderItem[] {
    return [...this.reminders];
  }

  public addReminder(title: string, dueTime: string, category = 'General'): ReminderItem {
    const newRem: ReminderItem = {
      id: `rem_${Date.now()}`,
      title,
      dueTime,
      isTriggered: false,
      category,
    };
    this.reminders.push(newRem);
    this.saveReminders();
    return newRem;
  }

  public deleteReminder(id: string): boolean {
    const len = this.reminders.length;
    this.reminders = this.reminders.filter((r) => r.id !== id);
    if (this.reminders.length !== len) {
      this.saveReminders();
      return true;
    }
    return false;
  }

  private saveReminders() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(this.reminders));
    } catch {}
  }

  public getAgenda(): AgendaEvent[] {
    return [...this.agenda];
  }

  public addAgendaEvent(title: string, startTime: string, endTime: string, location = 'Mobile Workspace', category = 'Schedule'): AgendaEvent {
    const evt: AgendaEvent = {
      id: `evt_${Date.now()}`,
      title,
      startTime,
      endTime,
      location,
      category,
    };
    this.agenda.push(evt);
    this.saveAgenda();
    return evt;
  }

  private saveAgenda() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(this.agenda));
    } catch {}
  }

  public getProjects(): ProjectItem[] {
    return [...this.projects];
  }

  public getAutomations(): AutomationWorkflow[] {
    return [...this.automations];
  }

  public getAutomationHistory(): AutomationHistoryEntry[] {
    return [...this.automationHistory];
  }

  public addAutomation(workflow: Omit<AutomationWorkflow, 'id'>): AutomationWorkflow {
    const created: AutomationWorkflow = {
      ...workflow,
      id: `auto_${Date.now()}`,
    };
    this.automations.unshift(created);
    this.saveAutomations();
    return created;
  }

  public toggleAutomation(id: string): boolean {
    const auto = this.automations.find((a) => a.id === id);
    if (!auto) return false;
    auto.isEnabled = !auto.isEnabled;
    this.saveAutomations();
    return auto.isEnabled;
  }

  public pauseAutomation(id: string): boolean {
    const auto = this.automations.find((a) => a.id === id);
    if (!auto) return false;
    auto.isPaused = !auto.isPaused;
    this.saveAutomations();
    return Boolean(auto.isPaused);
  }

  public deleteAutomation(id: string): boolean {
    const len = this.automations.length;
    this.automations = this.automations.filter((a) => a.id !== id);
    if (this.automations.length !== len) {
      this.saveAutomations();
      return true;
    }
    return false;
  }

  public cancelActiveExecution(): void {
    this.activeRunCancelled = true;
  }

  public async executeAutomation(
    id: string,
    options: { approved?: boolean; onSpeak?: (text: string) => void } = {}
  ): Promise<AutomationHistoryEntry> {
    const auto = this.automations.find((a) => a.id === id);
    if (!auto) {
      throw new Error('Automation workflow not found.');
    }

    if (auto.isPaused) {
      const entry: AutomationHistoryEntry = {
        id: `hist_${Date.now()}`,
        automationId: auto.id,
        automationName: auto.name,
        status: 'cancelled',
        details: 'Execution skipped because routine is paused.',
        timestamp: new Date().toISOString(),
      };
      this.recordHistory(entry);
      return entry;
    }

    if (auto.requiresApproval && !options.approved) {
      const entry: AutomationHistoryEntry = {
        id: `hist_${Date.now()}`,
        automationId: auto.id,
        automationName: auto.name,
        status: 'awaiting_approval',
        details: 'Routine requires explicit operator confirmation before execution.',
        timestamp: new Date().toISOString(),
      };
      this.recordHistory(entry);
      return entry;
    }

    // Condition check
    const telemetry = deviceBridgeService.getTelemetry();
    if (auto.condition?.onlyWhenOnline && !telemetry.online) {
      const entry: AutomationHistoryEntry = {
        id: `hist_${Date.now()}`,
        automationId: auto.id,
        automationName: auto.name,
        status: 'skipped_condition',
        details: 'Skipped: condition requires active internet connectivity.',
        timestamp: new Date().toISOString(),
      };
      this.recordHistory(entry);
      return entry;
    }

    this.activeRunCancelled = false;
    const executedSteps: string[] = [];

    for (const step of auto.actions) {
      if (this.activeRunCancelled) {
        const cancelledEntry: AutomationHistoryEntry = {
          id: `hist_${Date.now()}`,
          automationId: auto.id,
          automationName: auto.name,
          status: 'cancelled',
          details: `Cancelled after ${executedSteps.length} step(s).`,
          timestamp: new Date().toISOString(),
        };
        this.recordHistory(cancelledEntry);
        return cancelledEntry;
      }

      if (step.type === 'add_task') {
        this.addTask(step.target, 'MEDIUM', 'Automation');
        executedSteps.push(`Added task "${step.target}"`);
      } else if (step.type === 'send_notification') {
        deviceBridgeService.sendNotification(auto.name, step.target);
        executedSteps.push(`Alert: ${step.target}`);
      } else if (step.type === 'speak_greeting' && options.onSpeak) {
        options.onSpeak(step.target);
        executedSteps.push(`Spoke: "${step.target}"`);
      } else if (step.type === 'open_app') {
        const match = localIntentRouter.matchLocalCommand(`open ${step.target}`);
        if (match.isLocal) {
          await localIntentRouter.executeLocalCommand(match);
        }
        executedSteps.push(`Dispatched ${step.target}`);
      } else {
        executedSteps.push(`${step.type}: ${step.target}`);
      }
    }

    auto.lastExecuted = new Date().toISOString();
    this.saveAutomations();

    const completedEntry: AutomationHistoryEntry = {
      id: `hist_${Date.now()}`,
      automationId: auto.id,
      automationName: auto.name,
      status: 'completed',
      details: executedSteps.join(' · '),
      timestamp: new Date().toISOString(),
    };
    this.recordHistory(completedEntry);
    return completedEntry;
  }

  private recordHistory(entry: AutomationHistoryEntry) {
    this.automationHistory.unshift(entry);
    this.automationHistory = this.automationHistory.slice(0, 30);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTOMATION_HISTORY, JSON.stringify(this.automationHistory));
      } catch {}
    }
  }

  private saveProjects() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
    } catch {}
  }

  private saveAutomations() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(this.automations));
    } catch {}
  }
}

export const productivityService = new ProductivityService();
