# Feature: AI Research Agent — Holistic Signal Generation

## Metadata

- **issue_number:** an
- **adw_id:** AI
- **issue_json:** Research

## Feature Description

Create an AI Research Agent that combines news headlines, technical analysis results, and price data into a single context and asks the local LLM to reason across all of them to produce a structured trading signal. Unlike the current system where the LLM just rewrites bullet points, this agent gives the LLM the _full picture_ — headlines, RSI, MACD, Bollinger, SMA crossovers, price change, and volume — and asks it to reason holistically about what the combined data means.

The agent creates signals with `source: 'agent'` that feed into synthesis alongside individual technical indicators. The LLM can now say things the rule-based system can't: "RSI shows oversold but the lawsuit headlines suggest the dip has fundamental cause — HOLD rather than bottom-fish" or "MACD bearish crossover aligns with negative earnings guidance — high-conviction SELL."

## User Story

As a trader
I want an AI agent that reasons across news AND technical data together
So that I get signals informed by the full context, not just isolated indicators

## Problem Statement

The current system analyzes news and technicals in separate silos. RSI says BUY (oversold), but the stock is oversold because of a fraud investigation — the keyword scorer can't connect these dots. Technical indicators are context-free math; news sentiment is context-free word counting. Nobody reasons across both to produce an informed signal.

## Solution Statement

1. Add a general `generate(prompt)` method to `LlmService`.
2. Create a `ResearchAgentService` that:
   - For each asset: fetches headlines (Finnhub), runs technical analysis (reuse `TechnicalAnalysisService`), and gets current quote
   - Builds a comprehensive prompt with ALL of this data
   - Asks the LLM for a JSON response: `{ "direction": "BUY"|"SELL"|"HOLD", "confidence": 0-100, "reasoning": "..." }`
   - Parses and validates the response, creates signals with `source: 'agent'`
   - Skips the asset when Ollama is unavailable — no low-quality fallback
3. Remove the keyword-based `sentiment-scorer.ts` and the old `NewsSentimentService` cron that created `news-sentiment` signals. The research agent replaces it entirely.
4. Runs on a 15-minute cron. No UI changes — `source: 'agent'` already renders in synthesis cards.

## Relevant Files

- `apps/api/src/llm/llm.service.ts` — Add general `generate()` method
- `apps/api/src/llm/llm.service.spec.ts` — Test `generate()`
- `apps/api/src/llm/llm.module.ts` — Already exists, no changes
- `apps/api/src/news-sentiment/news-sentiment.service.ts` — Reuse `fetchHeadlines()`, remove cron signal creation
- `apps/api/src/news-sentiment/news-sentiment.module.ts` — Export service for reuse
- `apps/api/src/news-sentiment/sentiment-scorer.ts` — DELETE (replaced by LLM)
- `apps/api/src/news-sentiment/sentiment-scorer.spec.ts` — DELETE
- `apps/api/src/technical-analysis/technical-analysis.service.ts` — Reuse `analyze()`
- `apps/api/src/technical-analysis/technical-analysis.module.ts` — Already exports service
- `apps/api/src/market-data/market-data.service.ts` — Reuse `getQuote()`, `mapSymbol()`
- `apps/api/src/market-data/market-data.module.ts` — Already exports service
- `apps/api/src/signals/signals.service.ts` — Create signals with `source: 'agent'`
- `apps/api/src/app/app.module.ts` — Register `ResearchAgentModule`

### New Files

- `apps/api/src/research-agent/research-agent.service.ts` — Core agent logic
- `apps/api/src/research-agent/research-agent.service.spec.ts` — Tests
- `apps/api/src/research-agent/research-agent.module.ts` — NestJS module

## Implementation Plan

### Phase 1: Foundation

Add `generate(prompt)` to `LlmService` as a general-purpose Ollama call. Export `NewsSentimentService` from its module so the research agent can reuse `fetchHeadlines()`.

### Phase 2: Core Implementation

Build `ResearchAgentService` that orchestrates data collection (headlines + TA + price) for each asset, constructs a comprehensive prompt, calls the LLM, parses the JSON response, and creates signals. The prompt includes: asset name, asset class, current price, price change, RSI value and signal, MACD value and signal, SMA crossover status, Bollinger %B, and up to 10 recent headlines with dates. The LLM sees everything in one context window.

### Phase 3: Integration

Register the module, wire the cron. Signals with `source: 'agent'` automatically appear in synthesis because the synthesis service already reads all signals. The agent weight is already `1.0` in synthesis config.

## Step by Step Tasks

### Step 1: Add generate() to LlmService

- Edit `apps/api/src/llm/llm.service.ts`:
  - Add `async generate(prompt: string, maxTokens = 256): Promise<string | null>`
  - Same Ollama availability check, fetch, error handling as `generateReasoning`
  - No caching — caller manages caching
- Edit `apps/api/src/llm/llm.service.spec.ts`:
  - Add tests for `generate()`: success, unavailable, error

### Step 2: Clean up NewsSentimentService

