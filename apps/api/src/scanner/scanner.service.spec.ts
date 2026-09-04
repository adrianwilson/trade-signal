import { ScannerService } from './scanner.service';
import type { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import type { MarketDataService } from '../market-data/market-data.service';

describe('ScannerService', () => {
  let service: ScannerService;
  let mockTA: Partial<TechnicalAnalysisService>;
  let mockMarket: Partial<MarketDataService>;

  beforeEach(() => {
    mockTA = {
      analyze: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        rsi: 25,
        rsiSignal: 'BUY',
        macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
        macdSignal: 'BUY',
        sma20: 150,
        sma50: 148,
        sma200: 140,
        ema20: 150,
        crossover: { type: 'none', occurred: false },
        smaSignal: 'BUY',
        bollingerPercentB: 0.1,
        bollingerSignal: 'HOLD',
        overallSignal: 'BUY',
      }),
    };
    mockMarket = {
      getQuote: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        price: 175,
        changePercent: 1.5,
        volume: 1000000,
        updatedAt: new Date().toISOString(),
      }),
    };
    service = new ScannerService(
      mockTA as TechnicalAnalysisService,
      mockMarket as MarketDataService,
    );
  });

  describe('scan', () => {
    it('should return opportunities with confidence >= 60', async () => {
      await service.scan();
      const results = await service.getOpportunities();
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.confidence).toBeGreaterThanOrEqual(60);
      }
    });

    it('should sort by confidence descending', async () => {
      await service.scan();
      const results = await service.getOpportunities();
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(
          results[i].confidence,
        );
      }
    });

    it('should include price data', async () => {
      await service.scan();
      const results = await service.getOpportunities();
      expect(results[0].price).toBe(175);
      expect(results[0].changePercent).toBe(1.5);
    });

    it('should filter out HOLD-only results', async () => {
      (mockTA.analyze as jest.Mock).mockResolvedValue({
        symbol: 'AAPL',
        rsi: 50,
        rsiSignal: 'HOLD',
        macd: null,
        macdSignal: 'HOLD',
        sma20: null,
        sma50: null,
        sma200: null,
        ema20: null,
        crossover: { type: 'none', occurred: false },
        smaSignal: 'HOLD',
        bollingerPercentB: 0.5,
        bollingerSignal: 'HOLD',
        overallSignal: 'HOLD',
      });

      await service.scan();
      const results = await service.getOpportunities();
      expect(results.length).toBe(0);
    });

    it('should cache results', async () => {
      await service.scan();
      const first = await service.getOpportunities();
      const second = await service.getOpportunities();
      // analyze called once per scan (40 assets), not again for second getOpportunities
      expect(first).toBe(second);
    });

    it('should handle analysis errors gracefully', async () => {
      (mockTA.analyze as jest.Mock).mockRejectedValue(new Error('API down'));
      await service.scan();
      const results = await service.getOpportunities();
      expect(results.length).toBe(0);
    });
  });
});
