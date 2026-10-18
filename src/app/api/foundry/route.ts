import { NextResponse } from 'next/server';
import {
  executeFoundryPromptOnServer,
  isLiveFoundryConfigured,
  getMicrosoftFoundryConfig,
} from '@/lib/agents/microsoftAdapter';

/**
 * In-memory sliding-window rate limiter.
 * Architectural note: Designed for single-instance hackathon evaluation and local development.
 * In a distributed, multi-instance deployment, an external shared store (e.g. Redis, Azure API Management)
 * must be used.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 req/min
const MAX_PAYLOAD_BYTES = 16384; // 16KB

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // 1. Enforce payload size limit on actual body
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Unable to read request payload.' },
      { status: 400 }
    );
  }

  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Payload too large. Maximum allowed size is 16KB.' },
      { status: 413 }
    );
  }

  // 2. Client identification & rate limiting
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientId = forwardedFor ? forwardedFor.split(',')[0].trim() : 'local_client';
  const rateLimit = checkRateLimit(clientId);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 30 requests per minute.',
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter || 60) },
      }
    );
  }

  // 2b. Public deployment access control & Azure credit protection
  const requiredDemoKey = process.env.FOUNDRY_ACCESS_KEY || process.env.FOUNDRY_DEMO_KEY;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const isLiveExplicitlyEnabled =
    process.env.ENABLE_LIVE_FOUNDRY === 'true' || process.env.ALLOW_PUBLIC_ANONYMOUS_FOUNDRY === 'true';

  if (requiredDemoKey && requiredDemoKey.trim().length > 0) {
    const authHeader = request.headers.get('authorization') || '';
    const customHeader = request.headers.get('x-foundry-key') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const providedKey = customHeader || bearerToken;

    if (!providedKey || providedKey !== requiredDemoKey) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Live Azure AI Foundry inference requires a valid access key in this deployment. Deterministic fallback engine remains active.',
          provider: 'deterministic_agent_fallback',
        },
        { status: 401 }
      );
    }
  } else if (isProduction && !isLiveExplicitlyEnabled && process.env.NODE_ENV !== 'test') {
    // In unauthenticated production deployments, prevent open credit drain unless explicitly opted in
    return NextResponse.json(
      {
        error:
          'Restricted Deployment: Anonymous public model inference is disabled to prevent credit exhaustion. Enable via Vercel-protected preview deployment with ENABLE_LIVE_FOUNDRY=true. Deterministic rules fallback active.',
        provider: 'deterministic_agent_fallback',
      },
      { status: 403 }
    );
  }

  // 3. Body parsing and schema validation
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON payload.' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object.' },
      { status: 400 }
    );
  }

  const { systemPrompt, userPrompt, temperature } = body as Record<string, unknown>;

  if (typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty required field: "userPrompt".' },
      { status: 400 }
    );
  }

  if (userPrompt.length > 4000) {
    return NextResponse.json(
      { error: '"userPrompt" exceeds maximum length of 4000 characters.' },
      { status: 400 }
    );
  }

  if (systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    return NextResponse.json(
      { error: '"systemPrompt" must be a string.' },
      { status: 400 }
    );
  }

  if (typeof systemPrompt === 'string' && systemPrompt.length > 4000) {
    return NextResponse.json(
      { error: '"systemPrompt" exceeds maximum length of 4000 characters.' },
      { status: 400 }
    );
  }

  const validatedTemp = typeof temperature === 'number' && Number.isFinite(temperature)
    ? Math.max(0, Math.min(1.0, temperature))
    : 0.2;

  // 4. Domain guardrail: Prevent open LLM proxy abuse
  const promptText = `${String(systemPrompt || '')} ${userPrompt}`.toLowerCase();
  const hasDomainKeyword =
    promptText.includes('interval') ||
    promptText.includes('match') ||
    promptText.includes('pass') ||
    promptText.includes('pressure') ||
    promptText.includes('tactical') ||
    promptText.includes('analyst') ||
    promptText.includes('proofline');

  if (!hasDomainKeyword) {
    return NextResponse.json(
      {
        error:
          'Access Denied: Endpoint is restricted to Proofline FC match analysis telemetry tasks.',
      },
      { status: 400 }
    );
  }

  // 5. Configuration check
  if (!isLiveFoundryConfigured()) {
    return NextResponse.json(
      {
        content: '',
        tokensUsed: 0,
        tokensReported: false,
        latencyMs: Math.max(1, Date.now() - startTime),
        provider: 'deterministic_agent_fallback',
        modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
        errorDetails: 'Azure AI Foundry credentials not configured in server environment (.env.local)',
      },
      { status: 503 }
    );
  }

  // 6. Execution with structured error handling
  try {
    const result = await executeFoundryPromptOnServer(
      typeof systemPrompt === 'string' ? systemPrompt : '',
      userPrompt,
      validatedTemp
    );

    if (result.provider === 'microsoft_foundry_live') {
      return NextResponse.json(result, { status: 200 });
    }

    // Upstream failure: map to appropriate HTTP status rather than returning 200
    const err = result.errorDetails || '';
    let status = 502;
    if (err.includes('401') || err.includes('Authentication')) {
      status = 502; // Bad Gateway / Upstream Auth Failure
    } else if (err.includes('429') || err.includes('Quota')) {
      status = 429; // Upstream rate limit
    } else if (err.includes('timed out') || err.includes('Timeout')) {
      status = 504; // Gateway Timeout
    }

    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      {
        content: '',
        tokensUsed: 0,
        tokensReported: false,
        latencyMs: Math.max(1, Date.now() - startTime),
        provider: 'deterministic_agent_fallback',
        modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
        errorDetails: `Server route error: ${errorDetails}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isConfigured = isLiveFoundryConfigured();
  const config = getMicrosoftFoundryConfig();

  // Return non-sensitive status information only. Never return keys or internal endpoints.
  return NextResponse.json({
    isConfigured,
    provider: isConfigured ? 'microsoft_foundry_live' : 'deterministic_agent_fallback',
    modelName: config.deploymentName || 'gpt-4o',
    hasEndpoint: Boolean(config.endpoint && config.endpoint.length > 0),
  });
}
