# Feature: Integrate Yahoo Finance API for Live Market Data

## Metadata

- **issue_number:** 17
- **adw_id:** 8dc41f47
- **issue_json:** {"number":17,"title":"Integrate Yahoo Finance API for live market data","state":"OPEN","labels":["enhancement"]}

## Feature Description

Integrate Yahoo Finance via the `yahoo-finance2` npm package to fetch real-time stock quotes. Add a `MarketDataModule` with service, controller, and entity. Add price/change columns to the dashboard signal table.

## User Story

As a trader
I want to see live market prices alongside trading signals
So that I can evaluate signals in the context of current market conditions

## Problem Statement

The signal table shows signals without any price context. A BUY signal on AAPL is more useful when you can see the current price and whether it's already moved.

## Solution Statement

1. Install `yahoo-finance2` and `@nestjs/schedule`.
2. Create a `MarketDataModule` with `MarketDataService`, `MarketDataController`, and `AssetPriceEntity`.
3. `MarketDataService` fetches quotes from Yahoo Finance, caches them in SQLite via the `AssetPriceEntity`, and provides a symbol-mapping utility (our format `BTC/USD` → Yahoo format `BTC-USD`).
4. `MarketDataController` exposes `GET /api/market-data/quote/:symbol` and `GET /api/market-data/history/:symbol`.
5. Add a scheduled task that refreshes prices for all unique assets in the signals table every 5 minutes.
6. Add `price` and `priceChange` columns to the dashboard signal table, fetched from a new `GET /api/market-data/quotes` bulk endpoint.

## Relevant Files

- `apps/api/src/app/app.module.ts` — Add `MarketDataModule`, `ScheduleModule`, and `AssetPriceEntity` to entities array
- `apps/api/src/signals/signals.service.ts` — Need to expose unique assets for the cron job
- `apps/api/src/signals/signal.entity.ts` — Reference for entity pattern
- `apps/dashboard/src/app/signals/signal-table/signal-table.ts` — Add price/change columns
- `apps/dashboard/src/app/signals/signal-table/signal-table.html` — Add price/change template columns
- `apps/dashboard/src/app/services/signal.service.ts` — Add market data fetch method

### New Files

- `apps/api/src/market-data/market-data.module.ts`
- `apps/api/src/market-data/market-data.service.ts`
- `apps/api/src/market-data/market-data.controller.ts`
- `apps/api/src/market-data/asset-price.entity.ts`
- `apps/api/src/market-data/market-data.service.spec.ts`
- `apps/api/src/market-data/market-data.controller.spec.ts`
- `apps/api/src/market-data/market-data.integration.spec.ts`

## Implementation Plan

### Phase 1: Foundation

Install dependencies. Create the `AssetPriceEntity` and `MarketDataModule` skeleton. Add symbol mapping utility.

### Phase 2: Core Implementation

Implement `MarketDataService` with Yahoo Finance integration, caching, and cron refresh. Implement `MarketDataController` with quote and history endpoints. Add bulk quotes endpoint.

### Phase 3: Integration

Add price/change columns to dashboard. Update signal service to expose unique assets. Add tests. Run full validation.

## Step by Step Tasks

### 1. Install dependencies

- Run `pnpm add -w yahoo-finance2 @nestjs/schedule`

### 2. Create AssetPriceEntity

- Create `apps/api/src/market-data/asset-price.entity.ts`:
  - `symbol` (PrimaryColumn, text) — Yahoo Finance symbol format
  - `price` (Column, real)
  - `changePercent` (Column, real)
  - `volume` (Column, integer, nullable)
  - `updatedAt` (Column, text) — ISO timestamp of last fetch

### 3. Create MarketDataService

- Create `apps/api/src/market-data/market-data.service.ts`:
  - Inject `Repository<AssetPriceEntity>` and `SignalsService`
  - `mapSymbol(asset: string, assetClass: string): string` — convert our format to Yahoo format:
    - equity: use as-is (AAPL, TSLA)
    - crypto: `BTC/USD` → `BTC-USD`
    - forex: `EUR/USD` → `EURUSD=X`, `GBP/JPY` → `GBPJPY=X`
  - `getQuote(symbol: string): Promise<AssetPrice>` — fetch from Yahoo, cache in DB, return
  - `getHistory(symbol: string, days?: number): Promise<HistoricalData[]>` — fetch historical OHLCV
  - `getBulkQuotes(assets: {asset: string, assetClass: string}[]): Promise<Record<string, AssetPrice>>` — fetch quotes for multiple assets
  - `@Cron('0 */5 * * * *')` `refreshPrices()` — get unique assets from signals, fetch quotes for each
  - Handle Yahoo Finance errors gracefully (network issues, invalid symbols)

