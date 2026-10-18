import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMatchStateAnalyst } from '../lib/agents/matchStateAnalyst';
import { runEvidenceAuditor } from '../lib/agents/evidenceAuditor';
import { executeMultiAgentWorkflow } from '../lib/agents/orchestrator';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { computeIntervalSnapshot } from '../lib/eventEngine/statsCalculator';

describe('Interval Scoping, Quiet Phases & Bounded Revision Loop', () => {
  it('quiet interval following a busy interval does NOT inherit events from previous intervals', async () => {
    // Generate busy interval 16-30m and quiet interval 31-45m
    const busyEvents = generateSyntheticMatchEvents('passing_pressure_shift', 16, 30, 101);
    const quietEvents = generateSyntheticMatchEvents('signature_demo', 31, 45, 999).slice(0, 5); // sparse/quiet
    const cumulativeEvents = [...busyEvents, ...quietEvents];

    const quietInterval = { startMinute: 31, endMinute: 45, label: "31'-45'" };
    const quietSnap = computeIntervalSnapshot(quietEvents, quietInterval);

    // Call runMatchStateAnalyst on quiet interval with cumulative match events
    const proposal = await runMatchStateAnalyst(quietSnap, [], cumulativeEvents, quietInterval);

    // Assert that NONE of the referenced event IDs belong to busyEvents (minutes 16-30)
    const busyIds = new Set(busyEvents.map((e) => e.id));
    for (const id of proposal.candidateClaim.referencedEventIds) {
      assert.strictEqual(
        busyIds.has(id),
        false,
        `Contamination detected: Quiet interval referenced event ${id} from prior busy interval`
      );
    }
  });

  it('handles completely empty intervals safely without crashing or phantom references', async () => {
    const emptyInterval = { startMinute: 46, endMinute: 60, label: "46'-60'" };
    const emptySnap = computeIntervalSnapshot([], emptyInterval);

    const proposal = await runMatchStateAnalyst(emptySnap, [], [], emptyInterval);

    assert.strictEqual(proposal.candidateClaim.referencedEventIds.length, 0);
    assert.strictEqual(proposal.candidateClaim.targetInterval.startMinute, 46);
    assert.strictEqual(proposal.candidateClaim.targetInterval.endMinute, 60);

    const auditVerdict = runEvidenceAuditor(proposal.candidateClaim, [], emptySnap, 0, 2);
    assert.strictEqual(auditVerdict.audit.outcome, 'insufficient_evidence');
  });

  it('sparse evidence intervals (<10 events) correctly trigger abstention/deferral', async () => {
    const sparseEvents = generateSyntheticMatchEvents('insufficient_evidence', 1, 15, 404);
    assert.ok(sparseEvents.length < 10, 'Sparse fixture must contain <10 events');

    const sparseInterval = { startMinute: 1, endMinute: 15, label: "01'-15'" };
    const sparseSnap = computeIntervalSnapshot(sparseEvents, sparseInterval);

    const result = await executeMultiAgentWorkflow({
      workflowId: 'test_wf_sparse',
      scenarioId: 'insufficient_evidence',
      snapshot: sparseSnap,
      turningPoints: [],
      events: sparseEvents,
      existingClaims: [],
      currentIntervalIndex: 0,
    });

    assert.strictEqual(result.activeClaims[0].status, 'uncertain');
    assert.strictEqual(
      result.activeClaims[0].broadcastDecision?.published,
      false,
      'Sparse interval claims must be deferred from broadcast'
    );
    assert.strictEqual(result.activeClaims[0].broadcastDecision?.decision, 'deferred');
  });

  it('revision loop successfully corrects causal assertion into verified correlation', async () => {
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 16,
      endMinute: 30,
      label: "16'-30'",
    });

    const result = await executeMultiAgentWorkflow({
      workflowId: 'test_wf_revision_success',
      scenarioId: 'agent_failure_recovery',
      snapshot: snap,
      turningPoints: [
        {
          id: 'tp_pass_decay_16',
          interval: snap.interval,
          teamId: 'home',
          title: 'Passing Accuracy Degradation',
          metric: 'Passing Success Rate',
          observedDelta: -25.0,
          baselineValue: 84.0,
          currentValue: snap.home.passingSuccessRate,
          thresholdCrossed: -15.0,
          supportingEventIds: events.filter((e) => e.teamId === 'home').slice(0, 4).map((e) => e.id),
          severity: 'critical',
          summary: 'Passing dropped under press',
          observedFact: 'Observed drop in passing accuracy',
        },
      ],
      events,
      existingClaims: [],
      currentIntervalIndex: 1,
      maxRevisionLimit: 2,
    });

    // The workflow should have triggered at least 1 revision
    assert.ok(result.currentRevisionCount >= 1, 'Should have triggered bounded revision');
    assert.strictEqual(result.activeClaims[0].status, 'verified');
    assert.strictEqual(result.activeClaims[0].broadcastDecision?.published, true);
    assert.ok(
      result.activeClaims[0].revisions.length >= 1,
      'Revisions history must be recorded in Truthline record'
    );
  });

  it('revision limit exhaustion results in rejection and withholding when candidate cannot be verified', async () => {
    // Test that when maxRevisionLimit is 0 (or exceeded), an unverified claim is withheld with explicit reason
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 16,
      endMinute: 30,
      label: "16'-30'",
    });

    const unverifiedCandidate = {
      claimId: 'clm_unfixable',
      claimText: 'Munich pressure directly caused every passing error.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: ['ev_nonexistent_999'], // Unfixable missing ID
      numericAssertions: [],
    };

    const verdictExhausted = runEvidenceAuditor(
      unverifiedCandidate,
      events,
      snap,
      2, // currentRevisionCount == maxRevisionLimit
      2
    );

    assert.strictEqual(verdictExhausted.shouldRequestRevision, false, 'Should not request revision when limit reached');
    assert.strictEqual(verdictExhausted.audit.outcome, 'rejected');
    assert.ok(verdictExhausted.audit.decisionReason.includes('Revision limit exhausted'));
  });

  it('prevents premature supersession if new claim fails verification', async () => {
    const events1 = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const events2 = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap2 = computeIntervalSnapshot(events2, { startMinute: 16, endMinute: 30, label: "16'-30'" });

    // Step 1: Initial verified claim
    const initialRun = await executeMultiAgentWorkflow({
      workflowId: 'wf_initial',
      scenarioId: 'signature_demo',
      snapshot: snap2,
      turningPoints: [
        {
          id: 'tp_pass_decay_16',
          interval: snap2.interval,
          teamId: 'home',
          title: 'Passing Decay',
          metric: 'Passing Success Rate',
          observedDelta: -25,
          baselineValue: 84,
          currentValue: 58,
          thresholdCrossed: -15,
          supportingEventIds: events2.filter((e) => e.teamId === 'home').slice(0, 4).map((e) => e.id),
          severity: 'critical',
          summary: 'Drop',
          observedFact: 'Observed',
        },
      ],
      events: [...events1, ...events2],
      existingClaims: [],
      currentIntervalIndex: 1,
    });

    assert.strictEqual(initialRun.activeClaims[0].status, 'verified');
    const initialClaimId = initialRun.activeClaims[0].claimId;

    // Step 2: Next interval has flawed/sparse telemetry and CANNOT verify adaptation
    const emptyEvents = generateSyntheticMatchEvents('insufficient_evidence', 31, 45, 999);
    const emptySnap = computeIntervalSnapshot(emptyEvents, { startMinute: 31, endMinute: 45, label: "31'-45'" });

    const flawedNextRun = await executeMultiAgentWorkflow({
      workflowId: 'wf_flawed_next',
      scenarioId: 'insufficient_evidence',
      snapshot: emptySnap,
      turningPoints: [],
      events: emptyEvents,
      existingClaims: initialRun.activeClaims,
      currentIntervalIndex: 2,
      isContradictoryPhase: true, // caller flags contradiction phase, but evidence is flawed!
    });

    // The prior verified claim MUST NOT be superseded by an unverified/sparse run!
    const priorInLedger = flawedNextRun.activeClaims.find((c) => c.claimId === initialClaimId);
    assert.strictEqual(
      priorInLedger?.status,
      'verified',
      'Prior claim must remain verified; cannot be superseded by unverified run'
    );
  });
});
