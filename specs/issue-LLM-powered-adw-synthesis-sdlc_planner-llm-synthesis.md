# Feature: LLM-Powered Signal Synthesis

## Metadata

- **issue_number:** LLM-powered
- **adw_id:** synthesis
- **issue_json:** using

## Feature Description

Replace the rule-based `buildReasoningChain()` in `SynthesisService` with an LLM-powered reasoning engine using the Anthropic Claude API. The existing weighted verdict calculation (direction, confidence, conviction) remains unchanged — it's deterministic and fast. The LLM enhances only the reasoning chain: it receives the agent contributions, agreements, disagreements, and timeframe alignment as structured input and produces a natural-language analysis explaining _why_ the signals converge or diverge, what the indicators mean in context, and what risks to watch. The LLM call is async and cached — if the API key is missing or the call fails, the system falls back to the existing template-based reasoning.

## User Story

As a trader
I want intelligent, context-aware reasoning behind each signal synthesis
So that I can understand _why_ indicators agree or disagree and make more confident trading decisions

## Problem Statement

The current reasoning chain is string concatenation: "AAPL: BUY with 75% confidence based on 3 agents." followed by a bullet list. It doesn't explain _why_ RSI oversold + MACD bullish crossover together are significant, or what it means when news sentiment opposes technical signals. The reasoning is mechanical, not insightful.

## Solution Statement

1. Add the `@anthropic-ai/sdk` package to the API.
2. Create a `LlmService` that wraps Claude API calls with rate limiting, error handling, and caching.
3. Update `SynthesisService.buildReasoningChain()` to call the LLM when an API key is configured, falling back to the existing template when it's not.
4. The LLM receives a structured prompt with asset name, direction, confidence, each agent's contribution, agreements, disagreements, timeframe alignment, and conviction — and returns a 2-4 sentence analysis.
5. Cache LLM responses in memory (keyed by asset+timeframe+direction+confidence hash) to avoid redundant API calls during the 5-minute cron cycle.
6. No UI changes needed — the `reasoningChain` field already renders in a `<pre>` block.

## Relevant Files

Use these files to implement the feature:

- `apps/api/src/synthesis/synthesis.service.ts` — Replace `buildReasoningChain()` with LLM call + fallback
- `apps/api/src/synthesis/synthesis.module.ts` — Import `LlmModule`
- `apps/api/src/synthesis/synthesis.service.spec.ts` — Update tests for async reasoning
- `libs/signals/src/lib/signals.ts` — No changes needed (reasoningChain is already a string)
- `package.json` — Add `@anthropic-ai/sdk`
- `.env` — Add `ANTHROPIC_API_KEY` (gitignored)

### New Files

- `apps/api/src/llm/llm.service.ts` — Claude API wrapper with caching, rate limiting, error handling
- `apps/api/src/llm/llm.service.spec.ts` — Unit tests for LLM service
- `apps/api/src/llm/llm.module.ts` — NestJS module exporting LlmService

## Implementation Plan

### Phase 1: Foundation

Install `@anthropic-ai/sdk`. Create the `LlmModule` with `LlmService` that reads `ANTHROPIC_API_KEY` from env, initializes the Anthropic client, and exposes a `generateReasoning()` method. Add in-memory cache with TTL. Handle missing API key gracefully (return null, log once).

### Phase 2: Core Implementation

Build the synthesis prompt template. The prompt receives structured signal data and asks Claude to produce a concise trading analysis (2-4 sentences). Update `SynthesisService` to inject `LlmService` and call it from `buildReasoningChain()`. Since the cron runs every 5 minutes and processes multiple assets sequentially, rate limiting is naturally bounded. Make `buildReasoningChain()` async and update callers.

### Phase 3: Integration

Wire `LlmModule` into `SynthesisModule` imports. Update `aggregateSignals()` to be async (it calls `buildReasoningChain()`). Update `synthesize()` accordingly. Ensure fallback works when API key is not set. Update tests to mock the LLM service.

## Step by Step Tasks

### Step 1: Install Anthropic SDK

- Run `pnpm add @anthropic-ai/sdk`
- Verify it installs correctly

### Step 2: Create LlmModule and LlmService

- Create `apps/api/src/llm/llm.module.ts` — simple NestJS module
- Create `apps/api/src/llm/llm.service.ts`:
  - Inject `ConfigService` or read `process.env['ANTHROPIC_API_KEY']` directly (match existing pattern — this project reads env vars directly, no ConfigModule)
  - Initialize `Anthropic` client only if API key exists
  - `generateReasoning(prompt: string): Promise<string | null>` — calls `client.messages.create()` with `claude-haiku-4-5-20251001` (fast, cheap for short reasoning)
  - In-memory cache: `Map<string, { text: string; expiresAt: number }>` with 5-minute TTL
  - `buildSynthesisPrompt(data: SynthesisPromptData): string` — builds the structured prompt
  - Return `null` on any error (no API key, rate limit, network failure) — caller falls back to template
  - Log errors at `warn` level, log "no API key" once at `debug` level

