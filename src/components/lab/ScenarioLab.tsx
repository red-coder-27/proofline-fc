import React from 'react';
import { SCENARIO_CATALOG } from '@/lib/scenarios/scenarioCatalog';
import { ScenarioDefinition } from '@/types/scenarios';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  FlaskConical,
  RotateCcw,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { AgentExecutionMessage } from '@/types/agents';

interface ScenarioLabProps {
  currentScenarioId: string;
  onSelectScenario: (scenario: ScenarioDefinition) => void;
  onRunSignaturePhase: (phase: 1 | 2 | 3 | 4) => void;
  signaturePhase: number;
  agentMessages: AgentExecutionMessage[];
  isExecuting: boolean;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({
  currentScenarioId,
  onSelectScenario,
  onRunSignaturePhase,
  signaturePhase,
  agentMessages,
  isExecuting,
}) => {
  const selectedScenario =
    SCENARIO_CATALOG.find((s) => s.id === currentScenarioId) || SCENARIO_CATALOG[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-5 w-5 text-emerald-800" />
              <h2 className="text-base font-bold text-slate-900">Scenario Lab & Multi-Agent Testbed</h2>
            </div>
            <p className="text-xs text-slate-600">
              Execute 6 deterministic synthetic scenarios to test causal guardrails, missing telemetry, contradictory events, and agent recovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Seed:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800 font-bold">
              {selectedScenario.defaultSeed} (PRNG Deterministic)
            </span>
          </div>
        </div>
      </div>

      {/* Signature Demo Interactive Stepper (Section 11) */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-400 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded">
                Signature Feature Demo
              </span>
              <h3 className="text-sm font-bold text-white">
                Contradiction and Claim Supersession Lifecycle
              </h3>
            </div>
            <p className="text-xs text-emerald-200">
              Watch the multi-agent system detect a collapse, verify it, encounter contradictory recovery data, and supersede the stale claim.
            </p>
          </div>

          {/* Stepper Phase Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRunSignaturePhase(2)}
              disabled={isExecuting}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                signaturePhase === 2
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              Phase 1 & 2: Detect & Verify
            </button>

            <button
              onClick={() => onRunSignaturePhase(4)}
              disabled={isExecuting}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                signaturePhase === 4
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              <span>Phase 3 & 4: Inject Contradiction</span>
            </button>

            <button
              onClick={() => onRunSignaturePhase(1)}
              disabled={isExecuting}
              className="p-1.5 rounded-lg text-xs bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 transition-colors cursor-pointer"
              title="Reset Signature Demo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phase State Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div
            className={`p-3 rounded-lg border transition-all ${
              signaturePhase >= 1
                ? 'bg-emerald-900/50 border-emerald-600 text-emerald-100'
                : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
            }`}
          >
            <div className="font-bold text-[11px] text-amber-300">Phase 1: Detect</div>
            <p className="mt-1 text-[11px] leading-snug">
              Titans passing drops from 84% to 58%; Munich press surges to 2.87/min.
            </p>
          </div>

          <div
            className={`p-3 rounded-lg border transition-all ${
              signaturePhase >= 2
                ? 'bg-emerald-900/50 border-emerald-600 text-emerald-100'
                : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
            }`}
          >
            <div className="font-bold text-[11px] text-amber-300">Phase 2: Verify & Qualify</div>
            <p className="mt-1 text-[11px] leading-snug">
              Auditor catches causal word &ldquo;caused&rdquo;; rewrites to verified correlation.
            </p>
          </div>

          <div
            className={`p-3 rounded-lg border transition-all ${
              signaturePhase >= 3
                ? 'bg-emerald-900/50 border-emerald-600 text-emerald-100'
                : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
            }`}
          >
            <div className="font-bold text-[11px] text-amber-300">Phase 3: Contradiction</div>
            <p className="mt-1 text-[11px] leading-snug">
              Minute 31-45: Passing rebounds to 75%+ under sustained press.
            </p>
          </div>

          <div
            className={`p-3 rounded-lg border transition-all ${
              signaturePhase >= 4
                ? 'bg-emerald-900/50 border-emerald-600 text-emerald-100'
                : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
            }`}
          >
            <div className="font-bold text-[11px] text-amber-300">Phase 4: Supersede</div>
            <p className="mt-1 text-[11px] leading-snug">
              Truthline marks old claim SUPERSEDED; broadcast updates to tactical adaptation.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Catalog Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          6 Reproducible Synthetic Scenarios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIO_CATALOG.map((sc) => {
            const isSelected = selectedScenario.id === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => onSelectScenario(sc)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-xs text-slate-900">{sc.name}</span>
                  <StatusBadge status={sc.expectedOutcome.expectedVerdict} size="sm" />
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 mb-2.5">
                  {sc.shortDescription}
                </p>
                <div className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded font-medium">
                  Rule: {sc.expectedOutcome.reasoningRule}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Agent Execution Message Trace (Live observable handoffs) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-800" />
            <h3 className="text-sm font-bold text-slate-900">
              Live Multi-Agent Handoff & Decision Trace ({agentMessages.length} steps)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Orchestrator: Analyst → Auditor (Revision Loop) → Producer
          </span>
        </div>

        {agentMessages.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">
            No agent handoffs executed yet. Advance the simulation or select a scenario above.
          </p>
        ) : (
          <div className="space-y-3">
            {agentMessages.map((msg) => {
              const isAnalyst = msg.sender === 'match_state_analyst';
              const isAuditor = msg.sender === 'evidence_auditor';

              return (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    isAnalyst
                      ? 'bg-blue-50/50 border-blue-200'
                      : isAuditor
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        Step #{msg.stepIndex}
                      </span>
                      <span
                        className={`font-semibold capitalize ${
                          isAnalyst ? 'text-blue-900' : isAuditor ? 'text-amber-900' : 'text-emerald-900'
                        }`}
                      >
                        {msg.sender.replace(/_/g, ' ')} → {msg.receiver.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-mono">{msg.latencyMs}ms</span>
                    </div>
                  </div>

                  <div className="font-semibold text-slate-900 text-xs">
                    {msg.action}: {msg.summary}
                  </div>

                  {/* Message Payload Snapshot */}
                  <div className="bg-white/80 border border-slate-200/70 p-2 rounded text-[10px] font-mono text-slate-700 overflow-x-auto max-h-24">
                    {JSON.stringify(msg.payload, null, 2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
