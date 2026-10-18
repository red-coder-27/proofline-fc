# Proofline FC — System Architecture & Verification Mechanics

## Executive Summary

Proofline FC is an evidence-gated multi-agent platform designed to produce factual, explainable tactical insights from football telemetry. Its central architectural guarantee is that **no language model output may bypass deterministic verification**.

---

## 1. Core Architecture & Component Boundaries

The platform is organized into three distinct layers:
1. **Telemetry & Feature Ingestion Layer**: Ingests raw match events, computes rolling spatial statistics, and detects statistical threshold crossings (turning points).
2. **Specialist Multi-Agent Orchestration Layer**: Coordinates proposal, audit, bounded revision, and broadcast packaging.
3. **Evidence Verification & Ledger Layer**: Runs deterministic 10-point mathematical verification, maintains the Truthline ledger, and gates on-air broadcast displays.

```mermaid
flowchart TD
    subgraph Layer1["1. Telemetry & Feature Ingestion (Deterministic)"]
        RawEvents["Synthetic Match Events<br/>(Passes, Pressures, Turnovers)"] --> StatsCalc["Stats Calculator<br/>(Passing %, Pressure/min)"]
        RawEvents --> TPDetect["Turning Point Detector<br/>(Delta Thresholds >40% / >15%)"]
    end

    subgraph Layer2["2. Specialist Agent Orchestration"]
        StatsCalc --> Analyst["Match State Analyst<br/>(Agent 1 - LLM / Fallback)"]
        TPDetect --> Analyst
        Analyst -->|"Candidate Claim Package<br/>(Claim text, referenced IDs, numerics)"| Auditor["Evidence Auditor<br/>(Agent 2 - Deterministic Code)"]

        Auditor -->|"REQUEST_REVISION<br/>(Directive: remove causal assertion)"| Analyst
        Analyst -->|"SUBMIT_REVISED_CLAIM<br/>(Max 2 Bounded Loops)"| Auditor

        Auditor -->|"AUDIT_VERDICT<br/>(Accepted / Uncertain / Rejected)"| Producer["Broadcast Producer<br/>(Agent 3 - LLM / Fallback)"]
    end

    subgraph Layer3["3. Verification Gate & Output Layer"]
        Producer --> Gate{"Publication Gate<br/>(0% Unverified Rule)"}
        Gate -->|"Rejected / Sparse"| Withheld["Withheld From Air<br/>(Producer Decision Logged)"]
        Gate -->|"Verified / Qualified"| Broadcast["Broadcast Studio Chyrons<br/>(Casual Fan & Analyst Drafts)"]
        Gate --> Ledger["Truthline Ledger<br/>(Immutable Claims, Revisions, Supersessions)"]
    end
```

---

## 2. Model vs. Deterministic Boundaries

To guarantee technical credibility, model-based reasoning is strictly bounded:

| Component | Execution Type | Model Role | Deterministic Fallback / Gate |
| :--- | :---: | :--- | :--- |
| **Event Generator** | Deterministic | None | Pseudorandom seed-based synthetic generator (`generator.ts`). |
| **Stats Calculator** | Deterministic | None | Exact mathematical recalculations; guarded against division-by-zero. |
| **Match State Analyst** | Hybrid (LLM + Fallback) | Drafts candidate claims and hypotheses from statistical anomalies. | If Foundry credentials missing: Uses template generator based on exact snapshot metrics. |
| **Evidence Auditor** | **100% Deterministic** | **None** | Completely independent code verifier. Never delegates audit decisions to an LLM. |
| **Epistemic Guardrails** | Deterministic | None | Regex and vocabulary parser detecting causal words (`caused`, `forced`, `led to`). |
| **Broadcast Producer** | Hybrid (LLM + Fallback) | Adapts verified facts into audience-specific drafts (Casual Fan vs Analyst). | Strict programmatic gate: If audit outcome is `rejected`, code unconditionally blocks publication regardless of LLM generation. |
| **Truthline Ledger** | Deterministic | None | Immutable state ledger; handles deduplication and supersession links. |

---

## 3. Detailed Multi-Agent Sequence & Hand-offs

