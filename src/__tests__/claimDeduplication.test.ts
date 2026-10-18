import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TruthlineRecord } from '../types/claims';
import {
  deduplicateTruthlineRecords,
  areSameLogicalClaim,
  disambiguateDistinctClaimId,
} from '../lib/claims/claimsDeduplicator';
import { executeMultiAgentWorkflow } from '../lib/agents/orchestrator';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { computeIntervalSnapshot } from '../lib/eventEngine/statsCalculator';
import { detectTurningPoints } from '../lib/eventEngine/turningPointDetector';
import { SCENARIO_CATALOG } from '../lib/scenarios/scenarioCatalog';

describe('Claim Deduplication and Key Stability Regression Suite', () => {
  const dummyAudit = {
    verifiedAt: '2026-10-17T00:00:00.000Z',
    outcome: 'accepted' as const,
    ruleChecks: {
      referencedEventsExist: true,
      intervalBoundariesValid: true,
      numericClaimsVerified: true,
      causalGuardrailPassed: true,
      counterEvidenceAssessed: true,
    },
    numericAssertions: [],
    referencedEventIds: ['ev_1', 'ev_2'],
    validEventCount: 2,
    missingEventIds: [],
    counterEvidence: [],
    uncertaintyScore: 0.05,
    decisionReason: 'Verified',
  };

  const dummyProvenance = {
    proposedByAgent: 'Match State Analyst',
    auditedByAgent: 'Evidence Auditor',
    producedByAgent: 'Broadcast Producer',
  };

  it('reproduces and resolves the clm_recovery_31 duplicate-key scenario', async () => {
    const scenario = SCENARIO_CATALOG[0]; // Contradiction & Correction scenario
    const seed = scenario.defaultSeed;

    // Simulate intervals up to 30m
    const ev1 = generateSyntheticMatchEvents(scenario.id, 1, 15, seed);
    const ev2 = generateSyntheticMatchEvents(scenario.id, 16, 30, seed);
    const ev3 = generateSyntheticMatchEvents(scenario.id, 31, 45, seed);
    const cumulativeEvents = [...ev1, ...ev2, ...ev3];

    const snap2 = computeIntervalSnapshot(ev2, scenario.intervals[1]);
    const snap3 = computeIntervalSnapshot(ev3, scenario.intervals[2]);

    const tp3 = detectTurningPoints(ev3, snap2, snap3, scenario.intervals[2]);

    // Initial decay claim from interval 2 (16-30m)
    const decayClaim: TruthlineRecord = {
      claimId: 'clm_decay_16',
      version: 1,
      claimText: 'Titans passing accuracy collapsed under high press.',
      category: 'passing_decay',
      epistemicType: 'interpretive',
      teamId: 'home',
      interval: scenario.intervals[1],
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    // First execution of Interval 3 (31-45m)
    const run1 = await executeMultiAgentWorkflow({
      workflowId: 'wf_test_contradiction_1',
      scenarioId: scenario.id,
      snapshot: snap3,
      turningPoints: tp3,
      events: cumulativeEvents,
      existingClaims: [decayClaim],
      currentIntervalIndex: 2,
      isContradictoryPhase: true,
    });

    // Verify first execution produced clm_recovery_31 and superseded clm_decay_16
    assert.strictEqual(run1.activeClaims.length, 2);
    const recoveryClaim1 = run1.activeClaims.find((c) => c.claimId === 'clm_recovery_31');
    assert.ok(recoveryClaim1, 'clm_recovery_31 must exist');
    const supersededClaim = run1.activeClaims.find((c) => c.claimId === 'clm_decay_16');
    assert.ok(supersededClaim, 'clm_decay_16 must exist');
    assert.strictEqual(supersededClaim.status, 'superseded');
    assert.strictEqual(supersededClaim.supersededByClaimId, 'clm_recovery_31');

    // Second execution passing activeClaims that ALREADY CONTAIN clm_recovery_31 (the bug scenario)
    const run2 = await executeMultiAgentWorkflow({
      workflowId: 'wf_test_contradiction_2',
      scenarioId: scenario.id,
      snapshot: snap3,
      turningPoints: tp3,
      events: cumulativeEvents,
      existingClaims: run1.activeClaims, // contains [clm_recovery_31, clm_decay_16]
      currentIntervalIndex: 2,
      isContradictoryPhase: true,
    });

    // Assert that activeClaims is NOT polluted with two clm_recovery_31 entries
    const recoveryMatches = run2.activeClaims.filter((c) => c.claimId === 'clm_recovery_31');
    assert.strictEqual(
      recoveryMatches.length,
      1,
      `Expected exactly 1 clm_recovery_31, but found ${recoveryMatches.length}`
    );

    // Verify all keys in activeClaims are strictly unique
    const allIds = run2.activeClaims.map((c) => c.claimId);
    const uniqueIds = new Set(allIds);
    assert.strictEqual(
      uniqueIds.size,
      allIds.length,
      `Detected duplicate keys in activeClaims: ${allIds.join(', ')}`
    );

    // Verify supersession relationship is preserved
    const decayAfterRun2 = run2.activeClaims.find((c) => c.claimId === 'clm_decay_16');
    assert.ok(decayAfterRun2);
    assert.strictEqual(decayAfterRun2.status, 'superseded');
    assert.strictEqual(decayAfterRun2.supersededByClaimId, 'clm_recovery_31');
  });

  it('deduplicates identical duplicate claims deterministically', () => {
    const claimA: TruthlineRecord = {
      claimId: 'clm_recovery_31',
      version: 1,
      claimText: 'Titans passing recovered to 83%.',
      category: 'tactical_shift',
      epistemicType: 'factual',
      teamId: 'home',
      interval: { startMinute: 31, endMinute: 45, label: "31'-45'" },
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const claimB: TruthlineRecord = {
      ...claimA,
      version: 2,
      claimText: 'Titans passing recovered to 83% through progressive switches.',
    };

    const deduplicated = deduplicateTruthlineRecords([claimA, claimB]);
    assert.strictEqual(deduplicated.length, 1);
    assert.strictEqual(deduplicated[0].claimId, 'clm_recovery_31');
    assert.strictEqual(deduplicated[0].version, 2, 'Higher version must take precedence');
    assert.strictEqual(deduplicated[0].claimText, claimB.claimText);
  });

  it('does NOT merge genuinely distinct claims that collide on claimId', () => {
    // Two distinct claims that collided on ID: one for interval 16-30m and one for 31-45m
    const claim1: TruthlineRecord = {
      claimId: 'clm_press_surge',
      version: 1,
      claimText: 'Away pressure surged in first half.',
      category: 'pressure_surge',
      epistemicType: 'interpretive',
      teamId: 'away',
      interval: { startMinute: 16, endMinute: 30, label: "16'-30'" },
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const claim2: TruthlineRecord = {
      claimId: 'clm_press_surge', // Colliding ID!
      version: 1,
      claimText: 'Away pressure surged again in late interval.',
      category: 'pressure_surge',
      epistemicType: 'interpretive',
      teamId: 'away',
      interval: { startMinute: 31, endMinute: 45, label: "31'-45'" }, // Different interval!
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const result = deduplicateTruthlineRecords([claim1, claim2]);

    // Must NOT merge genuinely distinct claims
    assert.strictEqual(result.length, 2, 'Both distinct claims must be preserved');
    assert.notStrictEqual(
      result[0].claimId,
      result[1].claimId,
      'Distinct claims must have unique IDs'
    );
    assert.strictEqual(result[0].claimId, 'clm_press_surge');
    assert.strictEqual(result[1].claimId, 'clm_press_surge_31_pressure_surge');
  });

  it('strictly preserves supersession links when deduplicating', () => {
    const originalDecay: TruthlineRecord = {
      claimId: 'clm_decay_16',
      version: 1,
      claimText: 'Passing collapsed.',
      category: 'passing_decay',
      epistemicType: 'interpretive',
      teamId: 'home',
      interval: { startMinute: 16, endMinute: 30, label: "16'-30'" },
      status: 'superseded',
      supersededByClaimId: 'clm_recovery_31',
      supersessionReason: 'Rebound observed in minute 31-45.',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const recoveryClaimDuplicate1: TruthlineRecord = {
      claimId: 'clm_recovery_31',
      version: 1,
      claimText: 'Passing rebounded to 83%.',
      category: 'tactical_shift',
      epistemicType: 'factual',
      teamId: 'home',
      interval: { startMinute: 31, endMinute: 45, label: "31'-45'" },
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const recoveryClaimDuplicate2: TruthlineRecord = {
      ...recoveryClaimDuplicate1,
    };

    const result = deduplicateTruthlineRecords([
      recoveryClaimDuplicate1,
      recoveryClaimDuplicate2,
      originalDecay,
    ]);

    assert.strictEqual(result.length, 2);
    const decay = result.find((c) => c.claimId === 'clm_decay_16');
    assert.ok(decay);
    assert.strictEqual(decay.status, 'superseded');
    assert.strictEqual(decay.supersededByClaimId, 'clm_recovery_31');
    assert.strictEqual(decay.supersessionReason, 'Rebound observed in minute 31-45.');
  });

  it('correctly compares logical claim identity and generates disambiguated IDs', () => {
    const claim1: TruthlineRecord = {
      claimId: 'clm_test_1',
      version: 1,
      claimText: 'Test claim 1',
      category: 'passing_decay',
      epistemicType: 'interpretive',
      teamId: 'home',
      interval: { startMinute: 16, endMinute: 30, label: "16'-30'" },
      status: 'verified',
      audit: dummyAudit,
      revisions: [],
      provenance: dummyProvenance,
    };

    const sameClaimDifferentText: TruthlineRecord = {
      ...claim1,
      claimText: 'Updated text for test claim 1',
    };

    const differentIntervalClaim: TruthlineRecord = {
      ...claim1,
      interval: { startMinute: 31, endMinute: 45, label: "31'-45'" },
    };

    assert.strictEqual(areSameLogicalClaim(claim1, sameClaimDifferentText), true);
    assert.strictEqual(areSameLogicalClaim(claim1, differentIntervalClaim), false);

    const seenIds = new Set(['clm_test_1']);
    const disambiguated = disambiguateDistinctClaimId(differentIntervalClaim, seenIds);
    assert.strictEqual(disambiguated, 'clm_test_1_31_passing_decay');
  });
});
