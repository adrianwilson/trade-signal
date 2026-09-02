import { WatchlistService } from './watchlist.service';
import { ConflictException } from '@nestjs/common';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let mockRepo: {
    findBy: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new WatchlistService(mockRepo as any);
  });

  describe('getByUser', () => {
    it('should return watchlist items for user', async () => {
      mockRepo.findBy.mockResolvedValue([
        {
          id: '1',
          userId: 'u1',
          asset: 'AAPL',
          assetClass: 'equity',
          addedAt: '2026-09-01T10:00:00Z',
        },
      ]);
      const items = await service.getByUser('u1');
      expect(items.length).toBe(1);
      expect(items[0].asset).toBe('AAPL');
    });

    it('should return empty array for no items', async () => {
      const items = await service.getByUser('u1');
      expect(items).toEqual([]);
    });
  });

  describe('add', () => {
    it('should add asset to watchlist', async () => {
      const item = await service.add('u1', 'AAPL', 'equity');
      expect(item.asset).toBe('AAPL');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if already watched', async () => {
      mockRepo.findOneBy.mockResolvedValue({ asset: 'AAPL' });
      await expect(service.add('u1', 'AAPL', 'equity')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete watchlist entry', async () => {
      await service.remove('u1', 'AAPL');
      expect(mockRepo.delete).toHaveBeenCalledWith({
        userId: 'u1',
        asset: 'AAPL',
      });
    });
  });

  describe('isWatched', () => {
    it('should return true if watched', async () => {
      mockRepo.findOneBy.mockResolvedValue({ asset: 'AAPL' });
      expect(await service.isWatched('u1', 'AAPL')).toBe(true);
    });

    it('should return false if not watched', async () => {
      expect(await service.isWatched('u1', 'AAPL')).toBe(false);
    });
  });
});
