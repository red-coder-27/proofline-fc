# Security Policy

## Responsible Disclosure

The Proofline FC maintainers take software security and confidentiality seriously. If you discover a security vulnerability or credential leak within this repository, please report it responsibly following the guidelines below.

---

## Reporting a Vulnerability

**Please do NOT disclose security vulnerabilities publicly in open GitHub Issues or public discussions.**

To report a vulnerability:
1. **GitHub Security Advisory**: If viewing this repository on GitHub, navigate to the **Security** tab and click **"Report a vulnerability"** to submit an advisory privately to the maintainers.
2. **Repository Owner / Maintainer**: If private security advisories are not enabled, please open an issue requesting a private security communication channel with the repository owner without posting exploit details or sensitive payloads.

Please provide:
- A description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal proof-of-concept.
- Any suggested remediations or mitigations.

We will acknowledge receipt within 48 hours and coordinate a fix prior to public disclosure.

---

## Threat Model Boundaries & Security Design

Proofline FC is designed with the following security safeguards:

1. **Server-Side Key Isolation**:
   - All Microsoft Foundry / Azure OpenAI API keys and endpoints reside strictly in server-side environment variables (`.env.local`).
   - The browser application communicates with models only via the internal `/api/foundry` Next.js route handler.
   - API keys are never bundled into client JavaScript bundles, exposed via `NEXT_PUBLIC_` prefixes, or returned in HTTP API responses.
2. **Centralized Publication Gate & Verification Boundary**:
   - The Broadcast Producer and Master Publication Gate enforce a strict deterministic policy boundary preventing unverified or tampered model outputs from rendering in on-air broadcast graphics.
3. **Server-Side API Route Safeguards (`/api/foundry`)**:
   - **Payload Limit**: Maximum 16KB request body limit enforced (HTTP 413).
   - **Rate Limiting**: Sliding-window rate limiter (30 requests/minute per client IP) enforced (HTTP 429).
   - **Domain Guardrail**: Rejects generic or malicious off-topic prompts; incoming prompts must be football tactical analysis requests (HTTP 400), preventing use as an open LLM proxy.
   - **Request Timeouts**: Upstream requests to Azure AI Foundry enforce a 15-second timeout via `AbortSignal.timeout` (HTTP 504).
   - **Structured Error Handling**: Upstream provider failures, missing configuration, or parsing errors return clean, standardized error responses without leaking internal API keys, endpoint URLs, or stack traces (HTTP 502/503).
4. **Synthetic Telemetry Scope**:
   - The project uses synthetic event streams and does not process real user personally identifiable information (PII) or confidential proprietary telemetry.
5. **Credential Leak Prevention**:
   - `.env*` files (except `.env.example`) are explicitly excluded in `.gitignore`.
   - Continuous inspection verifies that no real subscription identifiers or production access keys are committed to Git history.

---

## Deployment Security & Environment Boundaries

Proofline FC enforces three distinct security operating tiers:

1. **Local Development Mode (`NODE_ENV === 'development'` or local workstation)**:
   - Full access to local deterministic agents and optional live Azure AI Foundry credentials configured in `.env.local`.
   - Single-client in-memory rate limiting and 16KB payload limits active.

2. **Restricted Preview / Hackathon Evaluation (Vercel Deployment Protection)**:
   - For evaluator access on preview platforms (e.g. Vercel Preview Deployments), the entire application is protected at the infrastructure edge via **Vercel Password Protection**.
   - Within this authenticated edge boundary, set `ENABLE_LIVE_FOUNDRY=true` in Vercel preview environment variables.
   - Crucially, **no secrets are distributed to browser clients, stored in `sessionStorage`, or passed in client headers**. Evaluators authenticate via Vercel's edge password gate.
   - Direct server-to-server calls may optionally supply `Authorization: Bearer <key>` if `FOUNDRY_ACCESS_KEY` is configured.

3. **Public Production Deployment (`NODE_ENV === 'production'` or `VERCEL === '1'`)**:
   - To prevent public budget exhaustion and denial-of-wallet attacks, anonymous public model calls are rejected by default with HTTP 403 (`ENABLE_LIVE_FOUNDRY !== 'true'`).
   - The application functions with 100% fidelity in deterministic verification mode: every scenario, evidence check, publication gate, and broadcast chyron operates without external network dependencies.
   - For enterprise public multi-tenant deployments requiring open live inference, upstream Azure API Management, distributed Redis rate limiting, and Azure Entra ID user authentication must be provisioned.
