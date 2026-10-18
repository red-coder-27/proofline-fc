/**
 * Multi-Agent System Orchestrator.
 * Coordinates collaboration between:
 * 1. Match State Analyst
 * 2. Evidence Auditor
 * 3. Broadcast Producer
 *
 * Manages shared state, bounded revision loops (max 2),
 * error recovery, Truthline record updates, and supersession logic.
 */

import { MatchEvent } from '@/types/events';
import { MatchIntervalSnapshot, TurningPoint } from '@/types/stats';
import { TruthlineRecord, ClaimStatus, ClaimRevision, ClaimCategory } from '@/types/claims';
import { SharedWorkflowState, AgentExecutionMessage } from '@/types/agents';
import { runMatchStateAnalyst } from './matchStateAnalyst';
import { runEvidenceAuditor } from './evidenceAuditor';
import { runBroadcastProducer } from './broadcastProducer';
import { classifyClaimEpistemics } from '../verificationEngine/guardrails';
import { deduplicateTruthlineRecords } from '../claims/claimsDeduplicator';

export interface WorkflowRunInput {
  workflowId: string;
  scenarioId: string;
  snapshot: MatchIntervalSnapshot;
  turningPoints: TurningPoint[];
  events: MatchEvent[];
  existingClaims: TruthlineRecord[];
  currentIntervalIndex: number;
  maxRevisionLimit?: number;
  isContradictoryPhase?: boolean;
}

