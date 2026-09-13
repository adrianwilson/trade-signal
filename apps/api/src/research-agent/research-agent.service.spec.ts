import { ResearchAgentService } from './research-agent.service';
import type { LlmService } from '../llm/llm.service';
import type { NewsSentimentService } from '../news-sentiment/news-sentiment.service';
import type { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import type { MarketDataService } from '../market-data/market-data.service';
import type { SignalsService } from '../signals/signals.service';

describe('ResearchAgentService', () => {
  let service: ResearchAgentService;
  let mockLlm: Partial<LlmService>;
  let mockNews: Partial<NewsSentimentService>;
  let mockTA: Partial<TechnicalAnalysisService>;
  let mockMarket: Partial<MarketDataService>;
  let mockSignals: Partial<SignalsService>;

  beforeEach(() => {
    mockLlm = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          direction: 'BUY',
          confidence: 78,
          reasoning:
            'RSI oversold at 28 combined with positive earnings headlines suggests a bounce.',
        }),
      ),
      isAvailable: jest.fn().mockReturnValue(true),
    };
    mockNews = {
      fetchHeadlines: jest.fn().mockResolvedValue([
        {
          title: 'AAPL reports record earnings',
          source: 'Reuters',
          url: 'https://example.com',
          publishedAt: '2026-09-13T10:00:00Z',
        },
      ]),
    };
    mockTA = {
      analyze: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        rsi: 28,
        rsiSignal: 'BUY',
        macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
        macdSignal: 'BUY',
        sma20: 150,
        sma50: 148,
        sma200: 140,
        ema20: 150,
        crossover: { type: 'none', occurred: false },
        smaSignal: 'HOLD',
        bollingerPercentB: 0.15,
        bollingerSignal: 'BUY',
        overallSignal: 'BUY',
      }),
    };
    mockMarket = {
      getQuote: jest.fn().mockResolvedValue({ price: 175, changePercent: 1.5 }),
      mapSymbol: jest.fn().mockImplementation((a: string) => a),
    };
    mockSignals = {
      create: jest.fn().mockResolvedValue({}),
    };

    service = new ResearchAgentService(
      mockLlm as LlmService,
      mockNews as NewsSentimentService,
      mockTA as TechnicalAnalysisService,
      mockMarket as MarketDataService,
      mockSignals as SignalsService,
    );
  });

  describe('analyzeAsset', () => {
    it('should create agent signal from LLM response', async () => {
      const result = await service.analyzeAsset('AAPL', 'equity');
      expect(result).toBe(true);
      expect(mockSignals.create).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: 'AAPL',
          assetClass: 'equity',
          direction: 'BUY',
          confidence: 78,
          source: 'agent',
        }),
      );
    });

    it('should skip when LLM returns null', async () => {
      (mockLlm.generate as jest.Mock).mockResolvedValue(null);
      const result = await service.analyzeAsset('AAPL', 'equity');
      expect(result).toBe(false);
      expect(mockSignals.create).not.toHaveBeenCalled();
    });

    it('should skip when LLM returns invalid JSON', async () => {
      (mockLlm.generate as jest.Mock).mockResolvedValue(
        'I think AAPL is a good buy',
      );
      const result = await service.analyzeAsset('AAPL', 'equity');
      expect(result).toBe(false);
      expect(mockSignals.create).not.toHaveBeenCalled();
    });

    it('should skip when no headlines and no TA data', async () => {
      (mockNews.fetchHeadlines as jest.Mock).mockResolvedValue([]);
      (mockTA.analyze as jest.Mock).mockRejectedValue(new Error('fail'));
      const result = await service.analyzeAsset('AAPL', 'equity');
      expect(result).toBe(false);
    });

    it('should work with only TA data (no headlines)', async () => {
      (mockNews.fetchHeadlines as jest.Mock).mockResolvedValue([]);
      const result = await service.analyzeAsset('AAPL', 'equity');
      expect(result).toBe(true);
      expect(mockLlm.generate).toHaveBeenCalled();
    });
  });

  describe('parseResponse', () => {
    it('should parse valid JSON', () => {
      const result = service.parseResponse(
        '{"direction": "SELL", "confidence": 85, "reasoning": "Bearish divergence"}',
      );
      expect(result).toEqual({
        direction: 'SELL',
        confidence: 85,
        reasoning: 'Bearish divergence',
      });
    });

    it('should extract JSON from surrounding text', () => {
      const result = service.parseResponse(
        'Here is my analysis: {"direction": "BUY", "confidence": 60, "reasoning": "test"} end',
      );
      expect(result?.direction).toBe('BUY');
    });

    it('should clamp confidence to 0-100', () => {
      const result = service.parseResponse(
        '{"direction": "BUY", "confidence": 150, "reasoning": "test"}',
      );
      expect(result?.confidence).toBe(100);
    });

    it('should reject invalid direction', () => {
      const result = service.parseResponse(
        '{"direction": "STRONG_BUY", "confidence": 80, "reasoning": "test"}',
      );
      expect(result).toBeNull();
    });

    it('should reject non-JSON', () => {
      const result = service.parseResponse('AAPL looks bullish');
      expect(result).toBeNull();
    });
  });

  describe('buildResearchPrompt', () => {
    it('should include all data sections', () => {
      const prompt = service.buildResearchPrompt(
        'AAPL',
        'equity',
        [
          {
            title: 'Test headline',
            source: 'Reuters',
            url: '',
            publishedAt: '2026-09-13T10:00:00Z',
          },
        ],
        {
          symbol: 'AAPL',
          rsi: 28,
          rsiSignal: 'BUY',
          macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
          macdSignal: 'BUY',
          sma20: 150,
          sma50: 148,
          sma200: 140,
          ema20: 150,
          crossover: { type: 'none', occurred: false },
          smaSignal: 'HOLD',
          bollingerPercentB: 0.15,
          bollingerSignal: 'BUY',
          overallSignal: 'BUY',
        },
        {
          symbol: 'AAPL',
          price: 175,
          changePercent: 1.5,
          volume: null,
          updatedAt: '',
        },
      );

      expect(prompt).toContain('AAPL');
      expect(prompt).toContain('$175.00');
      expect(prompt).toContain('RSI(14): 28.0');
      expect(prompt).toContain('Test headline');
      expect(prompt).toContain('"direction"');
    });
  });

  describe('runResearch', () => {
    it('should skip when Ollama unavailable', async () => {
      (mockLlm.isAvailable as jest.Mock).mockReturnValue(false);
      await service.runResearch();
      expect(mockLlm.generate).not.toHaveBeenCalled();
    });
  });
});
