/**
 * Core event schema for synthetic match events in Match Reality Engine.
 * All events carry deterministic IDs, match/timestamp coordinates,
 * player/team attribution, spatial zones, and tactical attributes.
 */

export type TeamId = 'home' | 'away';

export type EventType =
  | 'pass'
  | 'pass_failed'
  | 'tackle'
  | 'interception'
  | 'pressure'
  | 'shot'
  | 'possession_change'
  | 'turnover'
  | 'clearance'
  | 'foul';

export type EventOutcome = 'success' | 'failure' | 'neutral';

export type PitchZone =
  | 'defensive_third'
  | 'middle_third'
  | 'attacking_third'
  | 'box';

export interface MatchEvent {
  id: string; // e.g. "ev_042"
  matchId: string;
  minute: number; // match minute (1 to 90)
  second: number; // 0 to 59
  timestampSeconds: number; // total elapsed match seconds
  teamId: TeamId;
  teamName: string;
  playerId?: string;
  playerName?: string;
  type: EventType;
  outcome: EventOutcome;
  zone: PitchZone;
  x: number; // 0 (own goal) to 100 (opponent goal)
  y: number; // 0 (left touchline) to 100 (right touchline)
  pressureIntensity?: number; // 0.0 to 1.0 (for pressure events or pressured passes)
  progressiveDistance?: number; // meters gained toward opponent goal
  provenance: {
    source: 'synthetic_generator';
    scenarioId: string;
    seed: number;
    generatedAt: string;
  };
}

export interface MatchMetadata {
  matchId: string;
  homeTeam: { id: TeamId; name: string; shortName: string; primaryColor: string; secondaryColor: string };
  awayTeam: { id: TeamId; name: string; shortName: string; primaryColor: string; secondaryColor: string };
  competition: string;
  venue: string;
  status: 'live' | 'halftime' | 'finished';
  currentMinute: number;
  homeScore: number;
  awayScore: number;
}
