import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Shield, Sparkles, RefreshCw } from 'lucide-react';
import { WorldModelMemory } from '../types/surya';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const WorldModelDashboard: React.FC = () => {
  const [memories, setMemories] = useState<WorldModelMemory[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<WorldModelMemory['category']>('preference');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getMemories();
      setMemories(data.memories);
    } catch (e) {
      console.warn('Failed to load memories:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newValue) return;
    soundFx.playClick();
    try {
      await apiService.addMemory(newKey, newValue, newCategory);
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
      soundFx.playAuthorize();
      loadMemories();
    } catch (err) {
      soundFx.playAbort();
    }
  };

  const handleDelete = async (id: string) => {
    soundFx.playClick();
    try {
      await apiService.deleteMemory(id);
      loadMemories();
    } catch (e) {
      soundFx.playAbort();
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Purge all Personal World Model records? This action cannot be undone.')) return;
    soundFx.playAbort();
    try {
      await apiService.clearAllMemories();
      loadMemories();
    } catch (e) {
      // Ignored
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            PERSONAL WORLD MODEL
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMemories}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200"
            title="Refresh Memories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
            {memories.length} ACTIVE MEMORIES
          </span>
        </div>
      </div>

      {/* Privacy Notice Card */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          World Model memories are completely transparent, user-controlled, and persistent.
          Zero passwords, tokens, or private secrets are ever stored in memory.
        </p>
      </div>

      {/* Add Memory Accordion / Button */}
      {!isAdding ? (
        <button
          onClick={() => {
            soundFx.playClick();
            setIsAdding(true);
          }}
          className="min-h-[44px] w-full py-2.5 px-4 rounded-xl border border-dashed border-cyan-500/40 text-cyan-400 text-xs font-mono font-medium flex items-center justify-center gap-2 hover:bg-cyan-500/10 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>INJECT CONTEXT / PREFERENCE MEMORY</span>
        </button>
      ) : (
        <form
          onSubmit={handleAddMemory}
          className="p-4 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
              NEW MEMORY RECORD
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              CANCEL
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                CATEGORY
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="preference">User Preference</option>
                <option value="context">System Context</option>
                <option value="fact">Personal Fact</option>
                <option value="directive">AI Directive</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                MEMORY KEY
              </label>
              <input
                type="text"
                placeholder="e.g. coffee_order, wake_time"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">
              VALUE / CONTEXT
            </label>
            <input
              type="text"
              placeholder="e.g. Double espresso with oat milk at 08:00 AM"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase transition-all active:scale-98"
          >
            COMMIT TO WORLD MODEL
          </button>
        </form>
      )}

      {/* Memory Entries List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1">
        {memories.map((m) => (
          <div
            key={m.id}
            className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {m.category}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                  {m.key}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">{m.value}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                <span>Confidence: {Math.round(m.confidence * 100)}%</span>
                <span>·</span>
                <span>Updated: {new Date(m.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(m.id)}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Delete memory"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {memories.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No memories stored. Teach SURYA your preferences and context above.
          </div>
        )}
      </div>

      {/* Wipe Action */}
      {memories.length > 0 && (
        <div className="pt-2">
          <button
            onClick={handleClearAll}
            className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>PURGE ALL WORLD MODEL MEMORIES</span>
          </button>
        </div>
      )}
    </div>
  );
};
