import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AnalysisConfig } from '../../types';

export interface LLMResponse {
  text: string;
}

export class LLMClient {
  private config: AnalysisConfig;
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor(config: AnalysisConfig) {
    this.config = config;

    console.log('[LLMClient] Initializing with provider:', config.llmProvider);
    console.log('[LLMClient] Model:', config.options.llmModel);

    if (config.llmProvider === 'anthropic' && config.anthropicApiKey) {
      console.log('[LLMClient] Using Anthropic');
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
        dangerouslyAllowBrowser: true // Required for client-side use
      });
    } else if (config.llmProvider === 'openrouter' && config.openRouterApiKey) {
      console.log('[LLMClient] Using OpenRouter');
      this.openai = new OpenAI({
        apiKey: config.openRouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true
      });
    } else if (config.llmProvider === 'lmstudio' && config.lmStudioUrl) {
      console.log('[LLMClient] Using LM Studio');
      let url = config.lmStudioUrl.trim();
      if (!url.endsWith('/v1') && !url.endsWith('/v1/')) {
        url = url.replace(/\/+$/, '') + '/v1';
      }
      this.openai = new OpenAI({
        apiKey: 'lmstudio-local',
        baseURL: url,
        dangerouslyAllowBrowser: true
      });
    } else if (config.llmProvider === 'openai' && config.openAiApiKey) {
      console.log('[LLMClient] Using OpenAI');
      this.openai = new OpenAI({
        apiKey: config.openAiApiKey,
        dangerouslyAllowBrowser: true
      });
    } else {
      console.error('[LLMClient] No valid provider configuration found!');
      console.error('[LLMClient] Provider:', config.llmProvider);
      console.error('[LLMClient] Has Anthropic key:', !!config.anthropicApiKey);
      console.error('[LLMClient] Has OpenRouter key:', !!config.openRouterApiKey);
      console.error('[LLMClient] Has OpenAI key:', !!config.openAiApiKey);
    }
  }

  async generateJson<T>(systemPrompt: string, userPrompt: string, maxTokens: number = 2000): Promise<T> {
    const rawResponse = await this.generateText(systemPrompt, userPrompt, maxTokens);
    return this.parseJsonResponse<T>(rawResponse);
  }

  async generateText(systemPrompt: string, userPrompt: string, maxTokens: number = 2000): Promise<string> {
    const model = this.config.options.llmModel;

    try {
      if (this.config.llmProvider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: model || 'claude-3-7-sonnet-20250219',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });

        const contentBlock = response.content[0];
        if (contentBlock.type === 'text') {
          return contentBlock.text;
        }
        return '';

      } else if (this.openai) {
        // Shared between OpenRouter, OpenAI, and LM Studio
        const response = await this.openai.chat.completions.create({
          model: model || (this.config.llmProvider === 'openai' ? 'gpt-4o' : 'local-model'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens
        });

        return response.choices[0]?.message?.content || '';
      } else {
        throw new Error(`LLM Client not properly configured for provider ${this.config.llmProvider}`);
      }
    } catch (e: any) {
      console.error(`LLM Call Failed: `, e);
      
      let message = e.message || String(e);
      if (message.includes('401') || message.includes('invalid x-api-key') || message.includes('authentication')) {
        message = `Authentication Failed (401): Please check your ${this.config.llmProvider} API key.`;
      }
      
      throw new Error(`LLM Call Failed: ${message}`);
    }
  }

  private parseJsonResponse<T>(text: string): T {
    // Strip markdown code fences
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(clean) as T;
    } catch (e) {
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
        } catch (innerE) {
          throw new Error(`Could not parse JSON from LLM string. Extracted chunk failed.`);
        }
      }
      throw new Error(`Could not find valid JSON structure in LLM string.`);
    }
  }
}
