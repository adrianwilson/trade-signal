import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { OutcomeEntity } from './outcome.entity';
import { SignalsService } from '../signals/signals.service';
import { MarketDataService } from '../market-data/market-data.service';
import { randomUUID } from 'crypto';

export interface AgentAccuracy {
  source: string;
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracyRate: number;
}

export interface LeaderboardEntry extends AgentAccuracy {
  rank: number;
}

export interface CalibrationBucket {
  bucket: string;
  range: [number, number];
  expectedAccuracy: number;
  actualAccuracy: number;
  total: number;
  correct: number;
}

export interface RetrospectiveSummary {
  totalSignals: number;
  evaluatedSignals: number;
  correctSignals: number;
  overallAccuracy: number;
  hypotheticalTrades: number;
  hypotheticalPnlPercent: number;
  byDirection: {
    BUY: { count: number; correct: number; avgReturn: number };
    SELL: { count: number; correct: number; avgReturn: number };
  };
}

@Injectable()
export class OutcomesService {
  private readonly logger = new Logger(OutcomesService.name);
  private readonly evaluationDays = [1, 3, 7];

  constructor(
    @InjectRepository(OutcomeEntity)
    private readonly repository: Repository<OutcomeEntity>,
    private readonly signalsService: SignalsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const outcomes = await this.repository.find();
    const bySource = new Map<string, OutcomeEntity[]>();

    for (const o of outcomes) {
      const list = bySource.get(o.source) ?? [];
      list.push(o);
      bySource.set(o.source, list);
    }

    const entries: AgentAccuracy[] = [];
    for (const [source, items] of bySource) {
      const evaluated = items.filter((i) => i.outcome !== 'pending');
      const correct = evaluated.filter((i) => i.outcome === 'correct').length;
      const incorrect = evaluated.filter(
        (i) => i.outcome === 'incorrect',
      ).length;
      const pending = items.filter((i) => i.outcome === 'pending').length;
      entries.push({
        source,
        total: items.length,
        correct,
        incorrect,
        pending,
        accuracyRate: evaluated.length > 0 ? correct / evaluated.length : 0,
      });
    }

    return entries
      .sort((a, b) => b.accuracyRate - a.accuracyRate)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async getAccuracyByAssetClass(): Promise<
    Record<string, { total: number; correct: number; rate: number }>
  > {
    const outcomes = await this.repository.find();
    const byClass = new Map<string, OutcomeEntity[]>();

    for (const o of outcomes) {
      const list = byClass.get(o.assetClass) ?? [];
      list.push(o);
      byClass.set(o.assetClass, list);
    }

    const result: Record<
      string,
      { total: number; correct: number; rate: number }
    > = {};
    for (const [assetClass, items] of byClass) {
      const evaluated = items.filter((i) => i.outcome !== 'pending');
      const correct = evaluated.filter((i) => i.outcome === 'correct').length;
      result[assetClass] = {
        total: evaluated.length,
        correct,
        rate: evaluated.length > 0 ? correct / evaluated.length : 0,
      };
    }

    return result;
  }

  async recordSignalOutcomes(): Promise<number> {
    const signals = await this.signalsService.findAll();
    let recorded = 0;

    for (const signal of signals) {
      if (signal.source === 'manual') continue;
      if (signal.direction === 'HOLD') continue;

      for (const days of this.evaluationDays) {
        const existing = await this.repository.findOneBy({
          signalId: signal.id,
          evaluationDays: days,
        });
        if (existing) continue;

        let priceAtSignal: number | null = null;
        try {
          const symbol = this.marketDataService.mapSymbol(
            signal.asset,
            signal.assetClass,
          );
          const history = await this.marketDataService.getHistory(symbol, 1);
          priceAtSignal = history.length > 0 ? history[0].close : null;
        } catch {
          // Skip if can't get price
        }

        if (priceAtSignal === null) continue;

        const entity: OutcomeEntity = {
          id: randomUUID(),
          signalId: signal.id,
          asset: signal.asset,
          assetClass: signal.assetClass,
          source: signal.source,
          direction: signal.direction,
          priceAtSignal,
          priceAfterDays: null,
          evaluationDays: days,
          outcome: 'pending',
          signalTimestamp: signal.timestamp,
          evaluatedAt: null,
        };

        await this.repository.save(entity);
        recorded++;
      }
    }

    return recorded;
  }

  async evaluatePendingOutcomes(): Promise<number> {
    const pending = await this.repository.findBy({ outcome: 'pending' });
    let evaluated = 0;

    for (const outcome of pending) {
      const signalDate = new Date(outcome.signalTimestamp);
      const evalDate = new Date(
        signalDate.getTime() + outcome.evaluationDays * 24 * 60 * 60 * 1000,
      );

      if (evalDate > new Date()) continue;

      try {
        const symbol = this.marketDataService.mapSymbol(
          outcome.asset,
          outcome.assetClass,
        );
        const history = await this.marketDataService.getHistory(symbol, 1);
        if (history.length === 0) continue;

        const currentPrice = history[0].close;
        const priceChange = currentPrice - outcome.priceAtSignal;

        const isCorrect =
          (outcome.direction === 'BUY' && priceChange > 0) ||
          (outcome.direction === 'SELL' && priceChange < 0);

        outcome.priceAfterDays = currentPrice;
        outcome.outcome = isCorrect ? 'correct' : 'incorrect';
        outcome.evaluatedAt = new Date().toISOString();

        await this.repository.save(outcome);
        evaluated++;
      } catch {
        // Skip on error
      }
    }

    return evaluated;
  }

  async getCalibration(): Promise<CalibrationBucket[]> {
    const signals = await this.signalsService.findAll();
    const outcomes = await this.repository.find();

    const signalConfidence = new Map<string, number>();
    for (const s of signals) {
      signalConfidence.set(s.id, s.confidence);
    }

    const buckets: [string, number, number][] = [
      ['0-20', 0, 20],
      ['20-40', 20, 40],
      ['40-60', 40, 60],
      ['60-80', 60, 80],
      ['80-100', 80, 100],
    ];

    return buckets.map(([label, low, high]) => {
      const inBucket = outcomes.filter((o) => {
        const conf = signalConfidence.get(o.signalId) ?? 0;
        return (
          conf >= low &&
          conf < (high === 100 ? 101 : high) &&
          o.outcome !== 'pending'
        );
      });
      const correct = inBucket.filter((o) => o.outcome === 'correct').length;
      return {
        bucket: label,
        range: [low, high] as [number, number],
        expectedAccuracy: (low + high) / 2 / 100,
        actualAccuracy: inBucket.length > 0 ? correct / inBucket.length : 0,
        total: inBucket.length,
        correct,
      };
    });
  }

  async getRetrospective(): Promise<RetrospectiveSummary> {
    const outcomes = await this.repository.find();
    const evaluated = outcomes.filter((o) => o.outcome !== 'pending');
    const correct = evaluated.filter((o) => o.outcome === 'correct');

    const buys = evaluated.filter((o) => o.direction === 'BUY');
    const sells = evaluated.filter((o) => o.direction === 'SELL');
    const buyCorrect = buys.filter((o) => o.outcome === 'correct');
    const sellCorrect = sells.filter((o) => o.outcome === 'correct');

    const calcAvgReturn = (items: OutcomeEntity[]) => {
      const withPrice = items.filter((o) => o.priceAfterDays !== null);
      if (withPrice.length === 0) return 0;
      const returns = withPrice.map((o) => {
        const change =
          ((o.priceAfterDays! - o.priceAtSignal) / o.priceAtSignal) * 100;
        return o.direction === 'SELL' ? -change : change;
      });
      return returns.reduce((a, b) => a + b, 0) / returns.length;
    };

    const allReturns = evaluated
      .filter((o) => o.priceAfterDays !== null)
      .map((o) => {
        const change =
          ((o.priceAfterDays! - o.priceAtSignal) / o.priceAtSignal) * 100;
        return o.direction === 'SELL' ? -change : change;
      });
    const totalPnl =
      allReturns.length > 0
        ? allReturns.reduce((a, b) => a + b, 0) / allReturns.length
        : 0;

    return {
      totalSignals: outcomes.length,
      evaluatedSignals: evaluated.length,
      correctSignals: correct.length,
      overallAccuracy:
        evaluated.length > 0 ? correct.length / evaluated.length : 0,
      hypotheticalTrades: evaluated.length,
      hypotheticalPnlPercent: totalPnl,
      byDirection: {
        BUY: {
          count: buys.length,
          correct: buyCorrect.length,
          avgReturn: calcAvgReturn(buys),
        },
        SELL: {
          count: sells.length,
          correct: sellCorrect.length,
          avgReturn: calcAvgReturn(sells),
        },
      },
    };
  }

  @Cron('0 0 */6 * * *')
  async runEvaluation(): Promise<void> {
    this.logger.log('Running signal outcome evaluation...');
    const recorded = await this.recordSignalOutcomes();
    const evaluated = await this.evaluatePendingOutcomes();
    this.logger.log(`Outcomes: ${recorded} recorded, ${evaluated} evaluated`);
  }
}