### Step 3: Create LlmService tests

- Create `apps/api/src/llm/llm.service.spec.ts`:
  - Test that `generateReasoning()` returns null when no API key
  - Test that cache returns cached value on second call
  - Test that expired cache triggers new call
  - Test that API errors return null gracefully
  - Mock the Anthropic SDK — don't make real API calls

### Step 4: Update SynthesisService to use LLM

- Edit `apps/api/src/synthesis/synthesis.service.ts`:
  - Inject `LlmService` in constructor
  - Make `buildReasoningChain()` async, returning `Promise<string>`
  - Call `llmService.generateReasoning()` with synthesis prompt data
  - If LLM returns null, fall back to existing template logic
  - Make `aggregateSignals()` async (it calls buildReasoningChain)
  - Update `synthesize()` loop to `await aggregateSignals()`

### Step 5: Update SynthesisModule

- Edit `apps/api/src/synthesis/synthesis.module.ts`:
  - Import `LlmModule`

### Step 6: Update SynthesisService tests

- Edit `apps/api/src/synthesis/synthesis.service.spec.ts`:
  - Add mock `LlmService` to constructor call
  - Test that when LLM returns a reasoning string, it's used
  - Test that when LLM returns null, fallback template is used
  - Keep all existing tests passing

### Step 7: Add ANTHROPIC_API_KEY to .env

- Add `ANTHROPIC_API_KEY=` (empty — user fills in their own key)
- The service gracefully handles missing key

### Step 8: Validate

- Run all validation commands

## Testing Strategy

### Unit Tests

- `llm.service.spec.ts`: Mock `Anthropic` client. Test generateReasoning returns LLM text on success, null on error, null when no API key. Test cache hit/miss/expiry. Test prompt building includes all signal data.
- `synthesis.service.spec.ts`: Mock `LlmService`. Test reasoning chain uses LLM output when available, falls back to template when LLM returns null. All existing tests continue to pass.

### Integration Tests

- No new integration tests needed — the synthesis controller tests don't change (same response shape).

### E2E Tests (if UI-affecting)

- No UI changes — the `reasoningChain` field renders identically whether LLM-generated or template-generated.

### Edge Cases

- No `ANTHROPIC_API_KEY` set — service initializes without client, all calls return null, template fallback used
- API rate limit hit — returns null, template fallback used, next cron cycle retries
- API timeout — SDK default timeout applies, returns null on timeout
- Empty contributions array — skip LLM call, return template
- Very long prompt (many contributions) — Claude Haiku handles up to 200K tokens, not a concern
- Cache key collision — extremely unlikely with asset+timeframe+direction+confidence hash

## Acceptance Criteria

- When `ANTHROPIC_API_KEY` is set, synthesis reasoning chains are generated by Claude with natural-language analysis
- When `ANTHROPIC_API_KEY` is not set, the existing template-based reasoning is used (zero behavior change)
- LLM responses are cached for 5 minutes to avoid redundant API calls
- API errors are handled gracefully with fallback to template reasoning
- No UI changes required — existing `reasoningChain` rendering works for both LLM and template output
- All existing tests pass with zero regressions
- New tests cover LLM service caching, error handling, and fallback behavior

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `pnpm exec nx reset` — Clear Nx cache
- `pnpm exec nx run-many -t typecheck` — Verify type safety across all projects
- `pnpm exec nx run-many -t build` — Build all projects to validate zero regressions
- `pnpm exec nx run-many -t lint` — Lint all projects to validate code quality
- `timeout 30 npx jest --config apps/api/jest.config.ts apps/api/src/llm/ apps/api/src/synthesis/ --forceExit --no-cache` — Run LLM and synthesis tests
- `pnpm exec nx run dashboard:test` — Run dashboard tests

## Notes

- **Model choice:** `claude-haiku-4-5-20251001` — fast, cheap ($0.80/MTok input, $4/MTok output), sufficient for 2-4 sentence analysis. Each synthesis prompt is ~200-500 tokens, response ~100-200 tokens. At 6 assets x 3 timeframes x every 5 minutes = ~5,000 calls/day = ~$2-4/day at worst. Cache reduces this significantly.
- **New package:** `@anthropic-ai/sdk` — official Anthropic TypeScript SDK
- **No ConfigModule:** This project reads env vars directly (`process.env['...']`), matching the existing pattern in `news-sentiment` and `auth` modules.
- **Future enhancement:** Could add a "regenerate reasoning" button to the dashboard to force a fresh LLM call for a specific asset. Out of scope for this issue.
