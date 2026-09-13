import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LlmService } from '../llm/llm.service';
import { NewsSentimentService } from '../news-sentiment/news-sentiment.service';
import type { NewsHeadline } from '../news-sentiment/news-sentiment.service';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import type { AnalysisResult } from '../technical-analysis/technical-analysis.service';
import { MarketDataService } from '../market-data/market-data.service';
import type { QuoteResult } from '../market-data/market-data.service';
import { SignalsService } from '../signals/signals.service';
import type { SignalDirection, AssetClass } from '@org/signals';

interface LlmSignalResponse {
  direction: string;
  confidence: number;
  reasoning: string;
}

const VALID_DIRECTIONS = new Set(['BUY', 'SELL', 'HOLD']);

@Injectable()
export class ResearchAgentService {
  private readonly logger = new Logger(ResearchAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly newsService: NewsSentimentService,
    private readonly taService: TechnicalAnalysisService,
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
  ) {}

  @Cron('0 */15 * * * *')
  async runResearch(): Promise<void> {
    if (!this.llmService.isAvailable()) {
      this.logger.debug('Ollama not available — skipping research agent');
      return;
    }

    this.logger.log('Running AI research agent...');
    const signals = await this.signalsService.findAll();
    const seen = new Set<string>();
    let created = 0;

    for (const signal of signals) {
      if (signal.assetClass !== 'equity') continue;
      const key = signal.asset;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const result = await this.analyzeAsset(
          signal.asset,
          signal.assetClass as AssetClass,
        );
        if (result) created++;
      } catch (err) {
        this.logger.warn(`Research failed for ${signal.asset}: ${err}`);
      }
    }

    this.logger.log(`Research agent complete: ${created} signals created`);
  }

  async analyzeAsset(asset: string, assetClass: AssetClass): Promise<boolean> {
    const yahooSymbol = this.marketDataService.mapSymbol(asset, assetClass);

    // Gather all context in parallel
    const [headlines, analysis, quote] = await Promise.all([
      this.newsService.fetchHeadlines(asset).catch(() => [] as NewsHeadline[]),
      this.taService
        .analyze(yahooSymbol, asset, assetClass)
        .catch(() => null as AnalysisResult | null),
      this.marketDataService
        .getQuote(yahooSymbol, asset)
        .catch(() => null as QuoteResult | null),
    ]);

    if (headlines.length === 0 && !analysis) {
      return false;
    }

    const prompt = this.buildResearchPrompt(
      asset,
      assetClass,
      headlines,
      analysis,
      quote,
    );

    const response = await this.llmService.generate(prompt, 512);
    if (!response) return false;

    const parsed = this.parseResponse(response);
    if (!parsed) {
      this.logger.warn(`Invalid LLM response for ${asset}`);
      return false;
    }

    await this.signalsService.create({
      asset,
      assetClass,
      direction: parsed.direction as SignalDirection,
      confidence: parsed.confidence,
      notes: parsed.reasoning,
      source: 'agent',
    });

    return true;
  }

  buildResearchPrompt(
    asset: string,
    assetClass: string,
    headlines: NewsHeadline[],
    analysis: AnalysisResult | null,
    quote: QuoteResult | null,
  ): string {
    const parts: string[] = [
      `You are a trading research analyst. Analyze ${asset} (${assetClass}) using ALL the data below and produce a trading signal.`,
      '',
    ];

    // Price data
    if (quote) {
      parts.push(
        `CURRENT PRICE: $${quote.price.toFixed(2)}, change: ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
        '',
      );
    }

    // Technical analysis
    if (analysis) {
      parts.push('TECHNICAL INDICATORS:');
      if (analysis.rsi !== null)
        parts.push(
          `- RSI(14): ${analysis.rsi.toFixed(1)} → ${analysis.rsiSignal}`,
        );
      if (analysis.macd)
        parts.push(
          `- MACD: histogram ${analysis.macd.histogram.toFixed(4)} → ${analysis.macdSignal}`,
        );
      parts.push(`- SMA crossover: ${analysis.smaSignal}`);
      if (analysis.bollingerPercentB !== null)
        parts.push(
          `- Bollinger %B: ${analysis.bollingerPercentB.toFixed(2)} → ${analysis.bollingerSignal}`,
        );
      parts.push(`- Overall technical signal: ${analysis.overallSignal}`, '');
    }

    // News headlines
    if (headlines.length > 0) {
      parts.push(`RECENT NEWS (${headlines.length} headlines):`);
      for (const h of headlines.slice(0, 10)) {
        const date = h.publishedAt.split('T')[0];
        parts.push(`- [${date}] ${h.title} (${h.source})`);
      }
      parts.push('');
    }

    parts.push(
      'Based on ALL the above data, what is your trading signal?',
      'Consider how the news context affects the technical signals.',
      'If technical indicators say BUY but news suggests fundamental problems, explain why you agree or disagree.',
      '',
      'Respond with ONLY valid JSON in this exact format, no other text:',
      '{"direction": "BUY" or "SELL" or "HOLD", "confidence": 0-100, "reasoning": "2-3 sentence explanation"}',
    );

    return parts.join('\n');
  }

  parseResponse(response: string): LlmSignalResponse | null {
    try {
      // Extract JSON from response (LLM might add text around it)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]) as LlmSignalResponse;

      if (!parsed.direction || !VALID_DIRECTIONS.has(parsed.direction)) {
        return null;
      }

      if (typeof parsed.confidence !== 'number') return null;
      parsed.confidence = Math.max(
        0,
        Math.min(100, Math.round(parsed.confidence)),
      );

      if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
        parsed.reasoning = `AI agent: ${parsed.direction} with ${parsed.confidence}% confidence`;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
