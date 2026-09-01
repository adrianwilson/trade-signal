import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataService } from './market-data.service';
import { AssetPriceEntity } from './asset-price.entity';
import { SignalsService } from '../signals/signals.service';
import { SignalEntity } from '../signals/signal.entity';
import { ScheduleModule } from '@nestjs/schedule';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    quote: jest.fn().mockResolvedValue({
      regularMarketPrice: 150.25,
      regularMarketChangePercent: 1.5,
      regularMarketVolume: 50000000,
    }),
    historical: jest.fn().mockResolvedValue([
      {
        date: new Date('2026-01-01'),
        open: 148,
        high: 152,
        low: 147,
        close: 150,
        volume: 45000000,
      },
    ]),
  },
}));

describe('MarketDataService', () => {
  let service: MarketDataService;
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
      providers: [MarketDataService, SignalsService],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    const signalsService = module.get<SignalsService>(SignalsService);
    await signalsService.onModuleInit();
  }, 30000);

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('mapSymbol', () => {
    it('should return equity symbols as-is', () => {
      expect(service.mapSymbol('AAPL', 'equity')).toBe('AAPL');
      expect(service.mapSymbol('TSLA', 'equity')).toBe('TSLA');
    });

    it('should convert crypto symbols', () => {
      expect(service.mapSymbol('BTC/USD', 'crypto')).toBe('BTC-USD');
      expect(service.mapSymbol('ETH/USD', 'crypto')).toBe('ETH-USD');
    });

    it('should convert forex symbols', () => {
      expect(service.mapSymbol('EUR/USD', 'forex')).toBe('EURUSD=X');
      expect(service.mapSymbol('GBP/JPY', 'forex')).toBe('GBPJPY=X');
    });
  });

  describe('getQuote', () => {
    it('should return quote data', async () => {
      const quote = await service.getQuote('AAPL');
      expect(quote).not.toBeNull();
      expect(quote!.price).toBe(150.25);
      expect(quote!.changePercent).toBe(1.5);
      expect(quote!.volume).toBe(50000000);
    });
  });

  describe('getHistory', () => {
    it('should return historical data', async () => {
      const history = await service.getHistory('AAPL', 30);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('date');
      expect(history[0]).toHaveProperty('open');
      expect(history[0]).toHaveProperty('close');
    });
  });

  describe('getQuote error handling', () => {
    it('should return null when Yahoo Finance fails and no cache', async () => {
      const yf = require('yahoo-finance2');
      (yf.default.quote as jest.Mock).mockRejectedValueOnce(
        new Error('API down'),
      );
      const quote = await service.getQuote('INVALID');
      expect(quote).toBeNull();
    });

    it('should return cached data when Yahoo Finance fails', async () => {
      // First call succeeds and caches
      await service.getQuote('AAPL');
      // Second call fails
      const yf = require('yahoo-finance2');
      (yf.default.quote as jest.Mock).mockRejectedValueOnce(
        new Error('API down'),
      );
      const quote = await service.getQuote('AAPL');
      expect(quote).not.toBeNull();
      expect(quote!.price).toBe(150.25);
    });
  });

  describe('getHistory error handling', () => {
    it('should return empty array when Yahoo Finance fails', async () => {
      const yf = require('yahoo-finance2');
      (yf.default.historical as jest.Mock).mockRejectedValueOnce(
        new Error('API down'),
      );
      const history = await service.getHistory('INVALID', 30);
      expect(history).toEqual([]);
    });
  });

  describe('getBulkQuotes', () => {
    it('should return quotes for all signal assets', async () => {
      const quotes = await service.getBulkQuotes();
      expect(Object.keys(quotes).length).toBeGreaterThan(0);
      expect(quotes['AAPL']).toBeDefined();
      expect(quotes['AAPL'].price).toBe(150.25);
    });

    it('should skip assets where getQuote returns null', async () => {
      const yf = require('yahoo-finance2');
      // Fail all quote calls
      (yf.default.quote as jest.Mock).mockRejectedValue(new Error('all fail'));
      const quotes = await service.getBulkQuotes();
      expect(Object.keys(quotes).length).toBe(0);
      // Restore
      (yf.default.quote as jest.Mock).mockResolvedValue({
        regularMarketPrice: 150.25,
        regularMarketChangePercent: 1.5,
        regularMarketVolume: 50000000,
      });
    });
  });
});
