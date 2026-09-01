import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from '../market-data/market-data.service';
import { SignalsService } from '../signals/signals.service';
import { calculateRSI, calculateMACD } from './indicators';
import type { SignalDirection } from '@org/signals';

export interface AnalysisResult {
  symbol: string;
  rsi: number | null;
  rsiSignal: SignalDirection;
  macd: { line: number; signal: number; histogram: number } | null;
  macdSignal: SignalDirection;
  overallSignal: SignalDirection;
}

@Injectable()
export class TechnicalAnalysisService {
  private readonly logger = new Logger(TechnicalAnalysisService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
  ) {}

  async analyze(
    yahooSymbol: string,
    asset: string,
    assetClass: string,
  ): Promise<AnalysisResult> {
    const history = await this.marketDataService.getHistory(yahooSymbol, 60);
    const closes = history.map((h) => h.close);

    const rsiValues = calculateRSI(closes, 14);
    const latestRSI =
      rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
    const rsiSignal = this.rsiToSignal(latestRSI);

    const macdResult = calculateMACD(closes);
    const latestMACD =
      macdResult.histogram.length > 0
        ? {
            line: macdResult.macd[macdResult.macd.length - 1],
            signal: macdResult.signal[macdResult.signal.length - 1],
            histogram: macdResult.histogram[macdResult.histogram.length - 1],
          }
        : null;
    const macdSignal = this.macdToSignal(latestMACD);

    const overallSignal = this.combineSignals(rsiSignal, macdSignal);

    return {
      symbol: yahooSymbol,
      rsi: latestRSI,
      rsiSignal,
      macd: latestMACD,
      macdSignal,
      overallSignal,
    };
  }

  private rsiToSignal(rsi: number | null): SignalDirection {
    if (rsi === null) return 'HOLD';
    if (rsi < 30) return 'BUY';
    if (rsi > 70) return 'SELL';
    return 'HOLD';
  }

  private macdToSignal(macd: { histogram: number } | null): SignalDirection {
    if (!macd) return 'HOLD';
    if (macd.histogram > 0) return 'BUY';
    if (macd.histogram < 0) return 'SELL';
    return 'HOLD';
  }

  private combineSignals(
    rsi: SignalDirection,
    macd: SignalDirection,
  ): SignalDirection {
    if (rsi === macd) return rsi;
    return 'HOLD';
  }

  @Cron('30 */5 * * * *')
  async runAnalysis(): Promise<void> {
    this.logger.log('Running technical analysis...');
    const signals = await this.signalsService.findAll();
    const seen = new Set<string>();

    for (const signal of signals) {
      const key = `${signal.asset}:${signal.assetClass}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const yahooSymbol = this.marketDataService.mapSymbol(
        signal.asset,
        signal.assetClass,
      );

      try {
        const result = await this.analyze(
          yahooSymbol,
          signal.asset,
          signal.assetClass,
        );

        if (result.rsi !== null && result.rsiSignal !== 'HOLD') {
          await this.signalsService.create({
            asset: signal.asset,
            assetClass: signal.assetClass as
              'equity' | 'crypto' | 'forex' | 'options',
            direction: result.rsiSignal,
            confidence: Math.round(Math.abs(result.rsi - 50) * 2),
            notes: `RSI at ${result.rsi.toFixed(1)}`,
          });
        }

        if (result.macd !== null && result.macdSignal !== 'HOLD') {
          await this.signalsService.create({
            asset: signal.asset,
            assetClass: signal.assetClass as
              'equity' | 'crypto' | 'forex' | 'options',
            direction: result.macdSignal,
            confidence: Math.min(
              Math.round(Math.abs(result.macd.histogram) * 100),
              100,
            ),
            notes: `MACD histogram at ${result.macd.histogram.toFixed(4)}`,
          });
        }
      } catch (err) {
        this.logger.warn(`Analysis failed for ${signal.asset}: ${err}`);
      }
    }

    this.logger.log('Technical analysis complete');
  }
}
