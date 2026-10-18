import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET } from '../app/api/foundry/route';

describe('Microsoft Foundry API Route Security & Abuse Prevention', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    delete process.env.AZURE_AI_FOUNDRY_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects malformed JSON with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json-content{',
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('Malformed JSON'));
  });

  it('rejects oversized payload (>16KB) with HTTP 413', async () => {
    const largeBody = JSON.stringify({
      userPrompt: 'a'.repeat(20000),
    });

    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': String(largeBody.length),
      },
      body: largeBody,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 413, 'Oversized payload must be rejected with 413');
    const data = await res.json();
    assert.ok(data.error.includes('16KB'));
  });

  it('rejects oversized payload (>16KB) with HTTP 413 even when content-length header is omitted', async () => {
    const largeBody = JSON.stringify({
      userPrompt: 'a'.repeat(20000),
    });

    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Omitting content-length deliberately to test body inspection
      },
      body: largeBody,
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 413, 'Oversized payload without header must still be rejected with 413');
    const data = await res.json();
    assert.ok(data.error.includes('16KB'));
  });

  it('rejects open LLM proxy abuse (prompts lacking match telemetry domain context) with HTTP 400', async () => {
    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: 'Write a python script to scrape arbitrary websites and mine crypto.',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('Access Denied'));
  });

  it('returns HTTP 503 Service Unavailable when credentials are not configured', async () => {
    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'Proofline FC Match State Analyst',
        userPrompt: 'Analyze interval passing decay and pressure frequency',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 503, 'Must return 503 when live Azure credentials are missing');
    const data = await res.json();
    assert.strictEqual(data.provider, 'deterministic_agent_fallback');
  });

  it('GET /api/foundry safely returns status without leaking API keys or secrets', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://my-resource.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'super_secret_unmasked_key';
    process.env.AZURE_AI_FOUNDRY_DEPLOYMENT = 'gpt-4o';

    const res = await GET();
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.isConfigured, true);
    assert.strictEqual(data.modelName, 'gpt-4o');
    // Security check: Keys and sensitive URLs must NEVER be in GET response!
    assert.strictEqual((data as Record<string, unknown>).apiKey, undefined);
    assert.strictEqual((data as Record<string, unknown>).endpoint, undefined);
    assert.strictEqual(JSON.stringify(data).includes('super_secret_unmasked_key'), false);
  });

  it('rejects unauthenticated requests with HTTP 401 when FOUNDRY_DEMO_KEY is configured', async () => {
    process.env.FOUNDRY_DEMO_KEY = 'evaluator_secret_passcode';

    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'Proofline FC Match State Analyst',
        userPrompt: 'Analyze interval passing decay and pressure frequency',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 401, 'Must reject with 401 when access key is missing');
    const data = await res.json();
    assert.ok(data.error.includes('Unauthorized'));
    assert.strictEqual(data.provider, 'deterministic_agent_fallback');
  });

  it('authorizes requests with valid x-foundry-key or Bearer token when FOUNDRY_DEMO_KEY is configured', async () => {
    process.env.FOUNDRY_DEMO_KEY = 'evaluator_secret_passcode';
    // When credentials missing, it should pass auth check and then hit config check (503)
    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-foundry-key': 'evaluator_secret_passcode',
      },
      body: JSON.stringify({
        systemPrompt: 'Proofline FC Match State Analyst',
        userPrompt: 'Analyze interval passing decay and pressure frequency',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 503, 'Must pass 401 auth gate and reach configuration gate (503)');
  });

  it('protects against anonymous credit exhaustion in production by default (HTTP 403)', async () => {
    delete process.env.FOUNDRY_DEMO_KEY;
    delete process.env.ALLOW_PUBLIC_ANONYMOUS_FOUNDRY;
    process.env.VERCEL = '1'; // Simulate Vercel production deployment

    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'Proofline FC Match State Analyst',
        userPrompt: 'Analyze interval passing decay and pressure frequency',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 403, 'Must reject anonymous production requests with 403 to protect Azure budget');
    const data = await res.json();
    assert.ok(data.error.includes('Restricted Deployment'));
    assert.strictEqual(data.provider, 'deterministic_agent_fallback');
  });

  it('authorizes production request when ENABLE_LIVE_FOUNDRY is enabled (Vercel-protected preview mode)', async () => {
    delete process.env.FOUNDRY_DEMO_KEY;
    process.env.VERCEL = '1';
    process.env.ENABLE_LIVE_FOUNDRY = 'true';

    const req = new Request('http://localhost:3000/api/foundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'Proofline FC Match State Analyst',
        userPrompt: 'Analyze interval passing decay and pressure frequency',
      }),
    });

    const res = await POST(req);
    // When live credentials not configured, it passes the production 403 gate and reaches 503 config check
    assert.strictEqual(res.status, 503, 'Must pass 403 production gate and reach configuration gate (503)');
  });
});
