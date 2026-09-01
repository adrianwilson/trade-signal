import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { AssetPriceEntity } from './asset-price.entity';
import { SignalsService } from '../signals/signals.service';
import { SignalEntity } from '../signals/signal.entity';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quote: jest.fn().mockResolvedValue({
      regularMarketPrice: 150.25,
      regularMarketChangePercent: 1.5,
      regularMarketVolume: 50000000,
    }),
    historical: jest.fn().mockResolvedValue([]),
  },
}));

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [AssetPriceEntity, SignalEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([AssetPriceEntity, SignalEntity]),
        ScheduleModule.forRoot(),
      ],
      controllers: [MarketDataController],
      providers: [MarketDataService, SignalsService],
    }).compile();

    controller = module.get<MarketDataController>(MarketDataController);
    const signalsService = module.get<SignalsService>(SignalsService);
    await signalsService.onModuleInit();
  }, 30000);

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('getQuote', () => {
    it('should return quote for valid symbol', async () => {
      const result = await controller.getQuote('AAPL');
      expect(result.price).toBe(150.25);
    });

    it('should throw NotFoundException when quote is null', async () => {
      const yf = require('yahoo-finance2');
      (yf.default.quote as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(controller.getQuote('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getHistory', () => {
    it('should return history array', async () => {
      const result = await controller.getHistory('AAPL');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept days query parameter', async () => {
      const result = await controller.getHistory('AAPL', '7');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getBulkQuotes', () => {
    it('should return quotes object', async () => {
      const result = await controller.getBulkQuotes();
      expect(typeof result).toBe('object');
    });
  });
});
