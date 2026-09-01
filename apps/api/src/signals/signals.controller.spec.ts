import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';
import { SignalEntity } from './signal.entity';

describe('SignalsController', () => {
  let controller: SignalsController;
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
      controllers: [SignalsController],
      providers: [SignalsService],
    }).compile();

    controller = module.get<SignalsController>(SignalsController);
    service = module.get<SignalsService>(SignalsService);
    await service.onModuleInit();
  }, 30000);

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('findAll', () => {
    it('should return all signals', async () => {
      const result = await controller.findAll();
      expect(result.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', async () => {
      const result = await controller.findOne('1');
      expect(result.id).toBe('1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new signal', async () => {
      const input = {
        asset: 'GOOG',
        assetClass: 'equity' as const,
        direction: 'SELL' as const,
        confidence: 65,
      };
      const result = await controller.create(input);
      expect(result.asset).toBe('GOOG');
      expect(result.direction).toBe('SELL');
      expect(result.id).toBeDefined();
    });
  });
});
