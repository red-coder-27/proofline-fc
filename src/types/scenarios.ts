/**
 * Scenario Lab and Signature Demo schemas.
 */

import { MatchEvent } from './events';
import { IntervalWindow } from './stats';

export interface ScenarioDefinition {
  id: string;
  name: string;
  category:
    | 'passing_pressure_shift'
    | 'misleading_correlation'
    | 'missing_event_data'
    | 'contradictory_evidence_later'
    | 'insufficient_evidence'
    | 'agent_failure_recovery';
  title: string;
  shortDescription: string;
  detailedContext: string;
  expectedOutcome: {
    expectedVerdict: 'accepted' | 'accepted_with_uncertainty' | 'rejected' | 'insufficient_evidence';
    shouldSupersedePrevious: boolean;
    reasoningRule: string;
  };
  totalMinutes: number;
  intervals: IntervalWindow[];
  defaultSeed: number;
}

export interface ScenarioSimulationStep {
  scenarioId: string;
  currentInterval: IntervalWindow;
  eventsAdded: MatchEvent[];
  totalCumulativeEvents: number;
  isContradictoryPhase: boolean;
  phaseName: string;
}
