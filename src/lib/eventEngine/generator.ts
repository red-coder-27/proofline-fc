/**
 * Deterministic Synthetic Match Event Engine.
 * Uses a seeded pseudo-random number generator (Mulberry32) to ensure
 * 100% reproducible event sequences and statistics.
 */

import { MatchEvent, EventType, EventOutcome, PitchZone, TeamId } from '@/types/events';

// Seeded PRNG implementation (Mulberry32)
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_TEAMS = {
  home: {
    id: 'home' as TeamId,
    name: 'London Titans',
    shortName: 'TOT',
    primaryColor: '#1e3a8a',
    secondaryColor: '#ffffff',
  },
  away: {
    id: 'away' as TeamId,
    name: 'Munich Red Star',
    shortName: 'MUN',
    primaryColor: '#b91c1c',
    secondaryColor: '#f8fafc',
  },
};

export const HOME_PLAYERS = [
  'H. Davies (GK)',
  'M. Sterling (CB)',
  'L. Romero (CB)',
  'K. Walker (RB)',
  'A. Robertson (LB)',
  'D. Rice (CDM)',
  'J. Maddison (CAM)',
  'B. Saka (RW)',
  'M. Rashford (LW)',
  'H. Kane (ST)',
  'C. Palmer (SUB)',
];

export const AWAY_PLAYERS = [
  'M. Neuer (GK)',
  'D. Upamecano (CB)',
  'M. Kim (CB)',
  'A. Davies (LB)',
  'J. Kimmich (CDM)',
  'L. Goretzka (CM)',
  'J. Musiala (CAM)',
  'L. Sane (RW)',
  'K. Coman (LW)',
  'T. Muller (ST)',
  'S. Gnabry (SUB)',
];

export interface ScenarioEventProfile {
  scenarioId: string;
  intervalStartMinute: number;
  intervalEndMinute: number;
  homePassAccuracyTarget: number; // e.g. 0.85
  awayPressureFrequencyTarget: number; // e.g. 2.5 per min
  homeTargetPasses: number;
  awayTargetPressures: number;
  homeTacticalAdjustment?: boolean;
}

