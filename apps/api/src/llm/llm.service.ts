import { Injectable, Logger } from '@nestjs/common';
import type { AgentContribution } from '@org/signals';

export interface SynthesisPromptData {
  asset: string;
  assetClass: string;
  direction: string;
  confidence: number;
  conviction: number;
  convictionLabel: string;
  contributions: AgentContribution[];
  agreements: string[];
  disagreements: string[];
  timeframe?: string;
  timeframeAlignment?: string;
}

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

type LlmProvider = 'gemini' | 'ollama' | 'none';

const GEMINI_DELAY_MS = 6500; // ~9 req/min, safely under free tier limit

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private readonly geminiApiKey: string | undefined;
  private readonly geminiModel: string;
  private provider: LlmProvider = 'none';
  private providerChecked = false;
  private lastCheck = 0;
  private static readonly RETRY_INTERVAL_MS = 60_000;
  private queue: Promise<unknown> = Promise.resolve();
  private lastGeminiCall = 0;

  constructor() {
    this.ollamaUrl = process.env['OLLAMA_URL'] || DEFAULT_OLLAMA_URL;
    this.ollamaModel = process.env['OLLAMA_MODEL'] || DEFAULT_OLLAMA_MODEL;
    this.geminiApiKey = process.env['GEMINI_API_KEY'];
    this.geminiModel = process.env['GEMINI_MODEL'] || DEFAULT_GEMINI_MODEL;
  }

  async generateReasoning(data: SynthesisPromptData): Promise<string | null> {
    if (!this.providerChecked) {
      await this.detectProvider();
    }

    if (
      this.provider === 'none' &&
      Date.now() - this.lastCheck < LlmService.RETRY_INTERVAL_MS
    ) {
      return null;
    }

    const cacheKey = this.buildCacheKey(data);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.text;
    }

    if (this.provider === 'none') {
      await this.detectProvider();
      if (this.provider === 'none') return null;
    }

    const prompt = this.buildSynthesisPrompt(data);
    const text = await this.generate(prompt, 256);

    if (text) {
      this.cache.set(cacheKey, {
        text,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return text;
  }

  async generate(prompt: string, maxTokens = 256): Promise<string | null> {
    if (!this.providerChecked) {
      await this.detectProvider();
    }

    if (
      this.provider === 'none' &&
      Date.now() - this.lastCheck < LlmService.RETRY_INTERVAL_MS
    ) {
      return null;
    }

    if (this.provider === 'none') {
      await this.detectProvider();
      if (this.provider === 'none') return null;
    }

    if (this.provider === 'gemini') {
      // Serialize Gemini requests with rate limiting
      const result = this.queue.then(() =>
        this.generateGeminiThrottled(prompt, maxTokens),
      );
      this.queue = result.catch(() => null);
      return result;
    }

    // Serialize Ollama requests
    const result = this.queue.then(() =>
      this.generateOllama(prompt, maxTokens),
    );
    this.queue = result.catch(() => null);
    return result;
  }

  private async generateGeminiThrottled(
    prompt: string,
    maxTokens: number,
  ): Promise<string | null> {
    const now = Date.now();
    const elapsed = now - this.lastGeminiCall;
    if (elapsed < GEMINI_DELAY_MS) {
      await new Promise((r) => setTimeout(r, GEMINI_DELAY_MS - elapsed));
    }
    this.lastGeminiCall = Date.now();
    return this.generateGemini(prompt, maxTokens);
  }

  private async generateGemini(
    prompt: string,
    maxTokens: number,
  ): Promise<string | null> {
    try {
      const url = `${GEMINI_API_URL}/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        this.logger.warn(`Gemini returned ${response.status}`);
        return null;
      }

      const result = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (err) {
      this.logger.warn(`Gemini generate failed: ${err}`);
      return null;
    }
  }

  private async generateOllama(
    prompt: string,
    maxTokens: number,
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: { num_predict: maxTokens },
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        this.logger.warn(`Ollama returned ${response.status}`);
        return null;
      }

      const result = (await response.json()) as { response?: string };
      return result.response?.trim() || null;
    } catch (err) {
      this.logger.warn(`LLM generate failed: ${err}`);
      return null;
    }
  }

  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  buildSynthesisPrompt(data: SynthesisPromptData): string {
    const contributions = data.contributions
      .map(
        (c) =>
          `- ${c.source}: ${c.direction} at ${c.confidence}% confidence${c.reasoning ? ` (${c.reasoning})` : ''}`,
      )
      .join('\n');

    const parts = [
      `Analyze the following trading signal synthesis for ${data.asset} (${data.assetClass}).`,
      '',
      `Verdict: ${data.direction} with ${data.confidence}% confidence, ${data.convictionLabel} conviction (${data.conviction}/100).`,
    ];

    if (data.timeframe) {
      parts.push(`Timeframe: ${data.timeframe}`);
    }
    if (data.timeframeAlignment) {
      parts.push(`Cross-timeframe alignment: ${data.timeframeAlignment}`);
    }

    parts.push('', 'Agent contributions:', contributions);

    if (data.agreements.length > 0) {
      parts.push('', `Consensus: ${data.agreements.join('. ')}`);
    }
    if (data.disagreements.length > 0) {
      parts.push('', `Conflicts: ${data.disagreements.join('. ')}`);
    }

    parts.push(
      '',
      'Write a concise 2-4 sentence trading analysis. Explain why the indicators agree or disagree, what the signal means in context, and any risks. Be direct and specific — no hedging or disclaimers.',
    );

    return parts.join('\n');
  }

  private async detectProvider(): Promise<void> {
    this.lastCheck = Date.now();
    this.providerChecked = true;

    // Prefer Gemini if API key is set
    if (this.geminiApiKey) {
      try {
        const url = `${GEMINI_API_URL}?key=${this.geminiApiKey}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          this.provider = 'gemini';
          this.logger.log(`Gemini available, using model: ${this.geminiModel}`);
          return;
        }
      } catch {
        this.logger.debug('Gemini not reachable');
      }
    }

    // Fallback to Ollama
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        this.provider = 'ollama';
        this.logger.log(
          `Ollama available at ${this.ollamaUrl}, using model: ${this.ollamaModel}`,
        );
        return;
      }
    } catch {
      // not available
    }

    this.provider = 'none';
    this.logger.debug('No LLM provider available — using template reasoning');
  }

  private buildCacheKey(data: SynthesisPromptData): string {
    return `${data.asset}:${data.timeframe ?? 'swing'}:${data.direction}:${data.confidence}:${data.conviction}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetAvailability(): void {
    this.provider = 'none';
    this.providerChecked = false;
  }
}
