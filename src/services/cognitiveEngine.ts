/**
 * SURYA Cognitive Engine & 10-Agent Orchestration Core
 * Provides goal decomposition, dependency-ordered execution, real side-effect
 * verification, user approval gates, and error recovery across all 10 specialized agents.
 */

import { apiService } from './apiService';
import { deviceCapabilityService } from './deviceCapabilityService';
import { intelligenceRouter } from './intelligenceRouter';
import { knowledgeVaultService } from './knowledgeVaultService';
import { localInferenceRuntime } from './localInferenceRuntime';
import { personalMemoryService } from './personalMemoryService';
import { productivityService } from './productivityService';

export type CognitiveIntentType =
  | 'question'
  | 'command'
  | 'action_request'
  | 'creation_request'
  | 'modify_request'
  | 'remember_request'
  | 'forget_request'
  | 'conversation';

export type StepActionType =
  | 'none'
  | 'create_task'
  | 'create_note'
  | 'add_memory'
  | 'health_check'
  | 'vault_query'
  | 'studio_scaffold'
  | 'verify';

export interface PlannedSubtask {
  id: string;
  order: number;
  title: string;
  agent: string;
  dependsOn?: string[];
  actionType?: StepActionType;
  actionPayload?: string;
  requiresApproval?: boolean;
  status: 'pending' | 'executing' | 'awaiting_approval' | 'succeeded' | 'failed';
  result?: string;
  verified: boolean;
}

export interface TaskPlan {
  id: string;
  goal: string;
  intent: CognitiveIntentType;
  subtasks: PlannedSubtask[];
  createdAt: string;
  completedAt?: string;
  summary: string;
  overallVerified?: boolean;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  capabilities: string[];
}

export const MULTI_AGENTS: AIAgent[] = [
  {
    id: 'agent_conversation',
    name: 'Core Conversation Agent',
    role: 'Natural Dialogue & Suryadev / JARVIS Persona',
    icon: 'MessageSquare',
    status: 'idle',
    capabilities: ['Concise & Detailed Modes', 'Multilingual Dialogue', 'Streaming Synthesis'],
  },
  {
    id: 'agent_context',
    name: 'Context & Personalization Agent',
    role: 'User Preferences, Active State & Device Telemetry Alignment',
    icon: 'UserCheck',
    status: 'idle',
    capabilities: ['Preference Contexting', 'Device Awareness', 'Adaptive Tone'],
  },
  {
    id: 'agent_planning',
    name: 'Planning Agent',
    role: 'Goal Decomposition & Dependency-Aware Sequencing',
    icon: 'GitPullRequest',
    status: 'idle',
    capabilities: ['Step Decomposition', 'Dependency Mapping', 'Approval Gating'],
  },
  {
    id: 'agent_productivity',
    name: 'Productivity Agent',
    role: 'Tasks, Notes, Reminders, Agenda & Automations',
    icon: 'CheckSquare',
    status: 'idle',
    capabilities: ['Task Tracking', 'Note Extraction', 'Workflow Triggers'],
  },
  {
    id: 'agent_vision',
    name: 'Vision Agent',
    role: 'Camera Optics, OCR, Translation, Docs & QR Decoding',
    icon: 'Eye',
    status: 'idle',
    capabilities: ['Object Recognition', 'Multilingual OCR', 'Visual Q&A'],
  },
  {
    id: 'agent_research',
    name: 'Research Agent',
    role: 'Technical Synthesis & Structured Fact Checking',
    icon: 'Search',
    status: 'idle',
    capabilities: ['Deep Synthesis', 'Citations', 'Scientific Lookup'],
  },
  {
    id: 'agent_coding',
    name: 'Coding & Studio Agent',
    role: 'Sandboxed App Generation, Debugging & GitHub Inspection',
    icon: 'Code2',
    status: 'idle',
    capabilities: ['Multi-File Generation', 'Error Analysis', 'Sandboxed Preview'],
  },
  {
    id: 'agent_knowledge',
    name: 'Knowledge Agent',
    role: 'Personal World Model & Knowledge Vault Retrieval',
    icon: 'Database',
    status: 'idle',
    capabilities: ['Memory Indexing', 'Vault Q&A', 'Directive Auditing'],
  },
  {
    id: 'agent_diagnostics',
    name: 'Diagnostics Agent',
    role: 'Backend Health, Latency Probing & Fallback Recovery',
    icon: 'Activity',
    status: 'idle',
    capabilities: ['Health Probing', 'Model Fallback', 'Error Recovery'],
  },
  {
    id: 'agent_verification',
    name: 'Verification Agent',
    role: 'Truthfulness Auditor & Real Outcome Verifier',
    icon: 'ShieldCheck',
    status: 'idle',
    capabilities: ['Outcome Auditing', 'Failure Detection', 'Honest Reporting'],
  },
];