- Delete `apps/api/src/news-sentiment/sentiment-scorer.ts`
- Delete `apps/api/src/news-sentiment/sentiment-scorer.spec.ts`
- Edit `apps/api/src/news-sentiment/news-sentiment.service.ts`:
  - Remove imports of `scoreHeadline`, `aggregateSentiment`, `SentimentResult`
  - Remove the `@Cron` `runSentimentAnalysis()` method (research agent replaces it)
  - Remove the keyword-based scoring from `analyzeSentiment()` — keep it as a headline fetcher + cache only
  - Keep `fetchHeadlines()`, `getSentiment()`, `getAllSentiment()` for the dashboard news panel
- Edit `apps/api/src/news-sentiment/news-sentiment.module.ts`:
  - Verify `exports: [NewsSentimentService]` (already exported)

### Step 3: Create ResearchAgentModule

- Create `apps/api/src/research-agent/research-agent.module.ts`:
  - Import `LlmModule`, `NewsSentimentModule`, `TechnicalAnalysisModule`, `MarketDataModule`, `SignalsModule`
- Edit `apps/api/src/app/app.module.ts`:
  - Import `ResearchAgentModule`

### Step 4: Create ResearchAgentService

- Create `apps/api/src/research-agent/research-agent.service.ts`:
  - Inject `LlmService`, `NewsSentimentService`, `TechnicalAnalysisService`, `MarketDataService`, `SignalsService`
  - `@Cron('0 */15 * * * *') async runResearch()`:
    - Get all unique assets from signals
    - For each asset: call `analyzeAsset()`
  - `async analyzeAsset(asset, assetClass)`:
    - Fetch headlines via `NewsSentimentService.fetchHeadlines()`
    - Run TA via `TechnicalAnalysisService.analyze()`
    - Get quote via `MarketDataService.getQuote()`
    - Build comprehensive prompt with all data
    - Call `LlmService.generate(prompt, 512)`
    - Parse JSON response, validate fields
    - If valid: create signal with `source: 'agent'`
    - If LLM unavailable or invalid JSON: skip asset, create no signal
  - `buildResearchPrompt(asset, assetClass, headlines, analysis, quote)`:
    - Structured prompt including all data points
    - Clear instruction to return ONLY valid JSON
    - Example format in the prompt for reliable parsing

### Step 5: Create ResearchAgentService tests

- Create `apps/api/src/research-agent/research-agent.service.spec.ts`:
  - Mock all dependencies
  - Test: LLM returns valid JSON → creates signal with `source: 'agent'`
  - Test: LLM returns null → no signal created
  - Test: LLM returns invalid JSON → no signal created
  - Test: confidence clamped to 0-100
  - Test: no headlines + no TA signals → skips asset
  - Test: prompt includes headlines, RSI, MACD, price data

### Step 6: Validate

- Run all validation commands

## Testing Strategy

### Unit Tests

- `llm.service.spec.ts`: Test `generate()` — success, unavailable, error
- `research-agent.service.spec.ts`: Test full pipeline with mocked deps — LLM success path, fallback path, JSON validation, prompt construction

### Integration Tests

- No new integration tests — uses existing signal pipeline.

### E2E Tests (if UI-affecting)

- No UI changes.

### Edge Cases

- Ollama not running — agent skips, no signals created
- LLM returns `{ "direction": "STRONG_BUY" }` — invalid direction, skip
- LLM returns confidence of 150 — clamped to 100
- LLM returns prose instead of JSON — skip
- No headlines for asset — prompt still includes TA data, LLM can reason on technicals alone
- No TA data (API down) — prompt includes headlines only
- Both headlines and TA empty — skip asset entirely

## Acceptance Criteria

- When Ollama is running, the research agent creates signals with `source: 'agent'` based on combined news + TA analysis
- The LLM receives headlines, RSI, MACD, SMA, Bollinger, price, and volume in a single prompt
- Agent signals include natural-language reasoning that references both news and technical data
- When Ollama is unavailable, no agent signals are created (clean skip, no noise)
- Invalid LLM responses are handled gracefully (skip, log warning)
- Agent runs every 15 minutes without blocking other services
- All existing tests pass

## Validation Commands

- `pnpm exec nx reset` — Clear cache
- `pnpm exec nx run-many -t typecheck` — Type safety
- `pnpm exec nx run-many -t build` — Build all
- `pnpm exec nx run-many -t lint` — Lint
- `timeout 30 npx jest --config apps/api/jest.config.ts apps/api/src/llm/ apps/api/src/research-agent/ --forceExit --no-cache` — LLM + research agent tests
- `pnpm exec nx run dashboard:test` — Dashboard tests

## Notes

- No new packages required.
- The research agent fully replaces the keyword-based sentiment scorer. `sentiment-scorer.ts` is deleted. `NewsSentimentService` retains headline fetching and caching for the dashboard news panel but no longer creates signals.
- Prompt engineering is critical. The prompt must be very explicit about returning ONLY JSON with no preamble. Llama 3.2 handles this well with few-shot examples in the prompt.
- The 15-minute cron aligns with the scanner cron. For ~6 assets with current signals, this means ~6 LLM calls per cycle, each taking 3-10 seconds with Ollama. Total cycle time: ~1 minute. Well within the 15-minute window.
- Future enhancement: add earnings calendar data, SEC filing summaries, macro indicators (Fed rate, CPI) to the prompt context. Each would make the agent smarter.
