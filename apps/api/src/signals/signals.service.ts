import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal, ManualSignalInput } from '@org/signals';
import { randomUUID } from 'crypto';
import { SignalEntity } from './signal.entity';
import { EventsGateway } from '../events/events.gateway';

const SEED_SIGNALS: Signal[] = [
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

@Injectable()
export class SignalsService implements OnModuleInit {
  constructor(
    @InjectRepository(SignalEntity)
    private readonly repository: Repository<SignalEntity>,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.repository.count();
    if (count === 0) {
      await this.repository.save(SEED_SIGNALS);
    }
  }

  async findAll(): Promise<Signal[]> {
    return this.repository.find() as Promise<Signal[]>;
  }

  async findOne(id: string): Promise<Signal | null> {
    return this.repository.findOneBy({ id }) as Promise<Signal | null>;
  }

  async create(input: ManualSignalInput): Promise<Signal> {
    const signal: Signal = {
      id: randomUUID(),
      asset: input.asset,
      assetClass: input.assetClass,
      direction: input.direction,
      confidence: input.confidence,
      source: input.source ?? 'manual',
      reasoning: input.notes,
      timestamp: new Date().toISOString(),
    };
    const saved = await this.repository.save(signal);
    this.eventsGateway?.emitSignalCreated(
      saved as unknown as Record<string, unknown>,
    );
    return saved;
  }
}
