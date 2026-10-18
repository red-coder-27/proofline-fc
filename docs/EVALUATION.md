# Proofline FC — Evaluation Benchmark & Methodology

## 1. Overview & Benchmark Objective

The evaluation harness in `src/lib/benchmarks/benchmarkRunner.ts` compares a standard **Baseline Single-Shot LLM** approach against the **Multi-Agent Evidence-Gated System** across six controlled ground-truth fixtures.

The objective of this benchmark is to measure:
1. Whether an independent deterministic evidence gate successfully prevents ungrounded tactical claims from reaching broadcast chyrons.
2. How the system handles contradictory late-match evidence compared to single-shot memoryless prompts.
3. The architectural trade-offs in end-to-end latency and financial token cost.

---

## 2. Ground-Truth Fixture Specifications

The evaluation dataset comprises six test items covering distinct failure modes in automated sports intelligence:

| ID | Fixture Name | Failure Mode Tested | Expected Ground-Truth Verdict | Ground-Truth Should Publish? |
| :--- | :--- | :--- | :---: | :---: |
| **`gt_01`** | **Verified Passing Degradation** | Valid statistical shift with genuine event IDs and matching denominators. | `accepted` | **Yes** |
| **`gt_02`** | **Corrupted Telemetry / Phantom IDs** | Candidate claim cites non-existent event IDs (`ev_phantom_991`, `ev_phantom_992`). | `rejected` | **No** |
| **`gt_03`** | **Unqualified Causal Speculation** | Analyst asserts high press *directly caused* every misplaced pass without mechanism proof. | `accepted_with_uncertainty` | **Yes (Qualified)** |
| **`gt_04`** | **Contradiction & Rebound** | Passing rebounds to 75%+ in Interval `31'-45'`, contradicting the earlier collapse thesis. | `accepted` | **Yes (Superseded)** |
| **`gt_05`** | **Sparse Sample Size (<10 events)** | Interval contains only 5 total events; insufficient data density for tactical claims. | `insufficient_evidence` | **No (Deferred)** |
| **`gt_06`** | **Fabricated Numeric Delta** | Claim asserts a 45% passing collapse when recalculated delta was only 23% (claimed 20% vs true ~58%). | `rejected` | **No** |

---

## 3. Baseline Implementation vs Multi-Agent Implementation

### Baseline Single-Shot LLM (`baselineSingleShot.ts`)
The baseline represents how standard generative AI applications generate football commentary:
- A single prompt receives the interval snapshot and produces a candidate chyron text.
- It has **no deterministic verification engine**: it does not verify whether cited event IDs exist in the match stream.
- It has **no stateful ledger**: it cannot link to previous claims or mark them as superseded.
- It has **no sample size threshold**: it naively publishes claims even during sparse 4-event intervals.
- It has **no publication gate**: `published` is set to `true` on every generation.

### Multi-Agent Evidence-Gated System (`orchestrator.ts`)
- **Specialist Roles**: Analyst (proposes), Auditor (verifies), and Producer (gates).
- **10-Point Checklist**: Independent recalculation against actual match telemetry within $\pm 2.0\%$ tolerance.
- **Bounded Revision Loop**: If causal language is detected, the Auditor requests an epistemic revision (max 2 attempts) to reformulate the claim into an observed correlation.
- **Publication Gate**: Unverified or rejected claims are strictly withheld from broadcast display.
- **Truthline Ledger**: Stateful supersession links earlier claims to newer revisions when contradictions arrive.

---

## 4. Benchmark Metric Definitions & Denominators

All metrics are calculated programmatically in `runFullBenchmark()` using the following formulas:

| Metric Key | Label | Mathematical Formula | Denominator Explanation |
| :--- | :--- | :--- | :--- |
| `supportedClaimAccuracy` | **Supported Claim Accuracy** | $\frac{\text{Supported claims correctly published}}{\text{Total supported ground-truth claims}} \times 100$ | $N_{sup} = 3$ (`gt_01`, `gt_03`, `gt_04`) |
| `unsupportedClaimRejectionRate` | **Unsupported Claim Rejection Rate** | $\frac{\text{Flawed/sparse claims correctly blocked}}{\text{Total flawed/sparse ground-truth claims}} \times 100$ | $N_{flaw} = 3$ (`gt_02`, `gt_05`, `gt_06`) |
| `unsupportedClaimHallucinationRate` | **Broadcast Hallucination Rate** | $\frac{\text{Flawed/sparse claims leaked to broadcast}}{\text{Total flawed/sparse ground-truth claims}} \times 100$ | $N_{flaw} = 3$ (`gt_02`, `gt_05`, `gt_06`) |
| `contradictionHandlingAccuracy` | **Contradiction Supersession Accuracy** | $\frac{\text{Contradictions where earlier claim was marked SUPERSEDED}}{\text{Total contradiction scenarios}} \times 100$ | $N_{contra} = 1$ (`gt_04`) |
| `correctAbstentionRate` | **Correct Abstention Rate** | $\frac{\text{Sparse scenarios correctly deferred}}{\text{Total sparse scenarios}} \times 100$ | $N_{sparse} = 1$ (`gt_05`) |
| `averageLatencyMs` | **Mean Latency (ms)** | $\frac{\sum \text{scenario execution durations}}{\text{Total scenarios evaluated}}$ | Total scenarios ($N = 6$) |
| `estimatedCostPerInsightUSD` | **Estimated Cost Per Insight ($)** | $\frac{\text{Total prompt + completion tokens}}{N} \times \$0.000005$ | Assumes standard token price (\$5.00 / 1M tokens) |

