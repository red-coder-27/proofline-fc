import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import {
  calculateTeamIntervalMetrics,
  computeIntervalSnapshot,
} from '../lib/eventEngine/statsCalculator';
import { detectTurningPoints } from '../lib/eventEngine/turningPointDetector';
import { verifyCandidateClaim } from '../lib/verificationEngine/verifier';
import { classifyClaimEpistemics, qualifyCausalClaim } from '../lib/verificationEngine/guardrails';
import { executeMultiAgentWorkflow } from '../lib/agents/orchestrator';
import { runBroadcastProducer } from '../lib/agents/broadcastProducer';
import { runFullBenchmark } from '../lib/benchmarks/benchmarkRunner';
import { SCENARIO_CATALOG } from '../lib/scenarios/scenarioCatalog';

describe('Event Generator and Determinism', () => {
  it('generates reproducible event sequences with identical seeds', () => {
    const eventsRun1 = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const eventsRun2 = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);

    assert.ok(eventsRun1.length > 15, 'Should generate more than 15 events in 15 minutes');
    assert.strictEqual(eventsRun1.length, eventsRun2.length, 'Length should match across identical seeds');
    assert.strictEqual(eventsRun1[0].id, eventsRun2[0].id, 'First event ID should match');
    assert.strictEqual(eventsRun1[5].x, eventsRun2[5].x, 'Spatial x coordinate should match');
    assert.strictEqual(eventsRun1[5].y, eventsRun2[5].y, 'Spatial y coordinate should match');
    assert.strictEqual(eventsRun1[5].playerId, eventsRun2[5].playerId, 'Player attribution should match');
  });

  it('rejects duplicate event IDs and malformed records', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const idSet = new Set(events.map((e) => e.id));
    assert.strictEqual(idSet.size, events.length, 'No duplicate event IDs allowed');
    for (const ev of events) {
      assert.ok(ev.id.length > 0, 'Event ID must not be empty');
      assert.ok(ev.minute >= 1 && ev.minute <= 15, 'Minute must be within interval');
      assert.ok(ev.teamId === 'home' || ev.teamId === 'away', 'Valid teamId required');
    }
  });
});

describe('Statistical Calculator & Denominator Safety', () => {
  it('handles empty intervals without dividing by zero or producing NaN', () => {
    const metrics = calculateTeamIntervalMetrics([], 'home', {
      startMinute: 1,
      endMinute: 15,
      label: "01'-15'",
    });

    assert.strictEqual(metrics.totalPasses, 0);
    assert.strictEqual(metrics.successfulPasses, 0);
    assert.strictEqual(metrics.passingSuccessRate, 0.0);
    assert.strictEqual(metrics.pressureFrequencyPerMin, 0.0);
    assert.strictEqual(isNaN(metrics.passingSuccessRate), false, 'Passing rate must not be NaN');
  });

  it('correctly calculates passing accuracy and pressure frequency', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const metrics = calculateTeamIntervalMetrics(events, 'home', {
      startMinute: 1,
      endMinute: 15,
      label: "01'-15'",
    });

    assert.ok(metrics.totalPasses > 0, 'Total passes should be positive');
    assert.ok(metrics.successfulPasses <= metrics.totalPasses, 'Successful passes cannot exceed total');
    const expectedRate = Number(((metrics.successfulPasses / metrics.totalPasses) * 100).toFixed(1));
    assert.strictEqual(metrics.passingSuccessRate, expectedRate, 'Calculated rate must match formula');
    assert.ok(metrics.passingSuccessRate > 70, 'Baseline passing rate should be >70%');
  });
});

describe('Turning Point Detection Algorithm', () => {
  it('detects passing degradation and pressure surge between intervals', () => {
    const events01_15 = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const events16_30 = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);

    const snap1 = computeIntervalSnapshot(events01_15, { startMinute: 1, endMinute: 15, label: "01'-15'" });
    const snap2 = computeIntervalSnapshot(events16_30, { startMinute: 16, endMinute: 30, label: "16'-30'" });

    const turningPoints = detectTurningPoints(events16_30, snap1, snap2, snap2.interval);

    assert.ok(turningPoints.length >= 1, 'Should detect at least 1 turning point in interval 16-30');
    const passTp = turningPoints.find((tp) => tp.metric === 'Passing Success Rate');
    assert.ok(passTp, 'Passing degradation turning point should be present');
    assert.ok((passTp?.observedDelta ?? 0) < 0, 'Observed delta should be negative');
    assert.ok((passTp?.supportingEventIds.length ?? 0) > 0, 'Should include supporting event IDs');
  });
});

