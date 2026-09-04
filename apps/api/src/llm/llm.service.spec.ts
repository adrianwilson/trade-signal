import { LlmService, SynthesisPromptData } from './llm.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LlmService', () => {
  let service: LlmService;

  const testData: SynthesisPromptData = {
    asset: 'AAPL',
    assetClass: 'equity',
    direction: 'BUY',
    confidence: 75,
    conviction: 80,
    convictionLabel: 'strong',
    contributions: [
      {
        source: 'rsi',
        direction: 'BUY',
        confidence: 80,
        reasoning: 'RSI at 28',
      },
      {
        source: 'macd',
        direction: 'BUY',
        confidence: 70,
        reasoning: 'MACD bullish',
      },
      {
        source: 'news-sentiment',
        direction: 'SELL',
        confidence: 60,
        reasoning: 'Negative headlines',
      },
    ],
    agreements: ['RSI and MACD agree: BUY'],
    disagreements: ['RSI, MACD say BUY while News Sentiment says SELL'],
    timeframe: 'swing',
    timeframeAlignment: 'mixed',
  };

  beforeEach(() => {
    mockFetch.mockReset();
    service = new LlmService();
  });

  describe('when Ollama is not running', () => {
    beforeEach(() => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
    });

    it('should return null', async () => {
      const result = await service.generateReasoning(testData);
      expect(result).toBeNull();
    });

    it('should not call Ollama again after first failure', async () => {
      await service.generateReasoning(testData);
      await service.generateReasoning(testData);
      // First call: checkOllama (1 fetch), second call: skipped
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('when Ollama is running', () => {
    beforeEach(() => {
      // Mock checkOllama success, then mock generate
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // /api/tags
        .mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              response: 'AAPL shows strong bullish momentum.',
            }),
        });
    });

    it('should return LLM text on success', async () => {
      const result = await service.generateReasoning(testData);
      expect(result).toBe('AAPL shows strong bullish momentum.');
    });

    it('should cache response on second call', async () => {
      const first = await service.generateReasoning(testData);
      const second = await service.generateReasoning(testData);
      expect(first).toBe('AAPL shows strong bullish momentum.');
      expect(second).toBe('AAPL shows strong bullish momentum.');
      // 1 checkOllama + 1 generate = 2 total (second is cached)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return null on API error', async () => {
      mockFetch
        .mockReset()
        .mockResolvedValueOnce({ ok: true }) // /api/tags
        .mockResolvedValueOnce({ ok: false, status: 500 }); // /api/generate

      service.resetAvailability();
      const result = await service.generateReasoning(testData);
      expect(result).toBeNull();
    });

    it('should clear cache', async () => {
      await service.generateReasoning(testData);
      service.clearCache();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'New response.' }),
      });

      const result = await service.generateReasoning(testData);
      expect(result).toBe('New response.');
    });
  });

  describe('buildSynthesisPrompt', () => {
    it('should include asset and direction', () => {
      const prompt = service.buildSynthesisPrompt(testData);
      expect(prompt).toContain('AAPL');
      expect(prompt).toContain('BUY');
      expect(prompt).toContain('75%');
    });

    it('should include contributions', () => {
      const prompt = service.buildSynthesisPrompt(testData);
      expect(prompt).toContain('rsi');
      expect(prompt).toContain('macd');
      expect(prompt).toContain('news-sentiment');
    });

    it('should include timeframe and alignment', () => {
      const prompt = service.buildSynthesisPrompt(testData);
      expect(prompt).toContain('swing');
      expect(prompt).toContain('mixed');
    });

    it('should include agreements and disagreements', () => {
      const prompt = service.buildSynthesisPrompt(testData);
      expect(prompt).toContain('RSI and MACD agree: BUY');
      expect(prompt).toContain('News Sentiment says SELL');
    });
  });
});
