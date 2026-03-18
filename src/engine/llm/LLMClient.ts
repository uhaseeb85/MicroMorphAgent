import OpenAI from 'openai';
import { AnalysisConfig } from '../../types';

export interface LLMResponse {
  text: string;
}

interface LLMThrottleConfig {
  maxConcurrent: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class LLMClient {
  private static readonly activeRequestsByProvider = new Map<string, number>();
  private static readonly waitQueuesByProvider = new Map<string, Array<() => void>>();

  private readonly config: AnalysisConfig;
  private readonly openai?: OpenAI;
  private readonly throttleConfig: LLMThrottleConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
    this.throttleConfig = this.getThrottleConfig(config.llmProvider);

    console.log('[LLMClient] Initializing with provider:', config.llmProvider);
    console.log('[LLMClient] Model:', config.options.llmModel);

    if (config.llmProvider === 'openrouter' && config.openRouterApiKey) {
      console.log('[LLMClient] Using OpenRouter');
      this.openai = new OpenAI({
        apiKey: config.openRouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true
      });
    } else {
      console.error('[LLMClient] No valid provider configuration found!');
      console.error('[LLMClient] Provider:', config.llmProvider);
      console.error('[LLMClient] Has OpenRouter key:', !!config.openRouterApiKey);
    }
  }

  async generateJson<T>(systemPrompt: string, userPrompt: string, maxTokens: number = 2000): Promise<T> {
    const rawResponse = await this.generateText(systemPrompt, userPrompt, maxTokens);
    return this.parseJsonResponse<T>(rawResponse);
  }

  getModelName(): string {
    return this.config.options.llmModel || 'anthropic/claude-3.7-sonnet';
  }