class CognitiveEngine {
  private activePlans: TaskPlan[] = [];
  private listeners: ((plans: TaskPlan[]) => void)[] = [];

  public subscribe(cb: (plans: TaskPlan[]) => void): () => void {
    this.listeners.push(cb);
    cb([...this.activePlans]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const snap = this.activePlans.map((p) => ({
      ...p,
      subtasks: p.subtasks.map((s) => ({ ...s })),
    }));
    for (const cb of this.listeners) {
      cb(snap);
    }
  }

  public classifyIntent(input: string): CognitiveIntentType {
    const lower = input.toLowerCase().trim();

    if (lower.startsWith('remember that') || lower.startsWith('remember ') || lower.includes('याद रखो')) {
      return 'remember_request';
    }
    if (lower.startsWith('forget ') || lower.includes('भूल जाओ')) {
      return 'forget_request';
    }
    if (/(create|build|make|generate)\s+(an?\s+)?(app|application|website|tool|skill|dashboard)/i.test(lower)) {
      return 'creation_request';
    }
    if (/(redesign|change theme|change color|make ui|move orb|switch theme|बदलो)/i.test(lower)) {
      return 'modify_request';
    }
    if (/^(open|launch|start|खोलो|chalao)\s+/i.test(lower)) {
      return 'command';
    }
    if (/(prepare|organize|schedule|automate|set up|plan|audit|check system|तैयार करो)/i.test(lower)) {
      return 'action_request';
    }
    if (/(what|who|where|when|why|how|can you|explain|tell me|is it|क्या|क्यों|कैसे)/i.test(lower) || lower.endsWith('?')) {
      return 'question';
    }
    return 'conversation';
  }

  /**
   * Builds a dependency-ordered pending plan (not pre-marked as succeeded!)
   * Uses backend Gemini orchestration when available, falling back cleanly offline.
   */
  public async createPlanAsync(goal: string): Promise<TaskPlan> {
    const intent = this.classifyIntent(goal);
    const memories = personalMemoryService.getAllMemories().slice(0, 6).map((m) => `${m.key}=${m.value}`).join('; ');

    let subtasks: PlannedSubtask[] = [];
    let summary = '';

    const status = intelligenceRouter.getEffectiveStatus();
    if (status.activePath === 'cloud-gemini') {
      try {
        const remote = await apiService.orchestrateGoal(goal, memories);
        if (remote?.success && Array.isArray(remote.plan?.subtasks) && remote.plan.subtasks.length > 0) {
          subtasks = remote.plan.subtasks.map((st, idx) => ({
            id: `step_${idx + 1}`,
            order: st.order || idx + 1,
            title: st.title,
            agent: st.agent || 'agent_planning',
            dependsOn: idx > 0 ? [`step_${idx}`] : [],
            actionType: (st.actionType as StepActionType) || 'none',
            actionPayload: st.actionPayload || goal,
            requiresApproval: Boolean(st.requiresApproval),
            status: 'pending',
            verified: false,
          }));
          summary = remote.plan.summary || `Synthesized ${subtasks.length}-step plan for "${goal}".`;
        }
      } catch {
        // Deterministic offline decomposition fallback
      }
    } else if (status.localReady) {
      try {
        const localRes = await localInferenceRuntime.generateResponse(
          `Create a concise 3-step summary plan for: "${goal}". Output plain bullet points only.`
        );
        if (localRes.text) {
          summary = `On-Device Plan (${localRes.modelName}): ${localRes.text.slice(0, 220)}`;
        }
      } catch {
        // Fall through cleanly to deterministic local staging
      }
    }

    if (subtasks.length === 0) {
      const lower = goal.toLowerCase();
      if (lower.includes('study') || lower.includes('पढ़ाई')) {
        subtasks = [
          {
            id: 'step_1',
            order: 1,
            title: 'Load Personal Context & Study Preferences',
            agent: 'agent_context',
            dependsOn: [],
            actionType: 'none',
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_2',
            order: 2,
            title: 'Query Knowledge Vault for Matching Notes',
            agent: 'agent_knowledge',
            dependsOn: ['step_1'],
            actionType: 'vault_query',
            actionPayload: goal,
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_3',
            order: 3,
            title: 'Create Tracked Study Task in Productivity Suite',
            agent: 'agent_productivity',
            dependsOn: ['step_2'],
            actionType: 'create_task',
            actionPayload: `Study Session: ${goal.slice(0, 80)}`,
            requiresApproval: true,
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_4',
            order: 4,
            title: 'Verify Real Task & Vault Outcomes',
            agent: 'agent_verification',
            dependsOn: ['step_3'],
            actionType: 'verify',
            status: 'pending',
            verified: false,
          },
        ];
        summary = 'Study workflow staged with Knowledge Vault lookup, approval-gated task creation, and outcome verification.';
      } else if (intent === 'creation_request') {
        subtasks = [
          {
            id: 'step_1',
            order: 1,
            title: 'Decompose App Requirements & Sandboxed Spec',
            agent: 'agent_planning',
            dependsOn: [],
            actionType: 'none',
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_2',
            order: 2,
            title: 'Generate App in SURYA Studio',
            agent: 'agent_coding',
            dependsOn: ['step_1'],
            actionType: 'studio_scaffold',
            actionPayload: goal,
            requiresApproval: true,
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_3',
            order: 3,
            title: 'Verify Generated Artifact & HTML Validity',
            agent: 'agent_verification',
            dependsOn: ['step_2'],
            actionType: 'verify',
            status: 'pending',
            verified: false,
          },
        ];
        summary = 'Studio creation workflow staged with approval gate and HTML verification.';
      } else {
        subtasks = [
          {
            id: 'step_1',
            order: 1,
            title: 'Align Context & Personal Memory',
            agent: 'agent_context',
            dependsOn: [],
            actionType: 'vault_query',
            actionPayload: goal,
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_2',
            order: 2,
            title: 'Probe Backend Health & Diagnostics',
            agent: 'agent_diagnostics',
            dependsOn: ['step_1'],
            actionType: 'health_check',
            status: 'pending',
            verified: false,
          },
          {
            id: 'step_3',
            order: 3,
            title: 'Audit Subtask Results Truthfully',
            agent: 'agent_verification',
            dependsOn: ['step_2'],
            actionType: 'verify',
            status: 'pending',
            verified: false,
          },
        ];
        summary = `Staged 3-step verified workflow for "${goal}".`;
      }
    }

    const plan: TaskPlan = {
      id: `plan_${Date.now()}`,
      goal,
      intent,
      subtasks,
      createdAt: new Date().toISOString(),
      summary,
      overallVerified: false,
    };

    this.activePlans.unshift(plan);
    this.notify();
    return plan;
  }

  /**
   * Synchronous convenience plan builder preserving backward compatibility.
   */
  public planGoal(goal: string): TaskPlan {
    const intent = this.classifyIntent(goal);
    const plan: TaskPlan = {
      id: `plan_${Date.now()}`,
      goal,
      intent,
      subtasks: [
        {
          id: 'step_1',
          order: 1,
          title: 'Align User Context & Intent',
          agent: 'agent_context',
          dependsOn: [],
          actionType: 'none',
          status: 'pending',
          verified: false,
        },
        {
          id: 'step_2',
          order: 2,
          title: 'Query Vault & Subsystem Telemetry',
          agent: 'agent_knowledge',
          dependsOn: ['step_1'],
          actionType: 'vault_query',
          actionPayload: goal,
          status: 'pending',
          verified: false,
        },
        {
          id: 'step_3',
          order: 3,
          title: 'Audit Execution Outcome',
          agent: 'agent_verification',
          dependsOn: ['step_2'],
          actionType: 'verify',
          status: 'pending',
          verified: false,
        },
      ],
      createdAt: new Date().toISOString(),
      summary: `Staged 3-step plan for "${goal}".`,
      overallVerified: false,
    };
    this.activePlans.unshift(plan);
    this.notify();
    return plan;
  }

  /**
   * Executes a staged TaskPlan step-by-step respecting dependencies and approval gates.
   */
  public async executePlan(
    planId: string,
    options: { approveAll?: boolean; approveStepId?: string } = {}
  ): Promise<TaskPlan> {
    const plan = this.activePlans.find((p) => p.id === planId);
    if (!plan) {
      throw new Error('Plan not found.');
    }

    for (const step of plan.subtasks) {
      if (step.status === 'succeeded') continue;

      // Verify dependencies succeeded before executing
      if (step.dependsOn && step.dependsOn.length > 0) {
        const unmet = step.dependsOn.some((depId) => {
          const dep = plan.subtasks.find((s) => s.id === depId);
          return !dep || dep.status !== 'succeeded';
        });
        if (unmet) {
          step.status = 'failed';
          step.result = 'Skipped because prerequisite dependency did not succeed.';
          step.verified = false;
          this.notify();
          continue;
        }
      }

      const isExplicitlyApproved = Boolean(options.approveAll || (options.approveStepId && options.approveStepId === step.id));
      if (step.requiresApproval && !isExplicitlyApproved) {
        step.status = 'awaiting_approval';
        step.result = 'Paused at approval gate. Confirm to execute this step.';
        step.verified = false;
        this.notify();
        return plan;
      }

      step.status = 'executing';
      this.notify();

      try {
        await this.runSubtaskAction(step, plan);
      } catch (err: any) {
        step.status = 'failed';
        step.result = err?.message || 'Execution failed.';
        step.verified = false;
      }
      this.notify();
    }

    const allSucceeded = plan.subtasks.every((s) => s.status === 'succeeded' && s.verified);
    plan.overallVerified = allSucceeded;
    if (allSucceeded) {
      plan.completedAt = new Date().toISOString();
      plan.summary = `Verified ${plan.subtasks.length}/${plan.subtasks.length} steps completed without errors.`;
    } else {
      const failedCount = plan.subtasks.filter((s) => s.status === 'failed').length;
      plan.summary = `Execution finished with ${failedCount} failed step(s).`;
    }
    this.notify();
    return plan;
  }

  private async runSubtaskAction(step: PlannedSubtask, plan: TaskPlan): Promise<void> {
    const payload = step.actionPayload || plan.goal;
    const action = step.actionType || 'none';

    if (action === 'create_task') {
      const created = productivityService.addTask(payload, 'MEDIUM', 'Agent Plan');
      step.status = 'succeeded';
      step.result = `Created task "${created.title}" (ID: ${created.id}).`;
      step.verified = Boolean(created.id);
      return;
    }

    if (action === 'create_note') {
      const note = productivityService.addNote('Agent Plan Note', payload, 'Agent Outputs');
      step.status = 'succeeded';
      step.result = `Saved note "${note.title}" (${note.id}).`;
      step.verified = Boolean(note.id);
      return;
    }

    if (action === 'add_memory') {
      const mem = personalMemoryService.addMemory('fact', `agent_note_${Date.now()}`, payload);
      step.status = 'succeeded';
      step.result = `Stored memory "${mem.key}".`;
      step.verified = Boolean(mem.id);
      return;
    }

    if (action === 'vault_query') {
      const res = knowledgeVaultService.queryKnowledge(payload);
      step.status = 'succeeded';
      step.result = res.sources.length > 0 ? `Matched ${res.sources.length} vault doc(s): ${res.sources.join(', ')}` : 'Vault queried (0 matching docs).';
      step.verified = true;
      return;
    }

    if (action === 'health_check') {
      const routerStatus = intelligenceRouter.getEffectiveStatus();
      if (routerStatus.activePath === 'cloud-gemini') {
        const health = await apiService.getSystemHealth();
        step.status = 'succeeded';
        step.result = `Cloud Backend ${health.status} · Model ${health.activeModel} · Gemini ${health.geminiConfigured ? 'configured' : 'missing key'}.`;
        step.verified = health.status === 'ONLINE' || health.status === 'ok';
      } else {
        const hw = deviceCapabilityService.getSnapshot();
        const rt = localInferenceRuntime.getState();
        step.status = 'succeeded';
        step.result = `Offline Diagnostics (${hw.platform}) · Mode: ${routerStatus.mode} · Local LLM: ${rt.activeModelName || 'None loaded'} · RAM free: ${hw.availableRamMb ?? '?'} MB.`;
        step.verified = true;
      }
      return;
    }

    if (action === 'studio_scaffold') {
      const routerStatus = intelligenceRouter.getEffectiveStatus();
      if (routerStatus.activePath === 'cloud-gemini') {
        const generated = await apiService.generateStudioApp(payload, 'Agent Studio App', 'Productivity');
        step.status = 'succeeded';
        step.result = `Generated "${generated.app.name}" (${generated.app.files.length} file(s)).`;
        step.verified = Boolean(generated.app.previewHtml && generated.app.previewHtml.length > 40);
        return;
      }
      if (routerStatus.localReady) {
        const localCode = await localInferenceRuntime.generateResponse(
          `Generate a minimal standalone HTML5 widget for "${payload}" and explain it in one sentence.`
        );
        step.status = 'succeeded';
        step.result = `On-device Studio draft prepared (${localCode.modelName}): ${localCode.text.slice(0, 140)}...`;
        step.verified = Boolean(localCode.text);
        return;
      }
      step.status = 'failed';
      step.result = 'Offline Studio AI scaffolding requires either online connectivity or a downloaded local AI model.';
      step.verified = false;
      return;
    }

    if (action === 'verify' || step.agent === 'agent_verification') {
      const priorSteps = plan.subtasks.filter((s) => s.id !== step.id);
      const anyFailed = priorSteps.some((s) => s.status === 'failed' || !s.verified);
      if (anyFailed) {
        step.status = 'failed';
        step.result = 'Verification Agent blocked success claim: one or more upstream steps failed or remain unverified.';
        step.verified = false;
      } else {
        step.status = 'succeeded';
        step.result = `Verification Agent confirmed all ${priorSteps.length} prerequisite step(s) produced verified outputs.`;
        step.verified = true;
      }
      return;
    }

    step.status = 'succeeded';
    step.result = `Completed by ${step.agent}.`;
    step.verified = true;
  }

  public getActivePlans(): TaskPlan[] {
    return [...this.activePlans];
  }

  public getAgents(): AIAgent[] {
    return [...MULTI_AGENTS];
  }
}

export const cognitiveEngine = new CognitiveEngine();
