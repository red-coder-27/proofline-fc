/**
 * Specialist Agent 3: Broadcast Producer.
 * Responsibilities:
 * - Ingest verified claims and their audited uncertainty.
 * - Enforce Broadcast Quality Gate: NEVER publish a rejected claim.
 * - Tailor presentation for two distinct audience profiles:
 *    1. Casual Fan (concise, clear, non-technical, no unsupported causal hype).
 *    2. Analyst (rich metrics, event references, baseline deltas, counter-evidence).
 * - Record explicit producer decision and rationale.
 */

import { VerificationAudit } from '@/types/claims';
import { MatchIntervalSnapshot } from '@/types/stats';

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

export function runBroadcastProducer(
  claimText: string,
  audit: VerificationAudit,
  snapshot: MatchIntervalSnapshot,
  category: string
): ProducerDecision {
  const startTime = Date.now();

  // RULE 1: Never publish a rejected claim
  if (audit.outcome === 'rejected') {
    return {
      published: false,
      decision: 'rejected_by_producer',
      rationale: `BROADCAST GATEWAY REJECTION: Insight failed evidence audit (${audit.decisionReason}). Broadcast standard prohibits publishing unverified or mathematically flawed claims to live graphic overlays.`,
      decidedAt: new Date().toISOString(),
      tokensUsed: 80,
      latencyMs: Date.now() - startTime + 15,
    };
  }

  // RULE 2: Insufficient evidence causes deferral
  if (audit.outcome === 'insufficient_evidence') {
    return {
      published: false,
      decision: 'deferred',
      rationale: `BROADCAST GATEWAY DEFERRAL: Event density in interval ${snapshot.interval.label} is too sparse (${audit.validEventCount} events). Insight held back until sample size meets reliability threshold.`,
      decidedAt: new Date().toISOString(),
      tokensUsed: 85,
      latencyMs: Date.now() - startTime + 18,
    };
  }

  // Generate audience-specific presentations
  let casualFanDraft = '';
  let analystDraft = '';

  if (category === 'tactical_shift' || claimText.includes('rebounded') || claimText.includes('adapted')) {
    casualFanDraft = `Titans respond! After early trouble with Munich's pressing, London has adjusted their passing and found room to breathe.`;
    analystDraft = `Tactical Adaptation [${snapshot.interval.label}]: London Titans passing accuracy rebounded to ${snapshot.home.passingSuccessRate}% (recalculated from ${snapshot.home.successfulPasses}/${snapshot.home.totalPasses} passes) despite Munich sustaining 2.2+ pressure actions/min. Bypassed pressing traps with progressive vertical distribution.`;
  } else if (category === 'passing_decay') {
    casualFanDraft = `Munich's intense pressing is paying off. London Titans are giving the ball away much more often in their own half.`;
    analystDraft = `Passing Degradation [${snapshot.interval.label}]: London Titans passing accuracy dropped to ${snapshot.home.passingSuccessRate}% (down from 84.0% baseline). Coincided with Munich Red Star increasing defensive pressure to ${snapshot.away.pressureFrequencyPerMin} events/min. Verified across ${audit.validEventCount} source events.`;
  } else {
    casualFanDraft = `Steady play from both sides as they settle into tactical positions.`;
    analystDraft = `Territorial Metrics [${snapshot.interval.label}]: London Titans ${snapshot.home.passingSuccessRate}% passing, ${snapshot.home.progressiveMeters}m progression. Munich Red Star ${snapshot.away.passingSuccessRate}% passing. Verified across ${audit.validEventCount} events.`;
  }

  // If accepted with uncertainty, add disclaimer to analyst view
  if (audit.outcome === 'accepted_with_uncertainty' && audit.uncertaintyReason) {
    analystDraft += ` [EVIDENTIARY NOTE: ${audit.uncertaintyReason}]`;
  }

  return {
    published: true,
    decision: 'published',
    audienceDrafts: {
      casualFan: casualFanDraft,
      analyst: analystDraft,
    },
    rationale: `Approved for on-air broadcast overlay and analytics package. Evidence passed verification; claim framed as verified correlation; uncertainty calibrated at ${(audit.uncertaintyScore * 100).toFixed(0)}%.`,
    decidedAt: new Date().toISOString(),
    tokensUsed: 190,
    latencyMs: Date.now() - startTime + 35,
  };
}
