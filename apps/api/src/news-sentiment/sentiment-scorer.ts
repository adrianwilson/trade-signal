const POSITIVE_WORDS = new Set([
  'surge',
  'soar',
  'rally',
  'gain',
  'rise',
  'jump',
  'boost',
  'bullish',
  'upgrade',
  'beat',
  'exceed',
  'profit',
  'growth',
  'record',
  'strong',
  'outperform',
  'breakout',
  'recovery',
  'optimistic',
  'positive',
  'upbeat',
  'momentum',
  'buy',
  'advance',
  'climb',
  'boom',
  'expand',
  'higher',
]);

const NEGATIVE_WORDS = new Set([
  'crash',
  'plunge',
  'drop',
  'fall',
  'decline',
  'loss',
  'sell',
  'bearish',
  'downgrade',
  'miss',
  'warn',
  'risk',
  'fear',
  'weak',
  'underperform',
  'slump',
  'recession',
  'crisis',
  'pessimistic',
  'negative',
  'concern',
  'cut',
  'layoff',
  'default',
  'bankruptcy',
  'fraud',
  'investigation',
  'lower',
]);

export interface SentimentResult {
  score: number; // -1 to +1
  positiveCount: number;
  negativeCount: number;
  wordCount: number;
}

export function scoreHeadline(headline: string): SentimentResult {
  const words = headline
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;

  return { score, positiveCount, negativeCount, wordCount: words.length };
}

export function aggregateSentiment(results: SentimentResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return sum / results.length;
}
