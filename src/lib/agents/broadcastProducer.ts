/**
 * Specialist Agent 3: Broadcast Producer.
 * Responsibilities:
 * - Ingest verified claims and their audited uncertainty.
 * - Enforce Centralized Publication Gate: NEVER publish a rejected, superseded,
 *   or unverified claim to live broadcast overlays.
 * - Formulate audience-specific personalizations (Casual Fan vs Analyst) strictly
 *   grounded in verified facts, with zero unverified causal speculation or invented tactics.
 * - Record explicit producer decision and policy rationale with genuine wall-clock measurement.
 */

import { VerificationAudit, ClaimStatus } from '@/types/claims';
import { MatchIntervalSnapshot } from '@/types/stats';
import { MatchEvent } from '@/types/events';
import { evaluateBroadcastPublicationGate } from '../verificationEngine/publicationGate';

export interface BroadcastDrafts {
  casualFan: string;
  analyst: string;
}

export interface ProducerDecision {
  published: boolean;
  decision: 'published' | 'deferred' | 'rejected_by_producer';
  audienceDrafts?: BroadcastDrafts;
  rationale: string;
  decidedAt: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface BroadcastProducerOptions {
  claimId?: string;
  claimStatus?: ClaimStatus;
  isSuperseded?: boolean;
  activeEvents?: MatchEvent[];
}

export function runBroadcastProducer(
  claimText: string,
  audit: VerificationAudit,
  snapshot: MatchIntervalSnapshot,
  category: string,
  options?: BroadcastProducerOptions
): ProducerDecision {
  const startTime = Date.now();

  // RULE 1: Never publish an audit-rejected claim
  if (audit.outcome === 'rejected') {
    return {
      published: false,
      decision: 'rejected_by_producer',
      rationale: `BROADCAST GATEWAY REJECTION: Insight failed evidence audit (${audit.decisionReason}). Broadcast standard prohibits publishing unverified or mathematically flawed claims to live graphic overlays.`,
      decidedAt: new Date().toISOString(),
      tokensUsed: 0,
      latencyMs: Math.max(1, Date.now() - startTime),
    };
  }

  // RULE 2: Insufficient evidence causes deferral
  if (audit.outcome === 'insufficient_evidence') {
    return {
      published: false,
      decision: 'deferred',
      rationale: `BROADCAST GATEWAY DEFERRAL: Event density in interval ${snapshot.interval.label} is too sparse (${audit.validEventCount} events). Insight held back until sample size meets reliability threshold.`,
      decidedAt: new Date().toISOString(),
      tokensUsed: 0,
      latencyMs: Math.max(1, Date.now() - startTime),
    };
  }

  // Generate audience-specific presentations strictly grounded in verified match metrics
  let casualFanDraft = '';
  let analystDraft = '';

  if (category === 'tactical_shift' || claimText.includes('rebounded') || claimText.includes('adapted')) {
    casualFanDraft = `London Titans adapted under pressure, completing ${snapshot.home.successfulPasses} passes to lift accuracy to ${snapshot.home.passingSuccessRate}%.`;
    analystDraft = `Tactical Adaptation [${snapshot.interval.label}]: London Titans passing accuracy rebounded to ${snapshot.home.passingSuccessRate}% (${snapshot.home.successfulPasses}/${snapshot.home.totalPasses} passes completed) while Munich Red Star maintained pressure at ${snapshot.away.pressureFrequencyPerMin} events/min. Verified across ${audit.validEventCount} source events.`;
  } else if (category === 'passing_decay') {
    casualFanDraft = `Munich Red Star pressure coincided with London Titans passing accuracy falling to ${snapshot.home.passingSuccessRate}%.`;
    analystDraft = `Passing Degradation [${snapshot.interval.label}]: London Titans passing accuracy dropped to ${snapshot.home.passingSuccessRate}%, coinciding with Munich Red Star defensive pressure at ${snapshot.away.pressureFrequencyPerMin} events/min. Verified across ${audit.validEventCount} source events.`;
  } else {
    casualFanDraft = `Balanced tactical structure in ${snapshot.interval.label}: London Titans completed ${snapshot.home.passingSuccessRate}% of passes.`;
    analystDraft = `Territorial Metrics [${snapshot.interval.label}]: London Titans recorded ${snapshot.home.passingSuccessRate}% passing accuracy and ${snapshot.home.progressiveMeters}m progression; Munich Red Star recorded ${snapshot.away.passingSuccessRate}% passing accuracy. Verified across ${audit.validEventCount} source events.`;
  }

  // If accepted with uncertainty, add explicit evidentiary caveat
  if (audit.outcome === 'accepted_with_uncertainty' && audit.uncertaintyReason) {
    analystDraft += ` [EVIDENTIARY NOTE: ${audit.uncertaintyReason}]`;
  }

  // Enforce Centralized Publication Gate policy
  const gateResult = evaluateBroadcastPublicationGate({
    claimId: options?.claimId || audit.claimId || 'clm_producer_gate',
    claimStatus: options?.claimStatus || 'verified',
    claimText,
    category,
    interval: snapshot.interval,
    audit,
    proposedDrafts: {
      casualFan: casualFanDraft,
      analyst: analystDraft,
    },
    activeEvents: options?.activeEvents || [],
    activeSnapshot: snapshot,
    isSuperseded: options?.isSuperseded,
  });

  return {
    published: gateResult.canPublish,
    decision: gateResult.decision,
    audienceDrafts: gateResult.sanitizedDrafts,
    rationale: gateResult.rationale,
    decidedAt: new Date().toISOString(),
    tokensUsed: 0,
    latencyMs: Math.max(1, Date.now() - startTime),
  };
}
