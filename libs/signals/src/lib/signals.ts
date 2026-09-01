/**
 * Core signal types shared between the Angular dashboard and NestJS API.
 */

export type AssetClass = 'equity' | 'crypto' | 'forex' | 'options';
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';
export type SignalSource = 'manual' | 'rsi' | 'macd' | 'sma-crossover' | 'bollinger' | 'news-sentiment' | 'volume' | 'agent';

export interface Signal {
  id: string;
  asset: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  confidence: number; // 0-100
  source: SignalSource;
  reasoning?: string;
  metadata?: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

export interface AggregatedSignal {
  asset: string;
  assetClass: AssetClass;
  price: number;
  priceChange: number; // percentage
  direction: SignalDirection;
  confidence: number; // weighted average, 0-100
  signals: Signal[];
  lastUpdated: string;
}

export interface AgentLogEntry {
  id: string;
  agentName: string;
  message: string;
  tag: 'analysis' | 'alert' | 'data' | 'synthesis' | 'manual';
  asset?: string;
  timestamp: string;
}

export interface ManualSignalInput {
  asset: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  confidence: number;
  notes?: string;
  source?: SignalSource;
}
