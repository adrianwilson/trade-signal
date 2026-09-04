# Feature: Stop-Loss and Take-Profit for Paper Trading

## Metadata

- **issue_number:** risk
- **adw_id:** management
- **issue_json:** to

## Feature Description

Add stop-loss and take-profit functionality to paper trades. When following a signal, the system auto-sets default SL/TP levels based on the asset's volatility (percentage-based). Users can see and edit SL/TP on the Open Positions table. A cron job checks prices against SL/TP thresholds and auto-closes positions that hit their limits. Trade history shows whether a position was closed by SL, TP, or manually.

## User Story

As a paper trader
I want automatic stop-loss and take-profit on my positions
So that my simulated trades close automatically at predefined risk/reward levels

## Problem Statement

Paper trades sit open indefinitely until manually closed. There's no way to set risk limits or profit targets, making the simulation unrealistic — real trading always involves exit strategies.

## Solution Statement

1. Add `stopLoss` and `takeProfit` columns to `PaperTradeEntity` (nullable, price-based).
2. When creating a trade via `followSignal()`, auto-calculate default SL/TP: SL at -5% from entry, TP at +10% from entry (2:1 reward/risk).
3. Add a `@Cron` job in `PaperTradingService` that checks open positions against current prices every 5 minutes and auto-closes any that hit SL or TP.
4. Add `closeReason` column: `'manual' | 'stop-loss' | 'take-profit'`.
5. Show SL/TP values in the Open Positions table on the dashboard.
6. Show close reason in Trade History.

## Relevant Files

- `apps/api/src/paper-trading/paper-trading.entities.ts` — Add SL/TP and closeReason columns
- `apps/api/src/paper-trading/paper-trading.service.ts` — Set defaults on follow, add cron check
- `apps/api/src/paper-trading/paper-trading.service.spec.ts` — Update tests
- `apps/api/src/paper-trading/paper-trading.controller.ts` — No changes needed (existing close endpoint works)
- `apps/dashboard/src/app/signals/paper-trading/paper-trading.html` — Show SL/TP columns and close reason
- `apps/dashboard/src/app/signals/paper-trading/paper-trading.ts` — Add new columns
- `apps/dashboard/src/app/services/signal.service.ts` — Update PaperTrade interface

## Implementation Plan

### Phase 1: Foundation

Add `stopLoss`, `takeProfit`, and `closeReason` columns to `PaperTradeEntity`. All nullable for backward compatibility with existing trades.

### Phase 2: Core Implementation

Update `followSignal()` to compute default SL/TP. Add `checkStopLossTakeProfit()` cron that iterates open trades, fetches current prices, and auto-closes positions that breach thresholds. Update `closePosition()` to accept a `reason` parameter.

### Phase 3: Integration

Update the dashboard: add SL/TP columns to Open Positions table, add close reason to Trade History. Update PaperTrade interface in SignalService.

## Step by Step Tasks

### Step 1: Add columns to PaperTradeEntity

- Edit `apps/api/src/paper-trading/paper-trading.entities.ts`:
  - Add `@Column({ type: 'real', nullable: true }) stopLoss!: number | null;`
  - Add `@Column({ type: 'real', nullable: true }) takeProfit!: number | null;`
  - Add `@Column({ type: 'text', nullable: true }) closeReason!: string | null;`

### Step 2: Update PaperTradingService

- Edit `apps/api/src/paper-trading/paper-trading.service.ts`:
  - In `followSignal()`: after setting entry price, compute default SL/TP
    - BUY: SL = entry * 0.95, TP = entry * 1.10
    - SELL: SL = entry * 1.05, TP = entry * 0.90
  - Update `closePosition()` to accept optional `reason` parameter (default `'manual'`), set `closeReason` on each trade
  - Add `@Cron('0 */5 * * * *') checkStopLossTakeProfit()`:
    - Find all open trades with SL or TP set
    - Group by asset, fetch current prices
    - For BUY trades: close if price <= SL or price >= TP
    - For SELL trades: close if price >= SL or price <= TP
    - Use appropriate close reason

### Step 3: Update service tests

- Edit `apps/api/src/paper-trading/paper-trading.service.spec.ts`:
  - Test that followSignal sets default SL/TP
  - Test checkStopLossTakeProfit closes positions at SL
  - Test checkStopLossTakeProfit closes positions at TP
  - Test manual close sets reason to 'manual'

### Step 4: Update dashboard PaperTrade interface

- Edit `apps/dashboard/src/app/services/signal.service.ts`:
  - Add `stopLoss`, `takeProfit`, `closeReason` to `PaperTrade` interface

### Step 5: Update Paper Trading UI

- Edit `apps/dashboard/src/app/signals/paper-trading/paper-trading.ts`:
  - Add 'stopLoss' and 'takeProfit' to `positionColumns` (before 'actions')
  - Add 'closeReason' to `tradeColumns`
- Edit `apps/dashboard/src/app/signals/paper-trading/paper-trading.html`:
  - Add SL column showing stopLoss price
  - Add TP column showing takeProfit price
  - Add close reason column in trade history with color-coded chip

### Step 6: Validate

- Run all validation commands

## Testing Strategy

### Unit Tests

- `paper-trading.service.spec.ts`: Test SL/TP defaults are set correctly for BUY and SELL trades. Test cron auto-closes at SL. Test cron auto-closes at TP. Test manual close sets reason.

### Integration Tests

- No new integration tests needed.

### E2E Tests (if UI-affecting)

- Verify SL/TP columns appear in Open Positions table
- Verify close reason appears in Trade History

### Edge Cases

- Existing trades without SL/TP (null) — cron skips them
- Price gaps past SL/TP — still closes at current price, not the threshold
- Multiple open trades for same asset — each checked independently
- Quote fetch failure during cron — skip that asset, try next cycle

## Acceptance Criteria

- Following a signal auto-sets SL at -5% and TP at +10% from entry
- Cron checks prices every 5 minutes and auto-closes positions hitting SL/TP
- Trade history shows close reason: manual, stop-loss, or take-profit
- Open Positions table shows SL and TP price columns
- Existing trades without SL/TP continue to work (backward compatible)
- All existing tests pass

## Validation Commands

- `pnpm exec nx reset` — Clear cache
- `pnpm exec nx run-many -t typecheck` — Type safety
- `pnpm exec nx run-many -t build` — Build all
- `pnpm exec nx run-many -t lint` — Lint
- `timeout 30 npx jest --config apps/api/jest.config.ts apps/api/src/paper-trading/paper-trading.service.spec.ts --forceExit --no-cache` — Paper trading tests
- `pnpm exec nx run dashboard:test` — Dashboard tests

## Notes

- No new packages required.
- Default SL/TP ratios (5%/10%) are hardcoded. Future enhancement: let users customize per-trade.
- The cron runs on the same 5-minute cycle as market data refresh, ensuring prices are reasonably fresh.
- `closeReason` is nullable for backward compat — existing closed trades will show null (rendered as "manual" in UI).
