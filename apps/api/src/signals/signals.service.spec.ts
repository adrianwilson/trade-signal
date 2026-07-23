import { SignalsService } from './signals.service';

describe('SignalsService', () => {
  let service: SignalsService;

  beforeEach(() => {
    service = new SignalsService();
  });

  describe('findAll', () => {
    it('should return seeded signals', () => {
      const signals = service.findAll();
      expect(signals.length).toBeGreaterThanOrEqual(5);
      expect(signals[0]).toHaveProperty('id');
      expect(signals[0]).toHaveProperty('asset');
      expect(signals[0]).toHaveProperty('direction');
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', () => {
      const signal = service.findOne('1');
      expect(signal).toBeDefined();
      expect(signal!.id).toBe('1');
      expect(signal!.asset).toBe('AAPL');
    });

    it('should return undefined for unknown id', () => {
      const signal = service.findOne('nonexistent');
      expect(signal).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new signal and return it', () => {
      const input = {
        asset: 'NVDA',
        assetClass: 'equity' as const,
        direction: 'BUY' as const,
        confidence: 90,
        notes: 'Strong earnings beat',
      };
      const created = service.create(input);
      expect(created.id).toBeDefined();
      expect(created.asset).toBe('NVDA');
      expect(created.direction).toBe('BUY');
      expect(created.confidence).toBe(90);
      expect(created.source).toBe('manual');
      expect(created.timestamp).toBeDefined();
    });

    it('should add the created signal to the list', () => {
      const before = service.findAll().length;
      service.create({
        asset: 'NVDA',
        assetClass: 'equity',
        direction: 'BUY',
        confidence: 90,
      });
      expect(service.findAll().length).toBe(before + 1);
    });
  });
});
