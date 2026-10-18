import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFoundryEndpointUrl,
  isLiveFoundryConfigured,
  executeFoundryPromptOnServer,
} from '../lib/agents/microsoftAdapter';
import { verifyCandidateClaim, CandidateClaimInput } from '../lib/verificationEngine/verifier';
import { runBroadcastProducer } from '../lib/agents/broadcastProducer';
import { executeMultiAgentWorkflow } from '../lib/agents/orchestrator';
import { generateSyntheticMatchEvents } from '../lib/eventEngine/generator';
import { computeIntervalSnapshot } from '../lib/eventEngine/statsCalculator';

describe('Microsoft Foundry Adapter & Fallback Resilience', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.AZURE_AI_FOUNDRY_ENDPOINT;
    delete process.env.AZURE_AI_FOUNDRY_KEY;
    delete process.env.AZURE_AI_FOUNDRY_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    delete process.env.AZURE_OPENAI_API_VERSION;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it('correctly normalizes different Azure AI Foundry and OpenAI endpoint formats', () => {
    // 1. Standard base URL
    const url1 = buildFoundryEndpointUrl({
      endpoint: 'https://my-foundry-resource.openai.azure.com',
      deploymentName: 'gpt-4o',
      apiVersion: '2024-08-01-preview',
    });
    assert.strictEqual(
      url1,
      'https://my-foundry-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
    );

    // 2. Trailing slashes stripped
    const url2 = buildFoundryEndpointUrl({
      endpoint: 'https://my-foundry-resource.openai.azure.com///',
      deploymentName: 'gpt-4o',
    });
    assert.ok(
      url2.startsWith('https://my-foundry-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions')
    );

    // 3. Pre-expanded chat completions URL preserved without duplication
    const url3 = buildFoundryEndpointUrl({
      endpoint:
        'https://my-foundry-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21',
      deploymentName: 'gpt-4o',
    });
    assert.strictEqual(
      url3,
      'https://my-foundry-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21'
    );

    // 4. Azure AI Foundry Model Inference route (/models)
    const url4 = buildFoundryEndpointUrl({
      endpoint: 'https://my-project.services.ai.azure.com/models',
      deploymentName: 'gpt-4o',
      apiVersion: '2024-05-01-preview',
    });
    assert.strictEqual(
      url4,
      'https://my-project.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview'
    );

    // 5. Endpoint with /openai/v1 cleanly extracted to origin host
    const url5 = buildFoundryEndpointUrl({
      endpoint: 'https://bridgeup-resource.openai.azure.com/openai/v1',
      deploymentName: 'gpt-4o',
      apiVersion: '2024-08-01-preview',
    });
    assert.strictEqual(
      url5,
      'https://bridgeup-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
    );
  });

  it('gracefully degrades to deterministic fallback when credentials are missing', async () => {
    assert.strictEqual(isLiveFoundryConfigured(), false);

    const result = await executeFoundryPromptOnServer(
      'System prompt for match analyst',
      'User prompt with interval data'
    );

    assert.strictEqual(result.provider, 'deterministic_agent_fallback');
    assert.strictEqual(
      result.modelName,
      'Microsoft Foundry Rules Engine (Deterministic Fallback)'
    );
    assert.ok(result.latencyMs >= 0);
    assert.strictEqual(result.tokensReported, false, 'Must not invent token counts during deterministic fallback');
    assert.strictEqual(result.tokensUsed, 0);
  });

  it('invokes live endpoint and returns parsed completions when mock fetch succeeds', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'mock_secret_key_123';
    process.env.AZURE_AI_FOUNDRY_DEPLOYMENT = 'gpt-4o';

    assert.strictEqual(isLiveFoundryConfigured(), true);

    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedHeaders = (init?.headers as Record<string, string>) || {};

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'London Titans passing accuracy dropped under sustained Munich press.',
              },
            },
          ],
          usage: {
            total_tokens: 388,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }) as typeof fetch;

    const result = await executeFoundryPromptOnServer('System instructions', 'Interval stats');

    assert.strictEqual(result.provider, 'microsoft_foundry_live');
    assert.strictEqual(result.modelName, 'gpt-4o');
    assert.strictEqual(
      result.content,
      'London Titans passing accuracy dropped under sustained Munich press.'
    );
    assert.strictEqual(result.tokensUsed, 388);
    assert.ok(capturedUrl.includes('/openai/deployments/gpt-4o/chat/completions'));
    assert.strictEqual(capturedHeaders['api-key'], 'mock_secret_key_123');
  });

  it('safely falls back to deterministic rules when upstream HTTP request fails (401 or 404)', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'invalid_mock_key';

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          error: { code: '401', message: 'Access denied due to invalid subscription key' },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }) as typeof fetch;

    const result = await executeFoundryPromptOnServer('System instructions', 'Interval stats');

    assert.strictEqual(result.provider, 'deterministic_agent_fallback');
    assert.ok(result.errorDetails?.includes('401'));
  });

  it('safely falls back to deterministic rules when network throws an exception', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'mock_key';

    globalThis.fetch = (async () => {
      throw new Error('ENOTFOUND mock-foundry.openai.azure.com');
    }) as typeof fetch;

    const result = await executeFoundryPromptOnServer('System instructions', 'Interval stats');

    assert.strictEqual(result.provider, 'deterministic_agent_fallback');
    assert.ok(result.errorDetails?.includes('ENOTFOUND') || result.errorDetails?.includes('Network error'));
  });

  it('strictly enforces deterministic evidence gate on model output (model cannot bypass verifier)', () => {
    const events = generateSyntheticMatchEvents('signature_demo', 16, 30, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 16,
      endMinute: 30,
      label: "16'-30'",
    });

    // Simulate model output that invents a phantom event ID
    const hallucinatedCandidate: CandidateClaimInput = {
      claimId: 'clm_hallucinated_by_llm',
      claimText: 'Titans midfield broke down completely (citing ev_phantom_101, ev_phantom_102).',
      category: 'passing_decay',
      targetInterval: snap.interval,
      referencedEventIds: ['ev_phantom_101', 'ev_phantom_102'],
      numericAssertions: [
        {
          teamId: 'home',
          metricName: 'passingSuccessRate',
          claimedValue: snap.home.passingSuccessRate,
        },
      ],
    };

    // Evidence Auditor runs 6-point deterministic gate
    const audit = verifyCandidateClaim(hallucinatedCandidate, events, snap, events.length);
    assert.strictEqual(audit.outcome, 'rejected', 'Auditor must reject hallucinated event IDs');
    assert.strictEqual(audit.ruleChecks.referencedEventsExist, false);

    // Broadcast Producer strictly blocks publication
    const producerDecision = runBroadcastProducer(
      hallucinatedCandidate.claimText,
      audit,
      snap,
      'passing_decay'
    );
    assert.strictEqual(
      producerDecision.published,
      false,
      'Producer must block publication when audit fails'
    );
    assert.strictEqual(producerDecision.decision, 'rejected_by_producer');
  });

  it('propagates isUsingMicrosoftFoundry live vs fallback mode through multi-agent workflow', async () => {
    const events = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 1,
      endMinute: 15,
      label: "01'-15'",
    });

    // 1. Without live credentials -> fallback mode (isUsingMicrosoftFoundry is false)
    const fallbackWorkflow = await executeMultiAgentWorkflow({
      workflowId: 'test_wf_fallback',
      scenarioId: 'signature_demo',
      snapshot: snap,
      turningPoints: [],
      events,
      existingClaims: [],
      currentIntervalIndex: 0,
      isContradictoryPhase: false,
    });
    assert.strictEqual(fallbackWorkflow.metrics.isUsingMicrosoftFoundry, false);

    // 2. With live mock credentials -> live mode (isUsingMicrosoftFoundry is true when valid structured JSON returned)
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'mock_key';

    const validSampleId = events[0].id;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  claimId: 'clm_model_live_test',
                  claimText: 'London Titans maintained tactical midfield structure across opening interval.',
                  category: 'territorial_dominance',
                  referencedEventIds: [validSampleId],
                  numericAssertions: [
                    {
                      teamId: 'home',
                      metricName: 'passingSuccessRate',
                      claimedValue: snap.home.passingSuccessRate,
                      unit: '%',
                    },
                  ],
                  alternativeHypotheses: ['Both teams maintained shape.'],
                  tacticalContext: 'Steady baseline opening interval.',
                  rationale: 'Observed steady passing rate across opening 15 minutes.',
                }),
              },
            },
          ],
          usage: { total_tokens: 150 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const liveWorkflow = await executeMultiAgentWorkflow({
      workflowId: 'test_wf_live',
      scenarioId: 'signature_demo',
      snapshot: snap,
      turningPoints: [],
      events,
      existingClaims: [],
      currentIntervalIndex: 0,
      isContradictoryPhase: false,
    });
    assert.strictEqual(liveWorkflow.metrics.isUsingMicrosoftFoundry, true);
    assert.strictEqual(liveWorkflow.metrics.foundryModelName, 'gpt-4o');
    // Verify that model-generated text actually reached the workflow claim!
    assert.strictEqual(
      liveWorkflow.activeClaims[0].claimText,
      'London Titans maintained tactical midfield structure across opening interval.'
    );
  });

  it('changing valid model output changes the candidate claim passed to verification', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'mock_key';

    const events = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 1,
      endMinute: 15,
      label: "01'-15'",
    });
    const sampleId = events[0].id;

    // First model response
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  claimId: 'clm_custom_alpha',
                  claimText: 'Alpha model hypothesis: Titans focused on left-flank progression.',
                  category: 'territorial_dominance',
                  referencedEventIds: [sampleId],
                  numericAssertions: [
                    {
                      teamId: 'home',
                      metricName: 'passingSuccessRate',
                      claimedValue: snap.home.passingSuccessRate,
                      unit: '%',
                    },
                  ],
                }),
              },
            },
          ],
          usage: { total_tokens: 120 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const runAlpha = await executeMultiAgentWorkflow({
      workflowId: 'test_alpha',
      scenarioId: 'signature_demo',
      snapshot: snap,
      turningPoints: [],
      events,
      existingClaims: [],
      currentIntervalIndex: 0,
    });

    // Second different model response
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  claimId: 'clm_custom_beta',
                  claimText: 'Beta model hypothesis: Central midfield pivot dictated tempo effectively.',
                  category: 'territorial_dominance',
                  referencedEventIds: [sampleId],
                  numericAssertions: [
                    {
                      teamId: 'home',
                      metricName: 'passingSuccessRate',
                      claimedValue: snap.home.passingSuccessRate,
                      unit: '%',
                    },
                  ],
                }),
              },
            },
          ],
          usage: { total_tokens: 130 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const runBeta = await executeMultiAgentWorkflow({
      workflowId: 'test_beta',
      scenarioId: 'signature_demo',
      snapshot: snap,
      turningPoints: [],
      events,
      existingClaims: [],
      currentIntervalIndex: 0,
    });

    assert.notStrictEqual(runAlpha.activeClaims[0].claimText, runBeta.activeClaims[0].claimText);
    assert.strictEqual(
      runAlpha.activeClaims[0].claimText,
      'Alpha model hypothesis: Titans focused on left-flank progression.'
    );
    assert.strictEqual(
      runBeta.activeClaims[0].claimText,
      'Beta model hypothesis: Central midfield pivot dictated tempo effectively.'
    );
  });

  it('safely falls back to deterministic rules when model output is malformed or invalid schema', async () => {
    process.env.AZURE_AI_FOUNDRY_ENDPOINT = 'https://mock-foundry.openai.azure.com';
    process.env.AZURE_AI_FOUNDRY_KEY = 'mock_key';

    const events = generateSyntheticMatchEvents('signature_demo', 1, 15, 42);
    const snap = computeIntervalSnapshot(events, {
      startMinute: 1,
      endMinute: 15,
      label: "01'-15'",
    });

    // Return completely unparseable junk from model
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'MALFORMED NON-JSON RESPONSE {missing brackets' } }],
          usage: { total_tokens: 40 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const malformedRun = await executeMultiAgentWorkflow({
      workflowId: 'test_malformed',
      scenarioId: 'signature_demo',
      snapshot: snap,
      turningPoints: [],
      events,
      existingClaims: [],
      currentIntervalIndex: 0,
    });

    // When model output is rejected by schema validator, system falls back safely
    assert.strictEqual(
      malformedRun.metrics.isUsingMicrosoftFoundry,
      false,
      'Must NOT report live Foundry success when model output failed schema validation'
    );
    assert.ok(malformedRun.activeClaims[0].claimText.length > 0);
  });
});
