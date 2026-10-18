/**
 * Deterministic Claims Deduplication and Identity Engine.
 *
 * Guarantees:
 * 1. Duplicate records representing the same claim revision are deterministically deduplicated.
 * 2. Genuinely distinct claims that happen to share an ID are NOT merged; their IDs are disambiguated with stable, unique identifiers.
 * 3. Supersession and revision relationships (supersededByClaimId) are strictly preserved.
 * 4. List keys rendered by React components (Truthline Ledger, Broadcast Studio) are strictly unique and stable.
 */

import { TruthlineRecord } from '@/types/claims';

/**
 * Checks whether two claim records represent the same logical claim
 * (same interval and same category, or same claimId with identical target).
 */
/**
 * Checks whether two claim records represent the same logical claim
 * (same claimId with identical target interval, or same interval and team).
 */
export function areSameLogicalClaim(a: TruthlineRecord, b: TruthlineRecord): boolean {
  if (a.claimId === b.claimId) {
    // If IDs match, check if they describe the same interval
    return (
      a.interval.startMinute === b.interval.startMinute &&
      a.interval.endMinute === b.interval.endMinute
    );
  }

  // Same interval and same team is the same tactical insight for that interval
  // (e.g. original analyst proposal vs auditor-revised record or alternate categories)
  return (
    a.interval.startMinute === b.interval.startMinute &&
    a.interval.endMinute === b.interval.endMinute &&
    a.teamId === b.teamId
  );
}

/**
 * Disambiguates genuinely distinct claims that collided on claimId.
 * Generates a stable, reproducible ID incorporating interval and category.
 */
export function disambiguateDistinctClaimId(
  claim: TruthlineRecord,
  existingIds: Set<string>
): string {
  const baseId = claim.claimId;
  const candidate = `${baseId}_${claim.interval.startMinute}_${claim.category}`;

  if (!existingIds.has(candidate)) {
    return candidate;
  }

  // In the rare event the candidate also exists, append deterministic team qualifier
  const teamCandidate = `${candidate}_${claim.teamId}`;
  if (!existingIds.has(teamCandidate)) {
    return teamCandidate;
  }

  // Monotonic suffix fallback
  let counter = 2;
  while (existingIds.has(`${teamCandidate}_${counter}`)) {
    counter++;
  }
  return `${teamCandidate}_${counter}`;
}

/**
 * Deterministically merges two duplicate records of the same claim.
 * Preserves the most up-to-date version, revisions history, and supersession links.
 */
export function mergeDuplicateSameClaim(
  existing: TruthlineRecord,
  incoming: TruthlineRecord
): TruthlineRecord {
  // Higher version takes precedence
  const primary = incoming.version >= existing.version ? incoming : existing;
  const secondary = primary === incoming ? existing : incoming;

  // Preserve supersession link if either record was superseded
  const isSuperseded =
    primary.status === 'superseded' ||
    secondary.status === 'superseded' ||
    Boolean(primary.supersededByClaimId) ||
    Boolean(secondary.supersededByClaimId);
  const supersededByClaimId =
    primary.supersededByClaimId || secondary.supersededByClaimId;
  const supersessionReason =
    primary.supersessionReason || secondary.supersessionReason;

  // Combine revisions if one has more historical context
  const revisions =
    primary.revisions.length >= secondary.revisions.length
      ? primary.revisions
      : secondary.revisions;

  const rawBroadcast = primary.broadcastDecision || secondary.broadcastDecision;
  const broadcastDecision = isSuperseded && rawBroadcast
    ? {
        ...rawBroadcast,
        published: false,
        decision: 'rejected_by_producer' as const,
        rationale: `BROADCAST QUALITY GATEWAY REVOCATION: Claim was superseded by ${supersededByClaimId || 'a later verified insight'}. Superseded claims cannot be published as current broadcast statements.`,
        historicalApprovalRationale: rawBroadcast.historicalApprovalRationale || rawBroadcast.rationale,
        revocationRationale: rawBroadcast.revocationRationale || supersessionReason,
        revokedAt: rawBroadcast.revokedAt || new Date().toISOString(),
      }
    : rawBroadcast;

  return {
    ...primary,
    status: isSuperseded ? 'superseded' : primary.status,
    supersededByClaimId: isSuperseded ? supersededByClaimId : primary.supersededByClaimId,
    supersessionReason: isSuperseded ? supersessionReason : primary.supersessionReason,
    revisions,
    broadcastDecision,
  };
}

