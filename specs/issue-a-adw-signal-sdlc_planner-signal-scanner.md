# Feature: Signal Scanner — Discover High-Confidence Opportunities

## Metadata

- **issue_number:** a
- **adw_id:** signal
- **issue_json:** scanner

## Feature Description

Add a signal scanner that runs technical analysis against a predefined universe of popular stocks and crypto assets, filters for high-confidence BUY/SELL signals, and surfaces them in a new "Opportunities" page. The scanner reuses the existing `TechnicalAnalysisService.analyze()` and `MarketDataService` — no new analysis logic needed. It scans on a cron schedule (every 15 minutes), caches results, and exposes them via a new API endpoint. The dashboard gets a new "Opportunities" page showing a ranked table of assets with strong signals that aren't already in the user's portfolio or watchlist.

## User Story

As a trader
I want to discover stocks and crypto with high-confidence signals
So that I can find new trading opportunities without manually searching

## Problem Statement

The app only analyzes assets already in the signal database (6 seeds + manually followed). There's no way to discover new opportunities. Users must know which assets to look at before the app can help them.

## Solution Statement

1. Define a scan universe: top 30 stocks + all 10 crypto assets already in CoinGecko map.
2. Create a `ScannerService` that runs `TechnicalAnalysisService.analyze()` against each asset, computes an overall confidence score, and filters for high-confidence results (>=60%).
3. Cache scan results in memory with a 15-minute TTL.
4. Expose via `GET /api/scanner/opportunities` returning a sorted list.
5. Add an "Opportunities" page to the dashboard with a ranked table showing asset, direction, confidence, and key indicator values.

## Relevant Files

- `apps/api/src/technical-analysis/technical-analysis.service.ts` — Reuse `analyze()` method
- `apps/api/src/market-data/market-data.service.ts` — Reuse `mapSymbol()`, `getQuote()`
- `apps/api/src/market-data/coingecko.service.ts` — `COIN_MAP` keys define crypto universe
- `apps/api/src/app/app.module.ts` — Register `ScannerModule`
- `apps/dashboard/src/app/app.routes.ts` — Add opportunities route
- `apps/dashboard/src/app/layout/layout.html` — Add sidenav link
- `apps/dashboard/src/app/services/signal.service.ts` — Add `getOpportunities()` method

### New Files

- `apps/api/src/scanner/scanner.service.ts` — Scan universe, run analysis, filter, cache
- `apps/api/src/scanner/scanner.service.spec.ts` — Unit tests
- `apps/api/src/scanner/scanner.controller.ts` — `GET /scanner/opportunities`
- `apps/api/src/scanner/scanner.module.ts` — NestJS module
- `apps/dashboard/src/app/signals/opportunities/opportunities.ts` — Component
- `apps/dashboard/src/app/signals/opportunities/opportunities.html` — Template
- `apps/dashboard/src/app/signals/opportunities/opportunities.scss` — Styles
- `apps/dashboard/src/app/signals/opportunities/opportunities.spec.ts` — Tests

## Implementation Plan

### Phase 1: Foundation

Define the scan universe as a constant array of `{ asset, assetClass, yahooSymbol }` objects. Include 30 popular stocks (FAANG, top market cap) and the 10 crypto assets from the existing CoinGecko map. Create the `ScannerModule` with service and controller.

### Phase 2: Core Implementation

Build `ScannerService.scan()` that iterates the universe, calls `TechnicalAnalysisService.analyze()` for each, computes a confidence score from the indicator signals, and returns only results with confidence >= 60%. Cache results with 15-minute TTL. Run on a cron schedule. Expose via controller.

### Phase 3: Integration

Add the dashboard Opportunities page with a mat-table showing ranked results. Add route and sidenav link. Add `getOpportunities()` to `SignalService`. Include price and change data from quotes.

## Step by Step Tasks

### Step 1: Define scan universe

- Create `apps/api/src/scanner/scan-universe.ts`:
  - Export `SCAN_UNIVERSE` array with 30 stocks + 10 crypto
  - Each entry: `{ asset: string, assetClass: AssetClass, yahooSymbol: string }`
  - Stocks: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, JPM, V, JNJ, WMT, PG, UNH, HD, MA, DIS, NFLX, PYPL, INTC, AMD, CRM, ADBE, ORCL, CSCO, PEP, KO, MRK, ABT, TMO, COST
  - Crypto: all keys from `COIN_MAP` in coingecko.service.ts

### Step 2: Create ScannerService