  async generateText(systemPrompt: string, userPrompt: string, maxTokens: number = 2000): Promise<string> {
    const model = this.getModelName();
    let lastError: unknown;

    if (!this.openai) {
      throw new Error('LLM Client not properly configured for OpenRouter');
    }

    for (let attempt = 0; attempt <= this.throttleConfig.maxRetries; attempt += 1) {
      try {
        const response = await this.withProviderSlot(async () => this.openai!.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens
        }));

        return response.choices[0]?.message?.content || '';
      } catch (e: any) {
        lastError = e;
        console.error('LLM Call Failed: ', e);

        if (!this.shouldRetry(e) || attempt === this.throttleConfig.maxRetries) {
          throw this.formatLlmError(e);
        }

        const retryDelayMs = this.getRetryDelayMs(e, attempt);
        console.warn(`[LLMClient] Retry ${attempt + 1}/${this.throttleConfig.maxRetries} in ${retryDelayMs}ms`);
        await this.sleep(retryDelayMs);
      }
    }

    throw this.formatLlmError(lastError);
  }

  private parseJsonResponse<T>(text: string): T {
    // Strip markdown code fences
    const clean = text.replaceAll(/```json\n?/g, '').replaceAll(/```\n?/g, '').trim();

    try {
      return JSON.parse(clean) as T;
    } catch {
      console.warn("Failed to parse LLM JSON directly, raw string:", clean);
      // Try to find the first '{' or '[' and parse from there
      const firstBrace = clean.indexOf('{');
      const firstBracket = clean.indexOf('[');
      const startIdx = (firstBrace !== -1 && firstBracket !== -1)
        ? Math.min(firstBrace, firstBracket)
        : Math.max(firstBrace, firstBracket);

      if (startIdx !== -1) {
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');
        const endIdx = Math.max(lastBrace, lastBracket) + 1;

        try {
          return JSON.parse(clean.substring(startIdx, endIdx)) as T;
        } catch {
          throw new Error(`Could not parse JSON from LLM string. Extracted chunk failed.`);
        }
      }
      throw new Error(`Could not find valid JSON structure in LLM string.`);
    }
  }

  private getThrottleConfig(provider: AnalysisConfig['llmProvider']): LLMThrottleConfig {
    if (provider === 'openrouter') {
      return {
        maxConcurrent: 3,
        maxRetries: 3,
        baseDelayMs: 1200,
        maxDelayMs: 10000
      };
    }

    return {
      maxConcurrent: 2,
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 8000
    };
  }

  private async withProviderSlot<T>(operation: () => Promise<T>): Promise<T> {
    const providerKey = this.config.llmProvider;
    await this.acquireProviderSlot(providerKey);

    try {
      return await operation();
    } finally {
      this.releaseProviderSlot(providerKey);
    }
  }

  private async acquireProviderSlot(providerKey: string): Promise<void> {
    const activeRequests = LLMClient.activeRequestsByProvider.get(providerKey) || 0;
    if (activeRequests < this.throttleConfig.maxConcurrent) {
      LLMClient.activeRequestsByProvider.set(providerKey, activeRequests + 1);
      return;
    }

    await new Promise<void>((resolve) => {
      const queue = LLMClient.waitQueuesByProvider.get(providerKey) || [];
      queue.push(() => {
        const currentActive = LLMClient.activeRequestsByProvider.get(providerKey) || 0;
        LLMClient.activeRequestsByProvider.set(providerKey, currentActive + 1);
        resolve();
      });
      LLMClient.waitQueuesByProvider.set(providerKey, queue);
    });
  }

  private releaseProviderSlot(providerKey: string): void {
    const activeRequests = LLMClient.activeRequestsByProvider.get(providerKey) || 0;
    LLMClient.activeRequestsByProvider.set(providerKey, Math.max(0, activeRequests - 1));

    const queue = LLMClient.waitQueuesByProvider.get(providerKey);
    const next = queue?.shift();
    if (next) {
      next();
    }
  }

  private shouldRetry(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    if (status === 401 || status === 403) {
      return false;
    }

    if (status === 408 || status === 409 || status === 425 || status === 429) {
      return true;
    }

    if (typeof status === 'number' && status >= 500) {
      return true;
    }

    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('timeout') || message.includes('network') || message.includes('fetch failed');
  }

  private getRetryDelayMs(error: unknown, attempt: number): number {
    const retryAfterMs = this.getRetryAfterMs(error);
    if (retryAfterMs !== null) {
      return retryAfterMs;
    }

    const exponentialDelay = this.throttleConfig.baseDelayMs * (2 ** attempt);
    const jitterMs = Math.floor(Math.random() * 250);
    return Math.min(this.throttleConfig.maxDelayMs, exponentialDelay + jitterMs);
  }

  private getRetryAfterMs(error: unknown): number | null {
    const retryAfter = this.getHeaderValue(error, 'retry-after');
    if (!retryAfter) {
      return null;
    }

    const asSeconds = Number(retryAfter);
    if (!Number.isNaN(asSeconds)) {
      return Math.max(0, asSeconds * 1000);
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isNaN(retryAt)) {
      return null;
    }

    return Math.max(0, retryAt - Date.now());
  }

  private getHeaderValue(error: unknown, headerName: string): string | null {
    const sources = [
      (error as { headers?: Record<string, string> })?.headers,
      (error as { response?: { headers?: Record<string, string> } })?.response?.headers
    ];

    for (const headers of sources) {
      if (!headers) {
        continue;
      }

      const matchingKey = Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase());
      if (matchingKey) {
        return headers[matchingKey];
      }
    }

    return null;
  }

  private getErrorStatus(error: unknown): number | undefined {
    const directStatus = (error as { status?: number })?.status;
    if (typeof directStatus === 'number') {
      return directStatus;
    }

    const responseStatus = (error as { response?: { status?: number } })?.response?.status;
    return typeof responseStatus === 'number' ? responseStatus : undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private formatLlmError(error: unknown): Error {
    let message = this.getErrorMessage(error);
    if (message.includes('401') || message.includes('invalid x-api-key') || message.includes('authentication')) {
      message = 'Authentication Failed (401): Please check your OpenRouter API key.';
    }

    return new Error(`LLM Call Failed: ${message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
