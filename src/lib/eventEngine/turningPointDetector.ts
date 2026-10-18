/**
 * Deterministic Turning-Point Detection Algorithm.
 * Evaluates statistical delta thresholds between consecutive match intervals,
 * isolates supporting event IDs, and formats objective factual statements.
 */

import { MatchEvent, TeamId } from '@/types/events';
import { IntervalWindow, TeamIntervalMetrics, TurningPoint } from '@/types/stats';
import { compareMetricsToBaseline } from './statsCalculator';

export interface TurningPointThresholdConfig {
  passingDropThresholdPercent: number; // e.g. -15.0%
  pressureSurgeThresholdPercent: number; // e.g. +40.0%
  turnoverSurgeThreshold: number; // e.g. +3 turnovers
  progressiveMetersDropThresholdPercent: number; // e.g. -25.0%
}

export const DEFAULT_THRESHOLDS: TurningPointThresholdConfig = {
  passingDropThresholdPercent: -15.0,
  pressureSurgeThresholdPercent: 40.0,
  turnoverSurgeThreshold: 3,
  progressiveMetersDropThresholdPercent: -25.0,
};

export function detectTurningPoints(
  events: MatchEvent[],
  baselineMetrics: { home: TeamIntervalMetrics; away: TeamIntervalMetrics },
  currentMetrics: { home: TeamIntervalMetrics; away: TeamIntervalMetrics },
  currentInterval: IntervalWindow,
  config = DEFAULT_THRESHOLDS
): TurningPoint[] {
  const turningPoints: TurningPoint[] = [];

  // Helper to grab event IDs in current interval for a team and specific event types
  const getEventIds = (teamId: TeamId, types: string[], limit = 6): string[] => {
    return events
      .filter(
        (e) =>
          e.minute >= currentInterval.startMinute &&
          e.minute <= currentInterval.endMinute &&
          e.teamId === teamId &&
          types.includes(e.type)
      )
      .slice(0, limit)
      .map((e) => e.id);
  };

  // 1. Check Home Passing Accuracy Collapse
  const homePassComparison = compareMetricsToBaseline(
    baselineMetrics.home,
    currentMetrics.home,
    'passingSuccessRate',
    Math.abs(config.passingDropThresholdPercent)
  );

  if (homePassComparison.percentageChange <= config.passingDropThresholdPercent) {
    const failedPassEvents = getEventIds('home', ['pass_failed'], 8);
    turningPoints.push({
      id: `tp_pass_decay_${currentInterval.startMinute}`,
      interval: currentInterval,
      teamId: 'home',
      title: 'Passing Accuracy Degradation',
      metric: 'Passing Success Rate',
      observedDelta: homePassComparison.absoluteDelta,
      baselineValue: homePassComparison.baselineValue,
      currentValue: homePassComparison.currentValue,
      thresholdCrossed: config.passingDropThresholdPercent,
      supportingEventIds: failedPassEvents,
      severity: homePassComparison.percentageChange <= -25 ? 'critical' : 'moderate',
      summary: `London Titans passing success dropped by ${Math.abs(homePassComparison.percentageChange)}% (${homePassComparison.baselineValue}% → ${homePassComparison.currentValue}%) during ${currentInterval.label}.`,
      observedFact: `Observed: London Titans completed ${currentMetrics.home.successfulPasses}/${currentMetrics.home.totalPasses} passes (${currentMetrics.home.passingSuccessRate}%) compared to ${baselineMetrics.home.passingSuccessRate}% in baseline ${baselineMetrics.home.interval.label}.`,
    });
  }

  // 2. Check Away High Pressure Surge
  const awayPressureComparison = compareMetricsToBaseline(
    baselineMetrics.away,
    currentMetrics.away,
    'pressureFrequencyPerMin',
    config.pressureSurgeThresholdPercent
  );

  if (awayPressureComparison.percentageChange >= config.pressureSurgeThresholdPercent) {
    const pressureEvents = getEventIds('away', ['pressure'], 8);
    turningPoints.push({
      id: `tp_press_surge_${currentInterval.startMinute}`,
      interval: currentInterval,
      teamId: 'away',
      title: 'Opponent High Press Escalation',
      metric: 'Pressure Events Frequency',
      observedDelta: awayPressureComparison.absoluteDelta,
      baselineValue: awayPressureComparison.baselineValue,
      currentValue: awayPressureComparison.currentValue,
      thresholdCrossed: config.pressureSurgeThresholdPercent,
      supportingEventIds: pressureEvents,
      severity: awayPressureComparison.percentageChange >= 80 ? 'critical' : 'moderate',
      summary: `Munich Red Star increased pressing actions from ${awayPressureComparison.baselineValue} to ${awayPressureComparison.currentValue} events/min (+${awayPressureComparison.percentageChange}%).`,
      observedFact: `Observed: Munich Red Star registered ${currentMetrics.away.pressureEventsCount} pressure events in ${currentInterval.label} (${currentMetrics.away.pressureFrequencyPerMin}/min) vs ${baselineMetrics.away.pressureEventsCount} in ${baselineMetrics.away.interval.label}.`,
    });
  }

  // 3. Check Passing Recovery (Contradiction Turning Point)
  // If baseline had degraded passing (<= 68%) and current interval recovers (delta >= +14% or rate >= 72%) despite sustained press
  const passingReboundDelta = currentMetrics.home.passingSuccessRate - baselineMetrics.home.passingSuccessRate;
  if (
    baselineMetrics.home.passingSuccessRate <= 68 &&
    (currentMetrics.home.passingSuccessRate >= 72 || passingReboundDelta >= 14.0) &&
    currentMetrics.away.pressureFrequencyPerMin >= 1.6
  ) {
    const recoveryPassEvents = getEventIds('home', ['pass'], 8);
    turningPoints.push({
      id: `tp_press_resistance_${currentInterval.startMinute}`,
      interval: currentInterval,
      teamId: 'home',
      title: 'Press-Resistant Tactical Rebound',
      metric: 'Passing Recovery Under Sustained Press',
      observedDelta: Number((currentMetrics.home.passingSuccessRate - baselineMetrics.home.passingSuccessRate).toFixed(1)),
      baselineValue: baselineMetrics.home.passingSuccessRate,
      currentValue: currentMetrics.home.passingSuccessRate,
      thresholdCrossed: 15.0,
      supportingEventIds: recoveryPassEvents,
      severity: 'decisive',
      summary: `London Titans passing recovered to ${currentMetrics.home.passingSuccessRate}% despite sustained opponent pressure (${currentMetrics.away.pressureFrequencyPerMin} events/min).`,
      observedFact: `Observed: London Titans passing accuracy rebounded by +${(currentMetrics.home.passingSuccessRate - baselineMetrics.home.passingSuccessRate).toFixed(1)}% while Munich Red Star maintained pressure at ${currentMetrics.away.pressureFrequencyPerMin}/min.`,
    });
  }

  return turningPoints;
}