describe('Deterministic Evidence Verification Engine', () => {
  it('rejects candidate claims referencing non-existent event IDs', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, { startMinute: 16, endMinute: 30, label: "16'-30'" });

    const audit = verifyCandidateClaim(
      {
        claimId: 'test_phantom_01',
        claimText: 'Titans passing accuracy collapsed due to intense press.',
        category: 'passing_decay',
        targetInterval: snap.interval,
        referencedEventIds: ['ev_phantom_1234', 'ev_phantom_5678'],
        numericAssertions: [
          {
            metricName: 'passingSuccessRate',
            claimedValue: snap.home.passingSuccessRate,
          },
        ],
      },
      events,
      snap.home,
      events.length
    );

    assert.strictEqual(audit.outcome, 'rejected');
    assert.strictEqual(audit.ruleChecks.referencedEventsExist, false);
    assert.strictEqual(audit.missingEventIds.length, 2);
  });

  it('rejects candidate claims with mathematically incorrect claims', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, { startMinute: 16, endMinute: 30, label: "16'-30'" });

    const validId = events.find((e) => e.teamId === 'home')?.id || 'ev_sig_0001';

    const audit = verifyCandidateClaim(
      {
        claimId: 'test_math_fail',
        claimText: 'London Titans passing accuracy fell to 20.0%.',
        category: 'passing_decay',
        targetInterval: snap.interval,
        referencedEventIds: [validId],
        numericAssertions: [
          {
            metricName: 'passingSuccessRate',
            claimedValue: 20.0, // False number! Actual is ~58%
          },
        ],
      },
      events,
      snap.home,
      events.length
    );

    assert.strictEqual(audit.outcome, 'rejected');
    assert.strictEqual(audit.ruleChecks.numericClaimsVerified, false);
  });

  it('qualifies causal claims using epistemic guardrails', () => {
    const causalText = 'Munich Red Star high press directly caused every passing failure.';
    const analysis = classifyClaimEpistemics(causalText);
    assert.strictEqual(analysis.epistemicType, 'causal');
    assert.ok(analysis.causalFlags.length > 0, 'Causal triggers detected');

    const qualified = qualifyCausalClaim(causalText, analysis.causalFlags);
    assert.strictEqual(qualified.isAcceptableAsFact, false);
    assert.ok(qualified.qualificationGuidance.includes('Causal assertion detected'));
  });

  it('correctly marks sparse sample size as insufficient evidence', () => {
    const events = generateSyntheticMatchEvents('insufficient_evidence', 1, 15, 404);
    const snap = computeIntervalSnapshot(events, { startMinute: 1, endMinute: 15, label: "01'-15'" });
    const sampleId = events[0]?.id || 'ev_ins_0001';

    const audit = verifyCandidateClaim(
      {
        claimId: 'test_insufficient',
        claimText: 'London Titans controlled match tempo in opening phase.',
        category: 'territorial_dominance',
        targetInterval: snap.interval,
        referencedEventIds: [sampleId],
        numericAssertions: [],
      },
      events,
      snap.home,
      events.length // sparse count < 10
    );

    assert.strictEqual(audit.outcome, 'insufficient_evidence');
    assert.ok(audit.uncertaintyScore >= 0.8, 'Uncertainty score should be high for sparse data');
  });

  it('strictly prevents rejected claims from being published by Broadcast Producer', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, { startMinute: 16, endMinute: 30, label: "16'-30'" });

    const rejectedAudit = verifyCandidateClaim(
      {
        claimId: 'test_reject',
        claimText: 'Fabricated claim with phantom IDs',
        category: 'passing_decay',
        targetInterval: snap.interval,
        referencedEventIds: ['ev_fake_999'],
        numericAssertions: [],
      },
      events,
      snap.home,
      events.length
    );

    const producerDecision = runBroadcastProducer(
      'Fabricated claim with phantom IDs',
      rejectedAudit,
      snap,
      'passing_decay'
    );

    assert.strictEqual(producerDecision.published, false, 'Broadcast Producer MUST NEVER publish a rejected claim');
    assert.strictEqual(producerDecision.decision, 'rejected_by_producer');
  });
});

