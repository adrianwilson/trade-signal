import type { Timeframe } from '@org/signals';

export interface TimeframeConfig {
  interval: string;
  historyDays: number;
  label: string;
}

export const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  intraday: { interval: '1h', historyDays: 5, label: 'Intraday (1H)' },
  swing: { interval: '1d', historyDays: 220, label: 'Swing (1D)' },
  'long-term': { interval: '1wk', historyDays: 365, label: 'Long-term (1W)' },
};

export const ALL_TIMEFRAMES: Timeframe[] = ['intraday', 'swing', 'long-term'];
