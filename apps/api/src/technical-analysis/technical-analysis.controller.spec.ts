import { TechnicalAnalysisController } from './technical-analysis.controller';
import { TechnicalAnalysisService } from './technical-analysis.service';

describe('TechnicalAnalysisController', () => {
  let controller: TechnicalAnalysisController;
  let mockService: Partial<TechnicalAnalysisService>;

  beforeEach(() => {
    mockService = {
      analyzeTimeframe: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        rsi: 45.5,
        rsiSignal: 'HOLD',
        macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
        macdSignal: 'BUY',
        overallSignal: 'HOLD',
      }),
    };
    controller = new TechnicalAnalysisController(
      mockService as TechnicalAnalysisService,
    );
  });

  describe('analyze', () => {
    it('should return analysis result', async () => {
      const result = await controller.analyze('AAPL');
      expect(result.symbol).toBe('AAPL');
      expect(result.rsi).toBe(45.5);
      expect(mockService.analyzeTimeframe).toHaveBeenCalledWith(
        'AAPL',
        'AAPL',
        'equity',
        'swing',
      );
    });

    it('should pass timeframe query param', async () => {
      const result = await controller.analyze('AAPL', 'intraday');
      expect(result.symbol).toBe('AAPL');
      expect(mockService.analyzeTimeframe).toHaveBeenCalledWith(
        'AAPL',
        'AAPL',
        'equity',
        'intraday',
      );
    });
  });
});
