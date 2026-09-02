import { OutcomesService } from './outcomes.service';

describe('OutcomesService', () => {
  let service: OutcomesService;
  let mockRepo: {
    find: jest.Mock;
    findBy: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
  };
  let mockSignals: { findAll: jest.Mock };
  let mockMarketData: { getHistory: jest.Mock; mapSymbol: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockSignals = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 's1',
          asset: 'AAPL',
          assetClass: 'equity',
          direction: 'BUY',
          confidence: 80,
          source: 'rsi',
          timestamp: '2026-08-01T10:00:00Z',
        },
      ]),
    };
    mockMarketData = {
      getHistory: jest
        .fn()
        .mockResolvedValue([{ close: 155, date: '2026-09-01' }]),
      mapSymbol: jest.fn().mockImplementation((a: string) => a),
    };
    service = new OutcomesService(
      mockRepo as any,
      mockSignals as any,
      mockMarketData as any,
    );
  });

  describe('getLeaderboard', () => {
    it('should return empty for no outcomes', async () => {
      const result = await service.getLeaderboard();
      expect(result).toEqual([]);
    });

    it('should rank agents by accuracy', async () => {
      mockRepo.find.mockResolvedValue([
        { source: 'rsi', outcome: 'correct', assetClass: 'equity' },
        { source: 'rsi', outcome: 'correct', assetClass: 'equity' },
        { source: 'macd', outcome: 'incorrect', assetClass: 'equity' },
        { source: 'macd', outcome: 'correct', assetClass: 'equity' },
      ]);
      const result = await service.getLeaderboard();
      expect(result[0].source).toBe('rsi');
      expect(result[0].accuracyRate).toBe(1);
      expect(result[0].rank).toBe(1);
      expect(result[1].source).toBe('macd');
      expect(result[1].accuracyRate).toBe(0.5);
    });
  });

  describe('getAccuracyByAssetClass', () => {
    it('should group by asset class', async () => {
      mockRepo.find.mockResolvedValue([
        { source: 'rsi', outcome: 'correct', assetClass: 'equity' },
        { source: 'rsi', outcome: 'incorrect', assetClass: 'crypto' },
      ]);
      const result = await service.getAccuracyByAssetClass();
      expect(result['equity'].rate).toBe(1);
      expect(result['crypto'].rate).toBe(0);
    });
  });

  describe('recordSignalOutcomes', () => {
    it('should record outcomes for non-manual signals', async () => {
      const count = await service.recordSignalOutcomes();
      expect(count).toBe(3); // 3 evaluation days
      expect(mockRepo.save).toHaveBeenCalledTimes(3);
    });

    it('should skip manual signals', async () => {
      mockSignals.findAll.mockResolvedValue([
        {
          id: 's1',
          asset: 'AAPL',
          direction: 'BUY',
          source: 'manual',
          assetClass: 'equity',
          timestamp: '2026-08-01T10:00:00Z',
        },
      ]);
      const count = await service.recordSignalOutcomes();
      expect(count).toBe(0);
    });

    it('should skip HOLD signals', async () => {
      mockSignals.findAll.mockResolvedValue([
        {
          id: 's1',
          asset: 'AAPL',
          direction: 'HOLD',
          source: 'rsi',
          assetClass: 'equity',
          timestamp: '2026-08-01T10:00:00Z',
        },
      ]);
      const count = await service.recordSignalOutcomes();
      expect(count).toBe(0);
    });

    it('should not duplicate existing outcomes', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: 'existing' });
      const count = await service.recordSignalOutcomes();
      expect(count).toBe(0);
    });
  });

  describe('evaluatePendingOutcomes', () => {
    it('should evaluate outcomes past their evaluation date', async () => {
      const pastDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      mockRepo.findBy.mockResolvedValue([
        {
          id: 'o1',
          asset: 'AAPL',
          assetClass: 'equity',
          direction: 'BUY',
          priceAtSignal: 150,
          evaluationDays: 1,
          outcome: 'pending',
          signalTimestamp: pastDate,
        },
      ]);
      const count = await service.evaluatePendingOutcomes();
      expect(count).toBe(1);
    });

    it('should mark BUY correct when price goes up', async () => {
      const pastDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const outcome = {
        id: 'o1',
        asset: 'AAPL',
        assetClass: 'equity',
        direction: 'BUY',
        priceAtSignal: 150,
        evaluationDays: 1,
        outcome: 'pending',
        signalTimestamp: pastDate,
        priceAfterDays: null,
        evaluatedAt: null,
      };
      mockRepo.findBy.mockResolvedValue([outcome]);
      mockMarketData.getHistory.mockResolvedValue([{ close: 160 }]);
      await service.evaluatePendingOutcomes();
      expect(outcome.outcome).toBe('correct');
    });

    it('should skip outcomes not yet due', async () => {
      const futureDate = new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      mockRepo.findBy.mockResolvedValue([
        {
          id: 'o1',
          direction: 'BUY',
          priceAtSignal: 150,
          evaluationDays: 7,
          outcome: 'pending',
          signalTimestamp: futureDate,
        },
      ]);
      const count = await service.evaluatePendingOutcomes();
      expect(count).toBe(0);
    });
  });
});
