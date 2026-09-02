import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SignalsService } from '../signals/signals.service';
import {
  scoreHeadline,
  aggregateSentiment,
  SentimentResult,
} from './sentiment-scorer';
import type { SignalDirection } from '@org/signals';

export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface AssetSentiment {
  asset: string;
  score: number;
  signal: SignalDirection;
  headlineCount: number;
  headlines: NewsHeadline[];
}

@Injectable()
export class NewsSentimentService implements OnModuleInit {
  private readonly logger = new Logger(NewsSentimentService.name);
  private readonly finnhubToken = process.env['FINNHUB_API_KEY'] ?? '';
  private sentimentCache: Map<string, AssetSentiment> = new Map();

  constructor(private readonly signalsService: SignalsService) {}

  async onModuleInit(): Promise<void> {
    if (this.finnhubToken) {
      setTimeout(() => this.runSentimentAnalysis(), 5000);
    }
  }

  async fetchHeadlines(symbol: string): Promise<NewsHeadline[]> {
    if (!this.finnhubToken) {
      this.logger.warn('FINNHUB_API_KEY not set, using mock headlines');
      return [];
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = weekAgo.toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.finnhubToken}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];

      const articles = (await response.json()) as Array<{
        headline: string;
        source: string;
        url: string;
        datetime: number;
      }>;

      return articles.slice(0, 20).map((a) => ({
        title: a.headline,
        source: a.source,
        url: a.url,
        publishedAt: new Date(a.datetime * 1000).toISOString(),
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch news for ${symbol}: ${err}`);
      return [];
    }
  }

  async analyzeSentiment(
    symbol: string,
    asset: string,
  ): Promise<AssetSentiment> {
    const headlines = await this.fetchHeadlines(symbol);

    if (headlines.length === 0) {
      const empty: AssetSentiment = {
        asset,
        score: 0,
        signal: 'HOLD',
        headlineCount: 0,
        headlines: [],
      };
      this.sentimentCache.set(asset, empty);
      return empty;
    }

    const results: SentimentResult[] = headlines.map((h) =>
      scoreHeadline(h.title),
    );
    const score = aggregateSentiment(results);
    const signal = this.sentimentToSignal(score);

    const sentiment: AssetSentiment = {
      asset,
      score,
      signal,
      headlineCount: headlines.length,
      headlines,
    };

    this.sentimentCache.set(asset, sentiment);
    return sentiment;
  }

  getSentiment(asset: string): AssetSentiment | null {
    return this.sentimentCache.get(asset) ?? null;
  }

  getAllSentiment(): AssetSentiment[] {
    return Array.from(this.sentimentCache.values());
  }

  private sentimentToSignal(score: number): SignalDirection {
    if (score >= 0.3) return 'BUY';
    if (score <= -0.3) return 'SELL';
    return 'HOLD';
  }

  @Cron('0 */10 * * * *')
  async runSentimentAnalysis(): Promise<void> {
    this.logger.log('Running news sentiment analysis...');
    const signals = await this.signalsService.findAll();
    const seen = new Set<string>();

    for (const signal of signals) {
      if (signal.assetClass !== 'equity') continue;
      if (seen.has(signal.asset)) continue;
      seen.add(signal.asset);

      try {
        const result = await this.analyzeSentiment(signal.asset, signal.asset);

        if (result.signal !== 'HOLD' && result.headlineCount > 0) {
          await this.signalsService.create({
            asset: signal.asset,
            assetClass: signal.assetClass as
              'equity' | 'crypto' | 'forex' | 'options',
            direction: result.signal,
            confidence: Math.min(Math.round(Math.abs(result.score) * 100), 100),
            notes: `News sentiment: ${result.score.toFixed(2)} from ${result.headlineCount} headlines`,
            source: 'news-sentiment',
          });
        }
      } catch (err) {
        this.logger.warn(
          `Sentiment analysis failed for ${signal.asset}: ${err}`,
        );
      }
    }

    this.logger.log('News sentiment analysis complete');
  }
}
