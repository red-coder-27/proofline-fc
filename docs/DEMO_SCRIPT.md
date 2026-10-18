# Proofline FC — 2-Minute Demonstration Script

This script provides an exact, timed walkthrough for judges and reviewers. It uses the real application flow, UI button labels, and screen states.

- **Total Duration**: 1 minute 55 seconds
- **Local Application URL**: `http://localhost:3000`
- **Initial Setup**: Click the **Reset** button in the top header to ensure the simulation begins at `01'-15'`.

---

## Act 1: Initial Discovery & Evidence Verification (0:00 – 0:35)

### Screen & Action
- **View**: **Match Intelligence** (Default view from Navigation Rail)
- **Clock**: `15'` | **Interval**: `(01'-15')`
- **Click**: Click **Advance Interval** in the top header.
- **Wait**: ~1 second as the simulation advances to `30'` (`16'-30'`).

### Narration
> *"Welcome to Proofline FC. Today's football broadcasts and AI analytics routinely suffer from hallucinations and unearned causal claims. Here, we're watching London Titans versus Munich Red Star. As we advance to the 30th minute, our Match State Analyst detects a severe tactical shift: London Titans' passing accuracy has collapsed from 84% down to ~58%, coinciding with a high-press surge from Munich at 2.4 pressing actions per minute."*

### What to Point Out on Screen
1. **Live Scoreboard**: London Titans 1 - 1 Munich Red Star (`30' (16'-30')`).
2. **Contextual Evidence Drawer** (Right panel):
   - Notice the candidate claim: *"London Titans passing accuracy fell to ~58%..."*
   - Point to the **Audit Badge**: `10/10 Checks Passed` and `0% Missing IDs`.
   - Show that all referenced event IDs (`ev_...`) exist and are plotted directly on the pitch.
   - Point to the **Epistemic Qualification**: The system flagged causal language and certified the claim as an observed correlation rather than unproven causation.

---

## Act 2: Injecting Contradiction & Truthline Supersession (0:35 – 1:05)

### Screen & Action
- **Click**: Click **Advance Interval** again in the top header.
- **Clock**: Advances to `45'` | **Interval**: `(31'-45')`.
- **Notice**: An amber pill appears in the header: `Phase 3: Contradictory Evidence Active`.
- **Click**: Click **Truthline Ledger** in the left Navigation Rail.

### Narration
> *"Now we advance to the 45th minute. Standard LLMs cling to their early narrative—assuming the Titans are still crumbling under pressure. But the telemetry tells a different story: Munich Red Star maintained their aggressive high press, yet London Titans adapted their tactical structure and rebounded their passing accuracy to over 75%."*
>
> *"Watch what happens in the Truthline Ledger: The engine does not repeat the obsolete collapse narrative. Instead, it marks the earlier passing decay claim as SUPERSEDED, directly linking it to the new tactical adaptation insight."*

### What to Point Out on Screen
1. **Earlier Claim (Interval 16'-30')**: Status pill is red/gray `SUPERSEDED`.
2. **Supersession Banner**: Reads *"Superseded in interval 31'-45': New match evidence confirms Titans passing rebounded to 75%+ under persistent pressure..."*
3. **New Adaptation Claim (Interval 31'-45')**: Status pill is bright emerald `VERIFIED`.

---

## Act 3: Broadcast Studio & Audience Chyrons (1:05 – 1:35)

### Screen & Action
- **Click**: Click **Broadcast Studio** in the left Navigation Rail.
- **Pitch**: Hover over event markers and click a cited evidence marker (e.g. `ev_...`) to lock selection.
- **Toggles**: Click between **Casual Fan** and **Tactical Analyst** buttons.

### Narration
> *"In Broadcast Studio, this intelligence feeds directly into television graphics. First, the interactive pitch telemetry: notice how hovering over markers is completely stable—no jitter, no scale flicker, and collision-avoided ID pills connected by leader lines. When I click a marker, it locks into inspection mode."*
>
> *"Below the pitch, our Broadcast Producer enforces a strict Quality Gate: zero percent unverified publication. Notice how the factual core is personalized for different viewers without distorting the data:"*
> - *"Casual Fan Mode translates the rebound into plain English: 'Titans respond! After early trouble with the press, London found their rhythm...'"*
> - *"Tactical Analyst Mode provides full quantitative baselines: 'Tactical Adaptation: passing rebounded to 75.0% under 2.2/min press intensity...'"*

### What to Point Out on Screen
1. **Tactical Pitch Frame**: Regulation emerald turf with stationary markers, floating inspection tooltip (`pointer-events: none`), and collision-avoided pills.
2. **Producer Decision Log**: Confirms 10/10 audit checks passed and logs publication rationale.
3. **Audience Cards**: Side-by-side contrast between Casual Fan and Tactical Analyst drafts.

---

## Act 4: Ground-Truth Benchmark & Honest Limitations (1:35 – 1:55)

### Screen & Action
- **Click**: Click **Evaluation Benchmark** in the left Navigation Rail.

### Narration
> *"Finally, we evaluated this architecture against a standard single-shot LLM baseline across six controlled ground-truth fixtures. While the baseline leaked 100% of flawed claims—hallucinating phantom event IDs and fabricating numbers—our multi-agent evidence gate achieved a 0.0% broadcast hallucination rate and 100% contradiction supersession."*
>
> *"Importantly, we disclose the trade-off: 3-agent auditing adds 57 milliseconds of latency and a fraction of a cent in token cost. Furthermore, we test on synthetic telemetry and controlled scenarios rather than claiming large-N generalization. For live broadcast where false graphics destroy credibility, that deterministic guarantee is essential."*

---

## Summary of Clicks for Quick Rehearsal

| Step | Time | Navigation / Click Target | Screen State Verified |
| :---: | :---: | :--- | :--- |
| **1** | 0:00 | **Reset** button | Clock at `15'`, Interval `01'-15'` |
| **2** | 0:10 | **Advance Interval** button | Clock at `30'`, Interval `16'-30'`, Passing at ~58% |
| **3** | 0:35 | **Advance Interval** button | Clock at `45'`, Interval `31'-45'`, Amber Contradiction Pill active |
| **4** | 0:45 | **Truthline Ledger** rail item | Interval 16'-30' claim marked `SUPERSEDED` |
| **5** | 1:05 | **Broadcast Studio** rail item | Pitch markers stationary, hover tooltip active, click locks selection |
| **6** | 1:20 | **Casual Fan** / **Analyst** toggles | Dual audience drafts displayed |
| **7** | 1:35 | **Evaluation Benchmark** rail item | 0% Hallucination rate, +57ms latency trade-off card |
