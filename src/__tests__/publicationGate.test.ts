import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBroadcastPublicationGate } from '../lib/verificationEngine/publicationGate';
import { verifyCandidateClaim, CandidateClaimInput } from '../lib/verificationEngine/verifier';
import { runBroadcastProducer } from '../lib/agents/broadcastProducer';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { computeIntervalSnapshot } from '../lib/eventEngine/statsCalculator';
import { verifyNumericAssertion } from '../lib/verificationEngine/rules';

describe('Centralized Publication Gate & Adversarial Security Policy', () => {
  const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
  const snap = computeIntervalSnapshot(events, {
    startMinute: 16,
    endMinute: 30,
    label: "16'-30'",
  });
  const validEventIds = events.filter((e) => e.teamId === 'home').slice(0, 4).map((e) => e.id);

  it('valid verified statements remain publishable', () => {
    const validCandidate: CandidateClaimInput = {
      claimId: 'clm_valid_01',
      claimText: 'London Titans passing accuracy fell to 58%, coinciding with opponent pressure.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    const audit = verifyCandidateClaim(validCandidate, events, snap, events.length);
    assert.strictEqual(audit.outcome, 'accepted');

    const decision = runBroadcastProducer(
      validCandidate.claimText,
      audit,
      snap,
      'passing_decay',
      {
        claimStatus: 'verified',
        activeEvents: events,
      }
    );

    assert.strictEqual(decision.published, true);
    assert.strictEqual(decision.decision, 'published');
    assert.ok(decision.audienceDrafts?.casualFan);
    assert.ok(decision.audienceDrafts?.analyst);
  });

  it('a forged verified status cannot bypass publication checks (must have authentic audit)', () => {
    // Malicious caller passes status: 'verified', but the audit outcome is rejected or missing checks
    const fakeAudit = verifyCandidateClaim(
      {
        claimId: 'clm_forged_01',
        claimText: 'London Titans midfield collapsed completely.',
        category: 'passing_decay',
        targetInterval: snap.interval,
        referencedEventIds: ['ev_phantom_fake_01'], // Nonexistent event
        numericAssertions: [],
      },
      events,
      snap,
      events.length
    );

    assert.strictEqual(fakeAudit.outcome, 'rejected');

    // Attempt to bypass by forging claimStatus: 'verified' in publication gate input
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: 'clm_forged_01',
      claimStatus: 'verified', // FORGED!
      claimText: 'London Titans midfield collapsed completely.',
      category: 'passing_decay',
      interval: snap.interval,
      audit: fakeAudit, // Audit is actually rejected!
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Forged verified status must be rejected by publication gate');
    assert.strictEqual(gateDecision.decision, 'rejected_by_producer');
    assert.ok(
      gateDecision.policyViolations.some((v) => v.includes('rejected by evidence audit') || v.includes('Forged verification status'))
    );
  });

  it('a superseded claim cannot be published as currently valid', () => {
    const validCandidate: CandidateClaimInput = {
      claimId: 'clm_prior_decay',
      claimText: 'London Titans passing accuracy fell to 58%.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    const audit = verifyCandidateClaim(validCandidate, events, snap, events.length);
    assert.strictEqual(audit.outcome, 'accepted');

    // Claim is superseded by interval 31-45 adaptation
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: validCandidate.claimId,
      claimStatus: 'superseded', // Stale/superseded status
      isSuperseded: true,
      claimText: validCandidate.claimText,
      category: validCandidate.category,
      interval: snap.interval,
      audit,
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Superseded claims must NEVER be published as current');
    assert.strictEqual(gateDecision.decision, 'rejected_by_producer');
    assert.ok(gateDecision.policyViolations.some((v) => v.includes('Superseded claims cannot be published')));
  });

  it('an unsupported number added by the producer is strictly blocked', () => {
    const validCandidate: CandidateClaimInput = {
      claimId: 'clm_valid_num',
      claimText: 'London Titans passing dropped to 58%.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    const audit = verifyCandidateClaim(validCandidate, events, snap, events.length);

    // Draft maliciously or accidentally introduces an unsupported figure: e.g. "99.4%" or "88.0%"
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: validCandidate.claimId,
      claimStatus: 'verified',
      claimText: validCandidate.claimText,
      category: validCandidate.category,
      interval: snap.interval,
      audit,
      proposedDrafts: {
        casualFan: 'Titans passing struggled.',
        analyst: `Tactical breakdown: London Titans recorded 99.4% passing (unsupported fabricated stat).`,
      },
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Producer draft with unsupported numeric assertion must be blocked');
    assert.ok(gateDecision.policyViolations.some((v) => v.includes('99.4%') || v.includes('Unsupported numeric figure')));
  });

  it('an unsupported causal explanation in producer text is blocked', () => {
    const validCandidate: CandidateClaimInput = {
      claimId: 'clm_valid_corr',
      claimText: 'London Titans passing accuracy coincided with Munich pressing.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    const audit = verifyCandidateClaim(validCandidate, events, snap, events.length);

    // Draft introduces unverified causal claim: "directly led to"
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: validCandidate.claimId,
      claimStatus: 'verified',
      claimText: validCandidate.claimText,
      category: validCandidate.category,
      interval: snap.interval,
      audit,
      proposedDrafts: {
        casualFan: 'Munich pressure directly led to complete tactical failure.',
        analyst: 'Verified correlation.',
      },
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Producer draft with causal trigger words must be blocked');
    assert.ok(gateDecision.policyViolations.some((v) => v.includes('directly led to') || v.includes('causal')));
  });

  it('an invented tactical mechanism in producer text is blocked', () => {
    const validCandidate: CandidateClaimInput = {
      claimId: 'clm_valid_tactical',
      claimText: 'London Titans passing accuracy changed.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    const audit = verifyCandidateClaim(validCandidate, events, snap, events.length);

    // Draft includes invented phrase "bypassed pressing traps"
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: validCandidate.claimId,
      claimStatus: 'verified',
      claimText: validCandidate.claimText,
      category: validCandidate.category,
      interval: snap.interval,
      audit,
      proposedDrafts: {
        casualFan: 'Titans responded.',
        analyst: 'Titans bypassed pressing traps with progressive vertical distribution.',
      },
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Draft with unverified tactical speculation must be blocked');
    assert.ok(gateDecision.policyViolations.some((v) => v.includes('bypassed pressing traps')));
  });

  it('a claim citing events outside active interval is withheld', () => {
    // Event from minute 5 cited in interval 16-30
    const outOfIntervalEvent = generateSyntheticMatchEvents('signature_demo', 1, 15, 42)[0];

    const candidate: CandidateClaimInput = {
      claimId: 'clm_cross_interval',
      claimText: 'Passing accuracy collapsed.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: [outOfIntervalEvent.id],
      numericAssertions: [],
    };

    const audit = verifyCandidateClaim(candidate, [...events, outOfIntervalEvent], snap, events.length);

    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: candidate.claimId,
      claimStatus: 'verified',
      claimText: candidate.claimText,
      category: candidate.category,
      interval: snap.interval,
      audit,
      activeEvents: events, // outOfIntervalEvent is not in interval 16-30 events!
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Cross-interval event citation must be blocked');
  });

  it('a passing audit from a different claim cannot be replayed to authorize publication', () => {
    // Generate genuine valid audit for Claim A
    const validCandidateA: CandidateClaimInput = {
      claimId: 'clm_legitimate_A',
      claimText: 'London Titans passing accuracy fell to 58%, coinciding with opponent pressure.',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: validEventIds,
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };
    const validAuditA = verifyCandidateClaim(validCandidateA, events, snap, events.length);
    assert.strictEqual(validAuditA.outcome, 'accepted');

    // Attempt to publish an unverified Claim B by replaying Claim A's audit
    const gateDecision = evaluateBroadcastPublicationGate({
      claimId: 'clm_unverified_B', // Different claim ID!
      claimStatus: 'verified',
      claimText: 'London Titans are completely broken tactically (unverified insight).',
      category: 'passing_decay',
      interval: snap.interval,
      audit: validAuditA, // Replayed audit from Claim A
      activeEvents: events,
      activeSnapshot: snap,
    });

    assert.strictEqual(gateDecision.canPublish, false, 'Audit replay across different claims must be rejected');
    assert.strictEqual(gateDecision.decision, 'rejected_by_producer');
    assert.ok(
      gateDecision.policyViolations.some((v) => v.includes('Audit mismatch') && v.includes('clm_legitimate_A')),
      'Must flag audit-claim mismatch violation'
    );
  });

  it('numeric integrity: validates exact 56.3% recalculation and boundary tolerances (rejects 58.3% discrepancy)', () => {
    // 1. Authoritative ground truth check: exactly 18 successful passes out of 32 total (56.25% rounds to 56.3%)
    assert.strictEqual(snap.home.successfulPasses, 18);
    assert.strictEqual(snap.home.totalPasses, 32);
    assert.strictEqual(snap.home.passingSuccessRate, 56.3);

    // 2. Exact match: claimed 56.3% vs true 56.3%
    const exactCheck = verifyNumericAssertion('passingSuccessRate', 56.3, snap.home);
    assert.strictEqual(exactCheck.matches, true);
    assert.strictEqual(exactCheck.recalculatedValue, 56.3);
    assert.strictEqual(exactCheck.tolerance, 1.5);

    // 3. Exact boundary acceptance: claimed 57.8% (diff = 1.5 <= 1.5)
    const upperBoundary = verifyNumericAssertion('passingSuccessRate', 57.8, snap.home);
    assert.strictEqual(upperBoundary.matches, true, 'Value exactly at boundary must pass');

    // 4. Exact lower boundary acceptance: claimed 54.8% (diff = 1.5 <= 1.5)
    const lowerBoundary = verifyNumericAssertion('passingSuccessRate', 54.8, snap.home);
    assert.strictEqual(lowerBoundary.matches, true, 'Lower value exactly at boundary must pass');

    // 5. Immediately beyond upper boundary: claimed 57.81% (diff = 1.51 > 1.5)
    const beyondUpper = verifyNumericAssertion('passingSuccessRate', 57.81, snap.home);
    assert.strictEqual(beyondUpper.matches, false, 'Value immediately beyond boundary must fail');

    // 6. The 2-percentage-point discrepancy (claimed 58.3% vs true 56.3%): diff = 2.0% > 1.5%
    const discrepancyCheck = verifyNumericAssertion('passingSuccessRate', 58.3, snap.home);
    assert.strictEqual(discrepancyCheck.matches, false, '58.3% vs 56.3% discrepancy must strictly fail verification');

    // 7. Pressure frequency boundaries (default tolerance 0.2/min, true is 2.87/min)
    assert.strictEqual(snap.away.pressureFrequencyPerMin, 2.87);
    const pressureExact = verifyNumericAssertion('pressureFrequencyPerMin', 2.87, snap.away);
    assert.strictEqual(pressureExact.matches, true);
    const pressureBoundary = verifyNumericAssertion('pressureFrequencyPerMin', 3.07, snap.away);
    assert.strictEqual(pressureBoundary.matches, true, 'Pressure exactly at 0.2 boundary must pass');
    const pressureBeyond = verifyNumericAssertion('pressureFrequencyPerMin', 3.08, snap.away);
    assert.strictEqual(pressureBeyond.matches, false, 'Pressure beyond 0.2 boundary must fail');
  });

  it('rejects unknown metric names and non-finite values safely', () => {
    const unknownMetric = verifyNumericAssertion('fabricated_expected_goals', 2.5, snap.home);
    assert.strictEqual(unknownMetric.matches, false);
    assert.ok(Number.isNaN(unknownMetric.recalculatedValue));

    const nanValue = verifyNumericAssertion('passingSuccessRate', NaN, snap.home);
    assert.strictEqual(nanValue.matches, false);
    assert.ok(Number.isNaN(nanValue.recalculatedValue));

    const infValue = verifyNumericAssertion('passingSuccessRate', Infinity, snap.home);
    assert.strictEqual(infValue.matches, false);
    assert.ok(Number.isNaN(infValue.recalculatedValue));
  });
});
