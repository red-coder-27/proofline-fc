import { NextResponse } from 'next/server';
import {
  executeFoundryPromptOnServer,
  isLiveFoundryConfigured,
  getMicrosoftFoundryConfig,
} from '@/lib/agents/microsoftAdapter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt : '';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.2;

    const result = await executeFoundryPromptOnServer(systemPrompt, userPrompt, temperature);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : 'Server route error';
    return NextResponse.json(
      {
        content: '',
        tokensUsed: 220,
        latencyMs: 50,
        provider: 'deterministic_agent_fallback',
        modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
        errorDetails,
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  const isConfigured = isLiveFoundryConfigured();
  const config = getMicrosoftFoundryConfig();

  // Return non-sensitive status information only. Never return keys.
  return NextResponse.json({
    isConfigured,
    provider: isConfigured ? 'microsoft_foundry_live' : 'deterministic_agent_fallback',
    modelName: config.deploymentName || 'gpt-4o',
    hasEndpoint: Boolean(config.endpoint && config.endpoint.length > 0),
  });
}
