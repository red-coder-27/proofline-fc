/**
 * Microsoft Foundry & Azure Agent Framework Adapter.
 * Provides a production-grade interface for Microsoft Foundry model endpoints
 * (Azure OpenAI / Azure AI Foundry). If credentials are not present in .env,
 * cleanly degrades to the deterministic verification agent system while
 * explicitly indicating the active execution mode.
 *
 * All secrets remain strictly server-side (in .env.local). No API keys are
 * ever exposed to client bundles or logged to consoles.
 */

export interface MicrosoftFoundryConfig {
  endpoint?: string;
  apiKey?: string;
  deploymentName?: string;
  apiVersion?: string;
}

export function getMicrosoftFoundryConfig(): MicrosoftFoundryConfig {
  return {
    endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_AI_FOUNDRY_KEY || process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_AI_FOUNDRY_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
  };
}

export function isLiveFoundryConfigured(): boolean {
  const config = getMicrosoftFoundryConfig();
  return Boolean(
    config.endpoint &&
    config.endpoint.trim().length > 0 &&
    config.apiKey &&
    config.apiKey.trim().length > 0
  );
}

/**
 * Normalizes Azure AI Foundry / Azure OpenAI endpoint URLs.
 * Handles:
 * 1. Base URL: https://<resource>.openai.azure.com
 * 2. Pre-expanded chat completions URL: https://<resource>.openai.azure.com/.../chat/completions
 * 3. Azure AI Foundry Model Inference route: https://<resource>.services.ai.azure.com/models
 */
export function buildFoundryEndpointUrl(config: MicrosoftFoundryConfig): string {
  const rawEndpoint = (config.endpoint || '').trim().replace(/\/+$/, '');
  const deployment = (config.deploymentName || 'gpt-4o').trim();
  const apiVersion = (config.apiVersion || '2024-08-01-preview').trim();

  if (!rawEndpoint) {
    return '';
  }

  // If user pasted a full completions URL directly
  if (rawEndpoint.includes('/chat/completions')) {
    if (!rawEndpoint.includes('api-version=')) {
      const sep = rawEndpoint.includes('?') ? '&' : '?';
      return `${rawEndpoint}${sep}api-version=${apiVersion}`;
    }
    return rawEndpoint;
  }

  // If user passed an Azure AI Foundry Model Inference endpoint (/models)
  if (rawEndpoint.endsWith('/models')) {
    return `${rawEndpoint}/chat/completions?api-version=${apiVersion}`;
  }

  // Extract base origin to prevent nested paths (e.g. if endpoint includes /openai/v1 or trailing paths)
  try {
    const parsed = new URL(rawEndpoint);
    if (parsed.pathname.includes('/openai/deployments/')) {
      const cleanPath = parsed.pathname.replace(/\/+$/, '');
      const sep = parsed.search ? '&' : '?';
      const search = parsed.search.includes('api-version=')
        ? parsed.search
        : `${parsed.search}${sep}api-version=${apiVersion}`;
      return `${parsed.origin}${cleanPath}/chat/completions${search}`;
    }

    return `${parsed.origin}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  } catch {
    return `${rawEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  }
}

export interface ModelCallResult {
  content: string;
  tokensUsed: number;
  tokensReported?: boolean;
  latencyMs: number;
  provider: 'microsoft_foundry_live' | 'deterministic_agent_fallback';
  modelName: string;
  errorDetails?: string;
}

/**
 * Server-side execution of Microsoft Foundry model inference.
 * Reads environment variables directly and performs the authenticated REST call.
 * Measures actual wall-clock elapsed time and provider-reported tokens only.
 */
export async function executeFoundryPromptOnServer(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<ModelCallResult> {
  const startTime = Date.now();
  const config = getMicrosoftFoundryConfig();

  // If live credentials are supplied in server environment variables
  if (config.endpoint && config.apiKey && config.apiKey.trim().length > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = buildFoundryEndpointUrl(config);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify({
          model: config.deploymentName || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsedMs = Math.max(1, Date.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const reportedTokens = typeof data.usage?.total_tokens === 'number' ? data.usage.total_tokens : undefined;

        return {
          content,
          tokensUsed: reportedTokens ?? 0,
          tokensReported: reportedTokens !== undefined,
          latencyMs: elapsedMs,
          provider: 'microsoft_foundry_live',
          modelName: config.deploymentName || 'gpt-4o',
        };
      }

      // Explicitly distinguish provider error categories
      let errorCategory = `Upstream HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        errorCategory = `Upstream HTTP ${response.status}: Authentication failed (check Azure AI Foundry API key)`;
      } else if (response.status === 404) {
        errorCategory = `Upstream HTTP 404: Deployment "${config.deploymentName}" not found at endpoint`;
      } else if (response.status === 429) {
        errorCategory = `Upstream HTTP 429: Quota or rate limit exceeded on Azure deployment`;
      }

      return {
        content: '',
        tokensUsed: 0,
        tokensReported: false,
        latencyMs: elapsedMs,
        provider: 'deterministic_agent_fallback',
        modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
        errorDetails: errorCategory,
      };
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      const elapsedMs = Math.max(1, Date.now() - startTime);
      const isTimeout = e instanceof Error && (e.name === 'AbortError' || e.message.includes('abort'));
      const msg = isTimeout
        ? 'Request timed out after 15000ms'
        : e instanceof Error
        ? e.message
        : 'Connection unreachable';

      return {
        content: '',
        tokensUsed: 0,
        tokensReported: false,
        latencyMs: elapsedMs,
        provider: 'deterministic_agent_fallback',
        modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
        errorDetails: isTimeout ? msg : `Network error: ${msg}`,
      };
    }
  }

  // Clean deterministic fallback when credentials are not configured (strictly measured wall-clock time)
  return {
    content: '',
    tokensUsed: 0,
    tokensReported: false,
    latencyMs: Math.max(1, Date.now() - startTime),
    provider: 'deterministic_agent_fallback',
    modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
  };
}

/**
 * Universal prompt execution:
 * - If running in browser: proxies through /api/foundry route so API keys are never exposed.
 * - If running on server or in test harness: calls executeFoundryPromptOnServer directly.
 */
export async function executeFoundryPrompt(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<ModelCallResult> {
  const startTime = Date.now();
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/foundry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, userPrompt, temperature }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to fallback
    }

    return {
      content: '',
      tokensUsed: 0,
      tokensReported: false,
      latencyMs: Math.max(1, Date.now() - startTime),
      provider: 'deterministic_agent_fallback',
      modelName: 'Microsoft Foundry Rules Engine (Deterministic Fallback)',
    };
  }

  return executeFoundryPromptOnServer(systemPrompt, userPrompt, temperature);
}
