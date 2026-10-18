# Proofline FC — Visual Asset & Screenshot Guide

This guide specifies the authentic visual assets and interface screenshots for Proofline FC. To maintain visual consistency for presentation decks, hackathon judging evaluations, and technical writeups, capture screenshots using the instructions below.

---

## 1. Capture Environment & Recommended Settings

- **Display Resolution**: Standard 1080p (`1920 × 1080`) or 1440p (`2560 × 1440`) viewport.
- **Browser**: Chromium-based browser (Chrome, Edge, Brave) with 100% zoom.
- **Theme**: Clean Light Mode (default UI theme).
- **Application URL**: `http://localhost:3000`
- **Initial State**: Click **Reset** in the top navigation bar before starting any scenario sequence.
- **Storage Directory**: Save captured PNG assets directly to `docs/screenshots/`.
- **Confidentiality Rule**: Never capture or commit screenshots containing API keys, private share tokens, personal identifiable information (PII), or deployment administrative dashboards.

---

## 2. Required Screenshot Catalog

| Filename | Viewport / Tab | Match State & Timing | Key Features to Highlight |
| :--- | :--- | :--- | :--- |
| `01-match-intelligence-workspace.png` | **Match Intelligence** (`workspace`) | Interval `16'-30'` (Minute `30'`) | Tactical pitch visualization, spatial pass/pressure vectors, momentum trend chart, turning point alert banner, and Contextual Evidence Drawer with 6/6 audit pass checks. |
| `02-truthline-supersession.png` | **Truthline Ledger** (`truthline`) | Interval `31'-45'` (Minute `45'`) | Prominent amber/gray `SUPERSEDED` badge on the earlier `16'-30'` claim, explicit supersession rationale banner, and the newly verified `31'-45'` recovery claim with green `VERIFIED` pill. |
| `03-broadcast-studio-pitch.png` | **Broadcast Studio** (`broadcast`) | Interval `31'-45'` (Minute `45'`) | Interactive regulation pitch turf, event marker hover inspection card (`pointer-events: none`), collision-avoided ID pills with leader lines, and selection lock state. |
| `04-audience-chyrons.png` | **Broadcast Studio** (`broadcast`) | Lower-third broadcast card | Side-by-side contrast between **Casual Fan** narrative (*"Titans respond! After early trouble with the press..."*) and **Tactical Analyst** technical baseline (*"Tactical Adaptation: passing rebounded to 75.0%..."*), plus Producer Publication Decision Log. |
| `05-scenario-lab-trace.png` | **Scenario Lab** (`lab`) | Contradictory Evidence Scenario | Multi-agent step-by-step execution trace showing Match State Analyst candidate generation, Evidence Auditor 6-point checklist verification, bounded revision directives, and Broadcast Producer publication gating. |
| `06-evaluation-benchmark.png` | **Evaluation Benchmark** (`evaluation`) | Full benchmark suite | Metric comparison dashboard showing 100% supported accuracy, 0.0% broadcast hallucination rate, 100% contradiction supersession, and honest execution latency overhead (+2.6ms in local verification). |

---

## 3. Step-by-Step Capture Walkthrough

### Screenshot 1: Match Intelligence Workspace (`01-match-intelligence-workspace.png`)
1. Open `http://localhost:3000`.
2. Click **Reset** in the top header.
3. Click **Advance Interval** once to advance from `01'-15'` to `16'-30'`.
4. Ensure the right-hand **Contextual Evidence Drawer** is expanded, showing the candidate insight and 6-point audit checklist.
5. Capture a full-screen browser window (`1920 × 1080`).

### Screenshot 2: Truthline Ledger & Supersession (`02-truthline-supersession.png`)
1. From the `16'-30'` state, click **Advance Interval** again to reach `31'-45'`.
2. Notice the amber header pill: `Phase 3: Contradictory Evidence Active`.
3. In the left Navigation Rail, click **Truthline Ledger**.
4. Scroll to view both the earlier `16'-30'` claim (with `SUPERSEDED` badge and revocation notice) and the newer `31'-45'` claim (with `VERIFIED` badge).
5. Capture the ledger view showing the explicit supersession link.

### Screenshot 3: Broadcast Studio Pitch (`03-broadcast-studio-pitch.png`)
1. In the left Navigation Rail, click **Broadcast Studio**.
2. Hover over a cited event marker on the pitch to reveal the floating metadata inspection card.
3. Click the marker to engage selection lock.
4. Capture the tactical pitch frame highlighting stationary markers and collision-avoided event labels.

### Screenshot 4: Audience-Personalized Chyrons (`04-audience-chyrons.png`)
1. In **Broadcast Studio**, scroll down to the **Lower-Third Broadcast Graphic** and **Audience Personalization** container.
2. Ensure both the **Casual Fan** card and the **Tactical Analyst** card are clearly visible alongside the **Producer Publication Decision Log**.
3. Capture a focused viewport of this container.

### Screenshot 5: Scenario Lab Message Trace (`05-scenario-lab-trace.png`)
1. In the left Navigation Rail, click **Scenario Lab**.
2. Select Scenario 4: **Contradiction Supersession (Rebound Phase 31'-45')**.
3. Click **Run Multi-Agent Simulation**.
4. Expand the step-by-step agent message stream showing handoffs: `Analyst → Auditor → Producer`.
5. Capture the expanded message trace.

### Screenshot 6: Evaluation Benchmark Dashboard (`06-evaluation-benchmark.png`)
1. In the left Navigation Rail, click **Evaluation Benchmark**.
2. Review the comparative rubric comparing **Baseline Single-Shot** against **Multi-Agent Evidence-Gated**.
3. Capture the full dashboard showing the headline metrics table, scenario breakdown cards, and disclosed trade-off metrics.

---

## 4. Verification Checklist Before Committing Assets

- [ ] File format is PNG (`.png`).
- [ ] Filenames exactly match the catalog (`01-match-intelligence-workspace.png` through `06-evaluation-benchmark.png`).
- [ ] No personal emails, developer machine paths, or sensitive tokens are visible.
- [ ] No browser bookmarks bars or operating system taskbars are captured.
- [ ] UI text is crisp and unscaled.
