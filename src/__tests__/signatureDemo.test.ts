import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { computeIntervalSnapshot } from '../lib/eventEngine/statsCalculator';
import { initializeSignatureDemo, advanceSignatureDemoToPhase3And4 } from '../lib/scenarios/signatureDemo';

describe('Signature Demo Contradiction and Supersession Lifecycle', () => {
  it('executes the full 6-phase signature lifecycle end-to-end', async () => {
    // 1. Initialize Signature Demo (Interval 01-15m baseline and 16-30m decay)
    const initialDemoState = await initializeSignatureDemo();
    assert.strictEqual(initialDemoState.currentPhase, 2);
    assert.ok(initialDemoState.events.length > 30, 'Should generate events for intervals 1 & 2');
    assert.ok(initialDemoState.truthlineClaims.length >= 1, 'Should produce initial claim');

    const initialClaim = initialDemoState.truthlineClaims[0];
    assert.strictEqual(initialClaim.status, 'verified', 'Initial claim must be verified');
    assert.strictEqual(initialClaim.category, 'passing_decay');
    assert.ok(initialClaim.broadcastDecision?.published, 'Verified initial claim must be approved for broadcast');

    // 2. Advance to Phase 3 & 4: Inject Contradictory Evidence (Interval 31-45m)
    const advancedDemoState = await advanceSignatureDemoToPhase3And4(initialDemoState);
    assert.strictEqual(advancedDemoState.currentPhase, 4);
    assert.strictEqual(advancedDemoState.truthlineClaims.length, 2, 'Must retain BOTH historical claims');

    // 3. Confirm Previous Claim is Marked SUPERSEDED (not deleted or silently overwritten)
    const priorClaim = advancedDemoState.truthlineClaims.find((c) => c.category === 'passing_decay');
    assert.ok(priorClaim, 'Prior passing decay claim must still exist in Truthline');
    assert.strictEqual(priorClaim?.status, 'superseded', 'Prior claim must transition to superseded');
    assert.ok(priorClaim?.supersededByClaimId, 'Must record superseding claim ID link');
    assert.ok(
      priorClaim?.supersessionReason?.includes('rebounded') ||
        priorClaim?.supersessionReason?.includes('invalidating'),
      'Must explain why the explanation was superseded'
    );

    // 4. Confirm Revised Narrative Reached Broadcast
    const revisedClaim = advancedDemoState.truthlineClaims.find((c) => c.category === 'tactical_shift');
    assert.ok(revisedClaim, 'Revised tactical shift claim must exist');
    assert.strictEqual(revisedClaim?.status, 'verified');
    assert.ok(revisedClaim?.broadcastDecision?.audienceDrafts?.casualFan && revisedClaim.broadcastDecision.audienceDrafts.casualFan.length > 0);
    assert.ok(revisedClaim?.broadcastDecision?.audienceDrafts?.analyst && revisedClaim.broadcastDecision.audienceDrafts.analyst.length > 0);
  });

  it('guarantees reset returns state to a reproducible initial interval', async () => {
    const seed = 42;
    const eventsRun1 = generateSyntheticMatchEvents('signature_demo', 1, 15, seed);
    const snapRun1 = computeIntervalSnapshot(eventsRun1, { startMinute: 1, endMinute: 15, label: "01'-15'" });

    // Simulate reset by generating interval 01-15m again with identical seed
    const eventsReset = generateSyntheticMatchEvents('signature_demo', 1, 15, seed);
    const snapReset = computeIntervalSnapshot(eventsReset, { startMinute: 1, endMinute: 15, label: "01'-15'" });

    assert.strictEqual(eventsRun1.length, eventsReset.length);
    assert.strictEqual(snapRun1.home.passingSuccessRate, snapReset.home.passingSuccessRate);
    assert.strictEqual(snapRun1.away.pressureFrequencyPerMin, snapReset.away.pressureFrequencyPerMin);
    assert.strictEqual(snapRun1.momentumDelta, snapReset.momentumDelta);
  });
});
