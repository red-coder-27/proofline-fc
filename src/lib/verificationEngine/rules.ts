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

export function validateEventReferences(
  referencedIds: string[],
  availableEvents: MatchEvent[],
  expectedInterval: IntervalWindow
): EventReferenceCheck {
  const eventMap = new Map<string, MatchEvent>();
  for (const ev of availableEvents) {
    eventMap.set(ev.id, ev);
  }

  const missingIds: string[] = [];
  const mismatchedIntervalIds: string[] = [];
  let validCount = 0;

  for (const id of referencedIds) {
    const ev = eventMap.get(id);
    if (!ev) {
      missingIds.push(id);
    } else if (ev.minute < expectedInterval.startMinute || ev.minute > expectedInterval.endMinute) {
      mismatchedIntervalIds.push(id);
    } else {
      validCount++;
    }
  }

  return {
    allValid: missingIds.length === 0 && mismatchedIntervalIds.length === 0 && validCount > 0,
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
  tolerance = 1.5,
  unit = '%',
  teamId?: 'home' | 'away'
): NumericAssertion {
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
  }

  const diff = Math.abs(claimedValue - recalculatedValue);
  const matches = diff <= tolerance;

  return {
    metricName,
    claimedValue,
    recalculatedValue,
    tolerance,
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