export function generateSyntheticMatchEvents(
  scenarioId: string,
  startMinute: number,
  endMinute: number,
  seed = 42
): MatchEvent[] {
  const rand = createPRNG(seed + startMinute * 100);
  const events: MatchEvent[] = [];
  let eventCounter = startMinute * 50;

  // Tactical parameters depending on scenario phase
  let homePassAccuracy = 0.82;
  let awayPressureMultiplier = 1.0;
  let isContradictoryPhase = false;

  if (scenarioId === 'contradictory_evidence_later' || scenarioId === 'signature_demo') {
    if (startMinute >= 1 && endMinute <= 15) {
      // Phase 1: Baseline balanced match
      homePassAccuracy = 0.84;
      awayPressureMultiplier = 0.8;
    } else if (startMinute >= 16 && endMinute <= 30) {
      // Phase 2: High press surge by Away, severe passing degradation by Home
      homePassAccuracy = 0.58;
      awayPressureMultiplier = 2.4;
    } else if (startMinute >= 31 && endMinute <= 45) {
      // Phase 3: Contradiction! Away press remains intense (2.2), but Home passes recover to 83% via direct vertical switches
      homePassAccuracy = 0.83;
      awayPressureMultiplier = 2.2;
      isContradictoryPhase = true;
    }
  } else if (scenarioId === 'passing_pressure_shift') {
    if (startMinute <= 15) {
      homePassAccuracy = 0.85;
      awayPressureMultiplier = 0.9;
    } else {
      homePassAccuracy = 0.61;
      awayPressureMultiplier = 2.3;
    }
  } else if (scenarioId === 'misleading_correlation') {
    // Both teams pass high, but coincidental yellow cards/fouls occur without affecting possession
    homePassAccuracy = 0.80;
    awayPressureMultiplier = 1.1;
  } else if (scenarioId === 'missing_event_data') {
    homePassAccuracy = 0.75;
    awayPressureMultiplier = 1.5;
  } else if (scenarioId === 'insufficient_evidence') {
    // Very sparse interval with only 4 events total
    homePassAccuracy = 0.70;
    awayPressureMultiplier = 0.5;
  }

  const eventDensity = scenarioId === 'insufficient_evidence' ? 1 : 4 + Math.floor(rand() * 2);

  for (let m = startMinute; m <= endMinute; m++) {
    // Generate events for minute m
    const eventsThisMinute = scenarioId === 'insufficient_evidence' ? (m % 3 === 0 ? 1 : 0) : eventDensity;

    for (let i = 0; i < eventsThisMinute; i++) {
      eventCounter++;
      const sec = Math.floor((60 / (eventsThisMinute + 1)) * (i + 1));
      const eventId = `ev_${scenarioId.slice(0, 3)}_${String(eventCounter).padStart(4, '0')}`;
      const roll = rand();

      let teamId: TeamId = 'home';
      let type: EventType = 'pass';
      let outcome: EventOutcome = 'success';
      let zone: PitchZone = 'middle_third';
      let x = 50;
      let y = 50;
      let pressureIntensity = 0;
      let progressiveDist = 0;
      let playerId = HOME_PLAYERS[Math.floor(rand() * HOME_PLAYERS.length)];

      if (roll < 0.40) {
        // Home passing sequence
        teamId = 'home';
        zone = isContradictoryPhase ? 'attacking_third' : (rand() > 0.5 ? 'middle_third' : 'defensive_third');
        x = isContradictoryPhase ? 65 + Math.floor(rand() * 25) : 30 + Math.floor(rand() * 40);
        y = 20 + Math.floor(rand() * 60);

        const passSuccessRoll = rand();
        if (passSuccessRoll < homePassAccuracy) {
          type = 'pass';
          outcome = 'success';
          progressiveDist = isContradictoryPhase ? 18 + Math.floor(rand() * 15) : 6 + Math.floor(rand() * 8);
        } else {
          type = 'pass_failed';
          outcome = 'failure';
          progressiveDist = 0;
        }
      } else if (roll < 0.40 + 0.35 * Math.min(awayPressureMultiplier, 2.5)) {
        // Away pressure or defensive duel
        teamId = 'away';
        playerId = AWAY_PLAYERS[Math.floor(rand() * AWAY_PLAYERS.length)];
        type = 'pressure';
        outcome = 'neutral';
        zone = 'attacking_third'; // pressing high in home half
        x = 35 + Math.floor(rand() * 25);
        y = 15 + Math.floor(rand() * 70);
        pressureIntensity = Number((0.65 + rand() * 0.35).toFixed(2));
      } else if (roll < 0.85) {
        // Turnover or tackle
        const isHome = rand() > 0.5;
        teamId = isHome ? 'home' : 'away';
        playerId = isHome
          ? HOME_PLAYERS[Math.floor(rand() * HOME_PLAYERS.length)]
          : AWAY_PLAYERS[Math.floor(rand() * AWAY_PLAYERS.length)];
        type = rand() > 0.5 ? 'tackle' : 'possession_change';
        outcome = 'success';
        zone = 'middle_third';
        x = 40 + Math.floor(rand() * 20);
        y = 25 + Math.floor(rand() * 50);
      } else {
        // Shot or box action
        const isHome = rand() > 0.45;
        teamId = isHome ? 'home' : 'away';
        playerId = isHome
          ? HOME_PLAYERS[Math.floor(rand() * 3) + 7]
          : AWAY_PLAYERS[Math.floor(rand() * 3) + 7];
        type = 'shot';
        outcome = rand() > 0.65 ? 'success' : 'failure';
        zone = 'box';
        x = isHome ? 88 + Math.floor(rand() * 10) : 12 - Math.floor(rand() * 8);
        y = 40 + Math.floor(rand() * 20);
      }

      events.push({
        id: eventId,
        matchId: `match_${scenarioId}`,
        minute: m,
        second: sec,
        timestampSeconds: m * 60 + sec,
        teamId,
        teamName: teamId === 'home' ? DEFAULT_TEAMS.home.name : DEFAULT_TEAMS.away.name,
        playerId,
        playerName: playerId,
        type,
        outcome,
        zone,
        x,
        y,
        pressureIntensity: pressureIntensity > 0 ? pressureIntensity : undefined,
        progressiveDistance: progressiveDist > 0 ? progressiveDist : undefined,
        provenance: {
          source: 'synthetic_generator',
          scenarioId,
          seed,
          generatedAt: new Date(1700000000000 + m * 60000).toISOString(),
        },
      });
    }
  }

  // Reject malformed events or duplicates
  const seenIds = new Set<string>();
  const sanitized = events.filter((ev) => {
    if (seenIds.has(ev.id)) return false;
    seenIds.add(ev.id);
    return ev.id && ev.minute >= 0 && ev.minute <= 120 && ev.teamId;
  });

  return sanitized;
}
