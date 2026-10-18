/**
 * Evaluation and Benchmark types for Match Reality Engine.
 * Formulates ground truth rubrics and contrasts baseline LLM output
 * against evidence-gated multi-agent workflow results.
 */

export interface GroundTruthTestItem {
  id: string;
  name: string;
  scenarioId: string;
  claimTested: string;
  hasFlawedEventIds: boolean;
  hasNumericMismatch: boolean;
  hasUnwarrantedCausalClaim: boolean;
  hasCounterEvidence: boolean;
  groundTruthVerdict: 'accepted' | 'accepted_with_uncertainty' | 'rejected' | 'insufficient_evidence';
  groundTruthShouldPublish: boolean;
}

export interface MetricDefinition {
  metricKey: keyof SystemRunMetric;
  label: string;
  formula: string;
  description: string;
}

export interface SystemRunMetric {
  supportedClaimAccuracy: number; // percentage of valid claims correctly accepted
  unsupportedClaimRejectionRate: number; // percentage of invalid claims caught and rejected
  unsupportedClaimHallucinationRate: number; // percentage of invalid claims mistakenly published
  contradictionHandlingAccuracy: number; // percentage of contradictory cases where claim was superseded
  correctAbstentionRate: number; // percentage of insufficient evidence cases where system correctly abstained
  averageLatencyMs: number;
  estimatedCostPerInsightUSD: number;
  totalClaimsEvaluated: number;
}

export interface BenchmarkComparison {
  executedAt: string;
  sampleSizeDisclosure: string;
  metricDefinitions: MetricDefinition[];
  baselineSingleShot: SystemRunMetric;
  multiAgentEvidenceGated: SystemRunMetric;
  improvementDelta: {
    accuracyDelta: number; // e.g. +33.3%
    hallucinationReduction: number; // e.g. -100.0%
    contradictionDelta: number; // e.g. +100.0%
    latencyTradeoffMs: number; // additional latency required for verification
  };
  sampleResults: {
    testItemId: string;
    testItemName: string;
    groundTruthVerdict: string;
    baselineVerdict: string;
    baselinePublished: boolean;
    multiAgentVerdict: string;
    multiAgentPublished: boolean;
    didMultiAgentMatchGroundTruth: boolean;
    didBaselineMatchGroundTruth: boolean;
    explanation: string;
  }[];
}
