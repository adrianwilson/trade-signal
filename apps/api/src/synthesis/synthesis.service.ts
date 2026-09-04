import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SignalsService } from '../signals/signals.service';
import type {
  Signal,
  SignalDirection,
  AggregatedSignal,
  AgentContribution,
} from '@org/signals';

const SOURCE_WEIGHTS: Record<string, number> = {
  rsi: 1.0,
  macd: 1.0,
  'sma-crossover': 1.2,
  bollinger: 0.8,
  'news-sentiment': 0.7,
  volume: 0.6,
  agent: 1.0,
  manual: 0.5,
};

const SOURCE_LABELS: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  'sma-crossover': 'SMA Crossover',
  bollinger: 'Bollinger Bands',
  'news-sentiment': 'News Sentiment',
  volume: 'Volume',
  agent: 'Agent',
  manual: 'Manual',
};

@Injectable()
export class SynthesisService implements OnModuleInit {
  private readonly logger = new Logger(SynthesisService.name);
  private synthesisCache: Map<string, AggregatedSignal> = new Map();

  constructor(private readonly signalsService: SignalsService) {}

  async onModuleInit(): Promise<void> {
    setTimeout(() => this.runSynthesis(), 8000);
  }

  async synthesize(): Promise<AggregatedSignal[]> {
    const signals = await this.signalsService.findAll();
    const grouped = this.groupByAsset(signals);
    const results: AggregatedSignal[] = [];

    for (const [asset, assetSignals] of grouped) {
      const result = this.aggregateSignals(asset, assetSignals);
      results.push(result);
      this.synthesisCache.set(asset, result);
    }

    return results;
  }

  getAll(): AggregatedSignal[] {
    return Array.from(this.synthesisCache.values());
  }

  getByAsset(asset: string): AggregatedSignal | null {
    return this.synthesisCache.get(asset) ?? null;
  }

  private groupByAsset(signals: Signal[]): Map<string, Signal[]> {
    const grouped = new Map<string, Signal[]>();
    for (const signal of signals) {
      const existing = grouped.get(signal.asset) ?? [];
      existing.push(signal);
      grouped.set(signal.asset, existing);
    }
    return grouped;
  }

  aggregateSignals(asset: string, signals: Signal[]): AggregatedSignal {
    const latest = this.getLatestPerSource(signals);
    const contributions = this.buildContributions(latest);
    const { direction, confidence } =
      this.calculateWeightedVerdict(contributions);
    const agreements = this.findAgreements(contributions);
    const disagreements = this.findDisagreements(contributions);
    const reasoningChain = this.buildReasoningChain(
      asset,
      direction,
      confidence,
      contributions,
      agreements,
      disagreements,
    );

    const assetClass = signals[0]?.assetClass ?? 'equity';
    const { conviction, convictionLabel } = this.calculateConviction(
      contributions,
      direction,
      latest,
    );

    return {
      asset,
      assetClass,
      price: 0,
      priceChange: 0,
      direction,
      confidence,
      signals: latest,
      contributions,
      agreements,
      disagreements,
      reasoningChain,
      conviction,
      convictionLabel,
      lastUpdated: new Date().toISOString(),
    };
  }

  private getLatestPerSource(signals: Signal[]): Signal[] {
    const latestBySource = new Map<string, Signal>();
    for (const signal of signals) {
      const existing = latestBySource.get(signal.source);
      if (!existing || signal.timestamp > existing.timestamp) {
        latestBySource.set(signal.source, signal);
      }
    }
    return Array.from(latestBySource.values());
  }

  private buildContributions(signals: Signal[]): AgentContribution[] {
    return signals.map((s) => ({
      source: s.source,
      direction: s.direction,
      confidence: Math.min(s.confidence, 100),
      reasoning: s.reasoning,
    }));
  }

  calculateWeightedVerdict(contributions: AgentContribution[]): {
    direction: SignalDirection;
    confidence: number;
  } {
    if (contributions.length === 0) {
      return { direction: 'HOLD', confidence: 0 };
    }

    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    for (const c of contributions) {
      const weight = SOURCE_WEIGHTS[c.source] ?? 1.0;
      const weighted = (c.confidence / 100) * weight;
      totalWeight += weight;

      if (c.direction === 'BUY') buyScore += weighted;
      else if (c.direction === 'SELL') sellScore += weighted;
    }

    if (totalWeight === 0) return { direction: 'HOLD', confidence: 0 };

    const buyPct = (buyScore / totalWeight) * 100;
    const sellPct = (sellScore / totalWeight) * 100;

    let direction: SignalDirection;
    let confidence: number;

    if (buyPct > sellPct && buyPct > 30) {
      direction = 'BUY';
      confidence = Math.round(buyPct);
    } else if (sellPct > buyPct && sellPct > 30) {
      direction = 'SELL';
      confidence = Math.round(sellPct);
    } else {
      direction = 'HOLD';
      confidence = Math.round(100 - buyPct - sellPct);
    }

    return { direction, confidence: Math.min(confidence, 100) };
  }

