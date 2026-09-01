export function calculateSMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];

  const sma: number[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  sma.push(sum / period);

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    sma.push(sum / period);
  }

  return sma;
}

export interface CrossoverResult {
  type: 'bullish' | 'bearish' | 'none';
  occurred: boolean;
}

export function detectCrossover(
  shortMA: number[],
  longMA: number[],
): CrossoverResult {
  if (shortMA.length < 2 || longMA.length < 2) {
    return { type: 'none', occurred: false };
  }

  // Align from the end (most recent values)
  const s1 = shortMA[shortMA.length - 2];
  const s2 = shortMA[shortMA.length - 1];
  const l1 = longMA[longMA.length - 2];
  const l2 = longMA[longMA.length - 1];

  // Golden cross: short crosses above long
  if (s1 <= l1 && s2 > l2) {
    return { type: 'bullish', occurred: true };
  }

  // Death cross: short crosses below long
  if (s1 >= l1 && s2 < l2) {
    return { type: 'bearish', occurred: true };
  }

  return { type: 'none', occurred: false };
}

export interface BollingerBandsResult {
  middle: number[];
  upper: number[];
  lower: number[];
  percentB: number[];
}

export function calculateBollingerBands(
  prices: number[],
  period = 20,
  k = 2,
): BollingerBandsResult {
  const middle = calculateSMA(prices, period);

  if (middle.length === 0) {
    return { middle: [], upper: [], lower: [], percentB: [] };
  }

  const upper: number[] = [];
  const lower: number[] = [];
  const percentB: number[] = [];

  for (let i = 0; i < middle.length; i++) {
    const window = prices.slice(i, i + period);
    const mean = middle[i];
    const variance =
      window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const stddev = Math.sqrt(variance);

    const upperBand = mean + k * stddev;
    const lowerBand = mean - k * stddev;
    upper.push(upperBand);
    lower.push(lowerBand);

    const bandwidth = upperBand - lowerBand;
    const price = prices[i + period - 1];
    percentB.push(bandwidth === 0 ? 0.5 : (price - lowerBand) / bandwidth);
  }

  return { middle, upper, lower, percentB };
}

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  for (let i = period; i < prices.length; i++) {
    ema.push(
      (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1],
    );
  }

  return ema;
}

export function calculateRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const rsi: number[] = [];
  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  if (slowEMA.length === 0) return { macd: [], signal: [], histogram: [] };

  // Align: fastEMA starts at index (fastPeriod-1), slowEMA at (slowPeriod-1)
  // MACD line = fastEMA - slowEMA, aligned from slowEMA start
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);

  if (signalLine.length === 0)
    return { macd: macdLine, signal: [], histogram: [] };

  // Align histogram to signal line
  const histogramOffset = macdLine.length - signalLine.length;
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + histogramOffset] - signalLine[i]);
  }

  return { macd: macdLine, signal: signalLine, histogram };
}
