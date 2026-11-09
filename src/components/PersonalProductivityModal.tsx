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
  Volume2,
  Calendar,
} from 'lucide-react';
import {
  productivityService,
  TaskItem,
  NoteItem,
  ReminderItem,
} from '../services/productivityService';
import { knowledgeVaultService, VaultDocument } from '../services/knowledgeVaultService';
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

  // Task State
  const [tasks, setTasks] = useState<TaskItem[]>(productivityService.getTasks());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('MEDIUM');

  // Notes State
  const [notes, setNotes] = useState<NoteItem[]>(productivityService.getNotes());
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>(productivityService.getReminders());
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemTime, setNewRemTime] = useState('18:00');

  // Focus Timer State
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusIntervalId, setFocusIntervalId] = useState<any>(null);

  // Knowledge Vault State
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>(knowledgeVaultService.getDocuments());
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultQuestion, setVaultQuestion] = useState('');
  const [vaultAnswer, setVaultAnswer] = useState<{ answer: string; sources: string[] } | null>(null);

  // Automations State
  const [automations, setAutomations] = useState(productivityService.getAutomations());

  // --- Task Handlers ---
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    soundFx.playClick();
    const created = productivityService.addTask(newTaskTitle.trim(), newTaskPriority);
    setTasks(productivityService.getTasks());
    setNewTaskTitle('');
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

  // --- Note Handlers ---
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

  // --- Focus Timer Handlers ---
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

  // --- Knowledge Vault Search & Grounded Q&A ---
  const handleVaultSearch = (q: string) => {
    setVaultSearch(q);
    setVaultDocs(knowledgeVaultService.searchDocuments(q));
  };

  const handleVaultQuery = () => {
    if (!vaultQuestion.trim()) return;
    soundFx.playAuthorize();
    const res = knowledgeVaultService.queryKnowledge(vaultQuestion.trim());
    setVaultAnswer(res);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personal Productivity Suite"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                SURYA PRODUCTIVITY SUITE
              </h2>
              <p className="text-[10px] text-slate-400">Tasks, Notes, Focus Sessions, Knowledge Vault & Automations</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            aria-label="Close productivity modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Sub-Navigation */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: 'tasks', label: 'TASKS', icon: CheckSquare },
            { id: 'notes', label: 'NOTES', icon: FileText },
            { id: 'focus', label: 'FOCUS MODE', icon: Clock },
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

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* TAB 1: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {/* Add Task input */}
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
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1 hover:bg-amber-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD TASK</span>
                  </button>
                </div>
              </div>

              {/* Task list */}
              <div className="space-y-2">
                {tasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isDone
                          ? 'bg-slate-950/40 border-slate-800 opacity-60'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleTask(t.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 hover:border-amber-400'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <span
                            className={`text-xs font-semibold block ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                t.priority === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                            {t.tags.map((tag) => (
                              <span key={tag} className="text-[9px] text-slate-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {/* Add Note box */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Note content..."
                  rows={3}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    SAVE NOTE
                  </button>
                </div>
              </div>

              {/* Note cards */}
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{n.title}</span>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FOCUS MODE */}
          {activeTab === 'focus' && (
            <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  SOLAR FOCUS & STUDY SESSION
                </span>
                <p className="text-xs text-slate-400">
                  Minimizes notifications, plays ambient solar binaural frequency, tracks study progress.
                </p>
              </div>

              {/* Big Timer Display */}
              <div className="w-44 h-44 rounded-full border-4 border-amber-500/40 flex flex-col items-center justify-center bg-slate-950/80 shadow-2xl shadow-amber-500/10">
                <span className="text-3xl font-mono font-bold text-amber-300">
                  {Math.floor(focusSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :
                  {(focusSeconds % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                  {isFocusRunning ? 'FLOW ACTIVE' : 'STANDBY'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFocusTimer}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  {isFocusRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isFocusRunning ? 'PAUSE SESSION' : 'START FOCUS'}</span>
                </button>
                <button
                  onClick={resetFocusTimer}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-all active:scale-95"
                >
                  RESET
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: KNOWLEDGE VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => handleVaultSearch(e.target.value)}
                  placeholder="Search research vault, architecture docs, topics..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Grounded Q&A Query box */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <span className="text-[11px] font-mono text-amber-300 font-bold block uppercase">
                  Grounded Q&A over Personal Vault
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vaultQuestion}
                    onChange={(e) => setVaultQuestion(e.target.value)}
                    placeholder="Ask a question about your saved docs..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleVaultQuery}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    ASK
                  </button>
                </div>
                {vaultAnswer && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 mt-2 space-y-1">
                    <p className="leading-relaxed">{vaultAnswer.answer}</p>
                    <div className="text-[9px] font-mono text-amber-400">
                      Sources: {vaultAnswer.sources.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Docs list */}
              <div className="space-y-2">
                {vaultDocs.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{doc.title}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-700">
                        {doc.topic}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {doc.summary}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      {doc.tags.map((tag) => (
                        <span key={tag} className="text-[9px] font-mono text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AUTOMATIONS */}
          {activeTab === 'automations' && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
                ACTIVE TRIGGER-ACTION AUTOMATIONS
              </span>
              <div className="space-y-2.5">
                {automations.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-100 block mb-1">{a.name}</span>
                      <span className="text-[10px] font-mono text-amber-400 block">
                        Trigger: {a.trigger.replace('_', ' ')}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Actions: {a.actions.map((act) => `${act.type} (${act.target})`).join(' → ')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        productivityService.toggleAutomation(a.id);
                        setAutomations(productivityService.getAutomations());
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                        a.isEnabled
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {a.isEnabled ? 'ENABLED' : 'PAUSED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              if (focusIntervalId) clearInterval(focusIntervalId);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
