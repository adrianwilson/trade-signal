import { scoreHeadline, aggregateSentiment } from './sentiment-scorer';

describe('Sentiment Scorer', () => {
  describe('scoreHeadline', () => {
    it('should return positive score for bullish headline', () => {
      const result = scoreHeadline('Stock surges on strong earnings beat');
      expect(result.score).toBeGreaterThan(0);
      expect(result.positiveCount).toBeGreaterThan(0);
    });

    it('should return negative score for bearish headline', () => {
      const result = scoreHeadline(
        'Market crash fears as recession risk grows',
      );
      expect(result.score).toBeLessThan(0);
      expect(result.negativeCount).toBeGreaterThan(0);
    });

    it('should return 0 for neutral headline', () => {
      const result = scoreHeadline('Company releases quarterly report');
      expect(result.score).toBe(0);
      expect(result.positiveCount).toBe(0);
      expect(result.negativeCount).toBe(0);
    });

    it('should detect both positive and negative words', () => {
      const result = scoreHeadline('Stock rally despite risk concerns');
      expect(result.positiveCount).toBeGreaterThan(0);
      expect(result.negativeCount).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = scoreHeadline('');
      expect(result.score).toBe(0);
    });

    it('should be case-insensitive', () => {
      const result = scoreHeadline('SURGE in BULLISH momentum');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('aggregateSentiment', () => {
    it('should average scores', () => {
      const results = [
        { score: 1, positiveCount: 1, negativeCount: 0, wordCount: 5 },
        { score: -1, positiveCount: 0, negativeCount: 1, wordCount: 5 },
      ];
      expect(aggregateSentiment(results)).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(aggregateSentiment([])).toBe(0);
    });

    it('should return positive for mostly positive results', () => {
      const results = [
        { score: 1, positiveCount: 2, negativeCount: 0, wordCount: 5 },
        { score: 1, positiveCount: 1, negativeCount: 0, wordCount: 5 },
        { score: -0.5, positiveCount: 0, negativeCount: 1, wordCount: 5 },
      ];
      expect(aggregateSentiment(results)).toBeGreaterThan(0);
    });
  });
});