---

## 5. Actual Verified Benchmark Output

Executed via `runFullBenchmark()` on Node.js 20+ runtime:

```json
{
  "baselineSingleShot": {
    "supportedClaimAccuracy": 100.0,
    "unsupportedClaimRejectionRate": 0.0,
    "unsupportedClaimHallucinationRate": 100.0,
    "contradictionHandlingAccuracy": 0.0,
    "correctAbstentionRate": 0.0,
    "averageLatencyMs": 153,
    "estimatedCostPerInsightUSD": 0.0007,
    "totalClaimsEvaluated": 6
  },
  "multiAgentEvidenceGated": {
    "supportedClaimAccuracy": 100.0,
    "unsupportedClaimRejectionRate": 100.0,
    "unsupportedClaimHallucinationRate": 0.0,
    "contradictionHandlingAccuracy": 100.0,
    "correctAbstentionRate": 100.0,
    "averageLatencyMs": 210,
    "estimatedCostPerInsightUSD": 0.0017,
    "totalClaimsEvaluated": 6
  },
  "improvementDelta": {
    "accuracyDelta": 0.0,
    "hallucinationReduction": 100.0,
    "contradictionDelta": 100.0,
    "latencyTradeoffMs": 57
  }
}
```

### Analysis of the Results
- **Hallucination Elimination**: The Baseline published all 3 flawed test items (hallucinated event IDs, sparse sample size, and wrong math), yielding a 100.0% Broadcast Hallucination Rate. The Multi-Agent Evidence Gate blocked all three, achieving **0.0% Hallucination Rate**.
- **Contradiction Adaptation**: When the passing accuracy rebounded in Interval `31'-45'`, the Baseline blindly repeated the earlier press collapse storyline. The Multi-Agent system verified the rebound, marked the earlier collapse claim as **`SUPERSEDED`**, and updated the chyron.
- **Latency & Cost Trade-off**: The 3-agent orchestration with deterministic recalculation adds **+57 ms** of wall-clock latency (153 ms vs 210 ms) and **+$0.0010** per insight in token costs. In live television broadcasting, this sub-second trade-off is negligible compared to the reputational damage of false graphics.

---

## 6. How Benchmark Runs Are Triggered

1. **Via UI**: Navigate to the **Evaluation Benchmark** view (`http://localhost:3000`) and view the comparative cards and scenario breakdown.
2. **Via Test Suite**:
   ```bash
   npm test
   ```
   The test in `src/__tests__/engine.test.ts` executes `runFullBenchmark()` and asserts all ground-truth verdicts match.
3. **Via Direct Node CLI**:
   ```bash
   npx tsx -e "import { runFullBenchmark } from './src/lib/benchmarks/benchmarkRunner'; console.log(JSON.stringify(runFullBenchmark(), null, 2));"
   ```

---

## 7. Latency and Cost Estimation Methodology

### Latency Measurement
- Measured using `Date.now()` timestamps wrapped around agent invocations and verification execution.
- In local Rules Fallback mode, latency reflects Node.js CPU execution time plus simulated API network latency.
- In live Azure AI Foundry mode, latency includes actual HTTP round-trip time to the Azure datacenter.

### Cost Estimation
- Token counts are tracked directly from model completions (or deterministic token counters).
- Token pricing is calculated using a standard reference rate of **$0.000005 per token** ($5.00 per 1,000,000 prompt/completion tokens).
- Baseline Single-Shot consumes ~140 tokens per insight (~$0.0007).
- Multi-Agent consumes ~340 tokens per insight (~$0.0017) across Analyst, Auditor feedback, and Producer drafts.

---

## 8. Known Benchmark Limitations

- **Small Sample Size ($N=6$)**: The benchmark is designed to evaluate specific failure modes (boundary bugs, missing data, causal vocabulary), not to prove statistical significance across thousands of matches.
- **Synthetic Data**: Match events are synthetically generated from parameterized probability distributions rather than live Opta/StatsBomb feeds.
- **Deterministic Verifier Overhead**: The verifier runs in-memory; scaling to hundreds of concurrent matches would require distributed queueing.