- Create `apps/api/src/scanner/scanner.service.ts`:
  - Inject `TechnicalAnalysisService` and `MarketDataService`
  - `scan(): Promise<Opportunity[]>` — iterate universe, analyze each, compute confidence
  - Confidence = count of non-HOLD signals / total indicators * 100, weighted by individual indicator confidence
  - Filter for confidence >= 60%
  - Sort by confidence descending
  - Cache results in `Map` with 15-minute TTL
  - `@Cron('0 */15 * * * *')` to run scan periodically
  - `getOpportunities()` returns cached results or triggers scan

### Step 3: Create ScannerController

- Create `apps/api/src/scanner/scanner.controller.ts`:
  - `GET /scanner/opportunities` — returns cached opportunities

### Step 4: Create ScannerModule and register

- Create `apps/api/src/scanner/scanner.module.ts`
  - Import `TechnicalAnalysisModule` (needs to export its service) and `MarketDataModule`
- Update `apps/api/src/technical-analysis/technical-analysis.module.ts`:
  - Add `exports: [TechnicalAnalysisService]`
- Update `apps/api/src/app/app.module.ts`:
  - Import `ScannerModule`

### Step 5: Create ScannerService tests

- Create `apps/api/src/scanner/scanner.service.spec.ts`:
  - Mock `TechnicalAnalysisService.analyze()` and `MarketDataService`
  - Test that scan returns only high-confidence results
  - Test caching behavior
  - Test that results are sorted by confidence

### Step 6: Add getOpportunities to dashboard SignalService

- Edit `apps/dashboard/src/app/services/signal.service.ts`:
  - Add `Opportunity` interface
  - Add `getOpportunities(): Observable<Opportunity[]>`

### Step 7: Create Opportunities component

- Create `apps/dashboard/src/app/signals/opportunities/opportunities.ts`:
  - Load opportunities on init
  - Display in mat-table sorted by confidence
  - Show: rank, asset, assetClass, direction, confidence, RSI, MACD signal, price, change%
  - Refresh button
- Create template and styles following existing patterns (leaderboard is a good reference)

### Step 8: Add route and sidenav link

- Edit `apps/dashboard/src/app/app.routes.ts`:
  - Add `{ path: 'opportunities', component: OpportunitiesComponent }`
- Edit `apps/dashboard/src/app/layout/layout.html`:
  - Add sidenav link under Trading section with `radar` icon

### Step 9: Create Opportunities component tests

- Create `apps/dashboard/src/app/signals/opportunities/opportunities.spec.ts`

### Step 10: Validate

- Run all validation commands

## Testing Strategy

### Unit Tests

- `scanner.service.spec.ts`: Mock TA service. Test scan filters by confidence >= 60%. Test caching. Test sort order. Test empty results when no high-confidence signals.
- `opportunities.spec.ts`: Mock SignalService. Test data loads on init. Test loading/error states.

### Integration Tests

- No new integration tests — reuses existing TA and market data services.

### E2E Tests (if UI-affecting)

- Navigate to Opportunities page via sidenav
- Verify table renders with ranked opportunities

### Edge Cases

- All assets return HOLD — empty opportunities list with "No opportunities found" message
- Yahoo Finance rate limit — scan gracefully skips failed assets
- First load before scan completes — show spinner, return empty until first scan finishes
- Asset already in user's watchlist — still show it (discovery is separate from tracking)

## Acceptance Criteria

- Scanner analyzes 40 assets (30 stocks + 10 crypto) on a 15-minute cron
- Only signals with confidence >= 60% appear in opportunities
- Results are ranked by confidence (highest first)
- Each opportunity shows: asset, class, direction, confidence, RSI value, price, change%
- Dashboard has an "Opportunities" page accessible from sidenav
- Scanner results are cached for 15 minutes
- Scan failures for individual assets don't block the rest
- All existing tests pass

## Validation Commands

- `pnpm exec nx reset` — Clear cache
- `pnpm exec nx run-many -t typecheck` — Type safety
- `pnpm exec nx run-many -t build` — Build all
- `pnpm exec nx run-many -t lint` — Lint
- `timeout 30 npx jest --config apps/api/jest.config.ts apps/api/src/scanner/ --forceExit --no-cache` — Scanner tests
- `pnpm exec nx run dashboard:test` — Dashboard tests

## Notes

- No new packages required.
- The scan universe is hardcoded. Future enhancement: let users configure which assets to scan.
- Yahoo Finance free tier has rate limits (~2000 requests/hour). 40 assets * 4 calls per scan (quote + 3 timeframes) = ~160 requests per scan, well within limits at 15-minute intervals.
- `TechnicalAnalysisModule` needs to export `TechnicalAnalysisService` so `ScannerModule` can import it.
- The scanner does NOT create Signal entities — it's read-only analysis. Users can follow opportunities by adding to watchlist or following via paper trading (future enhancement).
