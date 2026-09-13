import { PaperTradingService } from './paper-trading.service';
import { NotFoundException } from '@nestjs/common';

describe('PaperTradingService', () => {
  let service: PaperTradingService;
  let mockAccountRepo: {
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    save: jest.Mock;
  };
  let mockTradeRepo: { findBy: jest.Mock; find: jest.Mock; save: jest.Mock };
  let mockSignals: { findOne: jest.Mock };
  let mockMarketData: { getQuote: jest.Mock; mapSymbol: jest.Mock };

  beforeEach(() => {
    mockAccountRepo = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'acc-1',
        userId: 'u1',
        name: 'Paper Account',
        startingBalance: 100000,
        cashBalance: 100000,
        createdAt: '2026-09-03T10:00:00Z',
      }),
      findBy: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockTradeRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockSignals = {
      findOne: jest.fn().mockResolvedValue({
        id: 's1',
        asset: 'AAPL',
        assetClass: 'equity',
        direction: 'BUY',
        confidence: 80,
        source: 'rsi',
        reasoning: 'RSI oversold',
      }),
    };
    mockMarketData = {
      getQuote: jest.fn().mockResolvedValue({ price: 150, changePercent: 1.5 }),
      mapSymbol: jest.fn().mockImplementation((a: string) => a),
    };
    service = new PaperTradingService(
      mockAccountRepo as any,
      mockTradeRepo as any,
      mockSignals as any,
      mockMarketData as any,
    );
  });

  describe('createAccount', () => {
    it('should create account with $100K', async () => {
      const account = await service.createAccount('u1');
      expect(account.startingBalance).toBe(100000);
      expect(account.cashBalance).toBe(100000);
      expect(mockAccountRepo.save).toHaveBeenCalled();
    });
  });

  describe('followSignal', () => {
    it('should create trade based on signal', async () => {
      const trade = await service.followSignal('acc-1', 's1');
      expect(trade.asset).toBe('AAPL');
      expect(trade.side).toBe('buy');
      expect(trade.entryPrice).toBe(150);
      expect(trade.status).toBe('open');
      expect(trade.signalSource).toBe('rsi');
      expect(trade.confidence).toBe(80);
    });

    it('should size position by confidence (80% = 10% of cash)', async () => {
      const trade = await service.followSignal('acc-1', 's1');
      // 10% of 100K = 10K, at $150 = 66 shares
      expect(trade.quantity).toBe(66);
    });

    it('should deduct from cash balance', async () => {
      await service.followSignal('acc-1', 's1');
      const savedAccount = mockAccountRepo.save.mock.calls[0][0];
      expect(savedAccount.cashBalance).toBeLessThan(100000);
    });

    it('should throw if signal not found', async () => {
      mockSignals.findOne.mockResolvedValue(null);
      await expect(service.followSignal('acc-1', 'bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('followSignal stop-loss/take-profit defaults', () => {
    it('should set SL at -5% and TP at +10% for BUY', async () => {
      const trade = await service.followSignal('acc-1', 's1');
      expect(trade.stopLoss).toBe(142.5); // 150 * 0.95
      expect(trade.takeProfit).toBe(165); // 150 * 1.10
    });

    it('should set SL at +5% and TP at -10% for SELL', async () => {
      mockSignals.findOne.mockResolvedValue({
        id: 's2',
        asset: 'AAPL',
        assetClass: 'equity',
        direction: 'SELL',
        confidence: 80,
        source: 'rsi',
      });
      const trade = await service.followSignal('acc-1', 's2');
      expect(trade.stopLoss).toBe(157.5); // 150 * 1.05
      expect(trade.takeProfit).toBe(135); // 150 * 0.90
    });
  });

  describe('closePosition', () => {
    it('should close open trades and calculate P&L', async () => {
      mockTradeRepo.findBy.mockResolvedValue([
        {
          id: 't1',
          accountId: 'acc-1',
          asset: 'AAPL',
          assetClass: 'equity',
          side: 'buy',
          quantity: 10,
          entryPrice: 140,
          status: 'open',
        },
      ]);
      mockMarketData.getQuote.mockResolvedValue({ price: 155 });
      const trades = await service.closePosition('acc-1', 'AAPL');
      expect(trades[0].status).toBe('closed');
      expect(trades[0].pnl).toBe(150); // (155-140)*10
      expect(trades[0].closeReason).toBe('manual');
    });
  });

  describe('checkStopLossTakeProfit', () => {
    it('should close position at stop-loss', async () => {
      mockTradeRepo.findBy.mockResolvedValue([
        {
          id: 't1',
          accountId: 'acc-1',
          asset: 'AAPL',
          assetClass: 'equity',
          side: 'buy',
          quantity: 10,
          entryPrice: 150,
          stopLoss: 142.5,
          takeProfit: 165,
          status: 'open',
        },
      ]);
      mockMarketData.getQuote.mockResolvedValue({ price: 140 });
      await service.checkStopLossTakeProfit();
      // closePosition should have been called, which calls findBy again + save
      expect(mockTradeRepo.save).toHaveBeenCalled();
    });

    it('should close position at take-profit', async () => {
      mockTradeRepo.findBy.mockResolvedValue([
        {
          id: 't1',
          accountId: 'acc-1',
          asset: 'AAPL',
          assetClass: 'equity',
          side: 'buy',
          quantity: 10,
          entryPrice: 150,
          stopLoss: 142.5,
          takeProfit: 165,
          status: 'open',
        },
      ]);
      mockMarketData.getQuote.mockResolvedValue({ price: 170 });
      await service.checkStopLossTakeProfit();
      expect(mockTradeRepo.save).toHaveBeenCalled();
    });

    it('should skip trades without SL/TP', async () => {
      mockTradeRepo.findBy.mockResolvedValue([
        {
          id: 't1',
          accountId: 'acc-1',
          asset: 'AAPL',
          assetClass: 'equity',
          side: 'buy',
          quantity: 10,
          entryPrice: 150,
          stopLoss: null,
          takeProfit: null,
          status: 'open',
        },
      ]);
      await service.checkStopLossTakeProfit();
      expect(mockMarketData.getQuote).not.toHaveBeenCalled();
    });
  });

  describe('getPerformance', () => {
    it('should calculate win rate', async () => {
      mockTradeRepo.findBy.mockResolvedValue([
        { status: 'closed', pnl: 100, pnlPercent: 5, signalSource: 'rsi' },
        { status: 'closed', pnl: -50, pnlPercent: -2, signalSource: 'rsi' },
        { status: 'closed', pnl: 200, pnlPercent: 10, signalSource: 'macd' },
      ]);
      const perf = await service.getPerformance('acc-1');
      expect(perf.winRate).toBeCloseTo(0.667, 2);
      expect(perf.closedTrades).toBe(3);
      expect(perf.bySource['rsi'].trades).toBe(2);
      expect(perf.bySource['macd'].trades).toBe(1);
    });
  });
});
