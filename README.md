# Proofline FC

<div align="center">

### Every claim. Backed by evidence.

**Evidence-gated football intelligence that verifies AI-generated match insights against deterministic telemetry before broadcast.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2_Turbopack-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-64_Passing_%7C_13_Suites-brightgreen?style=flat-square&logo=node.js)](package.json)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Microsoft Foundry](https://img.shields.io/badge/Microsoft_Foundry-GPT--4o_Integration-0078D4?style=flat-square&logo=microsoft-azure)](https://ai.azure.com/)
[![Fallback](https://img.shields.io/badge/Fallback-100%25_Deterministic_Offline-6B7280?style=flat-square)](src/lib/agents/microsoftAdapter.ts)
[![License](https://img.shields.io/badge/License-Evaluation_(Pending_Finalization)-amber?style=flat-square)](#17-license-status)

[Interactive Judge Preview](https://proofline-fc-git-preview-demo-red-coder-27s-projects.vercel.app/) &nbsp;•&nbsp; [GitHub Repository](https://github.com/red-coder-27/proofline-fc) &nbsp;•&nbsp; [Architecture Deep Dive](docs/ARCHITECTURE.md) &nbsp;•&nbsp; [Benchmark Methodology](docs/EVALUATION.md) &nbsp;•&nbsp; [2-Minute Demo Script](docs/DEMO_SCRIPT.md)

</div>

---

> [!NOTE]
> **Solo Engineering Contribution**: Proofline FC was independently designed, architected, and implemented by a third-year Computer Science and Engineering student at Kumaraguru College of Technology (KCT) as an inquiry into trustworthy AI, multi-agent systems, and sports broadcast telemetry. It represents an independent engineering submission and is not officially affiliated with or endorsed by the Premier League, Microsoft, Azure, or any professional football club.

---

## Table of Contents

1. [Executive Summary & Core Principle](#1-executive-summary--core-principle)
2. [The Signature Demonstration: Claim Supersession](#2-the-signature-demonstration-claim-supersession)
3. [The Core Problem & Failure Modes](#3-the-core-problem--failure-modes)
4. [System Architecture & The Trust Boundary](#4-system-architecture--the-trust-boundary)
5. [Multi-Agent Roles & Responsibilities](#5-multi-agent-roles--responsibilities)
6. [The 6-Point Deterministic Evidence Gate](#6-the-6-point-deterministic-evidence-gate)
7. [The Master Broadcast Publication Gate](#7-the-master-broadcast-publication-gate)
8. [Truthline Ledger & Claim Provenance](#8-truthline-ledger--claim-provenance)
9. [End-to-End Orchestration & Bounded Revision](#9-end-to-end-orchestration--bounded-revision)
10. [Deployment Architecture & Trust Boundaries](#10-deployment-architecture--trust-boundaries)
11. [Benchmark Evaluation & Methodology (N=6 Fixtures)](#11-benchmark-evaluation--methodology-n6-fixtures)
12. [Technology Stack](#12-technology-stack)
13. [Quick Start & Local Development](#13-quick-start--local-development)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Two-Minute Judge Demonstration Walkthrough](#15-two-minute-judge-demonstration-walkthrough)
16. [Security, Threat Model & Known Limitations](#16-security-threat-model--known-limitations)
17. [License Status & Contributing](#17-license-status--contributing)
18. [Documentation Index](#18-documentation-index)

---

## 1. Executive Summary & Core Principle

Modern football broadcasting increasingly turns to generative AI to produce interval summaries, tactical commentary, and on-air graphics. However, standard language models exhibit dangerous failure modes when applied to sports telemetry: they confuse correlation with causation, invent phantom event references, fabricate percentages, cling to stale narratives after tactical shifts, and hallucinate during sparse data intervals.

In a live broadcast with millions of viewers, an ungrounded or contradictory lower-third graphic destroys editorial trust.

Proofline FC solves this with a strict architectural principle:

$$\text{\textbf{AI may propose an insight. Evidence determines whether that insight may be broadcast.}}$$

Rather than expecting a generative model to self-verify, Proofline FC decouples discovery, auditing, and publication into three specialized agent roles backed by an external **6-point mathematical evidence gate**, an immutable claim ledger (**Truthline**), and a centralized **broadcast publication policy gate**.

```mermaid
flowchart TD
    classDef model fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef deterministic fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef loop fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef gate fill:#fdf4ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;
    classDef pass fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef block fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;

    Telemetry["Raw Synthetic Match Telemetry"]:::deterministic --> Metrics["Spatial Metrics & Turning Points"]:::deterministic
    Metrics --> Analyst["Match State Analyst<br/>(Agent 1: LLM / Fallback)"]:::model

    Analyst -->|"Candidate Claim + Cited Event IDs"| Auditor["Evidence Auditor<br/>(Agent 2: 100% Deterministic Code)"]:::deterministic

    Auditor -.->|"Revision Directive"| RevLoop["Bounded Revision Loop<br/>(Max 2 Attempts)"]:::loop
    RevLoop -.->|"Reformulated Candidate"| Analyst

    Auditor -->|"Audit Verdict & Numerics"| Producer["Broadcast Producer<br/>(Agent 3: LLM / Fallback)"]:::model

    Producer --> Gate["Master Publication Gate<br/>(Deterministic Policy Boundary)"]:::gate

    Gate -->|"APPROVED (Verified)"| Approved["Truthline Ledger (Active)<br/>Dual Audience Chyrons (On-Air)"]:::pass
    Gate -->|"WITHHELD / REVOKED"| Withheld["Truthline Archive (Withheld)<br/>Producer Decision Log"]:::block
```

---

## 2. The Signature Demonstration: Claim Supersession

The central engineering capability of Proofline FC is **claim supersession under contradictory evidence**.

In football, tactical reality evolves across intervals. A narrative established in the 25th minute can become completely obsolete by the 40th minute. Conventional LLMs cling to their initial premise or overwrite history memorylessly. Proofline FC preserves the historical audit trail while explicitly revoking obsolete on-air graphics:

```mermaid
sequenceDiagram
    autonumber
    actor User as Broadcast Producer / Match Clock
    participant EE as Telemetry Engine
    participant Analyst as Match State Analyst
    participant Auditor as Evidence Auditor
    participant Gate as Publication Gate
    participant Ledger as Truthline Ledger

    Note over User,Ledger: Phase 1: Interval 16'-30' (Passing Decay Detected)
    User->>EE: Advance to Interval 16'-30'
    EE->>Analyst: Passing dropped to ~58% (Munich pressure surge: 2.4/min)
    Analyst->>Auditor: Propose candidate claim: 'Passing collapsed under high press'
    Auditor->>Auditor: 6-Point Audit: Valid IDs, math verified (58.3%), causal language qualified
    Auditor->>Gate: Verdict: ACCEPTED_WITH_UNCERTAINTY (Observed Correlation)
    Gate->>Ledger: Publish Claim clm_16_decay (Status: VERIFIED, On-Air: TRUE)

    Note over User,Ledger: Phase 2: Interval 31'-45' (Tactical Rebound & Contradiction)
    User->>EE: Advance to Interval 31'-45'
    EE->>Analyst: Telemetry shows passing rebounded to 75.0% despite persistent press
    Analyst->>Auditor: Propose replacement claim: 'Titans adapted structure, passing rebounded to 75%'
    Auditor->>Auditor: 6-Point Audit: Valid IDs, math verified (75.0%), counter-evidence confirmed
    Auditor->>Gate: Verdict: ACCEPTED (Tactical Shift Verified)

    Note over Gate,Ledger: Phase 3: Deterministic Supersession & Graphic Revocation
    Gate->>Ledger: Evaluate Historical Claims against Interval 31'-45' telemetry
    Ledger->>Ledger: Mark clm_16_decay as SUPERSEDED (supersededBy: clm_31_rebound)
    Ledger->>Ledger: Revoke publication approval for clm_16_decay (On-Air: FALSE)
    Gate->>Ledger: Publish replacement clm_31_rebound (Status: VERIFIED, On-Air: TRUE)

    Note over User,Ledger: Result: Historical claim remains inspectable, obsolete graphic withheld
```

### What Happens in the Code:
1. **Initial Insight (16'–30')**: London Titans passing accuracy drops from 84% to 58.3% (9 completed of 16 attempts) under Munich Red Star's pressure (2.4 actions/min). The claim is audited, causal assertions are qualified, and the claim is published to broadcast graphics.
2. **Contradictory Telemetry (31'–45')**: Munich maintains high pressure, but London Titans adapt their passing structure, rebounding to 75.0% accuracy (12 completed of 16 attempts).
3. **Deterministic Re-Evaluation**: The orchestrator (`src/lib/agents/orchestrator.ts`) checks whether the incoming verified claim invalidates earlier interval premises.
4. **State Transition**: The earlier claim (`clm_16_decay`) is transitioned to `status: 'superseded'`.
5. **Publication Revocation**: The Centralized Publication Gate marks `broadcastDecision.published = false`, logs `revocationRationale`, and withholds the obsolete graphic.
6. **Replacement Verification**: The replacement recovery claim (`clm_31_rebound`) is evaluated independently through the full 6-point verification gate before it is eligible for on-air broadcast. Supersession does not automatically certify the replacement claim.

---

## 3. The Core Problem & Failure Modes

When generative models analyze raw sports data without deterministic guardrails, six distinct failure modes emerge. Proofline FC implements an explicit architectural response to each:

| Failure Mode | How Standard LLMs Fail | Proofline FC Implemented Response | Engineering Limitation |
| :--- | :--- | :--- | :--- |
| **1. Correlation vs. Causation** | Asserts that high pressure *directly caused* every turnover without mechanical evidence. | **Epistemic Qualification (`guardrails.ts`)**: Causal trigger verbs (`caused`, `forced`, `led to`) are flagged and downgraded to certified correlation with an uncertainty score (0.45). | Uses vocabulary heuristics; does not perform causal graph discovery. |
| **2. Ungrounded Event References** | Cites hallucinated event IDs (e.g., `ev_phantom_991`) to sound authoritative. | **Event Reference Verification (`rules.ts`)**: Every referenced ID is cross-checked against the immutable match event stream. Missing IDs trigger immediate rejection. | Relies on the integrity of the upstream event generator. |
| **3. Numeric Discrepancies** | Hallucinates plausible-sounding numbers (e.g. claiming a 45% drop when true drop was 23%). | **Deterministic Recalculation (`verifier.ts`)**: Metrics are recomputed directly from raw coordinates and timestamps within strict tolerances ($\pm 1.5\%$ for passing, $\pm 0.2$/min for pressure). | Fixed tolerance windows; does not model sensor noise. |
| **4. Stale Narrative Lock-in** | Repeats early match storylines throughout the match, ignoring contradictory late-match data. | **Truthline Supersession (`orchestrator.ts`)**: Stateful claim ledger detects contradictory evidence, marks old claims as `SUPERSEDED`, and revokes broadcast eligibility. | Supersession currently operates within single-match scope. |
| **5. Failure to Abstain on Sparse Data** | Draws sweeping tactical conclusions during low-density intervals (<10 events). | **Sample Size Gate (`verifier.ts`)**: Intervals with $<10$ recorded events are automatically flagged as `insufficient_evidence` and deferred from broadcast. | Static count threshold (10 events); not density-scaled by game pace. |
| **6. Producer Narrative Drift** | LLM paraphraser embellishes verified facts with ungrounded tactical claims in final graphics. | **Master Publication Gate (`publicationGate.ts`)**: Re-scans generated broadcast drafts for unverified numbers and invented tactical phrases before on-air display. | Scans for known hallucination patterns and exact numbers. |

---

## 4. System Architecture & The Trust Boundary

Proofline FC enforces an explicit **trust boundary** between natural language generation and deterministic verification. Model completions are treated strictly as **untrusted candidate proposals** until certified by code that never delegates decisions to an LLM.

```mermaid
flowchart TD
    classDef deterministic fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef model fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef gate fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef ledger fill:#f5f3ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6;

    subgraph Ingestion["Layer 1: Telemetry & Ingestion (Deterministic)"]
        RawEvents["Synthetic Match Events<br/>(Passes, Pressures, Turnovers, Tackles)"]:::deterministic
        StatsCalc["Spatial Statistics Calculator<br/>(Passing %, Pressure/min, Possession)"]:::deterministic
        TPDetect["Turning Point Detector<br/>(Threshold Delta Detection >40% / >15%)"]:::deterministic
        RawEvents --> StatsCalc
        RawEvents --> TPDetect
    end

    subgraph TrustBoundary["=== TRUST BOUNDARY (Untrusted Model Output vs Deterministic Code) ==="]
        subgraph Proposal["Layer 2: Specialist Multi-Agent Orchestration"]
            Analyst["Agent 1: Match State Analyst<br/>(Azure AI Foundry GPT-4o / Rules Fallback)"]:::model
            Auditor["Agent 2: Evidence Auditor<br/>(100% Deterministic Code Engine)"]:::deterministic
            Producer["Agent 3: Broadcast Producer<br/>(Azure AI Foundry GPT-4o / Rules Fallback)"]:::model
        end
    end

    subgraph Verification["Layer 3: Verification, Publication & Storage"]
        PubGate{"Master Publication Gate<br/>(Deterministic Policy Boundary)"}:::gate
        Truthline["Truthline Claim Ledger<br/>(Stateful History & Supersession Links)"]:::ledger
        Studio["Broadcast Studio<br/>(Regulation Pitch & Dual Audience Chyrons)"]:::ledger
    end

    StatsCalc --> Analyst
    TPDetect --> Analyst
    Analyst -->|"Candidate Claim Package<br/>(Text, Event IDs, Assertions)"| Auditor

    Auditor -->|"REQUEST_REVISION<br/>(Directive: Qualify causal claim / fix math)"| Analyst
    Analyst -->|"SUBMIT_REVISED_CLAIM<br/>(Bounded: Max 2 Loops)"| Auditor

    Auditor -->|"AUDIT_VERDICT<br/>(Accepted / Uncertain / Rejected)"| Producer
    Producer -->|"SUBMIT_DRAFTS<br/>(Casual Fan & Tactical Analyst)"| PubGate

    PubGate -->|"APPROVED (Verified)"| Studio
    PubGate -->|"APPROVED (Verified)"| Truthline
    PubGate -->|"WITHHELD / REVOKED"| Truthline

    Ingestion -.->|"Ground Truth Verification Telemetry"| Auditor
    Ingestion -.->|"Ground Truth Audit Telemetry"| PubGate
```

---

## 5. Multi-Agent Roles & Responsibilities

Proofline FC assigns distinct, non-overlapping responsibilities to three agents. The Evidence Auditor is deliberately implemented in **100% deterministic TypeScript** to ensure mathematical guarantees cannot be bypassed by prompt injection or model hallucination.

| Agent Role | Implementation Type | Model Role | Primary Responsibilities | Failure Handling & Boundaries |
| :--- | :---: | :--- | :--- | :--- |
| **Match State Analyst** (`Agent 1`) | Hybrid (LLM + Fallback) | Drafts candidate claims via live Azure AI Foundry structured JSON; specifies cited event IDs and quantitative assertions. | Ingests interval snapshots and turning points; identifies tactical shifts; responds to revision directives from the Auditor. | If Foundry is unconfigured or unreachable: switches to deterministic rules fallback templates. Model cannot certify its own output. |
| **Evidence Auditor** (`Agent 2`) | **100% Deterministic Code** | **None** (Explicitly zero LLM reliance) | Executes the 6-point evidence checklist; recalculates metrics from raw event coordinates; classifies epistemic modality; scans for counter-evidence. | Never delegates audit decisions to an LLM. Enforces a hard revision cap ($\le 2$ loops); fails closed to `rejected` upon exhaustion. |
| **Broadcast Producer** (`Agent 3`) | Hybrid (LLM + Fallback) | Generates audience-specific drafts: **Casual Fan** (plain English, zero jargon) and **Tactical Analyst** (exact baselines, uncertainty notes). | Formulates on-air lower-third chyrons; respects publication gate decisions; logs publication rationale. | Model drafts are strictly checked by the Master Publication Gate. Any ungrounded numbers or invented phrases are blocked from broadcast. |

```mermaid
flowchart LR
    classDef agent fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef code fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;

    Analyst["Agent 1: Match State Analyst<br/><i>Proposes candidate claim</i>"]:::agent
    Auditor["Agent 2: Evidence Auditor<br/><i>Audits telemetry & math</i>"]:::code
    Producer["Agent 3: Broadcast Producer<br/><i>Adapts audience drafts</i>"]:::agent

    Analyst -->|"1. Candidate Claim<br/>+ Event References"| Auditor
    Auditor -.->|"2a. Revision Directive<br/>(if ungrounded, max 2)"| Analyst
    Analyst -.->|"2b. Revised Claim"| Auditor
    Auditor -->|"3. Certified Audit Verdict<br/>+ Uncertainty Score"| Producer
    Producer -->|"4. Publication Submission<br/>to Master Gate"| Gate["Master Publication Gate"]:::code
```

---

## 6. The 6-Point Deterministic Evidence Gate

Before any candidate claim can be accepted or forwarded to the broadcast producer, it must pass the deterministic verification engine ([`src/lib/verificationEngine/verifier.ts`](src/lib/verificationEngine/verifier.ts), [`rules.ts`](src/lib/verificationEngine/rules.ts), and [`guardrails.ts`](src/lib/verificationEngine/guardrails.ts)):

```
Rule 1: referencedEventsExist    ──► All referenced IDs exist in match event stream
Rule 2: intervalBoundariesValid  ──► Event timestamps fall strictly within interval window
Rule 3: numericClaimsVerified    ──► Recalculated from raw events within strict tolerance
Rule 4: causalGuardrailPassed    ──► Causal vocabulary flagged; qualified to correlation
Rule 5: counterEvidenceAssessed  ──► Contradictory events detected and uncertainty calibrated
Rule 6: sampleSizeSufficient     ──► Interval contains at least 10 recorded match events
```

### Detailed Validation Contract:

1. **Event Reference Verification (`referencedEventsExist`)**:
   - Every cited event ID (e.g. `ev_sig_0012`) must exist in the match event stream ([`validateEventReferences`](src/lib/verificationEngine/rules.ts)).
   - Cited IDs are deduplicated before validation (`Array.from(new Set(...))`) so repeated references cannot artificially inflate valid counts.
   - If any cited ID is missing or invalid, the claim is rejected with `uncertaintyScore: 1.0` and `ruleChecks.referencedEventsExist = false`.
   - In the multi-agent loop, [`runEvidenceAuditor`](src/lib/agents/evidenceAuditor.ts) issues a revision directive identifying the exact missing IDs (`missingIds`) before failing closed.

2. **Interval Boundary Alignment (`intervalBoundariesValid`)**:
   - Every cited event's timestamp (`minute`) must satisfy $T_{\text{start}} \le \text{minute} \le T_{\text{end}}$ for the requested interval window (e.g. $16 \le \text{minute} \le 30$).
   - Any event occurring outside this boundary is flagged in `mismatchedIntervalIds`.
   - Cross-interval data contamination (e.g. citing a minute 12 event to prove a minute 28 breakdown) causes validation failure and immediate rejection.

3. **Independent Metric Recalculation & Tolerance (`numericClaimsVerified`)**:
   - Candidate assertions are recomputed directly from underlying raw telemetry via [`calculateTeamIntervalMetrics`](src/lib/eventEngine/statsCalculator.ts) rather than trusting an unverified model snapshot.
   - Recalculation is strictly restricted to supported metrics (`SUPPORTED_METRICS`: `passingSuccessRate`, `pressureFrequencyPerMin`, `highTurnovers`, `progressiveMeters`, `totalPasses`, `successfulPasses`, `failedPasses`, `shotsTotal`, `shotsOnTarget`).
   - **Fail-Closed Principle**: Unknown metric names or non-finite claimed numbers (`NaN`, `Infinity`, `-Infinity`) immediately fail verification (`matches: false`, `recalculatedValue: NaN`).
   - If a claim text asserts percentages or frequencies (or belongs to category `pressure_surge`), numeric assertions are mandatory; omitting them triggers immediate rejection.
   - Recalculated figures must match claimed values within explicit metric-appropriate tolerances ([`verifyNumericAssertion`](src/lib/verificationEngine/rules.ts)):
     - `passingSuccessRate`: Default tolerance is $\pm 1.5\text{ percentage points}$.
     - `pressureFrequencyPerMin`: Default tolerance is $\pm 0.2\text{ actions/min}$.
     - Count and progression metrics: Default tolerance is $\pm 1.0$.
   - **Zero-Denominator Safety**: If `totalPasses === 0`, `passingSuccessRate` explicitly returns `0.0` (never `NaN`). The interval duration denominator is clamped to $\ge 1\text{ minute}$ (`Math.max(1, endMinute - startMinute + 1)`), preventing division by zero during empty intervals.

4. **Epistemic Classification & Causal Guardrails (`causalGuardrailPassed`)**:
   - Proofline FC treats causal attribution with strict epistemic caution. This rule implements a **lexical guardrail and vocabulary heuristic** ([`guardrails.ts`](src/lib/verificationEngine/guardrails.ts)), scanning for unproven causal triggers (`caused`, `directly led to`, `responsible for`, `resulted entirely from`, `forced every`, `proves that`, `due solely to`) and interpretive tropes (`struggled`, `dominated`, `panicked`, `tactical mastery`).
   - *Epistemic Distinction*: Observational match telemetry demonstrates correlation and statistical co-occurrence, not mechanical causality. The engine does not perform counterfactual causal inference; rather, it prevents language models from asserting unproven causation as factual certainty.
   - When causal language is detected without mechanical proof, `isAcceptableAsFact = false`. The claim is not outright discarded; it is qualified as **`accepted_with_uncertainty`** (`uncertaintyScore: 0.45`), provided with neutral framing suggestions (`coincided with`, `occurred alongside`, `suggests`), and directed to the Analyst for reformulation.

5. **Counter-Evidence Assessment (`counterEvidenceAssessed`)**:
   - The engine scans interval telemetry for contradictory events that qualify or contextualize the claim ([`scanForCounterEvidence`](src/lib/verificationEngine/rules.ts)):
     - For passing degradation claims (`passing_decay`): Scans for $\ge 4$ successful progressive passes ($> 20\text{m}$) by the team during the alleged collapse. If found, logs up to 3 `recovery_observed` contradiction items (`weight: 'medium'`).
     - For pressure claims (`pressure_surge`): Scans for $\ge 3$ sub-threshold pressure events ($< 0.6$ intensity) indicating low disruption (`weight: 'low'`).
   - High-weight counter-evidence or tactical recovery items raise calibrated uncertainty to `0.50` and yield **`accepted_with_uncertainty`**. The rule check flag (`counterEvidenceAssessed: true`) confirms the adversarial scan executed.

6. **Sample Size Threshold (`sampleSizeSufficient`)**:
   - The interval must contain an effective sample count of at least **10 recorded match events** (`effectiveSampleCount >= 10`).
   - If event density $< 10$ events, the claim is assigned **`insufficient_evidence`** with high uncertainty (`uncertaintyScore: 0.85`), setting `ruleChecks.sampleSizeSufficient = false`.
   - Quiet or empty intervals (e.g. 0 to 9 events) fail this rule, preventing models from drawing sweeping tactical conclusions from sparse or noisy sample sizes.

### Verdict Semantics, Revision Loops & The Publication Boundary

Passing individual evidence checks is necessary, but **does not guarantee on-air broadcast**. Proofline FC maintains a clear architectural separation between verification auditing and broadcast publication:

| Audit Outcome | Uncertainty Score | Condition in Code | Revision Loop Action | Broadcast Gate Decision |
| :--- | :---: | :--- | :--- | :--- |
| **`accepted`** | `0.05` | All 6 checks pass; metrics within tolerance; no causal triggers or heavy counter-evidence. | No revision required. Forwarded to Producer. | Eligible for on-air broadcast subject to publication gate policy. |
| **`accepted_with_uncertainty`** | `0.45 – 0.50` | Causal vocabulary flagged (`0.45`) or counter-evidence detected (`0.50`). Math and event IDs valid. | Revision requested if causal language and attempts $< 2$; otherwise forwarded with qualification. | Approved for broadcast with mandatory evidentiary note attached to Analyst chyron. |
| **`rejected`** | `0.95 – 1.0` | Phantom event IDs (`1.0`), out-of-interval events (`1.0`), metric mismatch (`0.95`), or revision limit exhausted. | Revision requested if attempts $< 2$; fails closed upon exhaustion. | **Strictly blocked from broadcast** (`decision: 'rejected_by_producer'`). |
| **`insufficient_evidence`** | `0.85` | Effective interval sample count $< 10$ match events. | No revision loop (data is genuinely sparse). | **Deferred from broadcast** (`decision: 'deferred'`, graphic withheld until data density increases). |

#### Centralized Publication Gate Role:
Even an `accepted` claim is not broadcast automatically. The **Master Publication Gate** ([`publicationGate.ts`](src/lib/verificationEngine/publicationGate.ts)) acts as an independent server-side policy boundary:
- **Anti-Forgery & Replay Check**: Verifies authentic audit completion and matches `audit.claimId` and `audit.targetIntervalLabel` to the submission, preventing forged verified flags or cross-claim audit replays.
- **Supersession Revocation**: Claims marked `superseded` are strictly barred from airing.
- **Draft Numeric Fidelity**: Producer drafts are regex-parsed; any number not confirmed by verified assertions or telemetry snapshot blocks the broadcast.
- **Lexical Guardrail Enforcement**: Paraphrased drafts cannot re-introduce banned causal phrases or ungrounded tactical cliches.

### Implementation Traceability:

| Verification Component | Source File | Key Functions | Verification Test Suites |
| :--- | :--- | :--- | :--- |
| **Audit Orchestration & Verdicts** | [`src/lib/verificationEngine/verifier.ts`](src/lib/verificationEngine/verifier.ts) | `verifyCandidateClaim` | [`engine.test.ts`](src/__tests__/engine.test.ts) |
| **Event & Numeric Rules** | [`src/lib/verificationEngine/rules.ts`](src/lib/verificationEngine/rules.ts) | `validateEventReferences`, `verifyNumericAssertion`, `scanForCounterEvidence` | [`engine.test.ts`](src/__tests__/engine.test.ts) |
| **Epistemic & Causal Guardrails** | [`src/lib/verificationEngine/guardrails.ts`](src/lib/verificationEngine/guardrails.ts) | `classifyClaimEpistemics`, `qualifyCausalClaim` | [`engine.test.ts`](src/__tests__/engine.test.ts) |
| **Denominator Safety & Metrics** | [`src/lib/eventEngine/statsCalculator.ts`](src/lib/eventEngine/statsCalculator.ts) | `calculateTeamIntervalMetrics`, `computeIntervalSnapshot` | [`engine.test.ts`](src/__tests__/engine.test.ts) |
| **Bounded Revision Handling** | [`src/lib/agents/evidenceAuditor.ts`](src/lib/agents/evidenceAuditor.ts) | `runEvidenceAuditor` | [`intervalScopingAndRevisions.test.ts`](src/__tests__/intervalScopingAndRevisions.test.ts) |
| **Master Publication Policy** | [`src/lib/verificationEngine/publicationGate.ts`](src/lib/verificationEngine/publicationGate.ts) | `evaluateBroadcastPublicationGate` | [`publicationGate.test.ts`](src/__tests__/publicationGate.test.ts) |

---

## 7. The Master Broadcast Publication Gate

Even if an agent produces a candidate insight, it cannot be broadcast without approval from the centralized **Master Publication Gate** (`src/lib/verificationEngine/publicationGate.ts`). This server-side policy boundary enforces six broadcast safety rules:

```mermaid
flowchart TD
    classDef check fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef pass fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef block fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;

    Candidate["Candidate Broadcast Package<br/>(Claim + Audit + Audience Drafts)"] --> Rule1{"Rule 1: Status Check<br/>Claim or Audit Rejected?"}:::check

    Rule1 -->|"Yes"| Block1["WITHHOLD: Rejected by audit"]:::block
    Rule1 -->|"No"| Rule2{"Rule 2: Supersession Check<br/>Claim Marked Superseded?"}:::check

    Rule2 -->|"Yes"| Block2["WITHHOLD: Superseded claims cannot air"]:::block
    Rule2 -->|"No"| Rule3{"Rule 3: Authenticity Check<br/>Audit Actually Passed?"}:::check

    Rule3 -->|"Forged / Failed"| Block3["WITHHOLD: Forged verification status blocked"]:::block
    Rule3 -->|"Authentic Pass"| Rule4{"Rule 4: Density Check<br/>Sample Count < 10 Events?"}:::check

    Rule4 -->|"Sparse"| Defer4["DEFER: Insufficient evidence for broadcast"]:::block
    Rule4 -->|"Sufficient"| Rule5{"Rule 5: Draft Numerics Check<br/>Draft numbers match verified data?"}:::check

    Rule5 -->|"Mismatch"| Block5["WITHHOLD: Producer draft altered verified numbers"]:::block
    Rule5 -->|"Matches"| Rule6{"Rule 6: Broadcast Guardrails<br/>Invented tactics or causal phrases?"}:::check

    Rule6 -->|"Violated"| Block6["WITHHOLD: Draft contains invented tactical tropes"]:::block
    Rule6 -->|"Clean"| Approve["PUBLISH TO ON-AIR CHYRON<br/>Dual Audience Drafts Active"]:::pass
```

### Publication Gate Safeguards:
- **Anti-Forgery Protection**: A caller cannot bypass the gate by setting `status = 'verified'` in JSON. The gate independently verifies that `audit.ruleChecks` authentically confirms event existence, numeric validity, and positive event count.
- **Supersession Revocation**: Superseded claims are permanently barred from being published as currently valid facts.
- **Audience Draft Numeric Veracity**: Final Casual Fan and Analyst drafts are parsed via regex for numeric statements (`%`, `/min`). Any number not grounded in the verified metric assertions causes the draft to be blocked.
- **Invented Tactical Phrase Guardrail**: Scans drafts for unearned broadcast cliches that models invent (e.g. `bypassed pressing traps`, `in their own half`, `guaranteeing a loss`, `tactical mastery`, `panicked`).

---

## 8. Truthline Ledger & Claim Provenance

All claims are tracked in the **Truthline Ledger** (`src/types/claims.ts`), an immutable record of tactical assertions, verification audits, revision histories, and publication decisions.

### Verified Claim Statuses (`ClaimStatus`):

| Claim Status | Meaning | Entry Condition | Broadcast Consequence | Inspectable in History? |
| :--- | :--- | :--- | :--- | :---: |
| **`proposed`** | Initial candidate claim drafted by Match State Analyst. | Emitted by Analyst; awaiting verification. | Ineligible for broadcast. | Yes |
| **`verified`** | Passed all 6 deterministic audit checks and approved by publication gate. | All 6 checks pass; recalculation within tolerance. | **Approved for on-air broadcast** (Casual & Analyst drafts). | Yes |
| **`uncertain`** | Qualified as observed correlation, accompanied by counter-evidence or sparse data warning. | Causal language flagged, counter-evidence detected, or sample count $<10$. | Qualified broadcast with uncertainty note, or deferred if sparse. | Yes |
| **`rejected`** | Failed event reference checks, failed numeric tolerance, or exceeded revision limit. | Missing event IDs, math mismatch, or ungrounded after 2 revisions. | **Strictly blocked from broadcast** (0% unverified rule). | Yes |
| **`superseded`** | Previously verified claim invalidated by subsequent contradictory evidence. | Verified claim arrives in later interval contradicting earlier premise. | **Publication revoked**; graphic withheld from broadcast. | **Yes (Full audit trail preserved)** |

### Claim Lifecycle State Diagram:

```mermaid
stateDiagram-v2
    [*] --> proposed: Analyst proposes candidate insight
    proposed --> Auditing: Submitted to Evidence Auditor

    state Auditing {
        [*] --> CheckRules
        CheckRules --> RevisionRequested: Causal language / numeric mismatch (revisions < 2)
        RevisionRequested --> CheckRules: Analyst submits revised claim
    }

    Auditing --> rejected: Missing IDs / math failure / max revisions exceeded
    Auditing --> uncertain: Sample size < 10 / counter-evidence / causal qualification
    Auditing --> verified: All 6 deterministic checks passed

    state PublicationDecision {
        rejected --> WithheldFromAir: Gate blocks broadcast
        uncertain --> QualifiedBroadcast: Gate approves with uncertainty pill
        uncertain --> DeferredFromAir: Gate defers if sparse sample
        verified --> ApprovedForAir: Gate approves Casual & Analyst drafts
    }

    ApprovedForAir --> superseded: Contradictory evidence verified in later interval
    QualifiedBroadcast --> superseded: Contradictory evidence verified in later interval

    superseded --> WithheldFromAir: Publication decision revoked (graphic withheld)
```

---

## 9. End-to-End Orchestration & Bounded Revision

When the Evidence Auditor detects an ungrounded assertion or causal overstatement, it does not simply crash or accept the flaw. It triggers a **bounded revision loop** with specific directives:

```mermaid
sequenceDiagram
    autonumber
    participant Analyst as Match State Analyst (Agent 1)
    participant Auditor as Evidence Auditor (Agent 2)
    participant Producer as Broadcast Producer (Agent 3)
    participant Gate as Master Publication Gate
    participant Ledger as Truthline Ledger

    Analyst->>Auditor: Propose: "High press directly caused passing failure" (ev_01, ev_02)
    Auditor->>Auditor: Check 4 Failed: Causal verb "caused" without mechanical proof

    rect rgb(254, 243, 199)
        note over Analyst,Auditor: Bounded Revision Loop (Attempt 1 of 2)
        Auditor->>Analyst: REQUEST_REVISION (Directive: Replace causal attribution with observed correlation)
        Analyst->>Analyst: Reformulate: "Passing accuracy fell to 58%, coinciding with high press"
        Analyst->>Auditor: SUBMIT_REVISED_CLAIM (Revised claim package)
        Auditor->>Auditor: Re-audit: All 6 checks now pass
    end

    Auditor->>Producer: AUDIT_VERDICT_ISSUED (Accepted with qualification, uncertainty: 0.45)
    Producer->>Gate: Submit Casual Fan & Tactical Analyst broadcast drafts
    Gate->>Gate: Validate draft numerics & broadcast guardrails
    Gate->>Ledger: Commit verified record to Truthline (Version 2)
```

**Revision Loop Guardrails**:
- **Hard Limit**: The revision loop is capped at a maximum of 2 attempts (`maxRevisionLimit: 2`).
- **Exhaustion Handling**: If a claim cannot be verified after 2 revisions, it is automatically marked **`rejected`** and withheld from broadcast. Infinite deliberation loops are architecturally impossible.

---

## 10. Deployment Architecture & Trust Boundaries

Proofline FC enforces three distinct security operating tiers to ensure that API credentials, server quotas, and broadcast integrity are protected across local, preview, and production environments:

```mermaid
flowchart TD
    classDef client fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef edge fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef server fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef cloud fill:#f5f3ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6;

    subgraph BrowserClient["Browser Client (Untrusted Environment)"]
        UI["React 19 User Interface<br/>(Match Intelligence, Truthline, Broadcast Studio)"]:::client
        NoKeys["ZERO SECRETS IN CLIENT<br/>No API keys in JavaScript bundles or client storage"]:::client
    end

    subgraph EdgeBoundary["Infrastructure Edge (Vercel)"]
        VercelEdge{"Vercel Deployment Protection<br/>(Password Protection / Shareable Access)"}:::edge
    end

    subgraph NextServer["Next.js Server Runtime (Secure Boundary)"]
        RouteHandler["/api/foundry Route Handler<br/>(Single Point of Model Egress)"]:::server

        subgraph RouteSafeguards["Server Route Safeguards"]
            PayloadLimit["16KB Body Limit<br/>(HTTP 413)"]:::server
            RateLimiter["Sliding-Window Rate Limiter<br/>30 req/min per IP (HTTP 429)"]:::server
            DomainGuard["Domain Topic Guardrail<br/>Football analysis only (HTTP 400)"]:::server
            CreditGuard["Credit Protection Gate<br/>Rejects unauthenticated prod (HTTP 403)"]:::server
            Timeout["15s Upstream Timeout<br/>AbortSignal.timeout (HTTP 504)"]:::server
        end

        EnvVars["Server Environment (.env.local)<br/>AZURE_AI_FOUNDRY_ENDPOINT<br/>AZURE_AI_FOUNDRY_KEY"]:::server
    end

    subgraph UpstreamProviders["Model Execution Layer"]
        AzureFoundry["Azure AI Foundry REST API<br/>(gpt-4o deployment)"]:::cloud
        DeterministicFallback["Deterministic Rules Engine<br/>(100% Offline Local Fallback)"]:::server
    end

    UI -->|"HTTP POST (Prompt payload only)"| VercelEdge
    VercelEdge --> RouteHandler
    RouteHandler --> RouteSafeguards
    RouteSafeguards --> EnvVars

    EnvVars -->|"Credentials Configured"| AzureFoundry
    EnvVars -->|"Credentials Missing / Timeout"| DeterministicFallback

    AzureFoundry -->|"Normalized Completion"| RouteHandler
    DeterministicFallback -->|"Deterministic Template"| RouteHandler
    RouteHandler -->|"Clean JSON Response"| UI
```

### Three Deployment Security Tiers (Aligned with [SECURITY.md](SECURITY.md)):

1. **Tier 1: Local Development (`NODE_ENV === 'development'`)**:
   - Runs locally at `http://localhost:3000`.
   - Full access to local deterministic agents and optional live Azure AI Foundry credentials configured in `.env.local`.
   - In-memory rate limiting (30 req/min) and 16KB payload limits active.

2. **Tier 2: Restricted Preview / Hackathon Evaluation (Vercel Deployment Protection)**:
   - For evaluator access on preview platforms ([Judge Preview Deployment](https://proofline-fc-git-preview-demo-red-coder-27s-projects.vercel.app/)), the entire application is protected at the infrastructure edge via **Vercel Password Protection / Shareable Access**.
   - Within this authenticated edge boundary, `ENABLE_LIVE_FOUNDRY=true` can be enabled in Vercel preview settings.
   - **Crucially, no secrets are distributed to browser clients or passed in client headers**. Evaluators authenticate via Vercel's edge gate.
   - Direct server-to-server calls may optionally supply `Authorization: Bearer <key>` if `FOUNDRY_ACCESS_KEY` is configured.

3. **Tier 3: Public Production Deployment (`NODE_ENV === 'production'` or `VERCEL === '1'`)**:
   - To prevent public budget exhaustion and denial-of-wallet attacks, anonymous public model calls are rejected by default with HTTP 403 (`ENABLE_LIVE_FOUNDRY !== 'true'`).
   - The application functions with **100% fidelity in deterministic verification mode**: every scenario, evidence check, publication gate, and broadcast chyron operates without external network dependencies.
   - In-memory rate limiting is single-instance; enterprise multi-tenant deployments require distributed Redis caching and Azure API Management.

---

## 11. Benchmark Evaluation & Methodology (N=6 Fixtures)

The evaluation harness (`src/lib/benchmarks/benchmarkRunner.ts`) executes a controlled ground-truth benchmark contrasting a standard **Baseline Single-Shot LLM** against the **Multi-Agent Evidence-Gated System**.

> [!IMPORTANT]
> **Benchmark Scope Disclosure**: This evaluation tests deterministic gating mechanics across **six controlled synthetic fixtures ($N=6$)** designed to evaluate specific failure modes. It demonstrates architectural correctness and verification guarantees; it does not claim large-N statistical generalization over real match feeds. The baseline is an illustrative, memoryless single-shot LLM without a verification engine or stateful ledger.

```mermaid
flowchart LR
    classDef fixture fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef baseline fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef gated fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef eval fill:#f5f3ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6;

    Fixtures["6 Controlled Ground-Truth Fixtures<br/>(Valid, Corrupted IDs, Causal Speculation,<br/>Contradiction, Sparse Sample, Wrong Math)"]:::fixture

    Fixtures -->|"Single-shot prompt"| Baseline["Baseline Single-Shot LLM<br/>- Memoryless<br/>- No evidence verifier<br/>- No publication gate<br/>- Auto-publishes 100%"]:::baseline
    Fixtures -->|"Multi-agent orchestration"| Gated["Proofline FC Evidence-Gated<br/>- 3 Specialized Agent Roles<br/>- 6-Point Deterministic Gate<br/>- Master Publication Gate<br/>- Truthline Ledger"]:::gated

    Baseline --> Eval["Comparative Evaluation Rubric<br/>(Accuracy, Hallucinations, Rejection, Latency, Cost)"]:::eval
    Gated --> Eval
```

### Scenario-by-Scenario Evaluation Results ($N=6$):

| Fixture ID | Scenario Name | Failure Mode Tested | Baseline Single-Shot Result | Proofline FC Evidence-Gated Result | Ground-Truth Expectation |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **`gt_01`** | **Verified Passing Degradation** | Valid statistical shift with genuine event IDs and matching denominators. | Published (100%) | **Published (Verified)** | `accepted` / Publish |
| **`gt_02`** | **Hallucinated Event References** | Candidate cites non-existent event IDs (`ev_phantom_991`, `ev_phantom_992`). | Leaked to broadcast (Hallucination) | **Blocked & Withheld (Rejected)** | `rejected` / Withhold |
| **`gt_03`** | **Unqualified Causal Speculation** | Analyst asserts press *directly caused* every misplaced pass without proof. | Published ungrounded causal claim | **Qualified to Correlation (Uncertain)** | `accepted_with_uncertainty` / Publish with note |
| **`gt_04`** | **Contradiction Supersession** | Passing rebounds to 75%+ in 31'-45', contradicting earlier collapse thesis. | Ignored contradiction (Stale) | **Earlier Claim Superseded & Revoked** | `accepted` / Supersede old |
| **`gt_05`** | **Sparse Sample Size (<10 events)** | Interval contains only 5 total events; data is statistically insufficient. | Published sweeping claim | **Deferred from Broadcast (Sparse)** | `insufficient_evidence` / Defer |
| **`gt_06`** | **Fabricated Numeric Delta** | Claim asserts 45% drop when true recalculated delta was only 23%. | Published false numbers | **Blocked & Withheld (Rejected)** | `rejected` / Withhold |

### Summary Metric Comparison Table:

| Metric Key | Evaluation Metric | Baseline Single-Shot | Multi-Agent Evidence-Gated | Mathematical Denominator & Formula |
| :--- | :--- | :---: | :---: | :--- |
| `supportedClaimAccuracy` | **Supported Claim Accuracy** | 100.0% | **100.0%** | $\frac{\text{Supported claims correctly published}}{\text{Total supported ground-truth claims}} \times 100$ ($N_{sup}=3$) |
| `unsupportedClaimRejectionRate` | **Unsupported Claim Rejection Rate** | 0.0% | **100.0%** | $\frac{\text{Flawed/sparse claims correctly blocked}}{\text{Total flawed/sparse ground-truth claims}} \times 100$ ($N_{flaw}=3$) |
| `unsupportedClaimHallucinationRate` | **Broadcast Hallucination Rate** | 100.0% | **0.0%** | $\frac{\text{Flawed/sparse claims leaked to broadcast}}{\text{Total flawed/sparse ground-truth claims}} \times 100$ ($N_{flaw}=3$) |
| `contradictionHandlingAccuracy` | **Contradiction Supersession Accuracy** | 0.0% | **100.0%** | $\frac{\text{Contradictions where earlier claim was marked SUPERSEDED}}{\text{Total contradiction scenarios}} \times 100$ ($N_{contra}=1$) |
| `correctAbstentionRate` | **Correct Abstention Rate** | 0.0% | **100.0%** | $\frac{\text{Sparse intervals correctly deferred}}{\text{Total sparse scenarios}} \times 100$ ($N_{sparse}=1$) |
| `averageLatencyMs` | **Verification Gate Overhead** | **1.2 ms** | 3.8 ms | Local deterministic verification execution duration via `performance.now()` across all scenarios ($N=6$, +2.6 ms in local mode) |
| `estimatedCostPerInsightUSD` | **Estimated Cost Per Insight** | **$0.0007** | $0.0017$ | Total tokens across 3 agents calculated at reference Azure OpenAI rate ($0.000005/token) |

---

## 12. Technology Stack

Verified directly from repository configuration, dependencies, and source code:

| Layer / Concern | Technology | Version | Purpose in Proofline FC |
| :--- | :--- | :---: | :--- |
| **Framework** | [Next.js](https://nextjs.org/) | `16.4.2` | App Router, Turbopack dev/build engine, server-side route handlers. |
| **UI Library** | [React](https://react.dev/) | `19.3.0` | Component state management, reactive timeline rendering, SVG pitch visuals. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.x` | Strict type safety, discriminated unions for claims/audits, zero `any` policy. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `4.x` | Modern utility styling via `@tailwindcss/turbopack`. |
| **Iconography** | [lucide-react](https://lucide.dev/) | `^1.59.0` | Accessible UI icons for navigation, audit indicators, and status pills. |
| **Test Runner** | Node.js Test Runner | `node:test` | Built-in test runner executed via [tsx](https://github.com/privatenumber/tsx) `^4.23.15` (64 tests across 13 suites). |
| **Linter** | [ESLint](https://eslint.org/) | `^9.x` | Code quality enforcement with `eslint-config-next`. |
| **Model Integration** | [Azure AI Foundry](https://ai.azure.com/) | REST API `2024-08-01-preview` | Authenticated chat completions (`gpt-4o`) with structured JSON schema output. |
| **Hosting Platform** | [Vercel](https://vercel.com/) | Cloud Edge | Serverless route execution with Vercel Deployment Protection. |

---

## 13. Quick Start & Local Development

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **Git**: Installed and configured

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/red-coder-27/proofline-fc.git
cd proofline-fc

# Install dependencies
npm install
```

### 2. Configure Environment (Optional for Live Inference)

Proofline FC is designed to run **100% offline out-of-the-box** using its deterministic rules fallback engine. If you do not have Azure AI Foundry credentials, skip this step.

```bash
# Copy example environment configuration
cp .env.example .env.local
```

*In Windows PowerShell:*
```powershell
Copy-Item .env.example .env.local
```

If configuring live Azure AI Foundry, edit `.env.local` with your endpoint and key:
```env
AZURE_AI_FOUNDRY_ENDPOINT=https://your-foundry-resource.openai.azure.com
AZURE_AI_FOUNDRY_KEY=your_azure_foundry_api_key_here
AZURE_AI_FOUNDRY_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

### 3. Verify Code Quality & Test Suite

Verify that all 64 automated tests, TypeScript strict compilation, and ESLint pass cleanly:

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run full automated test suite (64 tests across 13 suites)
npm test

# Verify production build compilation
npm run build
```

### 4. Start Local Development Server

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser. The application is immediately ready for evaluation.

---

## 14. Environment Variables Reference

Verified from `.env.example` and `src/app/api/foundry/route.ts`:

| Variable Name | Required? | Default Value | Server-Side Only? | Purpose & Safe Placeholder Example |
| :--- | :---: | :---: | :---: | :--- |
| `AZURE_AI_FOUNDRY_ENDPOINT` | Optional | `undefined` | **Yes** | Azure AI Foundry / Azure OpenAI endpoint URL.<br/>`https://mre-foundry.openai.azure.com` |
| `AZURE_AI_FOUNDRY_KEY` | Optional | `undefined` | **Yes** | Authentication API key for Azure AI Foundry deployment.<br/>`abcdef1234567890abcdef1234567890` (placeholder) |
| `AZURE_AI_FOUNDRY_DEPLOYMENT` | Optional | `gpt-4o` | **Yes** | Target model deployment name.<br/>`gpt-4o` |
| `AZURE_OPENAI_API_VERSION` | Optional | `2024-08-01-preview` | **Yes** | Azure OpenAI REST API protocol version.<br/>`2024-08-01-preview` |
| `ENABLE_LIVE_FOUNDRY` | Optional | `false` | **Yes** | Set to `true` in Vercel preview settings to enable live model calls within Vercel password protection.<br/>`false` |
| `FOUNDRY_ACCESS_KEY` | Optional | `undefined` | **Yes** | Optional server-to-server access key for automated test runners or curl requests.<br/>`your_server_access_key_here` |

*Critical Security Notice: All variables are server-side only. Never prefix with `NEXT_PUBLIC_` and never commit credentials to source control.*

---

## 15. Two-Minute Judge Demonstration Walkthrough

Follow this exact sequence to experience the full evidence-gating and claim supersession lifecycle in under two minutes (detailed script available in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)):

```
[0:00] Reset Simulation  ──►  [0:15] Advance to 16'-30'  ──►  [0:45] Advance to 31'-45'  ──►  [1:10] Truthline Ledger  ──►  [1:35] Broadcast Studio
   Initial Tactical              Passing Decay Detected          Contradictory Rebound           Inspect Superseded              Inspect Dual Chyrons
   Baseline (01'-15')            6/6 Audit Passed (58.3%)        Passing Rebounded (75.0%)       Claim & Revocation              Casual vs Analyst
```

1. **Minute 0:00 – 0:25: Initial Baseline & Discovery**
   - Navigate to **Match Intelligence** in the left Navigation Rail.
   - Click **Reset** in the top header to ensure the simulation begins at `01'–15'`.
   - Click **Advance Interval** to advance to `16'–30'`.
   - Notice London Titans passing accuracy drop to ~58% under Munich Red Star's pressure surge (2.4/min).
   - In the **Contextual Evidence Drawer**, inspect the candidate insight and the **6/6 Checks Passed** audit card. Point out how causal language was qualified to certified correlation.

2. **Minute 0:25 – 0:50: Inject Contradiction & Rebound**
   - Click **Advance Interval** again to advance to `31'–45'`.
   - An amber pill appears in the top header: `Phase 3: Contradictory Evidence Active`.
   - Notice telemetry shows London Titans adapted their shape, rebounding to 75.0% passing accuracy under sustained press.

3. **Minute 0:50 – 1:15: Truthline Ledger & Supersession**
   - Click **Truthline Ledger** in the left Navigation Rail.
   - Observe that the earlier `16'–30'` claim is prominently marked **`SUPERSEDED`** with an explicit explanation and link to the new claim.
   - Point out that the historical record remains inspectable, but its publication approval is revoked.
   - The newer `31'–45'` recovery claim displays a green **`VERIFIED`** badge.

4. **Minute 1:15 – 1:40: Broadcast Studio & Audience Personalization**
   - Click **Broadcast Studio** in the left Navigation Rail.
   - Hover over pitch markers to view the stationary inspection tooltip (`pointer-events: none`) and collision-avoided ID pills. Click a marker to lock selection.
   - Scroll to the lower-third broadcast card. Toggle between **Casual Fan** mode (*"Titans respond! After early trouble with the press..."*) and **Tactical Analyst** mode (*"Tactical Adaptation: passing rebounded to 75.0%..."*).
   - Inspect the **Producer Publication Decision Log** confirming 0% unverified publication.

5. **Minute 1:40 – 2:00: Scenario Lab & Benchmark**
   - Click **Scenario Lab** to inspect the step-by-step agent message handoff trace (`Analyst → Auditor → Producer`).
   - Click **Evaluation Benchmark** to inspect the 6 controlled ground-truth fixtures and the 0.0% hallucination rate metric.

---

## 16. Security, Threat Model & Known Limitations

### Implemented Security Controls (Verified in [SECURITY.md](SECURITY.md)):
- **Server-Side Credential Isolation**: Azure AI Foundry keys exist only in `.env.local` and server memory. No keys are bundled into client JavaScript.
- **Request Size Limitation**: Enforces a strict 16KB payload limit on incoming POST requests (HTTP 413).
- **Rate Limiting**: Sliding-window rate limiter limits client IPs to 30 requests per minute (HTTP 429).
- **Domain Guardrail**: Incoming prompts are scanned for football tactical keywords (`interval`, `match`, `pass`, `pressure`, `tactical`, `analyst`, `proofline`) to prevent use as an open LLM proxy (HTTP 400).
- **Execution Timeouts**: Upstream requests enforce a 15-second abort timeout (`AbortSignal.timeout(15000)`) to prevent thread hangs (HTTP 504).
- **Structured Error Responses**: Upstream provider failures return clean JSON error payloads without exposing provider stack traces or internal endpoints.

### Transparent Engineering Limitations:
- **Synthetic Telemetry**: The current prototype ingests synthetic event sequences generated with deterministic seeds. It has not yet been connected to real-time binary feeds (e.g. Opta or StatsBomb).
- **Fixed Interval Windows**: Analysis operates over fixed 15-minute segments (`01'–15'`, `16'–30'`, `31'–45'`). Rolling or event-driven segmentation is future work.
- **Single-Match Scope**: Truthline supersession currently tracks claims within a single match; cross-match campaign history is not yet implemented.
- **Controlled Benchmark Size**: The benchmark evaluates 6 controlled failure-mode fixtures. It demonstrates verification mechanics, not large-N statistical generalization over thousands of professional matches.
- **Single-Instance Rate Limiting**: The in-memory sliding-window rate limiter runs per Node.js process; a distributed multi-instance deployment requires an external cache (e.g. Redis or Azure API Management).

---

## 17. License Status & Contributing

### License Status
**Licensing has not yet been finalized by the repository owner.**
The project is currently provided for evaluation, academic assessment, and hackathon judging purposes. An open-source license (such as MIT or Apache 2.0) will be added upon confirmation by the repository maintainer.

### Contributing
Please review [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, coding standards, and pre-submission verification procedures. All pull requests must pass:
```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

---

## 18. Documentation Index

For deeper technical documentation, please consult the dedicated guides in the repository:

| Document | Primary Audience | Key Topics Covered |
| :--- | :--- | :--- |
| **[System Architecture](docs/ARCHITECTURE.md)** | Architects & Engineers | Layered architecture, model vs deterministic boundaries, multi-agent sequence diagrams, 6-point checklist mechanics. |
| **[Benchmark Methodology](docs/EVALUATION.md)** | Evaluators & Data Scientists | Ground-truth fixture specifications, mathematical metric formulas, denominators, and trade-off analysis. |
| **[2-Minute Demonstration Script](docs/DEMO_SCRIPT.md)** | Judges & Reviewers | Timed step-by-step walkthrough script, exact UI button clicks, and narration talking points. |
| **[Visual Asset & Screenshot Guide](docs/screenshots/README.md)** | Reviewers & Presenters | Recommended viewports, capture procedures, and asset specifications for all 6 core screens. |
| **[Security Policy](SECURITY.md)** | Security Auditors & Evaluators | Responsible disclosure guidelines, server-side safeguards, threat model boundaries, and deployment tiers. |
| **[Contributor Guidelines](CONTRIBUTING.md)** | Open-Source Contributors | Development setup, branch guidelines, coding standards, and pre-PR quality checklists. |
