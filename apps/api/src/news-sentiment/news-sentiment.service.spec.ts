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
    };
    service = new NewsSentimentService(mockSignals as SignalsService);
  });

  describe('fetchHeadlines', () => {
    it('should return empty array when no API key', async () => {
      const headlines = await service.fetchHeadlines('AAPL');
      expect(headlines).toEqual([]);
    });
  });

  describe('getHeadlinesForAsset', () => {
    it('should cache headlines', async () => {
      await service.getHeadlinesForAsset('AAPL', 'AAPL');
      const cached = service.getSentiment('AAPL');
      expect(cached).not.toBeNull();
      expect(cached?.asset).toBe('AAPL');
    });
  });

  describe('getAllSentiment', () => {
    it('should return all cached sentiments', async () => {
      await service.getHeadlinesForAsset('AAPL', 'AAPL');
      const all = service.getAllSentiment();
      expect(all.length).toBe(1);
    });
  });
});
