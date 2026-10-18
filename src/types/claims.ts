/**
 * Claims and Truthline structured evidence ledger schemas.
 * Represents candidate tactical insights, verification results,
 * contradiction audits, and broadcast publication decisions.
 */

import { IntervalWindow } from './stats';
import { TeamId } from './events';

export type ClaimCategory =
  | 'passing_decay'
  | 'pressure_surge'
  | 'tactical_shift'
  | 'territorial_dominance'
  | 'counter_attack_vulnerability'
  | 'stamina_collapse';

export type ClaimEpistemicType =
  | 'factual' // Direct observed measurement (e.g. "Passing accuracy fell from 84% to 61%")
  | 'interpretive' // Qualitative interpretation (e.g. "Midfield struggled to retain possession")
  | 'causal'; // Attribution of mechanism (e.g. "Opponent high press directly caused passing failure")

export type ClaimStatus =
  | 'proposed'
  | 'verified'
  | 'uncertain'
  | 'rejected'
  | 'superseded';

export type VerificationOutcome =
  | 'accepted'
  | 'accepted_with_uncertainty'
  | 'rejected'
  | 'insufficient_evidence';

export interface NumericAssertion {
  metricName: string;
  claimedValue: number;
  recalculatedValue: number;
  tolerance: number;
  matches: boolean;
  unit: string;
}

export interface CounterEvidenceItem {
  eventId: string;
  minute: number;
  description: string;
  contradictionType: 'temporal_inconsistency' | 'baseline_divergence' | 'recovery_observed' | 'confounding_factor';
  weight: 'low' | 'medium' | 'high';
}

export interface VerificationAudit {
  claimId?: string;
  targetIntervalLabel?: string;
  verifiedAt: string;
  outcome: VerificationOutcome;
  ruleChecks: {
    referencedEventsExist: boolean;
    intervalBoundariesValid: boolean;
    numericClaimsVerified: boolean;
    causalGuardrailPassed: boolean;
    counterEvidenceAssessed: boolean;
    sampleSizeSufficient?: boolean;
  };
  numericAssertions: NumericAssertion[];
  referencedEventIds: string[];
  validEventCount: number;
  missingEventIds: string[];
  counterEvidence: CounterEvidenceItem[];
  uncertaintyScore: number; // 0.0 (certain) to 1.0 (highly uncertain)
  uncertaintyReason?: string;
  decisionReason: string;
}

export interface ClaimRevision {
  revisionIndex: number;
  timestamp: string;
  previousClaimText: string;
  revisedClaimText: string;
  revisionReason: string;
  revisingAgent: string;
}

export interface TruthlineRecord {
  claimId: string;
  version: number;
  claimText: string;
  category: ClaimCategory;
  epistemicType: ClaimEpistemicType;
  teamId: TeamId;
  interval: IntervalWindow;
  status: ClaimStatus;
  audit: VerificationAudit;
  revisions: ClaimRevision[];
  supersededByClaimId?: string;
  supersessionReason?: string;
  broadcastDecision?: {
    published: boolean;
    decision: 'published' | 'deferred' | 'rejected_by_producer';
    audienceDrafts?: {
      casualFan: string;
      analyst: string;
    };
    rationale: string;
    decidedAt: string;
    historicalApprovalRationale?: string;
    revocationRationale?: string;
    revokedAt?: string;
  };
  provenance: {
    proposedByAgent: string;
    auditedByAgent: string;
    producedByAgent: string;
  };
}