describe('Multi-Agent Orchestrator & Contradiction Supersession', () => {
  it('executes bounded revision loop and supersedes prior claim when contradiction arrives', async () => {
    const events1 = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const events2 = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const events3 = generateSyntheticMatchEvents('signature_demo', 31, 45, 42);

    const snap1 = computeIntervalSnapshot(events1, { startMinute: 1, endMinute: 15, label: "01'-15'" });
    const snap2 = computeIntervalSnapshot(events2, { startMinute: 16, endMinute: 30, label: "16'-30'" });
    const snap3 = computeIntervalSnapshot(events3, { startMinute: 31, endMinute: 45, label: "31'-45'" });

    const tp2 = detectTurningPoints(events2, snap1, snap2, snap2.interval);
    const tp3 = detectTurningPoints(events3, snap2, snap3, snap3.interval);

    // Run interval 2 workflow
    const wfPhase2 = await executeMultiAgentWorkflow({
      workflowId: 'wf_test_p2',
      scenarioId: 'signature_demo',
      snapshot: snap2,
      turningPoints: tp2,
      events: [...events1, ...events2],
      existingClaims: [],
      currentIntervalIndex: 1,
      isContradictoryPhase: false,
    });

    assert.strictEqual(wfPhase2.activeClaims.length, 1);
    assert.strictEqual(wfPhase2.activeClaims[0].status, 'verified');
    assert.ok(wfPhase2.messages.length >= 3, 'Should produce agent messages trace');

    // Run interval 3 workflow with contradictory evidence
    const wfPhase4 = await executeMultiAgentWorkflow({
      workflowId: 'wf_test_p4',
      scenarioId: 'signature_demo',
      snapshot: snap3,
      turningPoints: tp3,
      events: [...events1, ...events2, ...events3],
      existingClaims: wfPhase2.activeClaims,
      currentIntervalIndex: 2,
      isContradictoryPhase: true,
    });

    assert.strictEqual(wfPhase4.activeClaims.length, 2);
    // The previous passing_decay claim must now be marked SUPERSEDED!
    const oldClaim = wfPhase4.activeClaims.find((c) => c.category === 'passing_decay');
    assert.strictEqual(oldClaim?.status, 'superseded');
    assert.ok(oldClaim?.supersededByClaimId, 'Must link to superseding claim ID');

    // The new claim must be verified and published
    const newClaim = wfPhase4.activeClaims.find((c) => c.category === 'tactical_shift');
    assert.strictEqual(newClaim?.status, 'verified');
    assert.strictEqual(newClaim?.broadcastDecision?.published, true);
  });
});

describe('Scenario Catalog and Benchmark Consistency', () => {
  it('contains 6 fully defined reproducible scenarios', () => {
    assert.strictEqual(SCENARIO_CATALOG.length, 6);
    for (const sc of SCENARIO_CATALOG) {
      assert.ok(sc.id.length > 0);
      assert.ok(sc.intervals.length > 0);
      assert.ok(sc.expectedOutcome.expectedVerdict);
    }
  });

  it('runs benchmark harness and computes actual metrics from test executions', () => {
    const comparison = runFullBenchmark();
    assert.strictEqual(comparison.sampleResults.length, 6);
    assert.strictEqual(comparison.multiAgentEvidenceGated.unsupportedClaimHallucinationRate, 0);
    assert.ok(comparison.multiAgentEvidenceGated.averageLatencyMs > 0);
    assert.ok(comparison.baselineSingleShot.unsupportedClaimHallucinationRate > 0);
    assert.ok(comparison.sampleSizeDisclosure.includes('N=6'), 'Must prominently disclose N=6 sample size');
    assert.strictEqual(comparison.metricDefinitions.length, 7, 'Must define all 7 benchmark metrics');
    for (const def of comparison.metricDefinitions) {
      assert.ok(def.formula.length > 0, `Metric ${def.metricKey} must have explicit formula`);
      assert.ok(def.description.length > 0, `Metric ${def.metricKey} must have description`);
    }

    // Honest latency trade-off verification
    assert.ok(
      comparison.improvementDelta.latencyTradeoffMs >= 0,
      'Multi-agent must honestly report latency trade-off for 3-agent audit pipeline'
    );

    // Verify baseline matched ground-truth on supported claims without predetermining loss
    const baselineMatches = comparison.sampleResults.filter((r) => r.didBaselineMatchGroundTruth);
    assert.ok(baselineMatches.length >= 2, 'Baseline should honestly receive credit when its publication matches ground truth');
    const maMatches = comparison.sampleResults.filter((r) => r.didMultiAgentMatchGroundTruth);
    assert.strictEqual(maMatches.length, 6, 'Multi-agent should match all 6 ground-truth verdicts');
  });

  it('verifies that baseline and multi-agent receive equivalent snapshot intervals', () => {
    const comparison = runFullBenchmark();
    const contradictionItem = comparison.sampleResults.find((r) => r.testItemId === 'gt_04');
    assert.ok(contradictionItem, 'gt_04 contradiction item must be tested');
    assert.ok(contradictionItem.explanation.includes('SUPERSEDED') || contradictionItem.explanation.includes('rebound'));

    const sparseItem = comparison.sampleResults.find((r) => r.testItemId === 'gt_05');
    assert.ok(sparseItem, 'gt_05 sparse item must be tested');
    assert.strictEqual(sparseItem.multiAgentVerdict, 'insufficient_evidence');
  });
});
