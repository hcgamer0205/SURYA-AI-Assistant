import React, { useState } from 'react';
import {
  Cpu,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { cognitiveEngine, MULTI_AGENTS, TaskPlan } from '../services/cognitiveEngine';
import { soundFx } from '../services/soundFx';

interface MultiAgentModalProps {
  onClose: () => void;
}

export const MultiAgentModal: React.FC<MultiAgentModalProps> = ({ onClose }) => {
  const [goalInput, setGoalInput] = useState('');
  const [plans, setPlans] = useState<TaskPlan[]>(cognitiveEngine.getActivePlans());
  const [activePlan, setActivePlan] = useState<TaskPlan | null>(plans[0] || null);

  const handleDispatchGoal = (goalText?: string) => {
    const text = goalText || goalInput;
    if (!text.trim()) return;
    soundFx.playAuthorize();
    const createdPlan = cognitiveEngine.planGoal(text.trim());
    setPlans(cognitiveEngine.getActivePlans());
    setActivePlan(createdPlan);
    setGoalInput('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Agent Task Planner"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                MULTI-AGENT ORCHESTRATION & TASK PLANNER
              </h2>
              <p className="text-[10px] text-slate-400">Goal decomposition, specialized agent delegation & verification</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Dispatch Goal Input */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              Submit High-Level Objective
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Organize my complete study environment..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleDispatchGoal()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>PLAN</span>
              </button>
            </div>

            {/* Quick Goal Prompts */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              {[
                'Organize study environment',
                'Build a notes app',
                'Audit system telemetry',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDispatchGoal(preset)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono whitespace-nowrap transition-colors"
                >
                  ⚡ {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Active Plan Execution Breakdown */}
          {activePlan ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                    ACTIVE PLAN: {activePlan.intent.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    VERIFIED
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 leading-snug">
                  "{activePlan.goal}"
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activePlan.summary}
                </p>
              </div>

              {/* Step Sequence */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-400 block uppercase">
                  DECOMPOSED TASK EXECUTION SEQUENCE
                </span>
                {activePlan.subtasks.map((step) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step.order}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-200">{step.title}</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>VERIFIED</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 block mb-1">
                        Assigned: {step.agent.replace('agent_', '').toUpperCase()} AGENT
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {step.result}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              Submit an objective above to trigger autonomous multi-agent planning.
            </div>
          )}

          {/* Specialized Agents Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              SPECIALIZED AGENT CAPABILITY ROSTER
            </span>
            <div className="grid grid-cols-2 gap-2">
              {MULTI_AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{agent.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {agent.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
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
