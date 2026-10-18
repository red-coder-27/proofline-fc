/**
 * Master Evidence Verification Engine.
 * Implements the 6-point deterministic verification checklist before any insight
 * can be published to Truthline or broadcast.
 */

import { MatchEvent } from '@/types/events';
import { IntervalWindow, TeamIntervalMetrics } from '@/types/stats';
import {
  VerificationAudit,
  VerificationOutcome,
  NumericAssertion,
} from '@/types/claims';
import { validateEventReferences, verifyNumericAssertion, scanForCounterEvidence } from './rules';
import { classifyClaimEpistemics, qualifyCausalClaim } from './guardrails';

export interface CandidateClaimInput {
  claimId: string;
  claimText: string;
  category: string;
  targetInterval: IntervalWindow;
  referencedEventIds: string[];
  numericAssertions: {
    teamId?: 'home' | 'away';
    metricName: string;
    claimedValue: number;
    unit?: string;
  }[];
}

import { calculateTeamIntervalMetrics } from '../eventEngine/statsCalculator';

export function verifyCandidateClaim(
  input: CandidateClaimInput,
  availableEvents: MatchEvent[],
  actualMetrics: TeamIntervalMetrics | { home: TeamIntervalMetrics; away: TeamIntervalMetrics },
  totalIntervalEventsCount: number
): VerificationAudit {
  // 1 & 2. Confirm referenced event IDs exist and match interval strictly
  const refCheck = validateEventReferences(
    input.referencedEventIds,
    availableEvents,
    input.targetInterval
  );

  // Recompute metrics directly from raw event data strictly within target interval
  // (Prevents blindly trusting an untrusted/copied snapshot)
  const recomputedHome = calculateTeamIntervalMetrics(availableEvents, 'home', input.targetInterval);
  const recomputedAway = calculateTeamIntervalMetrics(availableEvents, 'away', input.targetInterval);
  const groundTruthMetrics = { home: recomputedHome, away: recomputedAway };

  // 3 & 4. Recalculate numeric claims and verify tolerance
  const evaluatedAssertions: NumericAssertion[] = [];
  let allNumericsPassed = true;

  // Enforce non-vacuous assertions when the claim text asserts numeric values
  const textHasNumbers = /\b\d+(\.\d+)?(%|\/min|m)?\b/.test(input.claimText) && /\d/.test(input.claimText);
  const requiresNumericEvidence =
    (textHasNumbers && (input.claimText.includes('%') || input.claimText.includes('/min'))) ||
    input.category === 'pressure_surge';

  if (requiresNumericEvidence && (!input.numericAssertions || input.numericAssertions.length === 0)) {
    allNumericsPassed = false;
  }

  for (const assertion of input.numericAssertions || []) {
    const verified = verifyNumericAssertion(
      assertion.metricName,
      assertion.claimedValue,
      groundTruthMetrics,
      undefined,
      assertion.unit || '%',
      assertion.teamId
    );
    evaluatedAssertions.push(verified);
    if (!verified.matches) {
      allNumericsPassed = false;
    }
  }

  // 5. Counter-evidence scan
  const counterEvidence = scanForCounterEvidence(
    availableEvents,
    input.targetInterval,
    input.category
  );

  // 6. Epistemic classification
  const epistemicAnalysis = classifyClaimEpistemics(input.claimText);
  const causalGuard = qualifyCausalClaim(input.claimText, epistemicAnalysis.causalFlags);

  // Effective interval events count from ground truth telemetry
  const intervalEventsCount = availableEvents.filter(
    (e) => e.minute >= input.targetInterval.startMinute && e.minute <= input.targetInterval.endMinute
  ).length;
  const effectiveSampleCount = Math.min(totalIntervalEventsCount, intervalEventsCount);

  // 7, 8, 9, 10. Rule synthesis & Decision
  let outcome: VerificationOutcome = 'accepted';
  let decisionReason = '';
  let uncertaintyScore = 0.05;
  let uncertaintyReason: string | undefined = undefined;

  // Check 8: Insufficient evidence check
  if (effectiveSampleCount < 10) {
    outcome = 'insufficient_evidence';
    uncertaintyScore = 0.85;
    uncertaintyReason = `Only ${effectiveSampleCount} match events observed in interval ${input.targetInterval.label}. Minimum sample threshold (10 events) not met.`;
    decisionReason = `Marked uncertain: Event density in interval ${input.targetInterval.label} is too sparse for statistically valid tactical claims.`;
  }
  // Check 7: Missing or invalid event IDs
  else if (!refCheck.allValid) {
    outcome = 'rejected';
    uncertaintyScore = 1.0;
    const missingDesc = refCheck.missingIds.length > 0 ? `Missing IDs: [${refCheck.missingIds.join(', ')}]. ` : '';
    const intervalDesc = refCheck.mismatchedIntervalIds.length > 0 ? `Mismatched interval IDs: [${refCheck.mismatchedIntervalIds.join(', ')}]. ` : '';
    decisionReason = `Rejected: Claim references invalid or out-of-interval event IDs. ${missingDesc}${intervalDesc}`;
  }
  // Check 7: Numeric failure (including empty assertions on numeric categories)
  else if (!allNumericsPassed) {
    outcome = 'rejected';
    uncertaintyScore = 0.95;
    if (requiresNumericEvidence && (!input.numericAssertions || input.numericAssertions.length === 0)) {
      decisionReason = `Rejected: Claim category "${input.category}" requires numeric assertions, but none were provided.`;
    } else {
      const failures = evaluatedAssertions
        .filter((a) => !a.matches)
        .map((a) => {
          if (!Number.isFinite(a.claimedValue)) {
            return `${a.metricName} claimed invalid non-finite value: ${a.claimedValue}`;
          }
          if (Number.isNaN(a.recalculatedValue)) {
            return `Unsupported or unknown metric: "${a.metricName}"`;
          }
          return `${a.metricName} claimed ${a.claimedValue}${a.unit} vs recalculated ${a.recalculatedValue}${a.unit} (tolerance ±${a.tolerance})`;
        })
        .join('; ');
      decisionReason = `Rejected: Numeric verification failed. ${failures}`;
    }
  }
  // Check 9: Unsupported causal explanation
  else if (!causalGuard.isAcceptableAsFact) {
    outcome = 'accepted_with_uncertainty';
    uncertaintyScore = 0.45;
    uncertaintyReason = causalGuard.qualificationGuidance;
    decisionReason = `Accepted with qualification: Claim contains causal language ('${epistemicAnalysis.causalFlags.join("', '")}'). Certified as observed correlation rather than proven causation.`;
  }
  // Check 5: Heavy counter evidence
  else if (counterEvidence.some((c) => c.weight === 'high' || c.contradictionType === 'recovery_observed')) {
    outcome = 'accepted_with_uncertainty';
    uncertaintyScore = 0.50;
    uncertaintyReason = `${counterEvidence.length} contradictory event(s) observed indicating incomplete tactical picture.`;
    decisionReason = `Accepted with uncertainty: ${counterEvidence[0].description}`;
  } else {
    outcome = 'accepted';
    uncertaintyScore = 0.05;
    decisionReason = `Verified: All ${refCheck.validCount} referenced events confirmed in interval ${input.targetInterval.label}; all recalculated metrics match within tolerance.`;
  }

  return {
    claimId: input.claimId,
    targetIntervalLabel: input.targetInterval.label,
    verifiedAt: new Date().toISOString(),
    outcome,
    ruleChecks: {
      referencedEventsExist: refCheck.missingIds.length === 0 && refCheck.validCount > 0,
      intervalBoundariesValid: refCheck.mismatchedIntervalIds.length === 0,
      numericClaimsVerified: allNumericsPassed,
      causalGuardrailPassed: causalGuard.isAcceptableAsFact,
      counterEvidenceAssessed: true,
      sampleSizeSufficient: effectiveSampleCount >= 10,
    },
    numericAssertions: evaluatedAssertions,
    referencedEventIds: input.referencedEventIds,
    validEventCount: refCheck.validCount,
    missingEventIds: refCheck.missingIds,
    counterEvidence,
    uncertaintyScore,
    uncertaintyReason,
    decisionReason,
  };
}
