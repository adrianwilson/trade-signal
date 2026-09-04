import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { MarketDataService } from '../market-data/market-data.service';
import { SCAN_UNIVERSE } from './scan-universe';
import type { AssetClass, SignalDirection } from '@org/signals';

export interface Opportunity {
  asset: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  confidence: number;
  rsi: number | null;
  macdSignal: SignalDirection;
  smaSignal: SignalDirection;
  bollingerSignal: SignalDirection;
  price: number | null;
  changePercent: number | null;
  scannedAt: string;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_CONFIDENCE = 60;

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private cache: Opportunity[] = [];
  private cacheExpiry = 0;
  private scanning = false;

  constructor(
    private readonly taService: TechnicalAnalysisService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async getOpportunities(): Promise<Opportunity[]> {
    if (this.cache.length > 0 && Date.now() < this.cacheExpiry) {
      return this.cache;
    }
    if (!this.scanning) {
      await this.scan();
    }
    return this.cache;
  }

  @Cron('0 */15 * * * *')
  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.logger.log(
      `Scanning ${SCAN_UNIVERSE.length} assets for opportunities...`,
    );

    const opportunities: Opportunity[] = [];

    for (const entry of SCAN_UNIVERSE) {
      try {
        const result = await this.taService.analyze(
          entry.yahooSymbol,
          entry.asset,
          entry.assetClass,
        );

        const signals = [
          result.rsiSignal,
          result.macdSignal,
          result.smaSignal,
          result.bollingerSignal,
        ];

        const buys = signals.filter((s) => s === 'BUY').length;
        const sells = signals.filter((s) => s === 'SELL').length;
        const active = buys + sells;

        if (active === 0) continue;

        const direction: SignalDirection = buys > sells ? 'BUY' : 'SELL';
        const agreeing = direction === 'BUY' ? buys : sells;
        const confidence = Math.round((agreeing / signals.length) * 100);

        if (confidence < MIN_CONFIDENCE) continue;

        let price: number | null = null;
        let changePercent: number | null = null;
        try {
          const quote = await this.marketDataService.getQuote(
            entry.yahooSymbol,
            entry.asset,
          );
          if (quote) {
            price = quote.price;
            changePercent = quote.changePercent;
          }
        } catch {
          // price is optional
        }

        opportunities.push({
          asset: entry.asset,
          assetClass: entry.assetClass,
          direction,
          confidence,
          rsi: result.rsi,
          macdSignal: result.macdSignal,
          smaSignal: result.smaSignal,
          bollingerSignal: result.bollingerSignal,
          price,
          changePercent,
          scannedAt: new Date().toISOString(),
        });
      } catch (err) {
        this.logger.warn(`Scan failed for ${entry.asset}: ${err}`);
      }
    }

    opportunities.sort((a, b) => b.confidence - a.confidence);
    this.cache = opportunities;
    this.cacheExpiry = Date.now() + CACHE_TTL_MS;
    this.scanning = false;

    this.logger.log(
      `Scan complete: ${opportunities.length} opportunities found`,
    );
  }
}
