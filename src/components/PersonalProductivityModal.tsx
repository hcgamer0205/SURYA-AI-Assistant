import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  FileText,
  Clock,
  Zap,
  BookOpen,
  Plus,
  Trash2,
  Check,
  Play,
  Square,
  Search,
  X,
  Calendar,
  Pause,
  History,
  ShieldCheck,
} from 'lucide-react';
import {
  productivityService,
  TaskItem,
  NoteItem,
  AgendaEvent,
  AutomationWorkflow,
  AutomationTriggerType,
  AutomationHistoryEntry,
} from '../services/productivityService';
import { knowledgeVaultService, VaultDocument } from '../services/knowledgeVaultService';
import { voiceService } from '../services/voiceService';
import { soundFx } from '../services/soundFx';

interface PersonalProductivityModalProps {
  onClose: () => void;
  initialTab?: 'tasks' | 'notes' | 'focus' | 'vault' | 'automations';
  variant?: 'modal' | 'page';
}

export const PersonalProductivityModal: React.FC<PersonalProductivityModalProps> = ({
  onClose,
  initialTab = 'tasks',
  variant = 'modal',
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'focus' | 'vault' | 'automations'>(
    initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Tasks & Agenda State
  const [tasks, setTasks] = useState<TaskItem[]>(productivityService.getTasks());
  const [agenda, setAgenda] = useState<AgendaEvent[]>(productivityService.getAgenda());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('MEDIUM');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('04:30 PM');

  // Notes State
  const [notes, setNotes] = useState<NoteItem[]>(productivityService.getNotes());
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Focus Timer State
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusIntervalId, setFocusIntervalId] = useState<any>(null);

  // Knowledge Vault State
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(knowledgeVaultService.getDocuments());
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultQuestion, setVaultQuestion] = useState('');
  const [vaultAnswer, setVaultAnswer] = useState<{ answer: string; sources: string[] } | null>(null);

  // Automation Engine State
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(productivityService.getAutomations());
  const [autoHistory, setAutoHistory] = useState<AutomationHistoryEntry[]>(
    productivityService.getAutomationHistory()
  );
  const [autoName, setAutoName] = useState('');
  const [autoTrigger, setAutoTrigger] = useState<AutomationTriggerType>('at_time');
  const [autoActionTarget, setAutoActionTarget] = useState('');
  const [autoRequireApproval, setAutoRequireApproval] = useState(true);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [autoStatusNote, setAutoStatusNote] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (focusIntervalId) clearInterval(focusIntervalId);
    };
  }, [focusIntervalId]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    soundFx.playClick();
    productivityService.addTask(newTaskTitle.trim(), newTaskPriority);
    setTasks(productivityService.getTasks());
    setNewTaskTitle('');
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return;
    soundFx.playClick();
    productivityService.addAgendaEvent(newEventTitle.trim(), newEventTime, newEventTime);
    setAgenda(productivityService.getAgenda());
    setNewEventTitle('');
  };

  const handleToggleTask = (id: string) => {
    soundFx.playAuthorize();
    productivityService.toggleTask(id);
    setTasks(productivityService.getTasks());
  };

  const handleDeleteTask = (id: string) => {
    soundFx.playClick();
    productivityService.deleteTask(id);
    setTasks(productivityService.getTasks());
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    soundFx.playClick();
    productivityService.addNote(newNoteTitle.trim(), newNoteContent.trim());
    setNotes(productivityService.getNotes());
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleDeleteNote = (id: string) => {
    soundFx.playClick();
    productivityService.deleteNote(id);
    setNotes(productivityService.getNotes());
  };

  const toggleFocusTimer = () => {
    if (isFocusRunning) {
      clearInterval(focusIntervalId);
      setIsFocusRunning(false);
      setFocusIntervalId(null);
    } else {
      soundFx.playAuthorize();
      setIsFocusRunning(true);
      const interval = setInterval(() => {
        setFocusSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsFocusRunning(false);
            soundFx.playAuthorize();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
      setFocusIntervalId(interval);
    }
  };

  const resetFocusTimer = () => {
    clearInterval(focusIntervalId);
    setIsFocusRunning(false);
    setFocusSeconds(25 * 60);
  };

  const handleVaultSearch = (q: string) => {
    setVaultSearch(q);
    setVaultDocs(knowledgeVaultService.searchDocuments(q));
  };

  const handleVaultQuery = () => {
    if (!vaultQuestion.trim()) return;
    soundFx.playAuthorize();
    setVaultAnswer(knowledgeVaultService.queryKnowledge(vaultQuestion.trim()));
  };

  const handleCreateAutomation = () => {
    if (!autoName.trim() || !autoActionTarget.trim()) return;
    soundFx.playAuthorize();
    productivityService.addAutomation({
      name: autoName.trim(),
      trigger: autoTrigger,
      actions: [{ type: 'send_notification', target: autoActionTarget.trim() }],
      requiresApproval: autoRequireApproval,
      isEnabled: true,
      isPaused: false,
    });
    setAutomations(productivityService.getAutomations());
    setAutoName('');
    setAutoActionTarget('');
    setAutoStatusNote('New automation routine saved.');
  };

  const handleRunAutomation = async (id: string, approved = false) => {
    soundFx.playClick();
    const res = await productivityService.executeAutomation(id, {
      approved,
      onSpeak: (text) => voiceService.speak(text),
    });
    setAutoHistory(productivityService.getAutomationHistory());
    setAutomations(productivityService.getAutomations());
    setTasks(productivityService.getTasks());
    if (res.status === 'awaiting_approval') {
      setPendingApprovalId(id);
      setAutoStatusNote(`Approval required before running "${res.automationName}".`);
    } else {
      setPendingApprovalId(null);
      setAutoStatusNote(`${res.automationName}: ${res.status} — ${res.details}`);
      if (res.status === 'completed') soundFx.playAuthorize();
    }
  };

  const content = (
    <div
      className={
        variant === 'modal'
          ? 'w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#121826] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans'
          : 'w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4'
      }
    >
      {/* Header */}
      <div
        className={
          variant === 'modal'
            ? 'flex items-center justify-between px-4 py-3 bg-[#0b0f17] border-b border-slate-800'
            : 'flex items-center justify-between pb-2 border-b border-slate-800/80'
        }
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Tasks &amp; Productivity</h2>
          <p className="text-xs text-slate-400">
            Today&apos;s tasks, reminders, notes, focus timer, and routines
          </p>
        </div>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            aria-label="Close productivity view"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#121826] border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Clean Tabs */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
          variant === 'modal' ? 'px-4 pt-3' : ''
        }`}
      >
        {[
          { id: 'tasks', label: 'Tasks', icon: CheckSquare },
          { id: 'notes', label: 'Notes', icon: FileText },
          { id: 'focus', label: 'Focus', icon: Clock },
          { id: 'vault', label: 'Vault', icon: BookOpen },
          { id: 'automations', label: 'Automations', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#d4a84f] text-slate-950 border-[#d4a84f] font-semibold'
                  : 'bg-[#121826] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className={variant === 'modal' ? 'flex-1 p-4 overflow-y-auto space-y-4' : 'space-y-4'}>
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Quick Task Creation */}
            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <span className="text-xs font-medium text-slate-300 block">Quick Add Task</span>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to get done?"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4a84f]"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setNewTaskPriority(pri)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize ${
                        newTaskPriority === pri
                          ? pri === 'CRITICAL'
                            ? 'bg-rose-500 text-white'
                            : pri === 'HIGH'
                            ? 'bg-[#d4a84f] text-slate-950'
                            : 'bg-[#60a5fa] text-slate-950'
                          : 'bg-[#0b0f17] border border-slate-800 text-slate-400'
                      }`}
                    >
                      {pri.toLowerCase()}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">Today&apos;s Tasks</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {tasks.filter((t) => t.status !== 'completed').length} remaining
                </span>
              </div>
              <div className="space-y-2">
                {tasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isDone
                          ? 'bg-[#0b0f17]/60 border-slate-800/60 opacity-60'
                          : 'bg-[#0b0f17] border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id)}
                          aria-label={`Mark ${t.title} complete`}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <span
                            className={`text-xs font-medium block ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </span>
                          <span className="text-[11px] text-[#d4a84f] capitalize">
                            {t.priority.toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        aria-label={`Delete ${t.title}`}
                        className="p-1.5 text-slate-400 hover:text-rose-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Agenda / Reminders */}
            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#60a5fa]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Upcoming Reminders &amp; Agenda</span>
              </div>
              <div className="space-y-1.5">
                {agenda.map((evt) => (
                  <div
                    key={evt.id}
                    className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-200">{evt.title}</span>
                    <span className="text-xs text-[#60a5fa] tabular-nums">{evt.startTime}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Add reminder or event..."
                  className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100 placeholder-slate-500"
                />
                <input
                  type="text"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  aria-label="Event time"
                  className="w-24 px-2.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs font-mono text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className="px-3.5 py-2 rounded-xl bg-[#60a5fa] text-slate-950 text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-4 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold"
                >
                  Save Note
                </button>
              </div>
            </div>
            {notes.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-100">{n.title}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-6 text-center">
            <div className="w-40 h-40 rounded-full border-2 border-[#d4a84f]/50 flex flex-col items-center justify-center bg-[#0b0f17]">
              <span className="text-3xl font-mono font-semibold text-[#d4a84f] tabular-nums">
                {Math.floor(focusSeconds / 60).toString().padStart(2, '0')}:
                {(focusSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                {isFocusRunning ? 'Focus active' : 'Ready'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleFocusTimer}
                className="min-h-[42px] px-6 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-2"
              >
                {isFocusRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isFocusRunning ? 'Pause' : 'Start Focus'}</span>
              </button>
              <button
                type="button"
                onClick={resetFocusTimer}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0b0f17] border border-slate-700 text-slate-300 text-xs font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => handleVaultSearch(e.target.value)}
                placeholder="Search saved documents and notes..."
                className="w-full min-h-[42px] pl-10 pr-3 py-2 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <span className="text-xs font-medium text-[#d4a84f] block">
                Ask About Your Knowledge Vault
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vaultQuestion}
                  onChange={(e) => setVaultQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleVaultQuery}
                  className="px-4 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold"
                >
                  Ask
                </button>
              </div>
              {vaultAnswer && (
                <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-200 space-y-1">
                  <p>{vaultAnswer.answer}</p>
                  <div className="text-[11px] text-[#d4a84f]">
                    Sources: {vaultAnswer.sources.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {vaultDocs.map((doc) => (
              <div key={doc.id} className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{doc.title}</span>
                  <span className="text-[11px] text-[#d4a84f] shrink-0">{doc.topic}</span>
                </div>
                <p className="text-xs text-slate-300">{doc.summary}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
              <span className="text-xs font-medium text-[#d4a84f] block">Create Automation Routine</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="Routine name"
                  className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
                />
                <select
                  value={autoTrigger}
                  onChange={(e) => setAutoTrigger(e.target.value as AutomationTriggerType)}
                  className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
                >
                  <option value="at_time">Scheduled time</option>
                  <option value="morning_greeting">Morning briefing</option>
                  <option value="study_start">Focus session start</option>
                  <option value="on_wake_word">Wake word event</option>
                  <option value="battery_low">Low battery</option>
                  <option value="offline_mode">Offline mode</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={autoActionTarget}
                  onChange={(e) => setAutoActionTarget(e.target.value)}
                  placeholder="Notification or task text..."
                  className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoRequireApproval}
                    onChange={(e) => setAutoRequireApproval(e.target.checked)}
                    className="accent-[#d4a84f]"
                  />
                  Require approval
                </label>
                <button
                  type="button"
                  onClick={handleCreateAutomation}
                  className="px-3.5 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </div>

            {autoStatusNote && (
              <div className="p-3 rounded-xl bg-[#121826] border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
                <span>{autoStatusNote}</span>
                {pendingApprovalId && (
                  <button
                    type="button"
                    onClick={() => handleRunAutomation(pendingApprovalId, true)}
                    className="px-3 py-1 rounded-lg bg-[#d4a84f] text-slate-950 font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve &amp; Run</span>
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2.5">
              {automations.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-100 block">{a.name}</span>
                      <span className="text-[11px] text-slate-400">
                        Trigger: {a.trigger}
                        {a.requiresApproval ? ' · Approval required' : ''}
                        {a.isPaused ? ' · Paused' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        productivityService.deleteAutomation(a.id);
                        setAutomations(productivityService.getAutomations());
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRunAutomation(a.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Run</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        productivityService.pauseAutomation(a.id);
                        setAutomations(productivityService.getAutomations());
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0b0f17] border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" />
                      <span>{a.isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        productivityService.toggleAutomation(a.id);
                        setAutomations(productivityService.getAutomations());
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        a.isEnabled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-[#0b0f17] text-slate-400 border-slate-800'
                      }`}
                    >
                      {a.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {autoHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Execution History</span>
                </div>
                {autoHistory.slice(0, 5).map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-xl bg-[#121826] border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200">{h.automationName}</span>
                      <span className="text-slate-400 block truncate">{h.details}</span>
                    </div>
                    <span className="text-[11px] text-[#d4a84f] shrink-0">{h.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {variant === 'modal' && (
        <div className="px-4 py-3 bg-[#0b0f17] border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );

  if (variant === 'page') {
    return content;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tasks and Productivity"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md"
    >
      {content}
    </div>
  );
};
