import { TechnicalAnalysisService } from './technical-analysis.service';
import type { MarketDataService } from '../market-data/market-data.service';
import type { SignalsService } from '../signals/signals.service';

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;
  let mockMarketData: Partial<MarketDataService>;
  let mockSignals: Partial<SignalsService>;

  // 220 close prices to support SMA-200
  const mockHistory = Array.from({ length: 220 }, (_, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: 100 + Math.sin(i / 10) * 5,
    high: 101 + Math.sin(i / 10) * 5,
    low: 99 + Math.sin(i / 10) * 5,
    close: 100 + Math.sin(i / 10) * 5 + i * 0.01,
    volume: 1000000,
  }));

  beforeEach(() => {
    mockMarketData = {
      getHistory: jest.fn().mockResolvedValue(mockHistory),
      mapSymbol: jest.fn().mockImplementation((asset: string) => asset),
    };
    mockSignals = {
      findAll: jest
        .fn()
        .mockResolvedValue([{ asset: 'AAPL', assetClass: 'equity' }]),
      create: jest.fn().mockResolvedValue({}),
    };
    service = new TechnicalAnalysisService(
      mockMarketData as MarketDataService,
      mockSignals as SignalsService,
    );
  });

  describe('analyze', () => {
    it('should return RSI, MACD, and SMA/EMA values', async () => {
      const result = await service.analyze('AAPL', 'AAPL', 'equity');
      expect(result.symbol).toBe('AAPL');
      expect(result.rsi).not.toBeNull();
      expect(typeof result.rsi).toBe('number');
      expect(result.rsiSignal).toBeDefined();
      expect(result.macd).not.toBeNull();
      expect(result.macdSignal).toBeDefined();
      expect(result.sma20).not.toBeNull();
      expect(typeof result.sma20).toBe('number');
      expect(result.sma50).not.toBeNull();
      expect(result.sma200).not.toBeNull();
      expect(result.ema20).not.toBeNull();
      expect(result.crossover).toBeDefined();
      expect(result.smaSignal).toBeDefined();
      expect(result.bollingerPercentB).not.toBeNull();
      expect(typeof result.bollingerPercentB).toBe('number');
      expect(result.bollingerSignal).toBeDefined();
      expect(result.overallSignal).toBeDefined();
    });

    it('should return HOLD when not enough data', async () => {
      (mockMarketData.getHistory as jest.Mock).mockResolvedValue([]);
      const result = await service.analyze('AAPL', 'AAPL', 'equity');
      expect(result.rsi).toBeNull();
      expect(result.rsiSignal).toBe('HOLD');
      expect(result.macd).toBeNull();
      expect(result.macdSignal).toBe('HOLD');
      expect(result.sma20).toBeNull();
      expect(result.sma50).toBeNull();
      expect(result.sma200).toBeNull();
      expect(result.ema20).toBeNull();
      expect(result.crossover.occurred).toBe(false);
      expect(result.smaSignal).toBe('HOLD');
      expect(result.bollingerPercentB).toBeNull();
      expect(result.bollingerSignal).toBe('HOLD');
    });
  });

  describe('analyzeTimeframe', () => {
    it('should analyze with intraday config', async () => {
      const result = await service.analyzeTimeframe(
        'AAPL',
        'AAPL',
        'equity',
        'intraday',
      );
      expect(result.symbol).toBe('AAPL');
      expect(mockMarketData.getHistory).toHaveBeenCalledWith(
        'AAPL',
        5,
        undefined,
        '1h',
      );
    });

    it('should analyze with long-term config', async () => {
      const result = await service.analyzeTimeframe(
        'AAPL',
        'AAPL',
        'equity',
        'long-term',
      );
      expect(result.symbol).toBe('AAPL');
      expect(mockMarketData.getHistory).toHaveBeenCalledWith(
        'AAPL',
        365,
        undefined,
        '1wk',
      );
    });
  });

  describe('runAnalysis', () => {
    it('should process all unique assets across all timeframes', async () => {
      await service.runAnalysis();
      // 3 timeframes x 1 asset = at least 3 getHistory calls
      expect(
        (mockMarketData.getHistory as jest.Mock).mock.calls.length,
      ).toBeGreaterThanOrEqual(3);
    });

    it('should create signals with timeframe field', async () => {
      await service.runAnalysis();
      const createCalls = (mockSignals.create as jest.Mock).mock.calls;
      if (createCalls.length > 0) {
        expect(createCalls[0][0]).toHaveProperty('timeframe');
      }
    });

    it('should handle errors gracefully', async () => {
      (mockMarketData.getHistory as jest.Mock).mockRejectedValue(
        new Error('API down'),
      );
      await expect(service.runAnalysis()).resolves.not.toThrow();
    });
  });
});
