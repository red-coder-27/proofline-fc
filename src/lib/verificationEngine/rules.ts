/**
 * Verification Rules and Validation Logic.
 * Deterministic checks for event existence, interval bounds,
 * recalculation of numeric figures, and detection of counter-evidence.
 */

import { MatchEvent } from '@/types/events';
import { IntervalWindow, TeamIntervalMetrics } from '@/types/stats';
import { CounterEvidenceItem, NumericAssertion } from '@/types/claims';

export interface EventReferenceCheck {
  allValid: boolean;
  validCount: number;
  totalRequested: number;
  missingIds: string[];
  mismatchedIntervalIds: string[];
}

export const SUPPORTED_METRICS = [
  'passingSuccessRate',
  'pressureFrequencyPerMin',
  'highTurnovers',
  'progressiveMeters',
  'totalPasses',
  'successfulPasses',
  'failedPasses',
  'shotsTotal',
  'shotsOnTarget',
] as const;

export type SupportedMetric = (typeof SUPPORTED_METRICS)[number];

export function isSupportedMetric(metric: string): metric is SupportedMetric {
  return (SUPPORTED_METRICS as readonly string[]).includes(metric);
}

export function validateEventReferences(
  referencedIds: string[],
  availableEvents: MatchEvent[],
  expectedInterval: IntervalWindow
): EventReferenceCheck {
  if (!referencedIds || !Array.isArray(referencedIds) || referencedIds.length === 0) {
    return {
      allValid: false,
      validCount: 0,
      totalRequested: 0,
      missingIds: [],
      mismatchedIntervalIds: [],
    };
  }

  const eventMap = new Map<string, MatchEvent>();
  for (const ev of availableEvents) {
    eventMap.set(ev.id, ev);
  }

  // Deduplicate requested IDs so repeated IDs cannot inflate validCount
  const uniqueRequested = Array.from(new Set(referencedIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
  const missingIds: string[] = [];
  const mismatchedIntervalIds: string[] = [];
  let validCount = 0;

  for (const id of uniqueRequested) {
    const ev = eventMap.get(id);
    if (!ev) {
      missingIds.push(id);
    } else if (ev.minute < expectedInterval.startMinute || ev.minute > expectedInterval.endMinute) {
      mismatchedIntervalIds.push(id);
    } else {
      validCount++;
    }
  }

  const allValid =
    missingIds.length === 0 &&
    mismatchedIntervalIds.length === 0 &&
    validCount > 0 &&
    validCount === uniqueRequested.length;

  return {
    allValid,
    validCount,
    totalRequested: referencedIds.length,
    missingIds,
    mismatchedIntervalIds,
  };
}

export function verifyNumericAssertion(
  metricName: string,
  claimedValue: number,
  actualMetrics: TeamIntervalMetrics | { home: TeamIntervalMetrics; away: TeamIntervalMetrics },
  tolerance?: number,
  unit = '%',
  teamId?: 'home' | 'away'
): NumericAssertion {
  // 1. Strict metric existence check: Unknown metrics MUST FAIL CLOSED
  if (!isSupportedMetric(metricName)) {
    return {
      metricName,
      claimedValue,
      recalculatedValue: NaN,
      tolerance: tolerance ?? 1.5,
      matches: false,
      unit,
    };
  }

  // 2. Reject non-finite numbers (NaN, Infinity, -Infinity)
  if (!Number.isFinite(claimedValue)) {
    return {
      metricName,
      claimedValue,
      recalculatedValue: NaN,
      tolerance: tolerance ?? 1.5,
      matches: false,
      unit,
    };
  }

  let targetMetrics: TeamIntervalMetrics;
  if ('home' in actualMetrics && 'away' in actualMetrics) {
    const targetTeam = teamId || (metricName.toLowerCase().includes('pressure') ? 'away' : 'home');
    targetMetrics = actualMetrics[targetTeam];
  } else {
    targetMetrics = actualMetrics as TeamIntervalMetrics;
  }

  let recalculatedValue = 0;
  if (metricName === 'passingSuccessRate') {
    recalculatedValue = targetMetrics.passingSuccessRate;
  } else if (metricName === 'pressureFrequencyPerMin') {
    recalculatedValue = targetMetrics.pressureFrequencyPerMin;
  } else if (metricName === 'highTurnovers') {
    recalculatedValue = targetMetrics.highTurnovers;
  } else if (metricName === 'progressiveMeters') {
    recalculatedValue = targetMetrics.progressiveMeters;
  } else if (metricName === 'totalPasses') {
    recalculatedValue = targetMetrics.totalPasses;
  } else if (metricName === 'successfulPasses') {
    recalculatedValue = targetMetrics.successfulPasses;
  } else if (metricName === 'failedPasses') {
    recalculatedValue = targetMetrics.failedPasses;
  } else if (metricName === 'shotsTotal') {
    recalculatedValue = targetMetrics.shotsTotal;
  } else if (metricName === 'shotsOnTarget') {
    recalculatedValue = targetMetrics.shotsOnTarget;
  }

  // Explicit metric-appropriate default tolerance
  let effectiveTolerance = tolerance;
  if (effectiveTolerance === undefined) {
    if (metricName === 'pressureFrequencyPerMin') {
      effectiveTolerance = 0.2;
    } else if (metricName === 'passingSuccessRate') {
      effectiveTolerance = 1.5;
    } else {
      effectiveTolerance = 1.0;
    }
  }

  const diff = Math.abs(claimedValue - recalculatedValue);
  const matches = Number.isFinite(recalculatedValue) && diff <= effectiveTolerance;

  return {
    metricName,
    claimedValue,
    recalculatedValue,
    tolerance: effectiveTolerance,
    matches,
    unit,
  };
}

export function scanForCounterEvidence(
  events: MatchEvent[],
  interval: IntervalWindow,
  claimCategory: string
): CounterEvidenceItem[] {
  const counterItems: CounterEvidenceItem[] = [];

  const intervalEvents = events.filter(
    (e) => e.minute >= interval.startMinute && e.minute <= interval.endMinute
  );

  if (claimCategory === 'passing_decay') {
    // Look for high-value successful progressive passes despite alleged collapse
    const successfulDeepPasses = intervalEvents.filter(
      (e) => e.teamId === 'home' && e.type === 'pass' && e.outcome === 'success' && (e.progressiveDistance || 0) > 20
    );

    if (successfulDeepPasses.length >= 4) {
      for (const ev of successfulDeepPasses.slice(0, 3)) {
        counterItems.push({
          eventId: ev.id,
          minute: ev.minute,
          description: `Successful progressive pass (${ev.progressiveDistance}m) by ${ev.playerName} penetrated pressing block.`,
          contradictionType: 'recovery_observed',
          weight: 'medium',
        });
      }
    }
  }

  if (claimCategory === 'pressure_surge') {
    // Check if alleged pressure surge occurred only in unthreatened zones (e.g. middle third without turnovers)
    const ineffectivePressures = intervalEvents.filter(
      (e) => e.teamId === 'away' && e.type === 'pressure' && (e.pressureIntensity || 0) < 0.6
    );

    if (ineffectivePressures.length >= 3) {
      counterItems.push({
        eventId: ineffectivePressures[0].id,
        minute: ineffectivePressures[0].minute,
        description: `Sub-threshold pressure event with intensity ${ineffectivePressures[0].pressureIntensity} indicates low pressing disruption.`,
        contradictionType: 'confounding_factor',
        weight: 'low',
      });
    }
  }

  return counterItems;
}
