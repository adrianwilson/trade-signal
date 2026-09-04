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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ollamaUrl: string;
  private readonly model: string;
  private available: boolean | null = null;
  private lastCheck = 0;
  private static readonly RETRY_INTERVAL_MS = 60_000; // re-check every 60s

  constructor() {
    this.ollamaUrl = process.env['OLLAMA_URL'] || DEFAULT_OLLAMA_URL;
    this.model = process.env['OLLAMA_MODEL'] || DEFAULT_MODEL;
  }

  async generateReasoning(data: SynthesisPromptData): Promise<string | null> {
    // Re-check availability periodically instead of giving up permanently
    if (
      this.available === false &&
      Date.now() - this.lastCheck < LlmService.RETRY_INTERVAL_MS
    ) {
      return null;
    }

    const cacheKey = this.buildCacheKey(data);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.text;
    }

    // Check availability on first call or retry after interval
    if (this.available !== true) {
      this.available = await this.checkOllama();
      if (!this.available) return null;
    }

    const prompt = this.buildSynthesisPrompt(data);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: { num_predict: 256 },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        this.logger.warn(`Ollama returned ${response.status}`);
        return null;
      }

      const result = (await response.json()) as { response?: string };
      const text = result.response?.trim() || null;

      if (text) {
        this.cache.set(cacheKey, {
          text,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }

      return text;
    } catch (err) {
      this.logger.warn(`LLM reasoning failed for ${data.asset}: ${err}`);
      return null;
    }
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

  private async checkOllama(): Promise<boolean> {
    this.lastCheck = Date.now();
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        this.logger.log(
          `Ollama available at ${this.ollamaUrl}, using model: ${this.model}`,
        );
        return true;
      }
      return false;
    } catch {
      this.logger.debug('Ollama not available — using template reasoning');
      return false;
    }
  }

  private buildCacheKey(data: SynthesisPromptData): string {
    return `${data.asset}:${data.timeframe ?? 'swing'}:${data.direction}:${data.confidence}:${data.conviction}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** Reset availability check (for testing or reconnection) */
  resetAvailability(): void {
    this.available = null;
  }
}
