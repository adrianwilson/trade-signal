# Feature: Multi-Timeframe Analysis

## Metadata

- **issue_number:** multi-timeframe
- **adw_id:** analysis
- **issue_json:** —

## Feature Description

Add multi-timeframe analysis so signals can be generated and viewed across three timeframes: intraday (1-hour bars, last 5 days), swing (daily bars, last 30 days), and long-term (weekly bars, last 365 days). Each timeframe runs the same technical indicators (RSI, MACD, SMA, EMA, Bollinger) independently, producing separate signals tagged with their timeframe. The synthesis engine aggregates per-timeframe, and the dashboard lets users filter and compare signals across timeframes — revealing when short-term momentum diverges from long-term trend.

## User Story

As a trader
I want to see signals across intraday, swing, and long-term timeframes
So that I can distinguish short-term noise from long-term trends and make better-informed decisions

## Problem Statement

Currently all technical analysis runs on a single daily timeframe with 220 days of history. A trader looking at daily RSI might see "oversold" while the weekly trend is firmly bearish — or vice versa. Without multi-timeframe context, signals lack the depth needed for confident decision-making. Short-term traders need intraday signals; position traders need weekly signals. The current system serves neither well.

## Solution Statement

1. Add a `Timeframe` type (`'intraday' | 'swing' | 'long-term'`) to the shared types library.
2. Extend `MarketDataService.getHistory()` to accept an interval parameter (`'1h' | '1d' | '1wk'`) and pass it to Yahoo Finance / CoinGecko.
3. Extend `TechnicalAnalysisService.analyze()` to run analysis per timeframe, producing timeframe-tagged signals.
4. Add a `timeframe` field to the `Signal` type so each signal carries its timeframe.
5. Extend `SynthesisService` to group and aggregate per asset+timeframe, producing per-timeframe `AggregatedSignal` entries plus a cross-timeframe alignment indicator.
6. Add a timeframe toggle to the dashboard synthesis view so users can filter by timeframe and see alignment/divergence across timeframes.

## Relevant Files

Use these files to implement the feature:

- `libs/signals/src/lib/signals.ts` — Add `Timeframe` type and `timeframe` field to `Signal` and `AggregatedSignal`
- `libs/signals/src/index.ts` — Re-export new type
- `apps/api/src/market-data/market-data.service.ts` — Add interval parameter to `getHistory()`, pass to Yahoo Finance
- `apps/api/src/market-data/coingecko.service.ts` — Add interval support for crypto history
- `apps/api/src/technical-analysis/technical-analysis.service.ts` — Run analysis per timeframe, tag signals
- `apps/api/src/technical-analysis/technical-analysis.controller.ts` — Accept optional timeframe query param
- `apps/api/src/synthesis/synthesis.service.ts` — Group by asset+timeframe, add cross-timeframe alignment
- `apps/api/src/synthesis/synthesis.controller.ts` — Accept optional timeframe query param
- `apps/api/src/signals/signal.entity.ts` — Add `timeframe` column
- `apps/api/src/signals/signals.service.ts` — Pass timeframe through signal creation
- `apps/dashboard/src/app/services/signal.service.ts` — Add timeframe param to API calls
- `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.ts` — Add timeframe toggle
- `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.html` — Render timeframe selector and alignment badges

### New Files

- `apps/api/src/technical-analysis/timeframes.ts` — Timeframe configuration constants (intervals, data points, indicator periods)

## Implementation Plan

### Phase 1: Foundation

Add the `Timeframe` type to shared types and extend the `Signal` and `AggregatedSignal` interfaces with an optional `timeframe` field (defaulting to `'swing'` for backward compatibility). Add the `timeframe` column to the signal entity. Create timeframe configuration constants.

### Phase 2: Core Implementation

Extend `MarketDataService.getHistory()` to accept an interval parameter and fetch appropriate data granularity. Update `TechnicalAnalysisService` to iterate over all three timeframes during its cron-driven analysis, creating signals tagged with each timeframe. Create timeframe-specific indicator period configurations (e.g., RSI-14 on hourly bars vs RSI-14 on weekly bars).

### Phase 3: Integration

