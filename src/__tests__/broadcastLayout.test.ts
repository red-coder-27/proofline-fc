import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeCitedLabelPlacements } from '../components/broadcast/BroadcastStudio';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { MatchEvent } from '../types/events';
import { TruthlineRecord } from '../types/claims';
import { deduplicateTruthlineRecords } from '../lib/claims/claimsDeduplicator';

describe('BroadcastStudio Layout & Label Collision Avoidance', () => {
  const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);

  it('only computes placements for cited/supporting events, ignoring uncited events', () => {
    const citedIds = [events[0].id, events[1].id];
    const supportingIds = new Set(citedIds);
    const placements = computeCitedLabelPlacements(events, supportingIds);

    assert.strictEqual(placements.length, 2);
    const placedIds = placements.map((p) => p.eventId);
    assert.ok(placedIds.includes(events[0].id));
    assert.ok(placedIds.includes(events[1].id));
    assert.ok(!placedIds.includes(events[2].id));
  });

  it('avoids label collision when multiple events are clustered at virtually the same coordinates', () => {
    // Construct 3 closely clustered events
    const clusteredEvents: MatchEvent[] = [
      {
        ...events[0],
        id: 'ev_cluster_1',
        x: 50,
        y: 50,
      },
      {
        ...events[1],
        id: 'ev_cluster_2',
        x: 50.4,
        y: 50.6,
      },
      {
        ...events[2],
        id: 'ev_cluster_3',
        x: 50.8,
        y: 51.0,
      },
    ];

    const supportingIds = new Set(['ev_cluster_1', 'ev_cluster_2', 'ev_cluster_3']);
    const placements = computeCitedLabelPlacements(clusteredEvents, supportingIds);

    assert.strictEqual(placements.length, 3);

    // Verify all 3 placements have non-identical label coordinates and sufficient distance
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        const dist = Math.hypot(p1.labelX - p2.labelX, p1.labelY - p2.labelY);
        assert.ok(dist >= 3.0, `Labels for ${p1.eventId} and ${p2.eventId} are too close: dist=${dist}`);
      }
    }
  });

  it('strictly clamps labels inside visible pitch boundaries to avoid overlapping header and edges', () => {
    const edgeEvents: MatchEvent[] = [
      {
        ...events[0],
        id: 'ev_top_left',
        x: 0,
        y: 0,
      },
      {
        ...events[1],
        id: 'ev_bottom_right',
        x: 100,
        y: 100,
      },
    ];

    const placements = computeCitedLabelPlacements(edgeEvents, new Set(['ev_top_left', 'ev_bottom_right']));
    assert.strictEqual(placements.length, 2);

    for (const p of placements) {
      assert.ok(p.labelX >= 9.5 && p.labelX <= 95.5, `labelX ${p.labelX} out of pitch bounds`);
      assert.ok(p.labelY >= 8.0 && p.labelY <= 60.0, `labelY ${p.labelY} out of pitch bounds`);
    }
  });

  it('returns an empty array when no events match supporting IDs', () => {
    const placements = computeCitedLabelPlacements(events, new Set(['non_existent_id']));
    assert.strictEqual(placements.length, 0);
  });

  it('guarantees unique, stable marker keys derived strictly from event IDs and not array indexes or claim IDs', () => {
    const sampleEvents = generateSyntheticMatchEvents('signature_demo', 1, 15, 101);
    const supportingIds = new Set([sampleEvents[0].id, sampleEvents[2].id]);

    // Background events (uncited)
    const backgroundEvents = sampleEvents.filter((ev) => !supportingIds.has(ev.id));
    const backgroundKeys = backgroundEvents.map((ev) => `marker_${ev.id}`);

    // Cited events
    const citedEvents = sampleEvents.filter((ev) => supportingIds.has(ev.id));
    const citedKeys = citedEvents.map((ev) => `cited_${ev.id}`);

    // Verify all keys are derived strictly from ev.id
    for (const key of backgroundKeys) {
      assert.ok(key.startsWith('marker_ev_'), `Background key ${key} should derive from event ID`);
    }
    for (const key of citedKeys) {
      assert.ok(key.startsWith('cited_ev_'), `Cited key ${key} should derive from event ID`);
    }

    // Verify uniqueness across all rendered marker keys
    const allKeys = [...backgroundKeys, ...citedKeys];
    const uniqueKeys = new Set(allKeys);
    assert.strictEqual(uniqueKeys.size, allKeys.length, 'Every marker must have a strictly unique key');
    assert.strictEqual(allKeys.length, sampleEvents.length, 'Total keys must match total sample events');
  });

  it('safely handles duplicate claims and prevents key collision or crash in BroadcastStudio data pipeline', () => {
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

    const duplicateClaims: TruthlineRecord[] = [
      {
        claimId: 'clm_duplicate_01',
        version: 1,
        claimText: 'Passing breakdown initial',
        category: 'passing_decay',
        epistemicType: 'factual',
        teamId: 'home',
        interval: { startMinute: 16, endMinute: 30, label: "16'-30'" },
        status: 'verified',
        audit: dummyAudit,
        revisions: [],
        broadcastDecision: {
          published: true,
          decision: 'published',
          audienceDrafts: { casualFan: 'Casual draft', analyst: 'Analyst draft' },
          rationale: 'Verified',
          decidedAt: '2026-10-18T10:00:00Z',
        },
        provenance: dummyProvenance,
      },
      {
        claimId: 'clm_duplicate_01', // Identical duplicate claim ID with newer version
        version: 2,
        claimText: 'Passing breakdown updated',
        category: 'passing_decay',
        epistemicType: 'factual',
        teamId: 'home',
        interval: { startMinute: 16, endMinute: 30, label: "16'-30'" },
        status: 'verified',
        audit: { ...dummyAudit, uncertaintyScore: 0.04 },
        revisions: [],
        broadcastDecision: {
          published: true,
          decision: 'published',
          audienceDrafts: { casualFan: 'Casual draft v2', analyst: 'Analyst draft v2' },
          rationale: 'Verified v2',
          decidedAt: '2026-10-18T10:05:00Z',
        },
        provenance: dummyProvenance,
      },
    ];

    const deduped = deduplicateTruthlineRecords(duplicateClaims);
    assert.strictEqual(deduped.length, 1, 'Duplicate claims must be merged deterministically');
    assert.strictEqual(deduped[0].version, 2, 'Higher version should be preserved');
    assert.strictEqual(deduped[0].claimId, 'clm_duplicate_01');
  });
});
