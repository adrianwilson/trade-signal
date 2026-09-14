import type { Timeframe } from '@org/signals';

export interface TimeframeConfig {
  interval: string;
  historyDays: number;
  label: string;
}

export const TIMEFRAME_CONFIG: Record<Timeframe, TimeframeConfig> = {
  intraday: { interval: '1d', historyDays: 14, label: 'Day Trade' },
  swing: { interval: '1d', historyDays: 60, label: 'Swing' },
  'long-term': { interval: '1wk', historyDays: 365, label: 'Trend' },
};

export const ALL_TIMEFRAMES: Timeframe[] = ['intraday', 'swing', 'long-term'];
