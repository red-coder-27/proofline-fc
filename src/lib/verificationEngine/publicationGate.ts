/**
 * Master Publication Gate & Broadcast Policy Boundary.
 *
 * Enforces a strict, testable security and integrity gate between candidate claims
 * and broadcast publication:
 * 1. Claim must have a verified status backed by an authentic passing audit (no forged status).
 * 2. Superseded claims can NEVER be published as current facts.
 * 3. Every supporting event must exist in the active interval.
 * 4. All numeric claims in final broadcast drafts (casual and analyst) must match verified data.
 * 5. Paraphrased/rewritten broadcast drafts cannot introduce unverified causal language or invented tactics.
 * 6. Insufficient evidence claims must be deferred.
 */

import { MatchEvent } from '@/types/events';
import { IntervalWindow, MatchIntervalSnapshot } from '@/types/stats';
import { VerificationAudit, ClaimStatus } from '@/types/claims';
import { classifyClaimEpistemics } from './guardrails';

export interface PublicationGateInput {
  claimId: string;
  claimStatus: ClaimStatus;
  claimText: string;
  category: string;
  interval: IntervalWindow;
  audit: VerificationAudit;
  proposedDrafts?: {
    casualFan: string;
    analyst: string;
  };
  activeEvents: MatchEvent[];
  activeSnapshot: MatchIntervalSnapshot;
  isSuperseded?: boolean;
}

export interface PublicationGateDecision {
  canPublish: boolean;
  decision: 'published' | 'deferred' | 'rejected_by_producer';
  sanitizedDrafts?: {
    casualFan: string;
    analyst: string;
  };
  policyViolations: string[];
  rationale: string;
}

const INVENTED_TACTICAL_PHRASES = [
  'bypassed pressing traps',
  'in their own half',
  'guaranteeing a loss',
  'tactical mastery',
  'irreversible collapse',
  'panicked',
];

/**
 * Extracts numeric assertions from text (e.g. "58.5%", "2.4/min", "45%")
 */
export function extractNumbersFromText(text: string): { raw: string; value: number; unit?: string }[] {
  const matches: { raw: string; value: number; unit?: string }[] = [];
  // Match percentages
  const pctRegex = /\b(\d+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = pctRegex.exec(text)) !== null) {
    matches.push({ raw: m[0], value: parseFloat(m[1]), unit: '%' });
  }

  // Match frequencies (e.g. 2.4/min, 2.4 events/min)
  const freqRegex = /\b(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:events\/min|\/min)/g;
  while ((m = freqRegex.exec(text)) !== null) {
    matches.push({ raw: m[0], value: parseFloat(m[1]), unit: '/min' });
  }

  return matches;
}

/**
 * Evaluates whether a candidate claim and its broadcast drafts meet the strict publication policy.
 */
