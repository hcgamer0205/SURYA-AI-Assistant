/**
 * SURYA Personal Productivity Suite & Automation Service
 * Real data engine for Tasks, Notes, Reminders, Calendar Agenda,
 * Study Focus Sessions, Personal Projects, and Trigger-Action Automations.
 */

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

export interface FocusSession {
  id: string;
  subject: string;
  targetMinutes: number;
  completedMinutes: number;
  ambientTone: 'solar-hum' | 'binaural-flow' | 'silence';
  notes: string;
  timestamp: string;
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

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: 'morning_greeting' | 'study_start' | 'at_time' | 'on_wake_word' | 'system_start';
  triggerParam?: string;
  actions: { type: 'open_app' | 'speak_greeting' | 'show_tasks' | 'prepare_study'; target: string }[];
  isEnabled: boolean;
  lastExecuted?: string;
}

const STORAGE_KEYS = {
  TASKS: 'surya_productivity_tasks_v2',
  NOTES: 'surya_productivity_notes_v2',
  REMINDERS: 'surya_productivity_reminders_v2',
  PROJECTS: 'surya_productivity_projects_v2',
  AUTOMATIONS: 'surya_productivity_automations_v2',
};

class ProductivityService {
  private tasks: TaskItem[] = [];
  private notes: NoteItem[] = [];
  private reminders: ReminderItem[] = [];
  private agenda: AgendaEvent[] = [];
  private projects: ProjectItem[] = [];
  private automations: AutomationWorkflow[] = [];

  constructor() {
    this.loadAll();
  }

  private loadAll() {
    if (typeof window === 'undefined') return;
    try {
      // 1. Tasks
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

      // 2. Notes
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

      // 3. Reminders
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

      // 4. Projects
      const savedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (savedProjects) {
        this.projects = JSON.parse(savedProjects);
      } else {
        this.projects = [
          {
            id: 'proj_1',
            title: 'SURYA Next-Gen Assistant Launch',
            description: 'Full personal AI ecosystem for Android with voice-first UI and multi-agent intelligence.',
            progressPercent: 92,
            status: 'active',
            milestones: [
              { id: 'm1', title: 'Dynamic UI Theme Engine', done: true },
              { id: 'm2', title: 'Suryadev Radiant Voice', done: true },
              { id: 'm3', title: 'Local Intent Routing (0ms)', done: true },
              { id: 'm4', title: 'Multi-Agent Orchestration', done: true },
            ],
            updatedAt: new Date().toISOString(),
          },
        ];
        this.saveProjects();
      }

      // 5. Automations
      const savedAutomations = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
      if (savedAutomations) {
        this.automations = JSON.parse(savedAutomations);
      } else {
        this.automations = [
          {
            id: 'auto_1',
            name: 'Study Environment Preparation',
            trigger: 'study_start',
            actions: [
              { type: 'open_app', target: 'com.android.chrome' },
              { type: 'prepare_study', target: 'Solar Focus Mode' },
              { type: 'speak_greeting', target: 'Study environment prepared. Distractions minimized.' },
            ],
            isEnabled: true,
          },
          {
            id: 'auto_2',
            name: 'Morning Radiance Briefing',
            trigger: 'morning_greeting',
            actions: [
              { type: 'speak_greeting', target: 'Good morning. All SURYA subsystems are operational.' },
              { type: 'show_tasks', target: 'High priority tasks' },
            ],
            isEnabled: true,
          },
        ];
        this.saveAutomations();
      }

      // 6. Agenda sample
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
    } catch (e) {
      console.warn('[ProductivityService] Load error:', e);
    }
  }

  // --- Task Methods ---
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
    } catch (e) {}
  }

  // --- Note Methods ---
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
    } catch (e) {}
  }

  // --- Reminders ---
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

  private saveReminders() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(this.reminders));
    } catch (e) {}
  }

  // --- Agenda & Projects ---
  public getAgenda(): AgendaEvent[] {
    return [...this.agenda];
  }

  public getProjects(): ProjectItem[] {
    return [...this.projects];
  }

  public getAutomations(): AutomationWorkflow[] {
    return [...this.automations];
  }

  public toggleAutomation(id: string): boolean {
    const auto = this.automations.find((a) => a.id === id);
    if (!auto) return false;
    auto.isEnabled = !auto.isEnabled;
    this.saveAutomations();
    return auto.isEnabled;
  }

  private saveProjects() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
    } catch (e) {}
  }

  private saveAutomations() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(this.automations));
    } catch (e) {}
  }
}

export const productivityService = new ProductivityService();
