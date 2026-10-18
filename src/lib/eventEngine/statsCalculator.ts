/**
 * Deterministic Statistical Calculator for Football Event Streams.
 * Calculates passing accuracy, pressure frequency, territorial progression,
 * and baseline comparisons with strict denominator handling.
 */

import { MatchEvent, TeamId } from '@/types/events';
import {
  IntervalWindow,
  TeamIntervalMetrics,
  MatchIntervalSnapshot,
  BaselineComparison,
} from '@/types/stats';

export function calculateTeamIntervalMetrics(
  events: MatchEvent[],
  teamId: TeamId,
  interval: IntervalWindow
): TeamIntervalMetrics {
  const windowMinutes = Math.max(1, interval.endMinute - interval.startMinute + 1);

  // Filter events strictly within interval and team
  const intervalEvents = events.filter(
    (e) => e.minute >= interval.startMinute && e.minute <= interval.endMinute
  );

  const teamEvents = intervalEvents.filter((e) => e.teamId === teamId);

  let totalPasses = 0;
  let successfulPasses = 0;
  let failedPasses = 0;
  let pressureEventsCount = 0;
  let highTurnovers = 0;
  let shotsTotal = 0;
  let shotsOnTarget = 0;
  let progressiveMeters = 0;

  for (const ev of teamEvents) {
    if (ev.type === 'pass') {
      totalPasses++;
      if (ev.outcome === 'success') {
        successfulPasses++;
        if (ev.progressiveDistance) {
          progressiveMeters += ev.progressiveDistance;
        }
      } else {
        failedPasses++;
      }
    } else if (ev.type === 'pass_failed') {
      totalPasses++;
      failedPasses++;
    } else if (ev.type === 'pressure') {
      pressureEventsCount++;
    } else if (ev.type === 'turnover' || ev.type === 'possession_change') {
      if (ev.zone === 'defensive_third' || ev.zone === 'middle_third') {
        highTurnovers++;
      }
    } else if (ev.type === 'shot') {
      shotsTotal++;
      if (ev.outcome === 'success') {
        shotsOnTarget++;
      }
    }
  }

  // Passing success rate with explicit denominator handling
  const passingSuccessRate =
    totalPasses > 0 ? Number(((successfulPasses / totalPasses) * 100).toFixed(1)) : 0.0;

  const pressureFrequencyPerMin = Number((pressureEventsCount / windowMinutes).toFixed(2));

  return {
    teamId,
    interval,
    totalPasses,
    successfulPasses,
    failedPasses,
    passingSuccessRate,
    pressureEventsCount,
    pressureFrequencyPerMin,
    highTurnovers,
    shotsTotal,
    shotsOnTarget,
    progressiveMeters: Math.round(progressiveMeters),
    totalEvents: teamEvents.length,
    missingObservationCount: 0,
  };
}

export function computeIntervalSnapshot(
  events: MatchEvent[],
  interval: IntervalWindow
): MatchIntervalSnapshot {
  const homeMetrics = calculateTeamIntervalMetrics(events, 'home', interval);
  const awayMetrics = calculateTeamIntervalMetrics(events, 'away', interval);

  // Determine dominant team by composite index: passing volume, progression, pressure
  const homePressureOnAway = homeMetrics.pressureEventsCount;
  const awayPressureOnHome = awayMetrics.pressureEventsCount;

  const homeScore = homeMetrics.passingSuccessRate * 0.4 + homeMetrics.progressiveMeters * 0.05 + homePressureOnAway * 2;
  const awayScore = awayMetrics.passingSuccessRate * 0.4 + awayMetrics.progressiveMeters * 0.05 + awayPressureOnHome * 2;

  let dominantTeam: TeamId | 'balanced' = 'balanced';
  const delta = homeScore - awayScore;
  if (delta > 15) dominantTeam = 'home';
  else if (delta < -15) dominantTeam = 'away';

  const clampedMomentum = Math.max(-100, Math.min(100, Math.round(delta * 2)));

  return {
    interval,
    home: homeMetrics,
    away: awayMetrics,
    dominantTeam,
    momentumDelta: clampedMomentum,
  };
}

export function compareMetricsToBaseline(
  baseline: TeamIntervalMetrics,
  current: TeamIntervalMetrics,
  metricName: 'passingSuccessRate' | 'pressureFrequencyPerMin' | 'highTurnovers' | 'progressiveMeters',
  thresholdPercent = 15.0
): BaselineComparison {
  const baseVal = baseline[metricName];
  const currVal = current[metricName];
  const absoluteDelta = Number((currVal - baseVal).toFixed(2));

  let percentageChange = 0;
  if (baseVal !== 0) {
    percentageChange = Number((((currVal - baseVal) / baseVal) * 100).toFixed(1));
  } else if (currVal !== 0) {
    percentageChange = 100.0;
  }

  const isStatisticallyMeaningful = Math.abs(percentageChange) >= thresholdPercent;

  return {
    baselineInterval: baseline.interval,
    currentInterval: current.interval,
    teamId: current.teamId,
    metricName,
    baselineValue: baseVal,
    currentValue: currVal,
    absoluteDelta,
    percentageChange,
    isStatisticallyMeaningful,
    thresholdApplied: thresholdPercent,
  };
}
