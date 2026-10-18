/**
 * Specialist Agent 2: Evidence Auditor.
 * Responsibilities:
 * - Inspect candidate claims from Match State Analyst.
 * - Execute deterministic verification (6 core deterministic rules).
 * - Scrutinize counter-evidence and epistemic boundaries.
 * - Issue explicit audit verdict: accept, accept_with_uncertainty, reject, or request revision.
 * - Must NOT blindly trust the Analyst or LLM self-assessment.
 * - Measures genuine wall-clock execution time and provider-reported tokens only.
 */

import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot } from '@/types/stats';
import { VerificationAudit } from '@/types/claims';
import { CandidateClaimInput, verifyCandidateClaim } from '../verificationEngine/verifier';

export interface AuditorVerdict {
  audit: VerificationAudit;
  shouldRequestRevision: boolean;
  revisionDirective?: string;
  auditorNotes: string;
  tokensUsed: number;
  latencyMs: number;
}

export function runEvidenceAuditor(
  candidate: CandidateClaimInput,
  events: MatchEvent[],
  snapshot: MatchIntervalSnapshot,
  currentRevisionCount: number,
  maxRevisionLimit: number
): AuditorVerdict {
  const startTime = Date.now();

  const totalIntervalEvents = events.filter(
    (e) => e.minute >= candidate.targetInterval.startMinute && e.minute <= candidate.targetInterval.endMinute
  ).length;

  // Run deterministic verification directly against raw event stream
  const audit = verifyCandidateClaim(
    candidate,
    events,
    { home: snapshot.home, away: snapshot.away },
    totalIntervalEvents
  );

  let shouldRequestRevision = false;
  let revisionDirective: string | undefined = undefined;

  // Check if revisions can be attempted within the bounded limit
  if (currentRevisionCount < maxRevisionLimit) {
    if (audit.outcome === 'accepted_with_uncertainty' && !audit.ruleChecks.causalGuardrailPassed) {
      shouldRequestRevision = true;
      revisionDirective =
        'Auditor Directive: The candidate claim asserts direct causality ("caused" / "directly led to"). Statistical co-occurrence is confirmed, but causation is unproven. Rephrase claim to state observed co-occurrence without unwarranted causal certainty.';
    } else if (audit.outcome === 'rejected' && audit.missingEventIds && audit.missingEventIds.length > 0) {
      shouldRequestRevision = true;
      revisionDirective = `Auditor Directive: Referenced event IDs [${audit.missingEventIds.join(
        ', '
      )}] do not exist in the match stream. Re-anchor claim strictly to verified events.`;
    } else if (audit.outcome === 'rejected' && !audit.ruleChecks.numericClaimsVerified) {
      shouldRequestRevision = true;
      revisionDirective = `Auditor Directive: Numeric assertion recalculation failed (${audit.decisionReason}). Re-anchor claim values strictly to recalculated match statistics.`;
    }
  } else if (audit.outcome === 'rejected' || (!audit.ruleChecks.causalGuardrailPassed && audit.outcome !== 'accepted')) {
    // Revision limit exhausted
    audit.decisionReason = `Revision limit exhausted (${maxRevisionLimit}/${maxRevisionLimit} attempts). Claim remains unverified: ${audit.decisionReason}`;
  }

  const auditorNotes = `Auditor evaluation complete. Outcome: ${audit.outcome.toUpperCase()}. Event references valid: ${
    audit.ruleChecks.referencedEventsExist
  }; Numeric recalculation: ${audit.ruleChecks.numericClaimsVerified ? 'PASSED' : 'FAILED'}; Counter-evidence items: ${
    audit.counterEvidence.length
  }. Uncertainty: ${(audit.uncertaintyScore * 100).toFixed(0)}%. ${
    currentRevisionCount >= maxRevisionLimit && !shouldRequestRevision
      ? `(Revision limit ${maxRevisionLimit} reached)`
      : ''
  }`;

  return {
    audit,
    shouldRequestRevision,
    revisionDirective,
    auditorNotes,
    tokensUsed: 0,
    latencyMs: Math.max(1, Date.now() - startTime),
  };
}
