import { TechnicalAnalysisService } from './technical-analysis.service';
import type { MarketDataService } from '../market-data/market-data.service';
import type { SignalsService } from '../signals/signals.service';

describe('TechnicalAnalysisService', () => {
  let service: TechnicalAnalysisService;
  let mockMarketData: Partial<MarketDataService>;
  let mockSignals: Partial<SignalsService>;

  // 40 close prices that trend up then down
  const mockHistory = Array.from({ length: 40 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i * 0.5,
    high: 101 + i * 0.5,
    low: 99 + i * 0.5,
    close: i < 20 ? 100 + i : 120 - (i - 20) * 0.5,
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
    it('should return RSI and MACD values', async () => {
      const result = await service.analyze('AAPL', 'AAPL', 'equity');
      expect(result.symbol).toBe('AAPL');
      expect(result.rsi).not.toBeNull();
      expect(typeof result.rsi).toBe('number');
      expect(result.rsiSignal).toBeDefined();
      expect(result.macd).not.toBeNull();
      expect(result.macdSignal).toBeDefined();
      expect(result.overallSignal).toBeDefined();
    });

    it('should return HOLD when not enough data', async () => {
      (mockMarketData.getHistory as jest.Mock).mockResolvedValue([]);
      const result = await service.analyze('AAPL', 'AAPL', 'equity');
      expect(result.rsi).toBeNull();
      expect(result.rsiSignal).toBe('HOLD');
      expect(result.macd).toBeNull();
      expect(result.macdSignal).toBe('HOLD');
    });
  });

  describe('runAnalysis', () => {
    it('should process all unique assets', async () => {
      await service.runAnalysis();
      expect(mockMarketData.getHistory).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockMarketData.getHistory as jest.Mock).mockRejectedValue(
        new Error('API down'),
      );
      await expect(service.runAnalysis()).resolves.not.toThrow();
    });
  });
});
