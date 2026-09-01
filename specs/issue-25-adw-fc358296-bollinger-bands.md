# Spec: Bollinger Bands Technical Indicator

**Issue:** #25
**ADW ID:** fc358296
**Type:** Feature
**Phase:** 4 (Technical Analysis Agent)

## Overview

Add Bollinger Bands calculation using SMA-20 as middle band, with upper/lower bands at SMA ± k*stddev. Generate signals from %B (price position relative to bands).

## Changes

### 1. `indicators.ts` — Add `calculateBollingerBands`

- `BollingerBandsResult`: `{ middle: number[], upper: number[], lower: number[], percentB: number[] }`
- `calculateBollingerBands(prices, period=20, k=2)`: uses `calculateSMA`, computes rolling stddev
- `%B = (price - lower) / (upper - lower)` — 0 = at lower band, 1 = at upper band

### 2. `technical-analysis.service.ts` — Integrate Bollinger into analysis

- Add `bollingerBands` and `bollingerSignal` to `AnalysisResult`
- Signal logic: %B < 0.2 = BUY (oversold), %B > 0.8 = SELL (overbought)
- Add Bollinger signal to `combineSignals` (now 4 indicators, majority vote)
- Add Bollinger signals to cron job

### 3. Tests

- Bollinger Bands calculation correctness
- %B boundary values
- Service integration

## Acceptance Criteria

- [x] Bollinger Bands with configurable period and k
- [x] %B calculation for signal generation
- [x] Signals: %B < 0.2 = BUY, %B > 0.8 = SELL
- [x] Integrated into AnalysisResult and cron job
- [x] Unit tests pass
- [x] Build, test, lint pass
