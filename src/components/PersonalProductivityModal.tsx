import React, { useState } from 'react';
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
}

export const PersonalProductivityModal: React.FC<PersonalProductivityModalProps> = ({
  onClose,
  initialTab = 'tasks',
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'focus' | 'vault' | 'automations'>(initialTab);

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

  // Stark Automation Engine State
  const [automations, setAutomations] = useState<AutomationWorkflow[]>(productivityService.getAutomations());
  const [autoHistory, setAutoHistory] = useState<AutomationHistoryEntry[]>(productivityService.getAutomationHistory());
  const [autoName, setAutoName] = useState('');
  const [autoTrigger, setAutoTrigger] = useState<AutomationTriggerType>('at_time');
  const [autoActionTarget, setAutoActionTarget] = useState('');
  const [autoRequireApproval, setAutoRequireApproval] = useState(true);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [autoStatusNote, setAutoStatusNote] = useState<string | null>(null);

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
    setAutoStatusNote('New Stark automation routine saved.');
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personal Productivity Suite"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                PRODUCTIVITY, AGENDA &amp; STARK AUTOMATIONS
              </h2>
              <p className="text-[10px] text-slate-400">Tasks, Calendar Agenda, Notes, Focus, Vault &amp; Routines</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            aria-label="Close productivity modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'tasks', label: 'TASKS & AGENDA', icon: CheckSquare },
            { id: 'notes', label: 'NOTES', icon: FileText },
            { id: 'focus', label: 'FOCUS', icon: Clock },
            { id: 'vault', label: 'VAULT', icon: BookOpen },
            { id: 'automations', label: 'AUTOMATIONS', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Agenda Section */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>DAILY AGENDA</span>
                </div>
                <div className="space-y-1.5">
                  {agenda.map((evt) => (
                    <div key={evt.id} className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-200">{evt.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300 tabular-nums">{evt.startTime}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Add agenda event..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                  <button
                    onClick={handleAddEvent}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold"
                  >
                    + EVENT
                  </button>
                </div>
              </div>

              {/* Add Task */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New task description..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pri) => (
                      <button
                        key={pri}
                        onClick={() => setNewTaskPriority(pri)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          newTaskPriority === pri
                            ? pri === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : pri === 'HIGH'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pri}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAddTask}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD TASK</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {tasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isDone ? 'bg-slate-950/40 border-slate-800 opacity-60' : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleTask(t.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <span className={`text-xs font-semibold block ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {t.title}
                          </span>
                          <span className="text-[9px] font-mono text-amber-300">{t.priority}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(t.id)} className="p-1.5 text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Note content..."
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold"
                  >
                    SAVE NOTE
                  </button>
                </div>
              </div>
              {notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{n.title}</span>
                    <button onClick={() => handleDeleteNote(n.id)} className="p-1 text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'focus' && (
            <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
              <div className="w-44 h-44 rounded-full border-4 border-amber-500/40 flex flex-col items-center justify-center bg-slate-950/80">
                <span className="text-3xl font-mono font-bold text-amber-300 tabular-nums">
                  {Math.floor(focusSeconds / 60).toString().padStart(2, '0')}:
                  {(focusSeconds % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                  {isFocusRunning ? 'FLOW ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFocusTimer}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-2"
                >
                  {isFocusRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isFocusRunning ? 'PAUSE SESSION' : 'START FOCUS'}</span>
                </button>
                <button
                  onClick={resetFocusTimer}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold"
                >
                  RESET
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => handleVaultSearch(e.target.value)}
                  placeholder="Search research vault, architecture docs, topics..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-mono text-amber-300 font-bold block uppercase">
                  Grounded Q&amp;A over Personal Vault
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vaultQuestion}
                    onChange={(e) => setVaultQuestion(e.target.value)}
                    placeholder="Ask a question about your saved docs..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  />
                  <button
                    onClick={handleVaultQuery}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold"
                  >
                    ASK
                  </button>
                </div>
                {vaultAnswer && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 mt-2 space-y-1">
                    <p>{vaultAnswer.answer}</p>
                    <div className="text-[9px] font-mono text-amber-400">Sources: {vaultAnswer.sources.join(', ')}</div>
                  </div>
                )}
              </div>

              {vaultDocs.map((doc) => (
                <div key={doc.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{doc.title}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400">
                      {doc.topic}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{doc.summary}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'automations' && (
            <div className="space-y-4">
              {/* New Automation Builder */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-amber-300 block uppercase">
                  CREATE STARK AUTOMATION ROUTINE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={autoName}
                    onChange={(e) => setAutoName(e.target.value)}
                    placeholder="Routine name (e.g. Evening Wrap-up)"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  />
                  <select
                    value={autoTrigger}
                    onChange={(e) => setAutoTrigger(e.target.value as AutomationTriggerType)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  >
                    <option value="at_time">Time Trigger (Scheduled)</option>
                    <option value="morning_greeting">Morning Briefing</option>
                    <option value="study_start">Study Start</option>
                    <option value="on_wake_word">Wake Word Event</option>
                    <option value="battery_low">Low Battery Condition</option>
                    <option value="offline_mode">Offline Network Event</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={autoActionTarget}
                    onChange={(e) => setAutoActionTarget(e.target.value)}
                    placeholder="Action notification/task text..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoRequireApproval}
                      onChange={(e) => setAutoRequireApproval(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Require Approval
                  </label>
                  <button
                    onClick={handleCreateAutomation}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold"
                  >
                    + CREATE
                  </button>
                </div>
              </div>

              {autoStatusNote && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between gap-2">
                  <span>{autoStatusNote}</span>
                  {pendingApprovalId && (
                    <button
                      onClick={() => handleRunAutomation(pendingApprovalId, true)}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>APPROVE &amp; RUN</span>
                    </button>
                  )}
                </div>
              )}

              {/* Workflows */}
              <div className="space-y-2.5">
                {automations.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{a.name}</span>
                        <span className="text-[10px] font-mono text-amber-400">
                          Trigger: {a.trigger} {a.requiresApproval ? '· Approval Gate' : ''}
                          {a.isPaused ? ' · PAUSED' : ''}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Steps: {a.actions.map((act) => `${act.type} (${act.target})`).join(' → ')}
                        </p>
                      </div>
                      <button
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
                        onClick={() => handleRunAutomation(a.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-mono font-bold flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>RUN</span>
                      </button>
                      <button
                        onClick={() => {
                          productivityService.pauseAutomation(a.id);
                          setAutomations(productivityService.getAutomations());
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        <span>{a.isPaused ? 'RESUME' : 'PAUSE'}</span>
                      </button>
                      <button
                        onClick={() => {
                          productivityService.toggleAutomation(a.id);
                          setAutomations(productivityService.getAutomations());
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                          a.isEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {a.isEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution History */}
              {autoHistory.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
                    <History className="w-3.5 h-3.5 text-cyan-400" />
                    <span>EXECUTION HISTORY</span>
                  </div>
                  {autoHistory.slice(0, 5).map((h) => (
                    <div key={h.id} className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-200">{h.automationName}</span>
                        <span className="text-slate-400 block truncate">{h.details}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 uppercase shrink-0">{h.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
