/**
 * Specialist Agent 1: Match State Analyst.
 * Responsibilities:
 * - Inspect calculated match state and detected turning points.
 * - Detect meaningful changes against baselines.
 * - Propose candidate tactical insights with explicit event references.
 * - Ingests live Microsoft Foundry inference when available and validates output strictly against schema.
 * - If model output fails validation or Foundry is unavailable, degrades cleanly to deterministic rules.
 * - Must NOT invent fake event IDs, cross interval boundaries, or fabricate token/latency metrics.
 */

import { MatchEvent } from '@/types/events';
import { IntervalWindow, MatchIntervalSnapshot, TurningPoint } from '@/types/stats';
import { CandidateClaimInput } from '../verificationEngine/verifier';
import { isSupportedMetric } from '../verificationEngine/rules';
import { executeFoundryPrompt } from './microsoftAdapter';

export interface AnalystProposal {
  candidateClaim: CandidateClaimInput;
  alternativeHypotheses: string[];
  tacticalContext: string;
  rationale: string;
  tokensUsed: number;
  latencyMs: number;
  provider: 'microsoft_foundry_live' | 'deterministic_agent_fallback';
  modelName: string;
  errorDetails?: string;
}

export interface ParsedModelCandidateResult {
  valid: boolean;
  candidateClaim?: CandidateClaimInput;
  alternativeHypotheses?: string[];
  tacticalContext?: string;
  rationale?: string;
  errorReason?: string;
}

/**
 * Strictly parses and validates untrusted model completions into CandidateClaimInput schema.
 * Rejects malformed JSON, out-of-interval event IDs, unsupported metrics, and non-finite numbers.
 */
export function parseAndValidateModelOutput(
  content: string,
  currentInterval: IntervalWindow,
  intervalEvents: MatchEvent[],
  fallbackClaimId: string
): ParsedModelCandidateResult {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { valid: false, errorReason: 'Empty model completion' };
  }

  // Strip markdown code fences if present
  let jsonString = content.trim();
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: unknown) {
    return {
      valid: false,
      errorReason: `Malformed JSON: ${err instanceof Error ? err.message : 'Syntax error'}`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errorReason: 'Parsed JSON is not an object' };
  }

  const record = parsed as Record<string, unknown>;

  // Validate claimText
  if (typeof record.claimText !== 'string' || record.claimText.trim().length === 0) {
    return { valid: false, errorReason: 'Missing or empty "claimText"' };
  }

  // Validate category
  const validCategories = [
    'passing_decay',
    'pressure_surge',
    'tactical_shift',
    'territorial_dominance',
    'counter_attack_vulnerability',
    'stamina_collapse',
  ];
  const category =
    typeof record.category === 'string' && validCategories.includes(record.category)
      ? record.category
      : 'passing_decay';

  // Validate referenced event IDs: Every referenced ID MUST exist within the active interval events
  if (!Array.isArray(record.referencedEventIds)) {
    return { valid: false, errorReason: '"referencedEventIds" must be an array' };
  }

  const validIntervalIds = new Set(intervalEvents.map((e) => e.id));
  const referencedEventIds: string[] = [];

  for (const id of record.referencedEventIds) {
    if (typeof id !== 'string' || !validIntervalIds.has(id)) {
      return {
        valid: false,
        errorReason: `Referenced event ID "${id}" does not exist in active interval ${currentInterval.label}`,
      };
    }
    referencedEventIds.push(id);
  }

  // Validate numeric assertions
  const numericAssertions: CandidateClaimInput['numericAssertions'] = [];
  if (record.numericAssertions !== undefined) {
    if (!Array.isArray(record.numericAssertions)) {
      return { valid: false, errorReason: '"numericAssertions" must be an array' };
    }

    for (const a of record.numericAssertions) {
      if (!a || typeof a !== 'object') {
        return { valid: false, errorReason: 'Numeric assertion must be an object' };
      }
      const assertionObj = a as Record<string, unknown>;
      const metricName = typeof assertionObj.metricName === 'string' ? assertionObj.metricName : '';
      const claimedValue = Number(assertionObj.claimedValue);

      if (!isSupportedMetric(metricName)) {
        return { valid: false, errorReason: `Unsupported metric: "${metricName}"` };
      }

      if (!Number.isFinite(claimedValue)) {
        return { valid: false, errorReason: `Non-finite claimedValue for metric "${metricName}"` };
      }

      numericAssertions.push({
        metricName,
        claimedValue,
        unit: typeof assertionObj.unit === 'string' ? assertionObj.unit : '%',
        teamId: assertionObj.teamId === 'away' ? 'away' : 'home',
      });
    }
  }

  const claimId =
    typeof record.claimId === 'string' && record.claimId.trim().length > 0
      ? record.claimId.trim()
      : fallbackClaimId;

  const candidateClaim: CandidateClaimInput = {
    claimId,
    claimText: record.claimText.trim(),
    category,
    targetInterval: currentInterval, // Strictly bounded to requested interval
    referencedEventIds,
    numericAssertions,
  };

  const alternativeHypotheses = Array.isArray(record.alternativeHypotheses)
    ? record.alternativeHypotheses.filter((h): h is string => typeof h === 'string')
    : [];

  const tacticalContext =
    typeof record.tacticalContext === 'string'
      ? record.tacticalContext
      : 'Formulated by Microsoft Foundry model inference';

  const rationale =
    typeof record.rationale === 'string'
      ? record.rationale
      : 'Model-derived candidate insight grounded in telemetry';

  return {
    valid: true,
    candidateClaim,
    alternativeHypotheses,
    tacticalContext,
    rationale,
  };
}

