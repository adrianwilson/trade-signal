import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
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
    service = new PortfolioService(mockRepo as any);
  });

  describe('getByUser', () => {
    it('should return positions for user', async () => {
      mockRepo.findBy.mockResolvedValue([
        {
          id: '1',
          asset: 'AAPL',
          assetClass: 'equity',
          quantity: 10,
          avgPrice: 150,
          addedAt: '2026-09-01',
        },
      ]);
      const positions = await service.getByUser('u1');
      expect(positions.length).toBe(1);
      expect(positions[0].asset).toBe('AAPL');
    });
  });

  describe('addPosition', () => {
    it('should create new position', async () => {
      const pos = await service.addPosition('u1', 'AAPL', 'equity', 10, 150);
      expect(pos.asset).toBe('AAPL');
      expect(pos.quantity).toBe(10);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should average in on existing position', async () => {
      mockRepo.findOneBy.mockResolvedValue({
        id: '1',
        userId: 'u1',
        asset: 'AAPL',
        assetClass: 'equity',
        quantity: 10,
        avgPrice: 100,
        addedAt: '2026-09-01',
      });
      const pos = await service.addPosition('u1', 'AAPL', 'equity', 10, 200);
      expect(pos.quantity).toBe(20);
      expect(pos.avgPrice).toBe(150); // weighted average
    });
  });

  describe('importCsv', () => {
    it('should parse CSV and create positions', async () => {
      const csv =
        'asset,quantity,avgPrice,assetClass\nAAPL,10,150,equity\nTSLA,5,300,equity';
      const results = await service.importCsv('u1', csv);
      expect(results.length).toBe(2);
    });

    it('should skip header row', async () => {
      const csv = 'asset,quantity,avgPrice\nAAPL,10,150';
      const results = await service.importCsv('u1', csv);
      expect(results.length).toBe(1);
      expect(results[0].asset).toBe('AAPL');
    });

    it('should skip invalid rows', async () => {
      const csv = 'AAPL,invalid,150';
      const results = await service.importCsv('u1', csv);
      expect(results.length).toBe(0);
    });
  });

  describe('removePosition', () => {
    it('should delete position', async () => {
      await service.removePosition('u1', 'AAPL');
      expect(mockRepo.delete).toHaveBeenCalledWith({
        userId: 'u1',
        asset: 'AAPL',
      });
    });
  });
});
