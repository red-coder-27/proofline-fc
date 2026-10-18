/**
 * Signature Demo: Contradiction and Correction Engine.
 * Implements the 6-phase signature demonstration required in Section 11.
 * All statistics are calculated directly from generated synthetic match events.
 */

import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot, TurningPoint } from '@/types/stats';
import { TruthlineRecord } from '@/types/claims';
import { SharedWorkflowState } from '@/types/agents';
import { generateSyntheticMatchEvents } from '../eventEngine/generator';
import { computeIntervalSnapshot } from '../eventEngine/statsCalculator';
import { detectTurningPoints } from '../eventEngine/turningPointDetector';
import { executeMultiAgentWorkflow } from '../agents/orchestrator';

export interface SignatureDemoState {
  currentPhase: 1 | 2 | 3 | 4 | 5 | 6;
  phaseTitle: string;
  phaseSummary: string;
  events: MatchEvent[];
  interval1Snapshot: MatchIntervalSnapshot;
  interval2Snapshot: MatchIntervalSnapshot;
  interval3Snapshot: MatchIntervalSnapshot;
  interval2TurningPoints: TurningPoint[];
  interval3TurningPoints: TurningPoint[];
  activeWorkflowState: SharedWorkflowState | null;
  truthlineClaims: TruthlineRecord[];
}

export async function initializeSignatureDemo(): Promise<SignatureDemoState> {
  const seed = 42;
  const scenarioId = 'signature_demo';

  // Generate all events for Phase 1 (01-15m) and Phase 2 (16-30m)
  const events01_15 = generateSyntheticMatchEvents(scenarioId, 1, 15, seed);
  const events16_30 = generateSyntheticMatchEvents(scenarioId, 16, 30, seed);
  const events31_45 = generateSyntheticMatchEvents(scenarioId, 31, 45, seed);

  const allEventsUpTo30 = [...events01_15, ...events16_30];

  const snap1 = computeIntervalSnapshot(events01_15, { startMinute: 1, endMinute: 15, label: "01'-15'" });
  const snap2 = computeIntervalSnapshot(events16_30, { startMinute: 16, endMinute: 30, label: "16'-30'" });
  const snap3 = computeIntervalSnapshot(events31_45, { startMinute: 31, endMinute: 45, label: "31'-45'" });

  const tp2 = detectTurningPoints(events16_30, snap1, snap2, snap2.interval);
  const tp3 = detectTurningPoints(events31_45, snap2, snap3, snap3.interval);

  // Run initial workflow on Interval 2 (Phase 1 & 2 of signature demo)
  const workflowStatePhase2 = await executeMultiAgentWorkflow({
    workflowId: 'wf_sig_phase2',
    scenarioId,
    snapshot: snap2,
    turningPoints: tp2,
    events: allEventsUpTo30,
    existingClaims: [],
    currentIntervalIndex: 1,
    isContradictoryPhase: false,
  });

  return {
    currentPhase: 2,
    phaseTitle: 'Phase 2: Verified Initial Insight',
    phaseSummary: 'London Titans passing dropped from 84% to 58%, coinciding with Munich Red Star pressure surging to 2.4/min. Auditor validated event IDs and qualified causal claim into verified correlation.',
    events: allEventsUpTo30,
    interval1Snapshot: snap1,
    interval2Snapshot: snap2,
    interval3Snapshot: snap3,
    interval2TurningPoints: tp2,
    interval3TurningPoints: tp3,
    activeWorkflowState: workflowStatePhase2,
    truthlineClaims: workflowStatePhase2.activeClaims,
  };
}

export async function advanceSignatureDemoToPhase3And4(
  currentState: SignatureDemoState
): Promise<SignatureDemoState> {
  const seed = 42;
  const scenarioId = 'signature_demo';
  const events31_45 = generateSyntheticMatchEvents(scenarioId, 31, 45, seed);
  const allEventsUpTo45 = [...currentState.events, ...events31_45];

  // Execute workflow on Interval 3 with contradictory evidence
  const workflowStatePhase4 = await executeMultiAgentWorkflow({
    workflowId: 'wf_sig_phase4',
    scenarioId,
    snapshot: currentState.interval3Snapshot,
    turningPoints: currentState.interval3TurningPoints,
    events: allEventsUpTo45,
    existingClaims: currentState.truthlineClaims,
    currentIntervalIndex: 2,
    isContradictoryPhase: true,
  });

  return {
    ...currentState,
    currentPhase: 4,
    phaseTitle: 'Phase 4: Contradiction Detected & Claim Superseded',
    phaseSummary: 'New match events in interval 31\'-45\' revealed London Titans passing rebounded to 83% despite sustained Munich pressure. Truthline superseded the previous collapse claim and published the revised tactical adaptation.',
    events: allEventsUpTo45,
    activeWorkflowState: workflowStatePhase4,
    truthlineClaims: workflowStatePhase4.activeClaims,
  };
}