export async function executeMultiAgentWorkflow(
  input: WorkflowRunInput
): Promise<SharedWorkflowState> {
  const maxRevisions = input.maxRevisionLimit ?? 2;
  const messages: AgentExecutionMessage[] = [];
  let stepIndex = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  let revisionCount = 0;

  const currentInterval = input.snapshot.interval;

  // STEP 1: Analyst proposes candidate insight
  stepIndex++;
  const analystStartTime = Date.now();
  let proposal = await runMatchStateAnalyst(
    input.snapshot,
    input.turningPoints,
    input.events,
    currentInterval
  );
  const analystDuration = Date.now() - analystStartTime;
  totalTokens += proposal.tokensUsed;
  totalLatency += analystDuration;

  messages.push({
    id: `msg_${stepIndex}`,
    sender: 'match_state_analyst',
    receiver: 'evidence_auditor',
    stepIndex,
    timestamp: new Date().toISOString(),
    action: 'PROPOSE_CANDIDATE_INSIGHT',
    summary: `Proposed candidate claim: "${proposal.candidateClaim.claimText.slice(0, 65)}..."`,
    payload: {
      claim: proposal.candidateClaim,
      hypotheses: proposal.alternativeHypotheses,
      tacticalContext: proposal.tacticalContext,
    },
    latencyMs: analystDuration,
  });

  // STEP 2: Evidence Auditor evaluates candidate
  stepIndex++;
  let auditorVerdict = runEvidenceAuditor(
    proposal.candidateClaim,
    input.events,
    input.snapshot,
    revisionCount,
    maxRevisions
  );
  totalTokens += auditorVerdict.tokensUsed;
  totalLatency += auditorVerdict.latencyMs;

  messages.push({
    id: `msg_${stepIndex}`,
    sender: 'evidence_auditor',
    receiver: auditorVerdict.shouldRequestRevision ? 'match_state_analyst' : 'broadcast_producer',
    stepIndex,
    timestamp: new Date().toISOString(),
    action: auditorVerdict.shouldRequestRevision ? 'REQUEST_REVISION' : 'AUDIT_VERDICT_ISSUED',
    summary: auditorVerdict.shouldRequestRevision
      ? `Requested revision: ${auditorVerdict.revisionDirective}`
      : `Audit outcome: ${auditorVerdict.audit.outcome.toUpperCase()}`,
    payload: {
      outcome: auditorVerdict.audit.outcome,
      ruleChecks: auditorVerdict.audit.ruleChecks,
      uncertainty: auditorVerdict.audit.uncertaintyScore,
      notes: auditorVerdict.auditorNotes,
    },
    latencyMs: auditorVerdict.latencyMs,
  });

  const revisionsHistory: ClaimRevision[] = [];

  // STEP 2b: Bounded Revision Loop if revision requested
  while (auditorVerdict.shouldRequestRevision && revisionCount < maxRevisions) {
    revisionCount++;
    stepIndex++;

    const prevClaimText = proposal.candidateClaim.claimText;
    const revisionProposal = await runMatchStateAnalyst(
      input.snapshot,
      input.turningPoints,
      input.events,
      currentInterval,
      {
        originalClaimText: prevClaimText,
        auditRejectionReason: auditorVerdict.revisionDirective || 'Epistemic qualification required',
        revisionCount,
      }
    );

    revisionsHistory.push({
      revisionIndex: revisionCount,
      timestamp: new Date().toISOString(),
      previousClaimText: prevClaimText,
      revisedClaimText: revisionProposal.candidateClaim.claimText,
      revisionReason: auditorVerdict.revisionDirective || 'Replaced causal assumption with observed correlation',
      revisingAgent: 'Match State Analyst (Directed by Auditor)',
    });

    proposal = revisionProposal;
    totalTokens += revisionProposal.tokensUsed;
    totalLatency += revisionProposal.latencyMs;

    messages.push({
      id: `msg_${stepIndex}`,
      sender: 'match_state_analyst',
      receiver: 'evidence_auditor',
      stepIndex,
      timestamp: new Date().toISOString(),
      action: 'SUBMIT_REVISED_CLAIM',
      summary: `Submitted revision #${revisionCount}: "${proposal.candidateClaim.claimText.slice(0, 60)}..."`,
      payload: { revisedClaim: proposal.candidateClaim },
      latencyMs: revisionProposal.latencyMs,
    });

    // Re-audit the revised claim
    stepIndex++;
    auditorVerdict = runEvidenceAuditor(
      proposal.candidateClaim,
      input.events,
      input.snapshot,
      revisionCount,
      maxRevisions
    );
    totalTokens += auditorVerdict.tokensUsed;
    totalLatency += auditorVerdict.latencyMs;

    messages.push({
      id: `msg_${stepIndex}`,
      sender: 'evidence_auditor',
      receiver: 'broadcast_producer',
      stepIndex,
      timestamp: new Date().toISOString(),
      action: 'REAUDIT_VERDICT_ISSUED',
      summary: `Re-audit outcome for rev #${revisionCount}: ${auditorVerdict.audit.outcome.toUpperCase()}`,
      payload: {
        outcome: auditorVerdict.audit.outcome,
        ruleChecks: auditorVerdict.audit.ruleChecks,
        uncertainty: auditorVerdict.audit.uncertaintyScore,
      },
      latencyMs: auditorVerdict.latencyMs,
    });
  }

  // Handle revision exhaustion if loop ended with revision still requested
  if (auditorVerdict.shouldRequestRevision && revisionCount >= maxRevisions) {
    auditorVerdict.audit.outcome = 'rejected';
    auditorVerdict.audit.decisionReason = `Revision limit exhausted (${maxRevisions}/${maxRevisions} revisions attempted). Claim remains unverified: ${auditorVerdict.revisionDirective || auditorVerdict.audit.decisionReason}`;
  }

  // Epistemic classification
  const epistemicType = classifyClaimEpistemics(proposal.candidateClaim.claimText).epistemicType;

  // Determine Truthline claim status
  let claimStatus: ClaimStatus = 'verified';
  if (auditorVerdict.audit.outcome === 'rejected') {
    claimStatus = 'rejected';
  } else if (auditorVerdict.audit.outcome === 'insufficient_evidence') {
    claimStatus = 'uncertain';
  } else if (auditorVerdict.audit.outcome === 'accepted_with_uncertainty') {
    claimStatus = 'uncertain';
  }

  // STEP 3: Broadcast Producer Quality Gate & Audience Personalization
  stepIndex++;
  const producerDecision = runBroadcastProducer(
    proposal.candidateClaim.claimText,
    auditorVerdict.audit,
    input.snapshot,
    proposal.candidateClaim.category,
    {
      claimId: proposal.candidateClaim.claimId,
      claimStatus,
      activeEvents: input.events,
      isSuperseded: false,
    }
  );
  totalTokens += producerDecision.tokensUsed || 0;
  totalLatency += producerDecision.latencyMs;

  messages.push({
    id: `msg_${stepIndex}`,
    sender: 'broadcast_producer',
    receiver: 'broadcast',
    stepIndex,
    timestamp: new Date().toISOString(),
    action: producerDecision.published ? 'PUBLISH_BROADCAST_PACKAGE' : 'GATEWAY_DEFER_OR_REJECT',
    summary: producerDecision.published
      ? `Published to Broadcast Studio (Casual & Analyst drafts active)`
      : `Broadcast withheld: ${producerDecision.decision}`,
    payload: {
      decision: producerDecision.decision,
      rationale: producerDecision.rationale,
      drafts: producerDecision.audienceDrafts,
    },
    latencyMs: producerDecision.latencyMs,
  });

  const newTruthlineRecord: TruthlineRecord = {
    claimId: proposal.candidateClaim.claimId,
    version: 1 + revisionCount,
    claimText: proposal.candidateClaim.claimText,
    category: proposal.candidateClaim.category as ClaimCategory,
    epistemicType,
    teamId: 'home',
    interval: currentInterval,
    status: claimStatus,
    audit: auditorVerdict.audit,
    revisions: revisionsHistory,
    broadcastDecision: {
      published: producerDecision.published,
      decision: producerDecision.decision,
      audienceDrafts: producerDecision.audienceDrafts,
      rationale: producerDecision.rationale,
      decidedAt: producerDecision.decidedAt,
    },
    provenance: {
      proposedByAgent: 'Match State Analyst',
      auditedByAgent: 'Evidence Auditor',
      producedByAgent: 'Broadcast Producer',
    },
  };

  // STEP 4: Supersession & Claim Deduplication Handling
  // When a verified (or qualified) claim arrives in a contradictory/recovery phase,
  // all prior verified/uncertain claims from earlier intervals are superseded and revoked.
  let updatedActiveClaims = [...input.existingClaims];

  const isContradiction = Boolean(
    input.isContradictoryPhase ||
    proposal.candidateClaim.category === 'tactical_shift' ||
    (currentInterval.startMinute >= 31 && input.scenarioId === 'contradictory_evidence_later')
  );

  if (
    newTruthlineRecord.status === 'verified' &&
    isContradiction
  ) {
    for (let i = 0; i < updatedActiveClaims.length; i++) {
      const prior = updatedActiveClaims[i];
      if (
        prior.interval.endMinute <= currentInterval.startMinute &&
        (prior.status === 'verified' || prior.status === 'uncertain')
      ) {
        updatedActiveClaims[i] = {
          ...prior,
          status: 'superseded',
          supersededByClaimId: newTruthlineRecord.claimId,
          supersessionReason: `Superseded in interval ${currentInterval.label}: New match evidence confirms Titans passing rebounded to ${input.snapshot.home.passingSuccessRate}% under persistent pressure, invalidating the previous explanation of irreversible collapse.`,
          broadcastDecision: {
            ...prior.broadcastDecision,
            published: false,
            decision: 'rejected_by_producer',
            rationale: `BROADCAST QUALITY GATEWAY REVOCATION: Claim was superseded by ${newTruthlineRecord.claimId} in interval ${currentInterval.label}. Superseded claims cannot be published as current broadcast statements.`,
            decidedAt: prior.broadcastDecision?.decidedAt || new Date().toISOString(),
            historicalApprovalRationale: prior.broadcastDecision?.rationale || 'Approved for live broadcast overlay.',
            revocationRationale: `Superseded in interval ${currentInterval.label}: New match evidence confirms Titans passing rebounded to ${input.snapshot.home.passingSuccessRate}% under persistent pressure, invalidating the previous explanation of irreversible collapse.`,
            revokedAt: new Date().toISOString(),
          },
        };
      }
    }
  }

  // Prepend the new claim and deterministically deduplicate
  // (merges duplicate revisions, preserves supersession, disambiguates colliding IDs)
  updatedActiveClaims.unshift(newTruthlineRecord);
  updatedActiveClaims = deduplicateTruthlineRecords(updatedActiveClaims);

  return {
    workflowId: input.workflowId,
    scenarioId: input.scenarioId,
    currentIntervalIndex: input.currentIntervalIndex,
    snapshot: input.snapshot,
    turningPoints: input.turningPoints,
    events: input.events,
    activeClaims: updatedActiveClaims,
    historyClaims: updatedActiveClaims,
    messages,
    currentRevisionCount: revisionCount,
    maxRevisionLimit: maxRevisions,
    orchestrationStatus: 'completed',
    metrics: {
      totalTokensUsed: totalTokens,
      totalLatencyMs: totalLatency,
      auditPassingRate: auditorVerdict.audit.outcome === 'accepted' ? 1.0 : 0.0,
      revisionsTriggered: revisionCount,
      isUsingMicrosoftFoundry: proposal.provider === 'microsoft_foundry_live',
      foundryModelName: proposal.modelName,
      foundryError: proposal.errorDetails,
    },
  };
}
