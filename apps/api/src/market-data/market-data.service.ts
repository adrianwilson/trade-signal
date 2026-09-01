import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance =
  require('yahoo-finance2').default || require('yahoo-finance2');
const yahooFinance =
  typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;
import { AssetPriceEntity } from './asset-price.entity';
import { SignalsService } from '../signals/signals.service';

export interface QuoteResult {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number | null;
  updatedAt: string;
}

export interface HistoryResult {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @InjectRepository(AssetPriceEntity)
    private readonly priceRepository: Repository<AssetPriceEntity>,
    private readonly signalsService: SignalsService,
  ) {}

  mapSymbol(asset: string, assetClass: string): string {
    switch (assetClass) {
      case 'crypto':
        return asset.replace('/', '-');
      case 'forex':
        return asset.replace('/', '') + '=X';
      default:
        return asset;
    }
  }

  async getQuote(yahooSymbol: string): Promise<QuoteResult | null> {
    try {
      const result: Record<string, unknown> =
        await yahooFinance.quote(yahooSymbol);
      const quote: QuoteResult = {
        symbol: yahooSymbol,
        price: (result['regularMarketPrice'] as number) ?? 0,
        changePercent: (result['regularMarketChangePercent'] as number) ?? 0,
        volume: (result['regularMarketVolume'] as number) ?? null,
        updatedAt: new Date().toISOString(),
      };

      await this.priceRepository.save({
        symbol: quote.symbol,
        price: quote.price,
        changePercent: quote.changePercent,
        volume: quote.volume,
        updatedAt: quote.updatedAt,
      });

      return quote;
    } catch (err) {
      this.logger.warn(`Failed to fetch quote for ${yahooSymbol}: ${err}`);
      const cached = await this.priceRepository.findOneBy({
        symbol: yahooSymbol,
      });
      return cached
        ? {
            symbol: cached.symbol,
            price: cached.price,
            changePercent: cached.changePercent,
            volume: cached.volume,
            updatedAt: cached.updatedAt,
          }
        : null;
    }
  }

  async getHistory(yahooSymbol: string, days = 30): Promise<HistoryResult[]> {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days);

    try {
      const result: Record<string, unknown>[] = await yahooFinance.historical(
        yahooSymbol,
        {
          period1: start,
          period2: now,
        },
      );

      return result.map((row: Record<string, unknown>) => ({
        date: (row['date'] as Date).toISOString().split('T')[0],
        open: row['open'] as number,
        high: row['high'] as number,
        low: row['low'] as number,
        close: row['close'] as number,
        volume: row['volume'] as number,
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch history for ${yahooSymbol}: ${err}`);
      return [];
    }
  }

  async getBulkQuotes(): Promise<Record<string, QuoteResult>> {
    const signals = await this.signalsService.findAll();
    const seen = new Set<string>();
    const results: Record<string, QuoteResult> = {};

    for (const signal of signals) {
      const key = `${signal.asset}:${signal.assetClass}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const yahooSymbol = this.mapSymbol(signal.asset, signal.assetClass);
      const quote = await this.getQuote(yahooSymbol);
      if (quote) {
        results[signal.asset] = quote;
      }
    }

    return results;
  }

  @Cron('0 */5 * * * *')
  async refreshPrices(): Promise<void> {
    this.logger.log('Refreshing market prices...');
    await this.getBulkQuotes();
    this.logger.log('Market prices refreshed');
  }
}
