import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SignalsService } from '../signals/signals.service';

export interface NewsHeadline {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface AssetSentiment {
  asset: string;
  headlineCount: number;
  headlines: NewsHeadline[];
}

@Injectable()
export class NewsSentimentService implements OnModuleInit {
  private readonly logger = new Logger(NewsSentimentService.name);
  private readonly finnhubToken = process.env['FINNHUB_API_KEY'] ?? '';
  private headlineCache: Map<string, AssetSentiment> = new Map();

  constructor(private readonly signalsService: SignalsService) {}

  async onModuleInit(): Promise<void> {
    if (this.finnhubToken) {
      setTimeout(() => this.refreshHeadlines(), 5000);
    }
  }

  async fetchHeadlines(symbol: string): Promise<NewsHeadline[]> {
    if (!this.finnhubToken) {
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

  async getHeadlinesForAsset(
    symbol: string,
    asset: string,
  ): Promise<AssetSentiment> {
    const headlines = await this.fetchHeadlines(symbol);
    const sentiment: AssetSentiment = {
      asset,
      headlineCount: headlines.length,
      headlines,
    };
    this.headlineCache.set(asset, sentiment);
    return sentiment;
  }

  getSentiment(asset: string): AssetSentiment | null {
    return this.headlineCache.get(asset) ?? null;
  }

  getAllSentiment(): AssetSentiment[] {
    return Array.from(this.headlineCache.values());
  }

  @Cron('0 */10 * * * *')
  async refreshHeadlines(): Promise<void> {
    this.logger.log('Refreshing news headlines...');
    const signals = await this.signalsService.findAll();
    const seen = new Set<string>();

    for (const signal of signals) {
      if (signal.assetClass !== 'equity') continue;
      if (seen.has(signal.asset)) continue;
      seen.add(signal.asset);

      try {
        await this.getHeadlinesForAsset(signal.asset, signal.asset);
      } catch (err) {
        this.logger.warn(`Headlines fetch failed for ${signal.asset}: ${err}`);
      }
    }

    this.logger.log('Headlines refresh complete');
  }
}