```mermaid
sequenceDiagram
    autonumber
    participant EE as Event Engine
    participant Analyst as Match State Analyst (Agent 1)
    participant Auditor as Evidence Auditor (Agent 2)
    participant Producer as Broadcast Producer (Agent 3)
    participant Ledger as Truthline Ledger

    EE->>Analyst: Snapshot (metrics, turning points, interval events)
    Analyst->>Analyst: Draft candidate claim text + cited event IDs + numeric claims
    Analyst->>Auditor: PROPOSE_CANDIDATE_INSIGHT (CandidateClaimPackage)

    Auditor->>Auditor: Run 10-Point Checklist:
    Auditor->>Auditor: 1. Validate event IDs exist in match ledger
    Auditor->>Auditor: 2. Check timestamps fall within interval window
    Auditor->>Auditor: 3. Recalculate metric denominators from raw events
    Auditor->>Auditor: 4. Check tolerance (±2.0%)
    Auditor->>Auditor: 5. Scan for contradictory counter-evidence events
    Auditor->>Auditor: 6. Epistemic analysis: detect unproven causal assertions
    Auditor->>Auditor: 7. Check sample size threshold (minimum 10 events)

    opt Bounded Revision Loop (Max 2 Attempts)
        Auditor->>Analyst: REQUEST_REVISION (Specific directive, e.g. "Epistemic qualification required")
        Analyst->>Analyst: Reformulate claim into observed correlation
        Analyst->>Auditor: SUBMIT_REVISED_CLAIM (Revised claim package)
        Auditor->>Auditor: Re-audit revised claim
    end

    Auditor->>Producer: AUDIT_VERDICT_ISSUED (Audit object, rule checks, uncertainty score)

    alt Audit Outcome is REJECTED or INSUFFICIENT_EVIDENCE
        Producer->>Producer: Enforce Quality Gate: published = false
        Producer->>Ledger: Commit with status 'rejected' or 'uncertain' (withheld)
    else Audit Outcome is ACCEPTED or ACCEPTED_WITH_UNCERTAINTY
        Producer->>Producer: Generate Casual Fan draft (plain English) & Analyst draft (exact stats)
        Producer->>Ledger: Commit with status 'verified' or 'uncertain' (published)
    end

    opt Contradictory Evidence in Subsequent Interval
        Ledger->>Ledger: Mark earlier passing collapse claim as SUPERSEDED (link to superseding ID)
    end
```

---

## 4. The 10-Point Deterministic Evidence Checklist

Implemented in `src/lib/verificationEngine/verifier.ts`:

1. **Event Existence Verification**: Every referenced event ID (e.g., `ev_sig_0012`) must exist in the active event stream.
2. **Interval Boundary Alignment**: Referenced events must have timestamps (`minute`, `second`) falling within the target interval window (e.g., `16'-30'`).
3. **Independent Recalculation**: Claimed metric percentages (e.g., passing accuracy) are recalculated from underlying raw events, not trusted from agent prompts.
4. **Tolerance Checking**: The difference between claimed value and recalculated value must not exceed `±2.0%`.
5. **Sample Size Threshold**: The interval must contain at least 10 recorded events. If count $< 10$, the claim is marked `insufficient_evidence` with an uncertainty score $\ge 0.85$.
6. **Counter-Evidence Assessment**: Scans for contradictory events (e.g., successful progressive passes during an alleged total passing failure).
7. **Epistemic Classification**: Categorizes claim modality into `factual` (direct observation), `interpretive` (qualitative), or `causal` (mechanistic attribution).
8. **Causal Guardrail Enforcement**: Any claim using causal verbs (`caused`, `led to`, `forced`) without verifiable mechanism evidence is rejected or downgraded to `accepted_with_uncertainty` (observed correlation).
9. **Calibrated Uncertainty Scoring**: Assigns an uncertainty score from `0.05` (fully verified) to `1.0` (fully rejected).
10. **Publication Quality Gate**: A claim can only be marked `published: true` if its audit outcome is `accepted` or `accepted_with_uncertainty`.

---

## 5. Truthline Ledger & Contradiction Supersession

The Truthline ledger maintains an audit history across intervals:

```
[Interval 01'-15'] clm_baseline_01  ──► VERIFIED   (Balanced tactical baseline)
[Interval 16'-30'] clm_collapse_16  ──► SUPERSEDED (Passing collapsed to 58% under press)
                                              │
                                              ▼ (Superseded by)
[Interval 31'-45'] clm_rebound_31   ──► VERIFIED   (Passing rebounded to 75%+ under press)
```

When new match evidence invalidates an earlier thesis:
- The earlier record's `status` transitions from `verified` to `superseded`.
- `supersededByClaimId` records the ID of the new insight.
- `supersessionReason` provides an explicit explanation of why the earlier claim no longer holds.
- The on-air chyron updates immediately to reflect tactical adaptation rather than repeating obsolete commentary.

---

## 6. Microsoft Foundry Integration Architecture

The platform supports live Azure AI Foundry model execution alongside clean local fallback:

```mermaid
flowchart LR
    Client["Browser Client / UI"] --> Route["Next.js Route Handler<br/>/api/foundry"]
    Route --> Adapter["Microsoft Foundry Adapter<br/>(microsoftAdapter.ts)"]

    Adapter --> ConfigCheck{"Credentials in .env.local?"}
    ConfigCheck -->|"Yes (Endpoint + API Key)"| AzureCall["Azure AI Foundry REST API<br/>(/chat/completions?api-version=...)"]
    ConfigCheck -->|"No / Network Failure"| LocalFallback["Deterministic Rules Engine<br/>(Deterministic Fallback)"]

    AzureCall --> Normalized["Normalized ModelCallResult<br/>(content, tokensUsed, latencyMs, provider)"]
    LocalFallback --> Normalized
    Normalized --> Route
    Route --> Client
```

### Supported Endpoint Formats:
1. **Azure OpenAI Base URL**: `https://<resource>.openai.azure.com`
2. **Azure AI Foundry Project URL**: `https://<project>.services.ai.azure.com`
3. **Pre-expanded Completions Route**: `https://<resource>.openai.azure.com/.../chat/completions?api-version=...`