export async function runMatchStateAnalyst(
  snapshot: MatchIntervalSnapshot,
  turningPoints: TurningPoint[],
  events: MatchEvent[],
  currentInterval: IntervalWindow,
  revisionContext?: {
    originalClaimText: string;
    auditRejectionReason: string;
    revisionCount: number;
  }
): Promise<AnalystProposal> {
  const startTime = Date.now();

  // Strict interval event scoping: Never contaminate quiet intervals with events from earlier windows
  const intervalEvents = events.filter(
    (e) => e.minute >= currentInterval.startMinute && e.minute <= currentInterval.endMinute
  );
  const sampleEventIds = intervalEvents.slice(0, 10).map((e) => e.id);

  // Structured prompt instructing model to return typed JSON
  const systemPrompt = `You are the Match State Analyst in Proofline FC. Formulate candidate tactical insights strictly grounded in observed snapshot statistics and verified match events.
Output ONLY a JSON object matching this schema:
{
  "claimId": "clm_${currentInterval.startMinute}_analyst",
  "claimText": "Concise factual statement about match state",
  "category": "passing_decay" | "pressure_surge" | "tactical_shift" | "territorial_dominance",
  "referencedEventIds": ["<only IDs from provided active event list>"],
  "numericAssertions": [
    { "teamId": "home" | "away", "metricName": "passingSuccessRate" | "pressureFrequencyPerMin" | "progressiveMeters" | "totalPasses", "claimedValue": 0.0, "unit": "%" | "/min" | "m" }
  ],
  "alternativeHypotheses": ["..."],
  "tacticalContext": "...",
  "rationale": "..."
}
Do NOT invent phantom event IDs or ungrounded statistics.`;

  const userPrompt = `Match Interval: ${currentInterval.label} (Minutes ${currentInterval.startMinute}-${currentInterval.endMinute}).
Active Interval Telemetry:
- Home Passing Accuracy: ${snapshot.home.passingSuccessRate}% (${snapshot.home.successfulPasses}/${snapshot.home.totalPasses} completed)
- Home Progressive Meters: ${snapshot.home.progressiveMeters}m
- Away Pressure Frequency: ${snapshot.away.pressureFrequencyPerMin}/min (${snapshot.away.pressureEventsCount} events)
- Available Event IDs in Interval: [${sampleEventIds.join(', ')}]
- Detected Turning Points: ${turningPoints.map((tp) => tp.title).join('; ') || 'None'}.${
    revisionContext
      ? `\nREVISION DIRECTIVE FROM EVIDENCE AUDITOR:\nPrior claim "${revisionContext.originalClaimText}" was rejected: ${revisionContext.auditRejectionReason}. Revise the claim to resolve this directive strictly.`
      : ''
  }`;

  const foundryCall = await executeFoundryPrompt(systemPrompt, userPrompt);
  let liveValidationFailure: string | undefined = undefined;

  // 1. If live Microsoft Foundry inference succeeded and returned content, parse and validate it!
  if (foundryCall.provider === 'microsoft_foundry_live' && foundryCall.content) {
    const fallbackClaimId = revisionContext
      ? `clm_rev_${currentInterval.startMinute}_${revisionContext.revisionCount}`
      : `clm_foundry_${currentInterval.startMinute}`;

    const validation = parseAndValidateModelOutput(
      foundryCall.content,
      currentInterval,
      intervalEvents,
      fallbackClaimId
    );

    if (validation.valid && validation.candidateClaim) {
      // Model output influenced the candidate claim that enters verification
      return {
        candidateClaim: validation.candidateClaim,
        alternativeHypotheses: validation.alternativeHypotheses || [],
        tacticalContext: validation.tacticalContext || 'Live Microsoft Foundry inference',
        rationale: validation.rationale || 'Formulated by live Azure AI Foundry completion.',
        tokensUsed: foundryCall.tokensUsed,
        latencyMs: Math.max(1, Date.now() - startTime),
        provider: 'microsoft_foundry_live',
        modelName: foundryCall.modelName,
      };
    }

    // Schema validation failed: Must NOT falsely label failed inference as live success
    liveValidationFailure = `Model output validation rejected: ${validation.errorReason}`;
  }

  // 2. Deterministic Fallback Engine (when credentials missing or model output rejected)
  // Revisions responding to Auditor feedback
  if (revisionContext) {
    const primaryTurningPoint = turningPoints[0];
    const candidateClaim: CandidateClaimInput = {
      claimId: `clm_rev_${currentInterval.startMinute}_${revisionContext.revisionCount}`,
      claimText: `London Titans experienced an observed decline in passing accuracy to ${snapshot.home.passingSuccessRate}%, which coincided with increased defensive pressure from Munich Red Star (${snapshot.away.pressureFrequencyPerMin} events/min).`,
      category: 'passing_decay',
      targetInterval: currentInterval,
      referencedEventIds: primaryTurningPoint
        ? primaryTurningPoint.supportingEventIds.filter((id) =>
            intervalEvents.some((e) => e.id === id)
          )
        : intervalEvents.slice(0, 4).map((e) => e.id),
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snapshot.home.passingSuccessRate,
          unit: '%',
        },
        {
          teamId: 'away',
          metricName: 'pressureFrequencyPerMin',
          claimedValue: snapshot.away.pressureFrequencyPerMin,
          unit: '/min',
        },
      ],
    };

    return {
      candidateClaim,
      alternativeHypotheses: [
        'Fatigue in central midfield reduced off-the-ball options rather than pure pressure.',
        'Tactical spacing collapsed as fullbacks pushed too high.',
      ],
      tacticalContext: 'Revised from causal assertion to strictly observed co-occurrence per Auditor directive.',
      rationale: `Revised claim to address auditor feedback: "${revisionContext.auditRejectionReason}". Replaced causal assertion with verified statistical correlation.`,
      tokensUsed: 0,
      latencyMs: Math.max(1, Date.now() - startTime),
      provider: 'deterministic_agent_fallback',
      modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
      errorDetails: liveValidationFailure || foundryCall.errorDetails,
    };
  }

  // Check top turning point (prioritize tactical rebound / contradiction turning points)
  const resistanceTp = turningPoints.find((tp) => tp.id.includes('tp_press_resistance'));
  const primaryTurningPoint = resistanceTp || turningPoints[0];

  if (!primaryTurningPoint) {
    // Balanced or quiet interval: Strictly take events from current interval only
    const quietEventIds = intervalEvents.slice(0, Math.min(4, intervalEvents.length)).map((e) => e.id);
    return {
      candidateClaim: {
        claimId: `clm_bal_${currentInterval.startMinute}`,
        claimText: `Both teams maintained steady tactical structure in ${currentInterval.label}; London Titans recorded ${snapshot.home.passingSuccessRate}% passing accuracy.`,
        category: 'territorial_dominance',
        targetInterval: currentInterval,
        referencedEventIds: quietEventIds,
        numericAssertions: [
          {
            teamId: 'home',
            metricName: 'passingSuccessRate',
            claimedValue: snapshot.home.passingSuccessRate,
            unit: '%',
          },
        ],
      },
      alternativeHypotheses: ['Both teams prioritized defensive shape over progressive progression.'],
      tacticalContext: 'Symmetric phase with balanced possession.',
      rationale: 'No statistical threshold crossed; reporting balanced match state.',
      tokensUsed: 0,
      latencyMs: Math.max(1, Date.now() - startTime),
      provider: 'deterministic_agent_fallback',
      modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
      errorDetails: liveValidationFailure || foundryCall.errorDetails,
    };
  }

  // Passing recovery (Contradiction Turning Point)
  if (primaryTurningPoint.id.includes('tp_press_resistance')) {
    const candidateClaim: CandidateClaimInput = {
      claimId: `clm_recovery_${currentInterval.startMinute}`,
      claimText: `London Titans successfully adapted to Munich Red Star's high press, with passing accuracy rebounding to ${snapshot.home.passingSuccessRate}% through direct progressive switches.`,
      category: 'tactical_shift',
      targetInterval: currentInterval,
      referencedEventIds: primaryTurningPoint.supportingEventIds.filter((id) =>
        intervalEvents.some((e) => e.id === id)
      ),
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snapshot.home.passingSuccessRate,
          unit: '%',
        },
        {
          teamId: 'away',
          metricName: 'pressureFrequencyPerMin',
          claimedValue: snapshot.away.pressureFrequencyPerMin,
          unit: '/min',
        },
      ],
    };

    return {
      candidateClaim,
      alternativeHypotheses: [
        'Munich pressing intensity remained high on paper but lacked coordinated second-ball structure.',
        'Home side switched to direct vertical long balls bypassing central congestion.',
      ],
      tacticalContext: 'Tactical adaptation effectively disproving initial assumption of sustained pressing dominance.',
      rationale: `Detected turning point: Rebound to ${snapshot.home.passingSuccessRate}% while away pressure remained high (${snapshot.away.pressureFrequencyPerMin}/min).`,
      tokensUsed: 0,
      latencyMs: Math.max(1, Date.now() - startTime),
      provider: 'deterministic_agent_fallback',
      modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
      errorDetails: liveValidationFailure || foundryCall.errorDetails,
    };
  }

  // Passing decay / pressure surge
  const candidateClaim: CandidateClaimInput = {
    claimId: `clm_decay_${currentInterval.startMinute}`,
    claimText: `Munich Red Star's aggressive pressing surge (${snapshot.away.pressureFrequencyPerMin} events/min) caused London Titans passing accuracy to collapse to ${snapshot.home.passingSuccessRate}%.`,
    category: 'passing_decay',
    targetInterval: currentInterval,
    referencedEventIds: primaryTurningPoint.supportingEventIds.filter((id) =>
      intervalEvents.some((e) => e.id === id)
    ),
    numericAssertions: [
      {
        teamId: 'home',
        metricName: 'passingSuccessRate',
        claimedValue: snapshot.home.passingSuccessRate,
        unit: '%',
      },
      {
        teamId: 'away',
        metricName: 'pressureFrequencyPerMin',
        claimedValue: snapshot.away.pressureFrequencyPerMin,
        unit: '/min',
      },
    ],
  };

  return {
    candidateClaim,
    alternativeHypotheses: [
      'Titans center-backs miscommunicated under unfamiliar pitch conditions.',
      'Midfield pivot was isolated due to wingers staying too wide.',
    ],
    tacticalContext: 'Significant divergence from 1st interval baseline.',
    rationale: `Turning point detected: Passing dropped by ${primaryTurningPoint.observedDelta}% while opponent press increased.`,
    tokensUsed: 0,
    latencyMs: Math.max(1, Date.now() - startTime),
    provider: 'deterministic_agent_fallback',
    modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
    errorDetails: liveValidationFailure || foundryCall.errorDetails,
  };
}
