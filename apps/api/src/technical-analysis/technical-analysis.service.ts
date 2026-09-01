import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from '../market-data/market-data.service';
import { SignalsService } from '../signals/signals.service';
import {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateEMA,
  detectCrossover,
  calculateBollingerBands,
} from './indicators';
import type { CrossoverResult } from './indicators';
import type { SignalDirection } from '@org/signals';

export interface AnalysisResult {
  symbol: string;
  rsi: number | null;
  rsiSignal: SignalDirection;
  macd: { line: number; signal: number; histogram: number } | null;
  macdSignal: SignalDirection;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  crossover: CrossoverResult;
  smaSignal: SignalDirection;
  bollingerPercentB: number | null;
  bollingerSignal: SignalDirection;
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
    const history = await this.marketDataService.getHistory(yahooSymbol, 220);
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

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema20 = calculateEMA(closes, 20);

    const latestSMA20 = sma20.length > 0 ? sma20[sma20.length - 1] : null;
    const latestSMA50 = sma50.length > 0 ? sma50[sma50.length - 1] : null;
    const latestSMA200 = sma200.length > 0 ? sma200[sma200.length - 1] : null;
    const latestEMA20 = ema20.length > 0 ? ema20[ema20.length - 1] : null;

    const crossover = detectCrossover(sma50, sma200);
    const smaSignal = this.crossoverToSignal(crossover);

    const bollinger = calculateBollingerBands(closes);
    const latestPercentB =
      bollinger.percentB.length > 0
        ? bollinger.percentB[bollinger.percentB.length - 1]
        : null;
    const bollingerSignal = this.bollingerToSignal(latestPercentB);

    const overallSignal = this.combineSignals(
      rsiSignal,
      macdSignal,
      smaSignal,
      bollingerSignal,
    );

    return {
      symbol: yahooSymbol,
      rsi: latestRSI,
      rsiSignal,
      macd: latestMACD,
      macdSignal,
      sma20: latestSMA20,
      sma50: latestSMA50,
      sma200: latestSMA200,
      ema20: latestEMA20,
      crossover,
      smaSignal,
      bollingerPercentB: latestPercentB,
      bollingerSignal,
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

  private bollingerToSignal(percentB: number | null): SignalDirection {
    if (percentB === null) return 'HOLD';
    if (percentB < 0.2) return 'BUY';
    if (percentB > 0.8) return 'SELL';
    return 'HOLD';
  }

  private crossoverToSignal(crossover: CrossoverResult): SignalDirection {
    if (!crossover.occurred) return 'HOLD';
    if (crossover.type === 'bullish') return 'BUY';
    if (crossover.type === 'bearish') return 'SELL';
    return 'HOLD';
  }

  private combineSignals(
    rsi: SignalDirection,
    macd: SignalDirection,
    sma: SignalDirection = 'HOLD',
    bollinger: SignalDirection = 'HOLD',
  ): SignalDirection {
    const signals = [rsi, macd, sma, bollinger];
    const buys = signals.filter((s) => s === 'BUY').length;
    const sells = signals.filter((s) => s === 'SELL').length;
    if (buys >= 2) return 'BUY';
    if (sells >= 2) return 'SELL';
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
            source: 'rsi',
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
            source: 'macd',
          });
        }

        if (result.crossover.occurred) {
          await this.signalsService.create({
            asset: signal.asset,
            assetClass: signal.assetClass as
              'equity' | 'crypto' | 'forex' | 'options',
            direction: result.smaSignal,
            confidence: 75,
            notes: `SMA crossover: ${result.crossover.type === 'bullish' ? 'Golden cross' : 'Death cross'} (SMA-50 vs SMA-200)`,
            source: 'sma-crossover',
          });
        }

        if (
          result.bollingerPercentB !== null &&
          result.bollingerSignal !== 'HOLD'
        ) {
          await this.signalsService.create({
            asset: signal.asset,
            assetClass: signal.assetClass as
              'equity' | 'crypto' | 'forex' | 'options',
            direction: result.bollingerSignal,
            confidence: Math.round(
              Math.abs(result.bollingerPercentB - 0.5) * 200,
            ),
            notes: `Bollinger %B at ${result.bollingerPercentB.toFixed(2)}`,
            source: 'bollinger',
          });
        }
      } catch (err) {
        this.logger.warn(`Analysis failed for ${signal.asset}: ${err}`);
      }
    }

    this.logger.log('Technical analysis complete');
  }
}
