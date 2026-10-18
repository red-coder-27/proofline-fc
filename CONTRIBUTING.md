# Contributing to Proofline FC

Thank you for your interest in contributing to Proofline FC. We welcome contributions that uphold our commitment to deterministic verification, software reliability, and empirical accuracy.

---

## 1. Core Principles for Contributors

1. **Deterministic Verification is Non-Negotiable**:
   Never allow language model completions to directly modify verified states without passing the 10-point evidence checklist in `src/lib/verificationEngine/verifier.ts`.
2. **Empirical Truthfulness**:
   Never fabricate or hardcode benchmark metrics, model accuracy percentages, or latency values. All evaluation claims must be calculated from reproducible code executions.
3. **Zero Secrets in Repository**:
   Never commit `.env.local`, API keys, Azure subscription IDs, or private credentials. All keys must remain in ignored local environment files.

---

## 2. Prerequisites & Setup

- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm**: `v10.x` or higher
- **Git**: Installed and configured

### Local Development Flow

```bash
# 1. Fork and clone repository
git clone https://github.com/your-username/proofline-fc.git
cd proofline-fc

# 2. Install dependencies
npm install

# 3. Create local environment configuration
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

---

## 3. Branching & Pull Request Guidelines

### Branch Naming
- `feature/<short-description>`: New functional capabilities or UI enhancements.
- `fix/<short-description>`: Bug fixes or interaction stability patches.
- `docs/<short-description>`: Documentation updates and architectural guides.
- `test/<short-description>`: Benchmark fixtures or regression test additions.

### Commit Messages
Use clear, imperative commit messages:
```
fix(broadcast): eliminate SVG marker hover flicker by removing CSS scale
test(benchmark): add regression test for duplicate claim ID deduplication
docs(architecture): document 10-point evidence checklist handoffs
```

---

## 4. Pre-Submission Quality Checklist

Before submitting a Pull Request, you must verify that all four checks pass with zero errors and zero warnings:

```bash
# 1. Type Safety Check (TypeScript strict mode)
npx tsc --noEmit

# 2. Linter Check (Next.js ESLint rules)
npm run lint

# 3. Automated Test Suite (All 34+ unit & regression tests)
npm test

# 4. Production Build Verification (Next.js Turbopack)
npm run build
```

---

## 5. Coding Standards

- **TypeScript**: Use strict types throughout. Avoid `any` types; prefer discriminated unions for states (`ClaimStatus`, `VerificationOutcome`).
- **SVG Interactions**: When building or modifying pitch visualizations, avoid CSS transforms (`hover:scale`) that alter SVG coordinate systems. Ensure tooltips use `pointer-events: none` to prevent hover jitter loops.
- **State Immutability**: All Truthline records must be treated as immutable. When superseding a claim, return a new object with updated status and supersession metadata.
- **Dependencies**: Do not add external dependencies without prior discussion. Keep the application lightweight, secure, and easily reproducible.
