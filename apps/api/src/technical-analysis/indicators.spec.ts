import {
  calculateSMA,
  detectCrossover,
  calculateEMA,
  calculateRSI,
  calculateMACD,
} from './indicators';

describe('Technical Analysis Indicators', () => {
  // 20 sample close prices for testing
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89,
    46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
  ];

  describe('calculateSMA', () => {
    it('should return empty for insufficient data', () => {
      expect(calculateSMA([1, 2], 5)).toEqual([]);
    });

    it('should calculate SMA correctly', () => {
      const sma = calculateSMA(closes, 5);
      expect(sma.length).toBe(closes.length - 5 + 1);
      const expectedFirst = (44.34 + 44.09 + 44.15 + 43.61 + 44.33) / 5;
      expect(sma[0]).toBeCloseTo(expectedFirst, 10);
    });

    it('should produce correct number of values', () => {
      const sma = calculateSMA(closes, 10);
      expect(sma.length).toBe(closes.length - 10 + 1);
    });

    it('should handle period equal to data length', () => {
      const sma = calculateSMA([1, 2, 3], 3);
      expect(sma).toEqual([2]);
    });

    it('should calculate sliding window correctly', () => {
      const sma = calculateSMA([1, 2, 3, 4, 5], 3);
      expect(sma).toEqual([2, 3, 4]);
    });
  });

  describe('detectCrossover', () => {
    it('should detect bullish crossover (golden cross)', () => {
      const shortMA = [10, 12]; // crosses above
      const longMA = [11, 11]; // stays flat
      const result = detectCrossover(shortMA, longMA);
      expect(result.type).toBe('bullish');
      expect(result.occurred).toBe(true);
    });

    it('should detect bearish crossover (death cross)', () => {
      const shortMA = [12, 10]; // crosses below
      const longMA = [11, 11]; // stays flat
      const result = detectCrossover(shortMA, longMA);
      expect(result.type).toBe('bearish');
      expect(result.occurred).toBe(true);
    });

    it('should return none when no crossover', () => {
      const shortMA = [12, 13]; // stays above
      const longMA = [11, 11];
      const result = detectCrossover(shortMA, longMA);
      expect(result.type).toBe('none');
      expect(result.occurred).toBe(false);
    });

    it('should return none for insufficient data', () => {
      const result = detectCrossover([1], [1]);
      expect(result.type).toBe('none');
      expect(result.occurred).toBe(false);
    });
  });

  describe('calculateEMA', () => {
    it('should return empty for insufficient data', () => {
      expect(calculateEMA([1, 2], 5)).toEqual([]);
    });

    it('should calculate EMA correctly', () => {
      const ema = calculateEMA(closes, 5);
      expect(ema.length).toBe(closes.length - 5 + 1);
      // First value is SMA of first 5
      const expectedSMA = (44.34 + 44.09 + 44.15 + 43.61 + 44.33) / 5;
      expect(ema[0]).toBeCloseTo(expectedSMA, 2);
    });

    it('should produce correct number of values', () => {
      const ema = calculateEMA(closes, 10);
      expect(ema.length).toBe(closes.length - 10 + 1);
    });
  });

  describe('calculateRSI', () => {
    it('should return empty for insufficient data', () => {
      expect(calculateRSI([1, 2, 3], 14)).toEqual([]);
    });

    it('should calculate RSI values between 0 and 100', () => {
      const rsi = calculateRSI(closes, 14);
      expect(rsi.length).toBeGreaterThan(0);
      for (const val of rsi) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });

    it('should return 100 for only gains', () => {
      const onlyUp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      const rsi = calculateRSI(onlyUp, 14);
      expect(rsi[0]).toBe(100);
    });

    it('should return low RSI for mostly losses', () => {
      const mostlyDown = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const rsi = calculateRSI(mostlyDown, 14);
      expect(rsi[0]).toBeLessThan(10);
    });

    it('should produce correct count of RSI values', () => {
      const rsi = calculateRSI(closes, 14);
      expect(rsi.length).toBe(closes.length - 14);
    });
  });

  describe('calculateMACD', () => {
    // Need at least 26 + 9 - 1 = 34 data points for a full MACD
    const longCloses = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
      46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
      43.42, 42.66, 43.13, 43.5, 43.65, 43.81, 44.15, 44.24, 44.57, 44.1,
    ];

    it('should return empty for insufficient data', () => {
      const result = calculateMACD([1, 2, 3]);
      expect(result.macd).toEqual([]);
    });

    it('should calculate MACD with correct structure', () => {
      const result = calculateMACD(longCloses);
      expect(result.macd.length).toBeGreaterThan(0);
      expect(result.signal.length).toBeGreaterThan(0);
      expect(result.histogram.length).toBeGreaterThan(0);
    });

    it('should produce histogram as macd minus signal', () => {
      const result = calculateMACD(longCloses);
      const hLen = result.histogram.length;
      const macdOffset = result.macd.length - result.signal.length;
      for (let i = 0; i < hLen; i++) {
        const expected = result.macd[i + macdOffset] - result.signal[i];
        expect(result.histogram[i]).toBeCloseTo(expected, 10);
      }
    });
  });
});
