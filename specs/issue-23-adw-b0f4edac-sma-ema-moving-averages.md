# Spec: SMA and EMA Moving Average Calculations

**Issue:** #23
**ADW ID:** b0f4edac
**Type:** Feature
**Phase:** 4 (Technical Analysis Agent)

## Overview

Add Simple Moving Average (SMA) and Exponential Moving Average (EMA) moving average calculations with crossover signal detection. EMA already exists in `indicators.ts` (used by MACD). SMA is new.

## Architecture

### Existing Code

- `indicators.ts`: `calculateEMA`, `calculateRSI`, `calculateMACD`
- `technical-analysis.service.ts`: `AnalysisResult` with RSI + MACD, cron job creates signals
- `technical-analysis.controller.ts`: `GET /technical-analysis/:symbol`

### Changes

#### 1. `indicators.ts` - Add `calculateSMA` and crossover detection

- `calculateSMA(prices: number[], period: number): number[]` - sliding window average
- `detectCrossover(shortMA: number[], longMA: number[]): CrossoverResult` - detects golden/death crosses

#### 2. `technical-analysis.service.ts` - Integrate SMA/EMA into analysis

- Add SMA-20, SMA-50, SMA-200 to `AnalysisResult`
- Add EMA-20 to `AnalysisResult`
- Add crossover signal (SMA-50 vs SMA-200)
- Add `smaSignal` based on crossover detection
- Update `combineSignals` to include SMA signal
- Update cron job to create SMA-based signals

#### 3. `indicators.spec.ts` - Add SMA and crossover tests

- SMA calculation correctness
- SMA edge cases (insufficient data)
- Crossover detection (bullish, bearish, no crossover)

#### 4. `technical-analysis.service.spec.ts` - Update service tests

- Verify SMA/EMA values in analysis result
- Verify crossover signal generation

## Acceptance Criteria

- [x] SMA calculation with configurable period
- [x] Multiple SMA periods (20, 50, 200)
- [x] EMA-20 exposed in analysis result (already calculated internally)
- [x] Golden cross / death cross detection (SMA-50 vs SMA-200)
- [x] Crossover signals created by cron job
- [x] Unit tests for all new functions
- [x] Build, test, lint pass
