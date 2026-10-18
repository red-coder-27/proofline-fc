/**
 * Scenario Lab Catalog.
 * 6 reproducible synthetic scenarios covering shifts, correlations,
 * missing data, contradictions, insufficient evidence, and agent recovery.
 */

import { ScenarioDefinition } from '@/types/scenarios';

export const SCENARIO_CATALOG: ScenarioDefinition[] = [
  {
    id: 'contradictory_evidence_later',
    name: 'Contradiction & Correction (Signature Demo)',
    category: 'contradictory_evidence_later',
    title: 'High Press Collapse Followed by Press-Resistant Rebound',
    shortDescription:
      'Demonstrates the signature lifecycle: initial passing collapse is detected and verified, followed by later contradictory evidence where passing rebounds under sustained pressure, triggering supersession.',
    detailedContext:
      'Phase 1 (01-15m): Balanced tactical baseline. Phase 2 (16-30m): Away high-press surge collapses Home passing to ~58%. Phase 3 (31-45m): Away press remains intense (~2.2/min), but Home adjusts tactics with vertical switches, rebounding passing to ~83%. The engine must supersede the initial collapse claim rather than blindly repeating it.',
    expectedOutcome: {
      expectedVerdict: 'accepted',
      shouldSupersedePrevious: true,
      reasoningRule: 'Rebound in passing accuracy contradicts hypothesis of irreversible pressing vulnerability; original claim must be marked superseded.',
    },
    totalMinutes: 45,
    intervals: [
      { startMinute: 1, endMinute: 15, label: "01'-15'" },
      { startMinute: 16, endMinute: 30, label: "16'-30'" },
      { startMinute: 31, endMinute: 45, label: "31'-45'" },
    ],
    defaultSeed: 42,
  },
  {
    id: 'passing_pressure_shift',
    name: 'Tactical Pressure Shift',
    category: 'passing_pressure_shift',
    title: 'Opponent Press Acceleration vs Passing Volume',
    shortDescription:
      'Away team switches from mid-block to aggressive 4-3-3 high pressing, generating a statistically meaningful threshold crossing.',
    detailedContext:
      'Monitors interval-to-interval transitions where pressing actions cross the +40% threshold and home passing success rate drops by >15%, verifying all event IDs and recalculating denominators.',
    expectedOutcome: {
      expectedVerdict: 'accepted',
      shouldSupersedePrevious: false,
      reasoningRule: 'Deterministic delta exceeds configured thresholds; all event references pass validation.',
    },
    totalMinutes: 30,
    intervals: [
      { startMinute: 1, endMinute: 15, label: "01'-15'" },
      { startMinute: 16, endMinute: 30, label: "16'-30'" },
    ],
    defaultSeed: 101,
  },
  {
    id: 'misleading_correlation',
    name: 'Misleading Correlation',
    category: 'misleading_correlation',
    title: 'Spurious Tactical Correlation vs Causation',
    shortDescription:
      'Both teams register fouls, but Analyst attempts to claim defensive fouls caused tactical dominance. Auditor rejects or qualifies.',
    detailedContext:
      'An analyst prompt attempts to assert that a spike in midfield fouls directly caused higher progressive passing. Epistemic guardrails detect causal trigger words without mechanism evidence.',
    expectedOutcome: {
      expectedVerdict: 'accepted_with_uncertainty',
      shouldSupersedePrevious: false,
      reasoningRule: 'Epistemic guardrails downgrade unproven causal claim to qualified correlation.',
    },
    totalMinutes: 30,
    intervals: [
      { startMinute: 1, endMinute: 15, label: "01'-15'" },
      { startMinute: 16, endMinute: 30, label: "16'-30'" },
    ],
    defaultSeed: 202,
  },
  {
    id: 'missing_event_data',
    name: 'Missing Event Data',
    category: 'missing_event_data',
    title: 'Corrupted Event Stream Integrity Check',
    shortDescription:
      'Simulates broken telemetry where candidate claim cites phantom event IDs (e.g. ev_phantom_999). Auditor catches and rejects.',
    detailedContext:
      'Tests evidence audit robustness when telemetry drops event packets. The verification engine detects missing IDs and prevents the claim from reaching the broadcast pipeline.',
    expectedOutcome: {
      expectedVerdict: 'rejected',
      shouldSupersedePrevious: false,
      reasoningRule: 'Rule Check #1 fails: Referenced event IDs do not exist in the verified match ledger.',
    },
    totalMinutes: 30,
    intervals: [
      { startMinute: 1, endMinute: 15, label: "01'-15'" },
      { startMinute: 16, endMinute: 30, label: "16'-30'" },
    ],
    defaultSeed: 303,
  },
  {
    id: 'insufficient_evidence',
    name: 'Insufficient Evidence',
    category: 'insufficient_evidence',
    title: 'Sparse Interval Sample Size Guardrail',
    shortDescription:
      'Simulates an interval with only 4 events total. The system correctly abstains from making grand tactical claims.',
    detailedContext:
      'When sample size falls below the 10-event threshold, the Auditor marks the claim as uncertain / insufficient evidence and Producer withholds broadcast publication.',
    expectedOutcome: {
      expectedVerdict: 'insufficient_evidence',
      shouldSupersedePrevious: false,
      reasoningRule: 'Sample size < 10 events; system must abstain rather than hallucinate tactical trends.',
    },
    totalMinutes: 15,
    intervals: [{ startMinute: 1, endMinute: 15, label: "01'-15'" }],
    defaultSeed: 404,
  },
  {
    id: 'agent_failure_recovery',
    name: 'Agent Failure & Bounded Recovery',
    category: 'agent_failure_recovery',
    title: 'Auditor Feedback Loop Corrects Causal Speculation',
    shortDescription:
      'Analyst drafts an unsupported causal assertion; Auditor rejects it with actionable guidance; Analyst resubmits a verified factual revision.',
    detailedContext:
      'Exemplifies multi-agent resilience: rather than crashing or publishing flawed content, the Auditor provides specific feedback directing the Analyst to replace causal assertions with verified correlation.',
    expectedOutcome: {
      expectedVerdict: 'accepted',
      shouldSupersedePrevious: false,
      reasoningRule: 'Bounded revision loop successfully transforms ungrounded causal claim into verified factual statement.',
    },
    totalMinutes: 30,
    intervals: [
      { startMinute: 1, endMinute: 15, label: "01'-15'" },
      { startMinute: 16, endMinute: 30, label: "16'-30'" },
    ],
    defaultSeed: 505,
  },
];
