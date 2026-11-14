import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
  X,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { cognitiveEngine, MULTI_AGENTS, TaskPlan } from '../services/cognitiveEngine';
import { soundFx } from '../services/soundFx';

interface MultiAgentModalProps {
  onClose: () => void;
}

export const MultiAgentModal: React.FC<MultiAgentModalProps> = ({ onClose }) => {
  const [goalInput, setGoalInput] = useState('');
  const [plans, setPlans] = useState<TaskPlan[]>(cognitiveEngine.getActivePlans());
  const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id || null);
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    const unsub = cognitiveEngine.subscribe((updatedPlans) => {
      setPlans(updatedPlans);
      if (updatedPlans.length > 0 && !activePlanId) {
        setActivePlanId(updatedPlans[0].id);
      }
    });
    return () => unsub();
  }, [activePlanId]);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0] || null;

  const handleDispatchGoal = async (goalText?: string) => {
    const text = goalText || goalInput;
    if (!text.trim() || isPlanning) return;
    soundFx.playClick();
    setIsPlanning(true);
    setGoalInput('');

    try {
      const staged = await cognitiveEngine.createPlanAsync(text.trim());
      setActivePlanId(staged.id);
      await cognitiveEngine.executePlan(staged.id);
      soundFx.playAuthorize();
    } catch {
      soundFx.playAbort();
    } finally {
      setIsPlanning(false);
    }
  };

  const handleApproveStep = async (planId: string, stepId: string) => {
    soundFx.playAuthorize();
    setIsPlanning(true);
    try {
      await cognitiveEngine.executePlan(planId, { approveStepId: stepId });
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multi-Agent Task Planner"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 tracking-wider uppercase">
                10-AGENT ORCHESTRATION & VERIFICATION CORE
              </h2>
              <p className="text-[10px] text-slate-400">
                Dependency-aware decomposition, approval gates & genuine Verification auditing
              </p>
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

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Submit Objective */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              Submit Multi-Agent Objective
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. Organize my study workflow, audit backend health..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleDispatchGoal()}
                disabled={isPlanning}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                {isPlanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                <span>{isPlanning ? 'RUNNING' : 'EXECUTE'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              {[
                'Organize my study environment',
                'Audit backend system diagnostics',
                'Build a minimal timer tool in Studio',
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDispatchGoal(preset)}
                  disabled={isPlanning}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono whitespace-nowrap"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Active Plan Breakdown */}
          {activePlan ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                    PLAN: {activePlan.intent.toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      activePlan.overallVerified
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {activePlan.overallVerified ? 'VERIFIED COMPLETE' : 'IN PROGRESS / GATED'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">&ldquo;{activePlan.goal}&rdquo;</h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">{activePlan.summary}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-400 block uppercase">
                  EXECUTION SEQUENCE ({activePlan.subtasks.length} STEPS)
                </span>
                {activePlan.subtasks.map((step) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      {step.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-200">{step.title}</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono shrink-0">
                          {step.status === 'succeeded' && step.verified && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              VERIFIED
                            </span>
                          )}
                          {step.status === 'executing' && (
                            <span className="text-cyan-300 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              EXECUTING
                            </span>
                          )}
                          {step.status === 'awaiting_approval' && (
                            <span className="text-amber-300 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              NEEDS APPROVAL
                            </span>
                          )}
                          {step.status === 'failed' && (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              FAILED
                            </span>
                          )}
                          {step.status === 'pending' && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-amber-400 block mb-1">
                        Agent: {step.agent.replace('agent_', '').toUpperCase()}
                        {step.dependsOn && step.dependsOn.length > 0 ? ` · Depends on ${step.dependsOn.join(', ')}` : ''}
                      </span>

                      {step.result && (
                        <p className="text-[11px] text-slate-300 leading-relaxed">{step.result}</p>
                      )}

                      {step.status === 'awaiting_approval' && (
                        <button
                          onClick={() => handleApproveStep(activePlan.id, step.id)}
                          disabled={isPlanning}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>APPROVE &amp; CONTINUE</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              Submit an objective above to orchestrate SURYA&apos;s 10 specialized agents.
            </div>
          )}

          {/* 10 Agents Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
              SPECIALIZED 10-AGENT ROSTER
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
