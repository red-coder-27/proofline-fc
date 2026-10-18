/**
 * Statistical calculations and match-state metrics schemas.
 * Explicitly tracks denominators, missing observation counts, and thresholds.
 */

import { TeamId } from './events';

export interface IntervalWindow {
  startMinute: number;
  endMinute: number;
  label: string; // e.g. "01'-15'", "16'-30'", "31'-45'"
}

export interface TeamIntervalMetrics {
  teamId: TeamId;
  interval: IntervalWindow;
  totalPasses: number;
  successfulPasses: number;
  failedPasses: number;
  passingSuccessRate: number; // 0.0 to 100.0 (strictly 0 if totalPasses == 0, with denominator tracked)
  pressureEventsCount: number;
  pressureFrequencyPerMin: number;
  highTurnovers: number; // turnovers in middle/defensive third
  shotsTotal: number;
  shotsOnTarget: number;
  progressiveMeters: number;
  totalEvents: number;
  missingObservationCount: number;
}

export interface MatchIntervalSnapshot {
  interval: IntervalWindow;
  home: TeamIntervalMetrics;
  away: TeamIntervalMetrics;
  dominantTeam: TeamId | 'balanced';
  momentumDelta: number; // -100 (away dominant) to +100 (home dominant)
}

export interface BaselineComparison {
  baselineInterval: IntervalWindow;
  currentInterval: IntervalWindow;
  teamId: TeamId;
  metricName: 'passingSuccessRate' | 'pressureFrequencyPerMin' | 'highTurnovers' | 'progressiveMeters';
  baselineValue: number;
  currentValue: number;
  absoluteDelta: number;
  percentageChange: number; // e.g. -22.5%
  isStatisticallyMeaningful: boolean;
  thresholdApplied: number;
}

export interface TurningPoint {
  id: string; // e.g. "tp_01"
  interval: IntervalWindow;
  teamId: TeamId;
  title: string;
  metric: string;
  observedDelta: number;
  baselineValue: number;
  currentValue: number;
  thresholdCrossed: number;
  supportingEventIds: string[];
  severity: 'moderate' | 'critical' | 'decisive';
  summary: string;
  observedFact: string; // Plain statement of statistical reality (not causal speculation)
}
