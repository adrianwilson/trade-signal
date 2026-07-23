import { Injectable } from '@nestjs/common';
import { Signal, ManualSignalInput } from '@org/signals';
import { randomUUID } from 'crypto';

@Injectable()
export class SignalsService {
  private signals: Signal[] = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 82,
      source: 'rsi',
      reasoning: 'RSI at 30 — oversold bounce likely',
      timestamp: '2026-07-23T09:00:00Z',
    },
    {
      id: '2',
      asset: 'BTC/USD',
      assetClass: 'crypto',
      direction: 'HOLD',
      confidence: 55,
      source: 'macd',
      reasoning: 'MACD flat — no clear momentum',
      timestamp: '2026-07-23T09:15:00Z',
    },
    {
      id: '3',
      asset: 'EUR/USD',
      assetClass: 'forex',
      direction: 'SELL',
      confidence: 74,
      source: 'news-sentiment',
      reasoning: 'ECB dovish signal in press conference',
      timestamp: '2026-07-23T09:30:00Z',
    },
    {
      id: '4',
      asset: 'TSLA',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 68,
      source: 'volume',
      reasoning: 'Unusual volume spike with price above VWAP',
      timestamp: '2026-07-23T10:00:00Z',
    },
    {
      id: '5',
      asset: 'ETH/USD',
      assetClass: 'crypto',
      direction: 'SELL',
      confidence: 71,
      source: 'agent',
      reasoning: 'Multi-agent synthesis: bearish divergence across indicators',
      timestamp: '2026-07-23T10:15:00Z',
    },
    {
      id: '6',
      asset: 'GBP/JPY',
      assetClass: 'forex',
      direction: 'BUY',
      confidence: 63,
      source: 'manual',
      reasoning: 'Support level bounce at 188.50',
      timestamp: '2026-07-23T10:30:00Z',
    },
  ];

  findAll(): Signal[] {
    return this.signals;
  }

  findOne(id: string): Signal | undefined {
    return this.signals.find((s) => s.id === id);
  }

  create(input: ManualSignalInput): Signal {
    const signal: Signal = {
      id: randomUUID(),
      asset: input.asset,
      assetClass: input.assetClass,
      direction: input.direction,
      confidence: input.confidence,
      source: 'manual',
      reasoning: input.notes,
      timestamp: new Date().toISOString(),
    };
    this.signals.push(signal);
    return signal;
  }
}