Extend `SynthesisService` to group signals by asset+timeframe and produce per-timeframe aggregations. Add a cross-timeframe alignment field that flags when timeframes agree or diverge. Update the dashboard synthesis view with a timeframe toggle and alignment indicators. Update API endpoints to accept optional timeframe filters.

## Step by Step Tasks

### Step 1: Add Timeframe type to shared library

- Edit `libs/signals/src/lib/signals.ts`:
  - Add `export type Timeframe = 'intraday' | 'swing' | 'long-term';`
  - Add `timeframe?: Timeframe;` to the `Signal` interface (optional for backward compat)
  - Add `timeframe?: Timeframe;` to the `AggregatedSignal` interface
  - Add `timeframeAlignment?: 'aligned' | 'mixed' | 'divergent';` to `AggregatedSignal`
- Verify `libs/signals/src/index.ts` re-exports `Timeframe`

### Step 2: Add timeframe column to signal entity

- Edit `apps/api/src/signals/signal.entity.ts`:
  - Add `@Column({ default: 'swing' }) timeframe: string;`
- Edit `apps/api/src/signals/signals.service.ts`:
  - Accept optional `timeframe` in `create()` and pass it to the entity

### Step 3: Create timeframe configuration

- Create `apps/api/src/technical-analysis/timeframes.ts`:
  - Define `TIMEFRAME_CONFIG` map with entries for each timeframe:
    - `intraday`: interval `'1h'`, historyDays `5`, label `'Intraday (1H)'`
    - `swing`: interval `'1d'`, historyDays `220`, label `'Swing (1D)'`
    - `long-term`: interval `'1wk'`, historyDays `365`, label `'Long-term (1W)'`

### Step 4: Extend MarketDataService with interval support

- Edit `apps/api/src/market-data/market-data.service.ts`:
  - Add `interval` parameter (default `'1d'`) to `getHistory()` and `getYahooHistory()`
  - Pass `interval` to `yahooFinance.historical()` options
- Edit `apps/api/src/market-data/coingecko.service.ts`:
  - Accept `interval` parameter in `getHistory()` — CoinGecko auto-selects granularity based on days, so this is mostly pass-through but ensures the API signature is consistent

### Step 5: Extend TechnicalAnalysisService for multi-timeframe

- Edit `apps/api/src/technical-analysis/technical-analysis.service.ts`:
  - Add `analyzeTimeframe(yahooSymbol, asset, assetClass, timeframe)` method that calls `getHistory()` with the timeframe's interval and days
  - Update `runAnalysis()` cron to iterate over all three timeframes for each asset
  - Tag each created signal with the `timeframe` field
  - Keep `analyze()` method as-is for backward compat (defaults to `'swing'`)

### Step 6: Update TechnicalAnalysisController

- Edit `apps/api/src/technical-analysis/technical-analysis.controller.ts`:
  - Add optional `@Query('timeframe')` param to the `analyze` endpoint
  - Default to `'swing'` if not provided

### Step 7: Extend SynthesisService for per-timeframe aggregation

- Edit `apps/api/src/synthesis/synthesis.service.ts`:
  - Change `groupByAsset()` to `groupByAssetAndTimeframe()`, keying on `asset:timeframe`
  - Generate one `AggregatedSignal` per asset per timeframe
  - Add `calculateTimeframeAlignment(asset)` method: compare directions across the three timeframes for the same asset — all same = `'aligned'`, 2 of 3 = `'mixed'`, opposing = `'divergent'`
  - Set `timeframeAlignment` on each `AggregatedSignal`
  - Update cache key to `asset:timeframe`

### Step 8: Update SynthesisController

- Edit `apps/api/src/synthesis/synthesis.controller.ts`:
  - Add optional `@Query('timeframe')` param to `getAll()`
  - Filter results by timeframe if provided, return all if not

### Step 9: Update dashboard SignalService

- Edit `apps/dashboard/src/app/services/signal.service.ts`:
  - Add optional `timeframe` param to `getSynthesis(timeframe?: string)`
  - Append `?timeframe=` query param when provided

### Step 10: Update dashboard SynthesisView

- Edit `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.ts`:
  - Add `selectedTimeframe = signal('all');`
  - Add `timeframes` array: `['all', 'intraday', 'swing', 'long-term']`
  - Add `timeframeLabels` map for display names
  - Update `loadData()` to pass selected timeframe to `getSynthesis()`
  - Add method to get alignment badge color
