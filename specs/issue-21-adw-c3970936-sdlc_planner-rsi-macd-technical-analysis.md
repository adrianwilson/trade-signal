# Feature: Add RSI and MACD Technical Analysis Calculations

## Metadata

- **issue_number:** 21
- **adw_id:** c3970936
- **issue_json:** {"number":21,"title":"Add RSI and MACD technical analysis calculations","state":"OPEN","labels":["enhancement"]}

## Feature Description

Add RSI (14-period) and MACD (12/26/9) calculations from historical close prices. Generate BUY/SELL/HOLD signals from indicator thresholds. Expose via API endpoint and persist generated signals.

## Solution

1. Create `apps/api/src/technical-analysis/` module with:
   - Pure calculation functions for RSI and MACD (no dependencies, easy to test)
   - `TechnicalAnalysisService` that uses `MarketDataService` for price data and `SignalsService` to persist signals
   - `TechnicalAnalysisController` with `GET /api/technical-analysis/:symbol`
2. RSI: 100 - (100 / (1 + RS)), RS = avg gain / avg loss over 14 periods. < 30 = BUY, > 70 = SELL, else HOLD.
3. MACD: 12-EMA minus 26-EMA. Signal = 9-EMA of MACD. Histogram = MACD - signal. Histogram > 0 = BUY, < 0 = SELL, == 0 = HOLD.
4. Cron job runs analysis every 5 minutes and persists signals.

## Relevant Files

- `apps/api/src/market-data/market-data.service.ts` — `getHistory()` provides close prices
- `apps/api/src/market-data/market-data.module.ts` — Export `MarketDataService` for injection
- `apps/api/src/signals/signals.service.ts` — `create()` to persist generated signals
- `apps/api/src/signals/signals.module.ts` — Already exports `SignalsService`
- `apps/api/src/app/app.module.ts` — Import `TechnicalAnalysisModule`

### New Files

- `apps/api/src/technical-analysis/indicators.ts` — Pure RSI/MACD calculation functions
- `apps/api/src/technical-analysis/indicators.spec.ts` — Unit tests with known values
- `apps/api/src/technical-analysis/technical-analysis.service.ts`
- `apps/api/src/technical-analysis/technical-analysis.controller.ts`
- `apps/api/src/technical-analysis/technical-analysis.module.ts`
- `apps/api/src/technical-analysis/technical-analysis.service.spec.ts`
- `apps/api/src/technical-analysis/technical-analysis.controller.spec.ts`

## Step by Step Tasks

### 1. Create pure indicator functions

- `calculateEMA(prices: number[], period: number): number[]`
- `calculateRSI(closes: number[], period?: number): number[]` (default 14)
- `calculateMACD(closes: number[], fast?: number, slow?: number, signal?: number): { macd: number[], signal: number[], histogram: number[] }`

### 2. Create TechnicalAnalysisService

- Inject `MarketDataService` and `SignalsService`
- `analyze(symbol: string, asset: string, assetClass: string)`: fetch history, calculate RSI/MACD, return results with generated signal direction
- `@Cron('30 */5 * * * *')` `runAnalysis()`: get unique assets from signals, run analysis for each, persist new signals

### 3. Create TechnicalAnalysisController

- `GET /api/technical-analysis/:symbol` — returns `{ rsi, macd, signal }`

### 4. Create TechnicalAnalysisModule

- Import `MarketDataModule` and `SignalsModule`

### 5. Update AppModule

- Import `TechnicalAnalysisModule`

### 6. Export MarketDataService from MarketDataModule

### 7. Add unit tests

- Test RSI with known price series (verify against manual calculation)
- Test MACD with known price series
- Test edge cases: not enough data, flat prices

### 8. Run full validation

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`

## Validation Commands

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`