  findAgreements(contributions: AgentContribution[]): string[] {
    const agreements: string[] = [];
    const buys = contributions.filter((c) => c.direction === 'BUY');
    const sells = contributions.filter((c) => c.direction === 'SELL');

    if (buys.length >= 2) {
      const names = buys.map((c) => SOURCE_LABELS[c.source] ?? c.source);
      agreements.push(`${names.join(' and ')} agree: BUY`);
    }
    if (sells.length >= 2) {
      const names = sells.map((c) => SOURCE_LABELS[c.source] ?? c.source);
      agreements.push(`${names.join(' and ')} agree: SELL`);
    }

    return agreements;
  }

  findDisagreements(contributions: AgentContribution[]): string[] {
    const disagreements: string[] = [];
    const buys = contributions.filter((c) => c.direction === 'BUY');
    const sells = contributions.filter((c) => c.direction === 'SELL');

    if (buys.length > 0 && sells.length > 0) {
      const buyNames = buys.map((c) => SOURCE_LABELS[c.source] ?? c.source);
      const sellNames = sells.map((c) => SOURCE_LABELS[c.source] ?? c.source);
      disagreements.push(
        `${buyNames.join(', ')} say BUY while ${sellNames.join(', ')} say SELL`,
      );
    }

    return disagreements;
  }

  private calculateConviction(
    contributions: AgentContribution[],
    direction: SignalDirection,
    signals: Signal[],
  ): {
    conviction: number;
    convictionLabel: 'strong' | 'moderate' | 'weak' | 'late';
  } {
    if (contributions.length === 0 || direction === 'HOLD') {
      return { conviction: 0, convictionLabel: 'weak' };
    }

    // Agreement score: what fraction agrees with the direction
    const agreeing = contributions.filter(
      (c) => c.direction === direction,
    ).length;
    const agreementScore = agreeing / contributions.length;

    // Recency: how fresh are the signals
    const now = Date.now();
    const avgAge =
      signals.reduce((sum, s) => {
        const age = (now - new Date(s.timestamp).getTime()) / (1000 * 60 * 60);
        return sum + age;
      }, 0) / signals.length;

    let recencyFactor: number;
    if (avgAge < 1) recencyFactor = 1.0;
    else if (avgAge < 4) recencyFactor = 0.8;
    else if (avgAge < 24) recencyFactor = 0.5;
    else recencyFactor = 0.3;

    // Counter-momentum: signals opposing recent price movement are stronger
    // For now, use a neutral 1.0 since we don't have real-time price momentum here
    // The synthesis doesn't store price change — this will be enhanced when regime detection lands
    const momentumFactor = 1.0;

    const rawConviction = agreementScore * recencyFactor * momentumFactor * 100;
    const conviction = Math.min(Math.round(rawConviction), 100);

    let convictionLabel: 'strong' | 'moderate' | 'weak' | 'late';
    if (agreementScore >= 0.75 && recencyFactor <= 0.3) {
      convictionLabel = 'late';
    } else if (conviction >= 70) {
      convictionLabel = 'strong';
    } else if (conviction >= 40) {
      convictionLabel = 'moderate';
    } else {
      convictionLabel = 'weak';
    }

    return { conviction, convictionLabel };
  }

  private buildReasoningChain(
    asset: string,
    direction: SignalDirection,
    confidence: number,
    contributions: AgentContribution[],
    agreements: string[],
    disagreements: string[],
  ): string {
    const parts: string[] = [];

    parts.push(
      `${asset}: ${direction} with ${confidence}% confidence based on ${contributions.length} agents.`,
    );

    for (const c of contributions) {
      const label = SOURCE_LABELS[c.source] ?? c.source;
      const detail = c.reasoning ? ` (${c.reasoning})` : '';
      parts.push(`- ${label}: ${c.direction} at ${c.confidence}%${detail}`);
    }

    if (agreements.length > 0) {
      parts.push(`Consensus: ${agreements.join('. ')}.`);
    }
    if (disagreements.length > 0) {
      parts.push(`Conflict: ${disagreements.join('. ')}.`);
    }

    return parts.join('\n');
  }

  @Cron('0 */5 * * * *')
  async runSynthesis(): Promise<void> {
    this.logger.log('Running signal synthesis...');
    await this.synthesize();
    this.logger.log(
      `Synthesis complete: ${this.synthesisCache.size} assets aggregated`,
    );
  }
}
