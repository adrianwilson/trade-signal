import { SynthesisService } from './synthesis.service';
import type { SignalsService } from '../signals/signals.service';
import type { LlmService } from '../llm/llm.service';
import type { Signal, AgentContribution } from '@org/signals';

describe('SynthesisService', () => {
  let service: SynthesisService;
  let mockSignals: Partial<SignalsService>;
  let mockLlm: Partial<LlmService>;

  const testSignals: Signal[] = [
    {
      id: '1',
      asset: 'AAPL',
      assetClass: 'equity',
      direction: 'BUY',
      confidence: 80,
      source: 'rsi',
      reasoning: 'RSI at 28 — oversold',
      timeframe: 'swing',
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
      timeframe: 'swing',
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
      timeframe: 'swing',
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
      timeframe: 'swing',
      timestamp: '2026-09-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockSignals = {
      findAll: jest.fn().mockResolvedValue(testSignals),
    };
    mockLlm = {
      generateReasoning: jest.fn().mockResolvedValue(null),
    };
    service = new SynthesisService(
      mockSignals as SignalsService,
      mockLlm as LlmService,
    );
  });

  describe('synthesize', () => {
    it('should aggregate signals by asset and timeframe', async () => {
      const results = await service.synthesize();
      expect(results.length).toBe(2);
      expect(results.map((r) => r.asset).sort()).toEqual(['AAPL', 'TSLA']);
      expect(results[0].timeframe).toBe('swing');
    });

    it('should cache results', async () => {
      await service.synthesize();
      expect(service.getAll().length).toBe(2);
      expect(service.getByAsset('AAPL')).not.toBeNull();
    });

    it('should filter by timeframe', async () => {
      await service.synthesize();
      const swing = service.getAll('swing');
      expect(swing.length).toBe(2);
      const intraday = service.getAll('intraday');
      expect(intraday.length).toBe(0);
    });
  });

  describe('aggregateSignals', () => {
    it('should produce BUY when majority agrees', async () => {
      const result = await service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.direction).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include contributions from each source', async () => {
      const result = await service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.contributions.length).toBe(3);
    });

    it('should use template reasoning when LLM returns null', async () => {
      const result = await service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.reasoningChain).toContain('AAPL');
      expect(result.reasoningChain).toContain('RSI');
      expect(result.reasoningChain).toContain('MACD');
    });

    it('should use LLM reasoning when available', async () => {
      (mockLlm.generateReasoning as jest.Mock).mockResolvedValue(
        'AAPL shows strong bullish momentum from technical indicators.',
      );
      const result = await service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.reasoningChain).toBe(
        'AAPL shows strong bullish momentum from technical indicators.',
      );
    });

    it('should include conviction score and label', async () => {
      const result = await service.aggregateSignals(
        'AAPL',
        testSignals.filter((s) => s.asset === 'AAPL'),
      );
      expect(result.conviction).toBeGreaterThanOrEqual(0);
      expect(result.conviction).toBeLessThanOrEqual(100);
      expect(['strong', 'moderate', 'weak', 'late']).toContain(
        result.convictionLabel,
      );
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

  describe('calculateTimeframeAlignment', () => {
    it('should return aligned when all timeframes agree', () => {
      const results = [
        { asset: 'AAPL', direction: 'BUY', timeframe: 'intraday' },
        { asset: 'AAPL', direction: 'BUY', timeframe: 'swing' },
        { asset: 'AAPL', direction: 'BUY', timeframe: 'long-term' },
      ] as import('@org/signals').AggregatedSignal[];
      expect(service.calculateTimeframeAlignment('AAPL', results)).toBe(
        'aligned',
      );
    });

    it('should return divergent when BUY and SELL conflict', () => {
      const results = [
        { asset: 'AAPL', direction: 'BUY', timeframe: 'intraday' },
        { asset: 'AAPL', direction: 'SELL', timeframe: 'swing' },
      ] as import('@org/signals').AggregatedSignal[];
      expect(service.calculateTimeframeAlignment('AAPL', results)).toBe(
        'divergent',
      );
    });

    it('should return mixed when directions differ but no BUY/SELL conflict', () => {
      const results = [
        { asset: 'AAPL', direction: 'BUY', timeframe: 'intraday' },
        { asset: 'AAPL', direction: 'HOLD', timeframe: 'swing' },
      ] as import('@org/signals').AggregatedSignal[];
      expect(service.calculateTimeframeAlignment('AAPL', results)).toBe(
        'mixed',
      );
    });

    it('should return undefined when only one timeframe exists', () => {
      const results = [
        { asset: 'AAPL', direction: 'BUY', timeframe: 'swing' },
      ] as import('@org/signals').AggregatedSignal[];
      expect(
        service.calculateTimeframeAlignment('AAPL', results),
      ).toBeUndefined();
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
