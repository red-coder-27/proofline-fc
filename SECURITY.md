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
2. **0% Unverified Publication Rule**:
   - The Broadcast Producer enforces a programmatic gate preventing unverified model outputs from rendering in on-air broadcast graphics.
3. **Synthetic Telemetry Scope**:
   - The project uses synthetic event streams and does not process real user personally identifiable information (PII) or confidential proprietary telemetry.
4. **Credential Leak Prevention**:
   - `.env*` files (except `.env.example`) are explicitly excluded in `.gitignore`.
   - Continuous inspection verifies that no real subscription identifiers or production access keys are committed to Git history.