### 4. Create MarketDataController

- Create `apps/api/src/market-data/market-data.controller.ts`:
  - `@Get('quote/:symbol')` — returns cached or fresh quote
  - `@Get('history/:symbol')` — returns historical data (query param `days` defaults to 30)
  - `@Get('quotes')` — returns bulk quotes for all assets with active signals

### 5. Create MarketDataModule

- Create `apps/api/src/market-data/market-data.module.ts`:
  - Import `TypeOrmModule.forFeature([AssetPriceEntity])`
  - Import `SignalsModule` (for accessing unique assets)
  - Provide `MarketDataService`, register `MarketDataController`

### 6. Update AppModule

- Import `ScheduleModule.forRoot()` from `@nestjs/schedule`
- Import `MarketDataModule`
- Add `AssetPriceEntity` to the entities array in `TypeOrmModule.forRoot()`

### 7. Export findAll from SignalsModule

- Update `SignalsModule` to export `SignalsService` so `MarketDataModule` can inject it

### 8. Update dashboard signal table

- Add a `MarketDataService` method to `SignalService` (or a new service) that calls `GET /api/market-data/quotes`
- Add `price` and `priceChange` columns to `displayedColumns`
- Fetch quotes on init, map them to signals by asset
- Display price as currency and change as percentage with color (green positive, red negative)

### 9. Add unit tests

- `MarketDataService`: test `mapSymbol`, test `getQuote` with mocked Yahoo Finance
- `MarketDataController`: test endpoints delegate to service
- Mock `yahoo-finance2` in tests — don't make real API calls

### 10. Add integration test

- `GET /api/market-data/quotes` returns 200 with quote data (may need to mock Yahoo Finance at the HTTP level or accept empty results in CI)

### 11. Run full validation suite

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`

## Testing Strategy

### Unit Tests

- `mapSymbol` correctly converts all asset formats
- `getQuote` fetches from Yahoo Finance and caches result
- `refreshPrices` calls getQuote for each unique asset
- Controller delegates to service

### Integration Tests

- Quote and history endpoints return correct HTTP status and shape
- Bulk quotes endpoint returns data for signal assets

### E2E Tests

- Existing e2e tests should pass (new columns are additive)
- Price columns may show "—" if Yahoo Finance is unavailable in CI

### Edge Cases

- Yahoo Finance API down — return cached data or null, don't crash
- Invalid symbol — return 404
- Rate limiting — cache aggressively, respect 5-minute interval
- CI environment — no internet access may cause Yahoo Finance calls to fail; mock in tests

## Acceptance Criteria

- `GET /api/market-data/quote/AAPL` returns price, changePercent, volume
- `GET /api/market-data/history/AAPL` returns OHLCV array
- `GET /api/market-data/quotes` returns bulk quotes for all signal assets
- Signal table shows price and change columns
- Cron job refreshes prices every 5 minutes
- All tests pass, coverage >= 70%
- format:check and typecheck pass

## Validation Commands

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`

## Notes

- **yahoo-finance2** — Free, no API key. Fetches from Yahoo Finance's unofficial API. May have rate limits.
- **Symbol mapping** — Our signals use `BTC/USD` format but Yahoo uses `BTC-USD` for crypto and `EURUSD=X` for forex. The mapping is centralized in `MarketDataService.mapSymbol()`.
- **Cron schedule** — `@nestjs/schedule` provides `@Cron` decorator. The 5-minute interval (`0 */5 * * * *`) only runs when the API server is up.
- **E2E consideration** — The dashboard price columns may show "—" or loading states if Yahoo Finance is unreachable. E2e tests should still pass because the signal table renders regardless.
- **`ScheduleModule` in tests** — Tests that import `AppModule` will load the scheduler. Use `@nestjs/schedule/testing` or disable the cron in test mode to avoid unwanted scheduled tasks during tests.