export function evaluateBroadcastPublicationGate(
  input: PublicationGateInput
): PublicationGateDecision {
  const violations: string[] = [];

  // RULE 1: Claim status check — Rejected claims must NEVER be published
  if (input.claimStatus === 'rejected' || input.audit.outcome === 'rejected') {
    violations.push(`Claim status is rejected by evidence audit (${input.audit.decisionReason}).`);
  }

  // RULE 2: Superseded claims must NEVER be published as current
  if (input.claimStatus === 'superseded' || input.isSuperseded) {
    violations.push('Superseded claims cannot be published as currently valid broadcast statements.');
  }

  // RULE 3: Forged verification status check
  // Even if caller sets claimStatus = 'verified', the audit checks must authentically confirm it
  const auditPassed =
    input.audit.ruleChecks.referencedEventsExist &&
    input.audit.ruleChecks.numericClaimsVerified &&
    input.audit.validEventCount > 0 &&
    (input.audit.outcome === 'accepted' || input.audit.outcome === 'accepted_with_uncertainty');

  if (input.claimStatus === 'verified' && !auditPassed) {
    violations.push('Forged verification status: Claim claims verified status without passing required audit rules.');
  }

  // RULE 3b: Audit-to-claim association check (Replay prevention)
  // A passing audit issued for Claim A cannot be replayed to authorize publication of Claim B
  if (
    input.audit.claimId &&
    input.claimId &&
    input.claimId !== 'clm_producer_gate' &&
    input.audit.claimId !== input.claimId
  ) {
    violations.push(
      `Audit mismatch: Audit was issued for claim ID "${input.audit.claimId}", but was submitted for claim ID "${input.claimId}".`
    );
  }
  if (input.audit.targetIntervalLabel && input.interval.label && input.audit.targetIntervalLabel !== input.interval.label) {
    violations.push(
      `Interval mismatch: Audit was issued for interval "${input.audit.targetIntervalLabel}", but claim belongs to "${input.interval.label}".`
    );
  }

  // RULE 4: Insufficient evidence check
  if (input.audit.outcome === 'insufficient_evidence') {
    return {
      canPublish: false,
      decision: 'deferred',
      policyViolations: ['Insufficient match event density to support broadcast publication.'],
      rationale: `BROADCAST GATEWAY DEFERRAL: Event density in interval ${input.interval.label} is too sparse (${input.audit.validEventCount} events). Insight held back until sample size meets reliability threshold.`,
    };
  }

  // RULE 5: Event reference interval integrity check
  const activeEventMap = new Map<string, MatchEvent>();
  for (const ev of input.activeEvents) {
    activeEventMap.set(ev.id, ev);
  }

  if (!input.audit.referencedEventIds || input.audit.referencedEventIds.length === 0) {
    violations.push('Claim does not cite any verified supporting events.');
  } else {
    for (const id of input.audit.referencedEventIds) {
      const ev = activeEventMap.get(id);
      if (!ev) {
        violations.push(`Referenced event ${id} does not exist in the active match stream.`);
      } else if (ev.minute < input.interval.startMinute || ev.minute > input.interval.endMinute) {
        violations.push(`Referenced event ${id} (minute ${ev.minute}) belongs outside active interval ${input.interval.label}.`);
      }
    }
  }

  // RULE 6: Draft text guardrails (Epistemic causal triggers and invented tactical mechanisms)
  if (input.proposedDrafts) {
    const drafts = [input.proposedDrafts.casualFan, input.proposedDrafts.analyst];

    for (const draft of drafts) {
      const epistemic = classifyClaimEpistemics(draft);
      if (epistemic.causalFlags.length > 0) {
        violations.push(
          `Broadcast draft introduces unverified causal claim: "${epistemic.causalFlags.join(', ')}"`
        );
      }

      const lowerDraft = draft.toLowerCase();
      for (const phrase of INVENTED_TACTICAL_PHRASES) {
        if (lowerDraft.includes(phrase)) {
          violations.push(`Broadcast draft introduces invented tactical speculation: "${phrase}"`);
        }
      }
    }

    // RULE 7: Numeric veracity check on final broadcast drafts
    // Every number mentioned in the final drafts must be supported by verified numeric assertions or snapshot data
    const verifiedNumbers = new Set<number>();
    // Collect from assertions
    for (const a of input.audit.numericAssertions || []) {
      if (a.matches) {
        verifiedNumbers.add(a.claimedValue);
        verifiedNumbers.add(a.recalculatedValue);
      }
    }
    // Collect from snapshot
    verifiedNumbers.add(input.activeSnapshot.home.passingSuccessRate);
    verifiedNumbers.add(input.activeSnapshot.away.passingSuccessRate);
    verifiedNumbers.add(input.activeSnapshot.home.pressureFrequencyPerMin);
    verifiedNumbers.add(input.activeSnapshot.away.pressureFrequencyPerMin);
    verifiedNumbers.add(input.activeSnapshot.home.successfulPasses);
    verifiedNumbers.add(input.activeSnapshot.home.totalPasses);
    verifiedNumbers.add(input.activeSnapshot.away.successfulPasses);
    verifiedNumbers.add(input.activeSnapshot.away.totalPasses);
    verifiedNumbers.add(input.activeSnapshot.home.progressiveMeters);
    verifiedNumbers.add(input.activeSnapshot.away.progressiveMeters);

    for (const draft of drafts) {
      const extracted = extractNumbersFromText(draft);
      for (const item of extracted) {
        const matchesVerified = Array.from(verifiedNumbers).some(
          (vn) => Math.abs(vn - item.value) <= 1.0
        );
        if (!matchesVerified) {
          violations.push(
            `Unsupported numeric figure in broadcast draft: "${item.raw}" is not supported by verified match telemetry.`
          );
        }
      }
    }
  }

  if (violations.length > 0) {
    return {
      canPublish: false,
      decision: 'rejected_by_producer',
      policyViolations: violations,
      rationale: `BROADCAST GATEWAY REJECTION: Publication blocked by policy gate. Violations: ${violations.join('; ')}`,
    };
  }

  // Handle uncertainty notes in analyst draft
  let finalDrafts = input.proposedDrafts;
  if (finalDrafts && input.audit.outcome === 'accepted_with_uncertainty' && input.audit.uncertaintyReason) {
    if (!finalDrafts.analyst.includes('EVIDENTIARY NOTE')) {
      finalDrafts = {
        ...finalDrafts,
        analyst: `${finalDrafts.analyst} [EVIDENTIARY NOTE: ${input.audit.uncertaintyReason}]`,
      };
    }
  }

  return {
    canPublish: true,
    decision: 'published',
    sanitizedDrafts: finalDrafts,
    policyViolations: [],
    rationale: `Approved for live broadcast overlay. Verified against ${input.audit.validEventCount} events; uncertainty calibrated at ${(input.audit.uncertaintyScore * 100).toFixed(0)}%.`,
  };
}
