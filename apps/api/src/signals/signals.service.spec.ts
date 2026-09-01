import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalsService } from './signals.service';
import { SignalEntity } from './signal.entity';

describe('SignalsService', () => {
  let service: SignalsService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [SignalEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([SignalEntity]),
      ],
      providers: [SignalsService],
    }).compile();

    service = module.get<SignalsService>(SignalsService);
    await service.onModuleInit();
  }, 30000);

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('findAll', () => {
    it('should return seeded signals', async () => {
      const signals = await service.findAll();
      expect(signals.length).toBeGreaterThanOrEqual(5);
      expect(signals[0]).toHaveProperty('id');
      expect(signals[0]).toHaveProperty('asset');
      expect(signals[0]).toHaveProperty('direction');
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', async () => {
      const signal = await service.findOne('1');
      expect(signal).not.toBeNull();
      expect(signal!.id).toBe('1');
      expect(signal!.asset).toBe('AAPL');
    });

    it('should return null for unknown id', async () => {
      const signal = await service.findOne('nonexistent');
      expect(signal).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new signal and return it', async () => {
      const input = {
        asset: 'NVDA',
        assetClass: 'equity' as const,
        direction: 'BUY' as const,
        confidence: 90,
        notes: 'Strong earnings beat',
      };
      const created = await service.create(input);
      expect(created.id).toBeDefined();
      expect(created.asset).toBe('NVDA');
      expect(created.direction).toBe('BUY');
      expect(created.confidence).toBe(90);
      expect(created.source).toBe('manual');
      expect(created.timestamp).toBeDefined();
    });

    it('should persist the created signal', async () => {
      const before = (await service.findAll()).length;
      await service.create({
        asset: 'NVDA',
        assetClass: 'equity',
        direction: 'BUY',
        confidence: 90,
      });
      const after = (await service.findAll()).length;
      expect(after).toBe(before + 1);
    });
  });

  describe('onModuleInit', () => {
    it('should not duplicate seeds on second init', async () => {
      await service.onModuleInit();
      const signals = await service.findAll();
      expect(signals.length).toBe(6);
    });
  });
});
