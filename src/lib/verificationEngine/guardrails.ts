/**
 * Epistemic Guardrails: Causal vs Correlational claim classifier.
 * Strictly prevents unverified causal claims from being labeled factual.
 */

import { ClaimEpistemicType } from '@/types/claims';

const CAUSAL_TRIGGER_WORDS = [
  'caused',
  'directly led to',
  'responsible for',
  'resulted entirely from',
  'forced every',
  'proves that',
  'due solely to',
];

const INTERPRETIVE_TRIGGER_WORDS = [
  'struggled',
  'dominated',
  'panicked',
  'asserted control',
  'tactical mastery',
  'disorganized',
];

export function classifyClaimEpistemics(text: string): {
  epistemicType: ClaimEpistemicType;
  causalFlags: string[];
  interpretiveFlags: string[];
} {
  const lower = text.toLowerCase();
  const causalFlags: string[] = [];
  const interpretiveFlags: string[] = [];

  for (const trigger of CAUSAL_TRIGGER_WORDS) {
    if (lower.includes(trigger)) {
      causalFlags.push(trigger);
    }
  }

  for (const trigger of INTERPRETIVE_TRIGGER_WORDS) {
    if (lower.includes(trigger)) {
      interpretiveFlags.push(trigger);
    }
  }

  if (causalFlags.length > 0) {
    return { epistemicType: 'causal', causalFlags, interpretiveFlags };
  }

  if (interpretiveFlags.length > 0) {
    return { epistemicType: 'interpretive', causalFlags, interpretiveFlags };
  }

  return { epistemicType: 'factual', causalFlags, interpretiveFlags };
}

export function qualifyCausalClaim(
  text: string,
  causalFlags: string[]
): {
  isAcceptableAsFact: boolean;
  qualificationGuidance: string;
  recommendedNeutralText: string;
} {
  if (causalFlags.length === 0) {
    return {
      isAcceptableAsFact: true,
      qualificationGuidance: 'Claim maintains appropriate factual or descriptive framing.',
      recommendedNeutralText: text,
    };
  }

  // Generate neutral framing replacing causal absolute assertions with observed correlation
  let neutral = text;
  for (const flag of causalFlags) {
    if (flag === 'caused' || flag === 'directly led to') {
      neutral = neutral.replace(new RegExp(flag, 'gi'), 'coincided with');
    } else if (flag === 'resulted entirely from') {
      neutral = neutral.replace(new RegExp(flag, 'gi'), 'occurred alongside');
    } else if (flag === 'proves that') {
      neutral = neutral.replace(new RegExp(flag, 'gi'), 'suggests');
    }
  }

  return {
    isAcceptableAsFact: false,
    qualificationGuidance: `Causal assertion detected ('${causalFlags.join("', '")}'). Observed statistical co-occurrence does not establish direct causation. Claim must be qualified or revised to correlational observation.`,
    recommendedNeutralText: neutral,
  };
}
