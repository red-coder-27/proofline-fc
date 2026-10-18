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
export function areSameLogicalClaim(a: TruthlineRecord, b: TruthlineRecord): boolean {
  if (a.claimId === b.claimId) {
    // If IDs match, check if they describe the same interval and category
    return (
      a.interval.startMinute === b.interval.startMinute &&
      a.interval.endMinute === b.interval.endMinute &&
      a.category === b.category
    );
  }

  // Same interval and same category is the same tactical insight
  return (
    a.interval.startMinute === b.interval.startMinute &&
    a.interval.endMinute === b.interval.endMinute &&
    a.category === b.category &&
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
  const isSuperseded = primary.status === 'superseded' || secondary.status === 'superseded';
  const supersededByClaimId =
    primary.supersededByClaimId || secondary.supersededByClaimId;
  const supersessionReason =
    primary.supersessionReason || secondary.supersessionReason;

  // Combine revisions if one has more historical context
  const revisions =
    primary.revisions.length >= secondary.revisions.length
      ? primary.revisions
      : secondary.revisions;

  return {
    ...primary,
    status: isSuperseded ? 'superseded' : primary.status,
    supersededByClaimId: isSuperseded ? supersededByClaimId : primary.supersededByClaimId,
    supersessionReason: isSuperseded ? supersessionReason : primary.supersessionReason,
    revisions,
    broadcastDecision: primary.broadcastDecision || secondary.broadcastDecision,
  };
}

/**
 * Deterministically deduplicates an array of Truthline claims.
 * - Same claim duplicates are merged, keeping latest version and supersession links.
 * - Distinct claims with colliding IDs are disambiguated with stable unique IDs.
 * - All React keys rendered from the resulting array are guaranteed unique and stable.
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

    const existingIndex = claimIdMap.get(claim.claimId);

    if (existingIndex === undefined) {
      // First time seeing this claimId
      result.push(claim);
      claimIdMap.set(claim.claimId, result.length - 1);
      seenIds.add(claim.claimId);
    } else {
      const existingRecord = result[existingIndex];

      if (areSameLogicalClaim(existingRecord, claim)) {
        // Same logical claim revision duplicate: merge deterministically
        const merged = mergeDuplicateSameClaim(existingRecord, claim);
        result[existingIndex] = merged;
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

  return result;
}