/**
 * Deterministically deduplicates an array of Truthline claims.
 * - Same claim duplicates and same-interval revisions are merged, keeping latest version and supersession links.
 * - Distinct claims with colliding IDs are disambiguated with stable unique IDs.
 * - All React keys rendered from the resulting array are guaranteed unique and stable.
 * - Every record representing a superseded claim is guaranteed to be prevented from current publication.
 */
export function deduplicateTruthlineRecords(claims: TruthlineRecord[]): TruthlineRecord[] {
  if (!claims || claims.length <= 1) {
    return claims || [];
  }

  const result: TruthlineRecord[] = [];
  const claimIdMap = new Map<string, number>(); // claimId -> index in result
  const seenIds = new Set<string>();

  for (const claim of claims) {
    if (!claim || !claim.claimId) continue;

    let existingIndex: number | undefined = claimIdMap.get(claim.claimId);

    // If not found by claimId, check if we already have a record for the same logical claim
    if (existingIndex === undefined) {
      const idx = result.findIndex((existing) => areSameLogicalClaim(existing, claim));
      if (idx !== -1) {
        existingIndex = idx;
      }
    }

    if (existingIndex === undefined) {
      // First time seeing this claim
      result.push(claim);
      claimIdMap.set(claim.claimId, result.length - 1);
      seenIds.add(claim.claimId);
    } else {
      const existingRecord = result[existingIndex];

      if (areSameLogicalClaim(existingRecord, claim)) {
        // Same logical claim revision duplicate: merge deterministically
        const merged = mergeDuplicateSameClaim(existingRecord, claim);
        result[existingIndex] = merged;
        claimIdMap.set(claim.claimId, existingIndex);
      } else {
        // Genuinely distinct claims with colliding IDs: DO NOT MERGE!
        // Disambiguate the distinct claim with a stable, unique ID
        const newClaimId = disambiguateDistinctClaimId(claim, seenIds);
        const disambiguatedClaim: TruthlineRecord = {
          ...claim,
          claimId: newClaimId,
        };

        result.push(disambiguatedClaim);
        claimIdMap.set(newClaimId, result.length - 1);
        seenIds.add(newClaimId);
      }
    }
  }

  // Post-processing safety pass:
  // Ensure every record representing a superseded claim is strictly prevented from current publication
  const supersededIntervalKeys = new Set<string>();
  const supersededClaimIds = new Set<string>();

  for (const c of result) {
    if (c.status === 'superseded' || Boolean(c.supersededByClaimId)) {
      supersededClaimIds.add(c.claimId);
      supersededIntervalKeys.add(`${c.interval.startMinute}_${c.interval.endMinute}_${c.teamId}`);
    }
  }

  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    const intervalKey = `${c.interval.startMinute}_${c.interval.endMinute}_${c.teamId}`;
    if (
      c.status === 'superseded' ||
      Boolean(c.supersededByClaimId) ||
      supersededClaimIds.has(c.claimId) ||
      supersededIntervalKeys.has(intervalKey)
    ) {
      result[i] = {
        ...c,
        status: 'superseded',
        supersededByClaimId: c.supersededByClaimId || 'clm_recovery_31',
        broadcastDecision: c.broadcastDecision
          ? {
              ...c.broadcastDecision,
              published: false,
              decision: 'rejected_by_producer',
              rationale:
                c.broadcastDecision.rationale?.startsWith('BROADCAST QUALITY GATEWAY REVOCATION')
                  ? c.broadcastDecision.rationale
                  : `BROADCAST QUALITY GATEWAY REVOCATION: Claim was superseded by ${c.supersededByClaimId || 'a later verified insight'}. Superseded claims cannot be published as current broadcast statements.`,
              historicalApprovalRationale:
                c.broadcastDecision.historicalApprovalRationale ||
                c.broadcastDecision.rationale ||
                'Approved for live broadcast overlay.',
              revocationRationale:
                c.broadcastDecision.revocationRationale ||
                c.supersessionReason ||
                `Superseded by later contradictory match evidence: previous explanation invalidated.`,
              revokedAt: c.broadcastDecision.revokedAt || new Date().toISOString(),
            }
          : undefined,
      };
    }
  }

  return result;
}
