import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let mockRepo: {
    find: jest.Mock;
    countBy: jest.Mock;
    update: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
  };
  let mockWatchlist: { getByUser: jest.Mock };
  let mockSynthesis: { getAll: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      countBy: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockWatchlist = {
      getByUser: jest
        .fn()
        .mockResolvedValue([{ asset: 'AAPL', assetClass: 'equity' }]),
    };
    mockSynthesis = {
      getAll: jest.fn().mockReturnValue([
        {
          asset: 'AAPL',
          direction: 'BUY',
          confidence: 80,
          lastUpdated: '2026-09-02T10:00:00Z',
        },
        {
          asset: 'TSLA',
          direction: 'SELL',
          confidence: 90,
          lastUpdated: '2026-09-02T10:00:00Z',
        },
      ]),
    };
    service = new AlertsService(
      mockRepo as any,
      mockWatchlist as any,
      mockSynthesis as any,
    );
  });

  describe('getByUser', () => {
    it('should return alerts for user', async () => {
      mockRepo.find.mockResolvedValue([
        {
          id: '1',
          asset: 'AAPL',
          direction: 'BUY',
          confidence: 80,
          message: 'AAPL: BUY at 80%',
          read: 0,
          createdAt: '2026-09-02T10:00:00Z',
        },
      ]);
      const alerts = await service.getByUser('u1');
      expect(alerts.length).toBe(1);
      expect(alerts[0].read).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      mockRepo.countBy.mockResolvedValue(3);
      expect(await service.getUnreadCount('u1')).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should update read status', async () => {
      await service.markAsRead('u1', 'alert-1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'alert-1', userId: 'u1' },
        { read: 1 },
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread as read', async () => {
      await service.markAllAsRead('u1');
      expect(mockRepo.update).toHaveBeenCalledWith(
        { userId: 'u1', read: 0 },
        { read: 1 },
      );
    });
  });

  describe('generateAlerts', () => {
    it('should create alerts for watched high-confidence signals', async () => {
      const alerts = await service.generateAlerts('u1');
      expect(alerts.length).toBe(1);
      expect(alerts[0].asset).toBe('AAPL');
      expect(alerts[0].direction).toBe('BUY');
    });

    it('should skip assets not in watchlist', async () => {
      mockWatchlist.getByUser.mockResolvedValue([]);
      const alerts = await service.generateAlerts('u1');
      expect(alerts.length).toBe(0);
    });

    it('should skip low-confidence signals', async () => {
      mockSynthesis.getAll.mockReturnValue([
        {
          asset: 'AAPL',
          direction: 'BUY',
          confidence: 50,
          lastUpdated: '2026-09-02T10:00:00Z',
        },
      ]);
      const alerts = await service.generateAlerts('u1');
      expect(alerts.length).toBe(0);
    });

    it('should skip HOLD signals', async () => {
      mockSynthesis.getAll.mockReturnValue([
        {
          asset: 'AAPL',
          direction: 'HOLD',
          confidence: 90,
          lastUpdated: '2026-09-02T10:00:00Z',
        },
      ]);
      const alerts = await service.generateAlerts('u1');
      expect(alerts.length).toBe(0);
    });

    it('should not duplicate existing alerts', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: 'existing' });
      const alerts = await service.generateAlerts('u1');
      expect(alerts.length).toBe(0);
    });
  });
});