- Edit `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.html`:
  - Add a timeframe toggle (mat-button-toggle-group) above the grid
  - Show timeframe label on each card
  - Show alignment badge when viewing `'all'` timeframe

### Step 11: Update unit tests

- Update `apps/api/src/technical-analysis/technical-analysis.service.spec.ts`:
  - Test `analyzeTimeframe()` with each timeframe
  - Test that `runAnalysis()` creates signals for all three timeframes
- Update `apps/api/src/synthesis/synthesis.service.spec.ts`:
  - Test grouping by asset+timeframe
  - Test `calculateTimeframeAlignment()` for aligned, mixed, and divergent cases
- Update `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.spec.ts`:
  - Test timeframe toggle changes data
  - Test alignment badge rendering

### Step 12: Validate

- Run all validation commands to confirm zero regressions

## Testing Strategy

### Unit Tests

- `indicators.ts`: No changes needed — indicators are timeframe-agnostic (they operate on price arrays)
- `technical-analysis.service.spec.ts`: Test `analyzeTimeframe()` returns results for each timeframe config; test `runAnalysis()` creates signals with correct timeframe tags
- `synthesis.service.spec.ts`: Test `groupByAssetAndTimeframe()` correctly separates signals; test `calculateTimeframeAlignment()` returns `aligned` when all three agree, `mixed` when 2/3, `divergent` when opposing
- `synthesis-view.spec.ts`: Test timeframe signal defaults to `'all'`; test filtering by timeframe

### Integration Tests

- `GET /api/technical-analysis/AAPL?timeframe=intraday` returns analysis result
- `GET /api/synthesis?timeframe=swing` returns only swing-timeframe aggregations
- `GET /api/synthesis` (no param) returns all timeframes

### E2E Tests (if UI-affecting)

- Navigate to synthesis view, verify timeframe toggle is visible
- Click each timeframe option, verify cards filter correctly
- Verify alignment badges appear on cards when viewing all timeframes

### Edge Cases

- Asset with data for only one timeframe (e.g., crypto with no intraday from CoinGecko) — should still produce signals for available timeframes
- Existing signals without `timeframe` field — entity default `'swing'` handles migration
- Yahoo Finance returning empty history for `'1h'` interval on weekends — should gracefully skip
- Timeframe alignment when only 1 or 2 timeframes have signals — should be `null` rather than misleading

## Acceptance Criteria

- Signals are generated for all three timeframes (intraday, swing, long-term) during the cron analysis cycle
- Each signal carries a `timeframe` field persisted in the database
- The synthesis view shows a timeframe toggle with options: All, Intraday, Swing, Long-term
- Filtering by timeframe shows only signals from that timeframe
- An alignment indicator (aligned/mixed/divergent) appears on synthesis cards
- Existing signals (without timeframe) continue to work, defaulting to `'swing'`
- All existing tests pass with zero regressions
- New unit tests cover timeframe analysis, grouping, and alignment calculation

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `pnpm exec nx reset` — Clear Nx cache to avoid stale results
- `pnpm exec nx run-many -t typecheck` — Verify type safety across all projects
- `pnpm exec nx run-many -t build` — Build all projects to validate zero regressions
- `pnpm exec nx run-many -t lint` — Lint all projects to validate code quality
- `pnpm exec nx run-many -t test` — Run all tests to validate the feature works with zero regressions

## Notes

- Yahoo Finance's `historical()` accepts an `interval` option (`'1h'`, `'1d'`, `'1wk'`). Intraday data (`'1h'`) is limited to ~7 days of history on free tier.
- CoinGecko auto-selects granularity: <2 days = 5-min, 2-90 days = hourly, >90 days = daily. Requesting 5 days gets hourly data, which is close enough for "intraday" on crypto.
- The `timeframe` field on `Signal` is optional to maintain backward compatibility with existing data. The entity column defaults to `'swing'`.
- No new packages required.
- Future enhancement: add a dedicated "Multi-Timeframe Overview" panel showing a matrix of assets x timeframes with direction chips — but this is out of scope for this issue.
