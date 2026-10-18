# Proofline FC — System Architecture & Verification Mechanics

## Executive Summary

Proofline FC is an evidence-gated multi-agent platform designed to produce factual, explainable tactical insights from football telemetry. Its central architectural guarantee is that **no language model output may bypass deterministic verification**.

---

## 1. Core Architecture & Component Boundaries

The platform is organized into three distinct layers:
1. **Telemetry & Feature Ingestion Layer**: Ingests raw match events, computes rolling spatial statistics, and detects statistical threshold crossings (turning points).
2. **Specialist Multi-Agent Orchestration Layer**: Coordinates proposal, audit, bounded revision, and broadcast packaging.
3. **Evidence Verification & Ledger Layer**: Runs the deterministic 6-point mathematical verification engine (`verifier.ts`), enforces the centralized publication policy gate (`publicationGate.ts`), maintains the Truthline ledger, and gates on-air broadcast displays.

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

        Auditor -->|"REQUEST_REVISION<br/>(Directive: recalculate numeric / qualify causal assertion)"| Analyst
        Analyst -->|"SUBMIT_REVISED_CLAIM<br/>(Max 2 Bounded Loops)"| Auditor

        Auditor -->|"AUDIT_VERDICT<br/>(Accepted / Uncertain / Rejected)"| Producer["Broadcast Producer<br/>(Agent 3 - LLM / Fallback)"]
    end

    subgraph Layer3["3. Verification Gate & Output Layer"]
        Producer --> Gate{"Centralized Publication Gate<br/>(Status, Audit, Numerics, Epistemic)"}
        Gate -->|"Blocked / Withheld"| Withheld["Withheld From Broadcast<br/>(Logged in Decision Log)"]
        Gate -->|"Approved"| Broadcast["Broadcast Studio Chyrons<br/>(Casual Fan & Analyst Drafts)"]
        Gate --> Ledger["Truthline Ledger<br/>(Validated Claims, Revisions, Supersessions)"]
    end
```

---

## 2. Model vs. Deterministic Boundaries

To guarantee technical credibility, model-based reasoning is strictly bounded:

| Component | Execution Type | Model Role | Deterministic Fallback / Gate |
| :--- | :---: | :--- | :--- |
| **Event Generator** | Deterministic | None | Pseudorandom seed-based synthetic generator (`generator.ts`). |
| **Stats Calculator** | Deterministic | None | Exact mathematical recalculations; guarded against division-by-zero. |
| **Match State Analyst** | Hybrid (LLM + Fallback) | Drafts candidate claims via live Azure AI Foundry structured JSON; validated strictly against schema. | If Foundry credentials missing or inference fails: Uses deterministic fallback templates. Only labeled as live when model output influences candidate. |
| **Evidence Auditor** | **100% Deterministic** | **None** | Completely independent code verifier. Never delegates audit decisions to an LLM. |
| **Epistemic Guardrails** | Deterministic | None | Regex and vocabulary parser detecting causal words (`caused`, `forced`, `led to`). |
| **Broadcast Producer** | Hybrid (LLM + Fallback) | Adapts verified facts into audience-specific drafts (Casual Fan vs Analyst). | Centralized Publication Gate (`publicationGate.ts`): Server-side policy boundary strictly blocking unverified claims, fabricated numbers, or invented tactical mechanisms. |
| **Truthline Ledger** | Deterministic | None | Stateful claim ledger; handles deduplication and validated supersession links. |

---

## 3. Detailed Multi-Agent Sequence & Hand-offs

```mermaid
sequenceDiagram
    autonumber
    participant EE as Event Engine
    participant Analyst as Match State Analyst (Agent 1)
    participant Auditor as Evidence Auditor (Agent 2)
    participant Producer as Broadcast Producer (Agent 3)
    participant Gate as Publication Gate (Central Policy)
    participant Ledger as Truthline Ledger

    EE->>Analyst: Snapshot (metrics, turning points, interval events)
    Analyst->>Analyst: Model completion parsed & validated into CandidateClaimInput
    Analyst->>Auditor: PROPOSE_CANDIDATE_INSIGHT (CandidateClaimPackage)

    Auditor->>Auditor: Run 6-Point Verification Checklist:
    Auditor->>Auditor: 1. Validate all referenced event IDs exist in active interval
    Auditor->>Auditor: 2. Check event timestamps fall within interval window
    Auditor->>Auditor: 3. Recalculate metrics from raw events (±1.5% passing tolerance)
    Auditor->>Auditor: 4. Epistemic analysis & causal guardrail enforcement
    Auditor->>Auditor: 5. Counter-evidence scan for contradictory events
    Auditor->>Auditor: 6. Sample size check (minimum 10 events)

    opt Bounded Revision Loop (Max 2 Attempts)
        Auditor->>Analyst: REQUEST_REVISION (Specific directive: recalculate/qualify)
        Analyst->>Analyst: Reformulate claim into observed correlation
        Analyst->>Auditor: SUBMIT_REVISED_CLAIM (Revised claim package)
        Auditor->>Auditor: Re-audit revised claim
    end

    Auditor->>Producer: AUDIT_VERDICT_ISSUED (Audit object, rule checks, uncertainty score)
    Producer->>Gate: SUBMIT_FOR_PUBLICATION (Claim, Audit, Audience Drafts)

    alt Audit Outcome is REJECTED, EXHAUSTED, or GATE_BLOCKED
        Gate->>Producer: PUBLICATION_DENIED (Withheld from air)
        Producer->>Ledger: Record with status 'rejected' or 'uncertain' (withheld)
    else Audit Outcome is ACCEPTED or ACCEPTED_WITH_UNCERTAINTY
        Gate->>Producer: PUBLICATION_APPROVED
        Producer->>Ledger: Record with status 'verified' or 'uncertain' (published)
    end

    opt Contradictory Evidence in Subsequent Interval
        Ledger->>Ledger: Mark earlier passing collapse claim as SUPERSEDED by newly verified claim
    end
