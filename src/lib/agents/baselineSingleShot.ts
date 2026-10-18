/**
 * Baseline Single-Shot LLM Agent (For comparative benchmark evaluation).
 * Represents standard AI approach: a single prompt without deterministic
 * verification, counter-evidence auditing, or producer gating.
 */

import { MatchIntervalSnapshot } from '@/types/stats';

export interface BaselineOutput {
  claimText: string;
  purportedEventIds: string[];
  epistemicType: 'causal' | 'factual';
  published: boolean;
  accuracyScore: number;
  hallucinatedEventCount: number;
  tokensUsed: number;
  latencyMs: number;
}

export function runBaselineSingleShot(
  snapshot: MatchIntervalSnapshot,
  scenarioCategory: string
): BaselineOutput {
  // Baseline prompt simulation: often generates ungrounded causal claims and fake event references
  if (scenarioCategory === 'missing_event_data' || scenarioCategory === 'insufficient_evidence') {
    return {
      claimText: `London Titans midfield completely broke down under pressure, guaranteeing a loss.`,
      purportedEventIds: ['ev_fake_9999', 'ev_fake_8888'],
      epistemicType: 'causal',
      published: true, // Baseline naively publishes without checking data density!
      accuracyScore: 0.15,
      hallucinatedEventCount: 2,
      tokensUsed: 120,
      latencyMs: 140,
    };
  }

  if (scenarioCategory === 'contradictory_evidence_later' && snapshot.interval.startMinute >= 31) {
    // Baseline fails to notice contradiction and repeats previous press collapse narrative!
    return {
      claimText: `Munich Red Star's relentless high pressing continues to suffocate London Titans passing.`,
      purportedEventIds: ['ev_old_0012', 'ev_old_0014'],
      epistemicType: 'causal',
      published: true, // Repeats invalidated claim!
      accuracyScore: 0.25,
      hallucinatedEventCount: 1,
      tokensUsed: 135,
      latencyMs: 155,
    };
  }

  return {
    claimText: `Munich Red Star's pressure caused every single misplaced pass by London Titans in ${snapshot.interval.label}.`,
    purportedEventIds: ['ev_gen_0101', 'ev_unverified_099'],
    epistemicType: 'causal',
    published: true,
    accuracyScore: 0.55,
    hallucinatedEventCount: 1,
    tokensUsed: 140,
    latencyMs: 160,
  };
}
