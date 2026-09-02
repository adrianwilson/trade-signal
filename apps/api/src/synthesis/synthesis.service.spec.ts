import { SynthesisService } from './synthesis.service';
import type { SignalsService } from '../signals/signals.service';
import type { Signal, AgentContribution } from '@org/signals';

describe('SynthesisService', () => {
  let service: SynthesisService;
  let mockSignals: Partial<SignalsService>;

  const testSignals: Signal[] = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 80,
      source: 'rsi',
      reasoning: 'RSI at 28 — oversold',
      timestamp: '2026-09-01T10:00:00Z',
    },
    {
      id: '2',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 70,
      source: 'macd',
      reasoning: 'MACD histogram positive',
      timestamp: '2026-09-01T10:00:00Z',
    },
    {
      id: '3',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'SELL',
      confidence: 60,
      source: 'news-sentiment',
      reasoning: 'Negative headlines',
      timestamp: '2026-09-01T10:00:00Z',
    },
    {
      id: '4',
      asset: 'TSLA',
      assetClass: 'equity',
      direction: 'SELL',
      confidence: 90,
      source: 'rsi',
      reasoning: 'RSI at 78 — overbought',
      timestamp: '2026-09-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignals = {
      findAll: jest.fn().mockResolvedValue(testSignals),
    };
    service = new SynthesisService(mockSignals as SignalsService);
  });

  describe('synthesize', () => {
    it('should aggregate signals by asset', async () => {
      const results = await service.synthesize();
      expect(results.length).toBe(2);
      expect(results.map((r) => r.asset).sort()).toEqual(['AAPL', 'TSLA']);
    });

    it('should cache results', async () => {
      await service.synthesize();
      expect(service.getAll().length).toBe(2);
      expect(service.getByAsset('AAPL')).not.toBeNull();
    });
  });

  describe('aggregateSignals', () => {
    it('should produce BUY when majority agrees', () => {
      const result = service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.direction).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include contributions from each source', () => {
      const result = service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.contributions.length).toBe(3);
    });

    it('should include reasoning chain', () => {
      const result = service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.reasoningChain).toContain('AAPL');
      expect(result.reasoningChain).toContain('RSI');
      expect(result.reasoningChain).toContain('MACD');
    });
  });

  describe('calculateWeightedVerdict', () => {
    it('should return HOLD for empty contributions', () => {
      const result = service.calculateWeightedVerdict([]);
      expect(result.direction).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    it('should return BUY when buy signals dominate', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'macd', direction: 'BUY', confidence: 70 },
      ];
      const result = service.calculateWeightedVerdict(contributions);
      expect(result.direction).toBe('BUY');
    });

    it('should return SELL when sell signals dominate', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'SELL', confidence: 90 },
        { source: 'macd', direction: 'SELL', confidence: 80 },
      ];
      const result = service.calculateWeightedVerdict(contributions);
      expect(result.direction).toBe('SELL');
    });
  });

  describe('findAgreements', () => {
    it('should detect buy agreement', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'macd', direction: 'BUY', confidence: 70 },
      ];
      const agreements = service.findAgreements(contributions);
      expect(agreements.length).toBe(1);
      expect(agreements[0]).toContain('RSI');
      expect(agreements[0]).toContain('MACD');
      expect(agreements[0]).toContain('BUY');
    });

    it('should return empty for no agreement', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'macd', direction: 'SELL', confidence: 70 },
      ];
      expect(service.findAgreements(contributions)).toEqual([]);
    });
  });

  describe('findDisagreements', () => {
    it('should detect buy/sell conflict', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'news-sentiment', direction: 'SELL', confidence: 60 },
      ];
      const disagreements = service.findDisagreements(contributions);
      expect(disagreements.length).toBe(1);
      expect(disagreements[0]).toContain('RSI');
      expect(disagreements[0]).toContain('News Sentiment');
    });

    it('should return empty when all agree', () => {
      const contributions: AgentContribution[] = [
        { source: 'rsi', direction: 'BUY', confidence: 80 },
        { source: 'macd', direction: 'BUY', confidence: 70 },
      ];
      expect(service.findDisagreements(contributions)).toEqual([]);
    });
  });

  describe('getByAsset', () => {
    it('should return null for uncached asset', () => {
      expect(service.getByAsset('UNKNOWN')).toBeNull();
    });
  });

  describe('runSynthesis', () => {
    it('should run without errors', async () => {
      await expect(service.runSynthesis()).resolves.not.toThrow();
    });
  });
});