```

---

## 4. The 6-Point Deterministic Evidence Checklist

Implemented in `src/lib/verificationEngine/verifier.ts` and `rules.ts`:

1. **Event Reference Verification** (`referencedEventsExist`): Every referenced event ID (e.g., `ev_sig_0012`) must exist in the active event stream and belong to the active match interval.
2. **Interval Boundary Alignment** (`intervalBoundariesValid`): Referenced events must have timestamps (`minute`, `second`) falling strictly within the requested interval window (e.g., `16'-30'`). Cross-interval contamination is rejected.
3. **Independent Recalculation & Tolerance** (`numericClaimsVerified`): Claimed metric percentages (e.g., passing accuracy) are recalculated from underlying raw events via `calculateTeamIntervalMetrics`. Recalculations must match within strict tolerances (±1.5% for passing accuracy, ±0.2/min for pressure frequency, ±1.0 for counts). Unknown metrics and empty assertion lists fail closed.
4. **Epistemic Classification & Causal Guardrail** (`causalGuardrailPassed`): Flags unproven causal attribution verbs (`caused`, `led to`, `forced`) without verifiable mechanism evidence and downgrades claims to `accepted_with_uncertainty` (observed correlation).
5. **Counter-Evidence Assessment** (`counterEvidenceAssessed`): Scans raw events for contradictory events (e.g., successful progressive passes during an alleged collapse).
6. **Sample Size Threshold** (`sampleSizeSufficient`): The interval must contain at least 10 recorded events. If count $< 10$, the claim is marked `insufficient_evidence` with calibrated high uncertainty ($\ge 0.85$).

### The Centralized Publication Gate (`publicationGate.ts`)

Before any claim can be published to on-air graphics:
- **Status Check**: Status must be `verified` or qualified `uncertain`. Claims with status `rejected`, `proposed`, or `superseded` are blocked.
- **Audit Verification**: Validates that the claim's audit actually passed. Forged `verified` claims with missing audit checks are blocked.
- **Interval Consistency**: Verifies the claim belongs to the active match interval.
- **Evidence Integrity**: All supporting event IDs must be valid.
- **Draft Numeric Veracity**: Producer audience drafts are parsed for numeric statements; numbers must match verified metric assertions.
- **Broadcast Guardrails**: Paraphrased broadcast drafts are scanned for causal trigger words and invented tactical mechanisms (`in their own half`, `bypassed pressing traps`).

---

## 5. Truthline Ledger & Contradiction Supersession

The Truthline ledger maintains a stateful audit history across intervals:

```
[Interval 01'-15'] clm_baseline_01  ──► VERIFIED   (Balanced tactical baseline)
[Interval 16'-30'] clm_collapse_16  ──► SUPERSEDED (Passing collapsed to ~58% under press)
                                              │
                                              ▼ (Superseded by newly verified claim)
[Interval 31'-45'] clm_rebound_31   ──► VERIFIED   (Passing rebounded to 75%+ under press)
```

When new match evidence invalidates an earlier thesis:
- The earlier record's `status` transitions from `verified` to `superseded`.
- `supersededByClaimId` records the ID of the newly verified insight.
- `supersessionReason` provides an explicit explanation of why the earlier claim no longer holds.
- Supersession is gated on genuine verification: an unverified or rejected candidate cannot supersede a verified claim.
- The on-air chyron updates immediately to reflect tactical adaptation rather than repeating obsolete commentary.

---

## 6. Microsoft Foundry Integration Architecture

The platform supports live Azure AI Foundry model execution alongside deterministic local fallback:

```mermaid
flowchart LR
    Client["Browser Client / UI"] --> Route["Next.js Route Handler<br/>/api/foundry"]
    Route --> Safeguards["Security & Policy Gate<br/>16KB Limit | 30 req/min | Domain Guard"]
    Safeguards --> Adapter["Microsoft Foundry Adapter<br/>(microsoftAdapter.ts)"]

    Adapter --> ConfigCheck{"Credentials in .env.local?"}
    ConfigCheck -->|"Yes (Endpoint + API Key)"| AzureCall["Azure AI Foundry REST API<br/>15s Timeout | gpt-4o"]
    ConfigCheck -->|"No / Failure"| LocalFallback["Deterministic Fallback<br/>(Explicitly Labeled)"]

    AzureCall --> Normalized["Normalized ModelCallResult<br/>(content, tokensUsed, latencyMs, provider)"]
    LocalFallback --> Normalized
    Normalized --> Route
    Route --> Client
```

### Server-Side Safeguards:
- **16KB Body Limit**: Prevents payload inflation attacks (HTTP 413).
- **In-Memory Rate Limiting**: 30 requests per minute per IP window (HTTP 429).
- **Football Domain Filter**: Validates prompt topic to prevent open proxy abuse (HTTP 400).
- **15-Second Timeout**: `AbortSignal.timeout(15000)` prevents thread blocking on hanging upstream connections (HTTP 504).
- **Safe Error Responses**: Upstream errors returned cleanly without exposing provider secrets or stack traces (HTTP 502/503).
