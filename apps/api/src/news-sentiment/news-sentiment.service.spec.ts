import { NewsSentimentService } from './news-sentiment.service';
import type { SignalsService } from '../signals/signals.service';

describe('NewsSentimentService', () => {
  let service: NewsSentimentService;
  let mockSignals: Partial<SignalsService>;

  beforeEach(() => {
    mockSignals = {
      findAll: jest
        .fn()
        .mockResolvedValue([{ asset: 'AAPL', assetClass: 'equity' }]),
      create: jest.fn().mockResolvedValue({}),
    };
    service = new NewsSentimentService(mockSignals as SignalsService);
  });

  describe('fetchHeadlines', () => {
    it('should return empty array when no API key', async () => {
      const headlines = await service.fetchHeadlines('AAPL');
      expect(headlines).toEqual([]);
    });
  });

  describe('analyzeSentiment', () => {
    it('should return HOLD with no headlines', async () => {
      const result = await service.analyzeSentiment('AAPL', 'AAPL');
      expect(result.signal).toBe('HOLD');
      expect(result.headlineCount).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should cache sentiment results', async () => {
      await service.analyzeSentiment('AAPL', 'AAPL');
      const cached = service.getSentiment('AAPL');
      expect(cached).not.toBeNull();
      expect(cached?.asset).toBe('AAPL');
    });
  });

  describe('getSentiment', () => {
    it('should return null for uncached asset', () => {
      expect(service.getSentiment('UNKNOWN')).toBeNull();
    });
  });

  describe('getAllSentiment', () => {
    it('should return all cached sentiments', async () => {
      await service.analyzeSentiment('AAPL', 'AAPL');
      const all = service.getAllSentiment();
      expect(all.length).toBe(1);
    });
  });

  describe('runSentimentAnalysis', () => {
    it('should process equity assets', async () => {
      await service.runSentimentAnalysis();
      expect(mockSignals.findAll).toHaveBeenCalled();
    });

    it('should skip non-equity assets', async () => {
      (mockSignals.findAll as jest.Mock).mockResolvedValue([
        { asset: 'BTC/USD', assetClass: 'crypto' },
      ]);
      await service.runSentimentAnalysis();
      expect(mockSignals.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mockSignals.findAll as jest.Mock).mockRejectedValue(
        new Error('DB down'),
      );
      await expect(service.runSentimentAnalysis()).rejects.toThrow();
    });
  });
});
