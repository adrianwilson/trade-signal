# Bug: Paper trading has no obvious way to close positions

## Metadata

- **issue_number:** trading
- **adw_id:** has
- **issue_json:** no

## Bug Description

After following a signal on the Synthesis page, there's no way to close the paper trade from that context. The Close button exists on the Paper Trading page (`/paper`), but users don't realize they need to navigate there. The "Following" badge on synthesis cards provides no link or action to manage the position. The result is confusion — users think they can't exit paper trades.

**Expected:** After following a signal, users can easily close the position without hunting for the Paper Trading page.

**Actual:** The "Following" button becomes a disabled badge with no path to closing the trade.

## Problem Statement

The synthesis cards show "Following" after a signal is followed but provide no way to close/exit the position. Users must independently discover the Paper Trading page in the sidenav to close positions.

## Solution Statement

Replace the disabled "Following" badge on synthesis cards with an active "Close Position" button that directly closes the paper trade. After closing, the button reverts to the original "Follow" state. This is a minimal, surgical fix — no new pages or components needed.

## Steps to Reproduce

1. Login and navigate to Synthesis view
2. Click "Follow BUY Signal" on any synthesis card
3. Button changes to "Following" (disabled)
4. There is no way to close the position from this view
5. User must navigate to Paper Trading page in sidenav to find the Close button

## Root Cause Analysis

The `SynthesisViewComponent.followSignal()` method adds the asset to `followedAssets` set, which renders a disabled "Following" button with no click handler. There is no `unfollowSignal()` or `closePosition()` method in the component. The Close functionality only exists in `PaperTradingComponent`.

## Relevant Files

- `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.ts` — Add close position method, track followed state as closeable
- `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.html` — Replace disabled "Following" button with "Close Position" button
- `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.spec.ts` — Add test for close position flow

## Step by Step Tasks

### Step 1: Add closePosition method to SynthesisViewComponent

- Edit `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.ts`:
  - Add `closingInProgress = signal<Set<string>>(new Set());`
  - Add `closePosition(synthesis: AggregatedSignal)` method:
    - Get `paperAccountId()`
    - Call `signalService.closePaperPosition(accountId, synthesis.asset)`
    - On success: remove asset from `followedAssets`, clear from `closingInProgress`
    - On error: clear from `closingInProgress`

### Step 2: Update template to show Close Position button

- Edit `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.html`:
  - Replace the disabled "Following" button with an active "Close Position" button
  - Button should call `closePosition(s)` and show "Closing..." while in progress
  - Use `warn` color to distinguish from the Follow button

### Step 3: Update tests

- Edit `apps/dashboard/src/app/signals/synthesis-view/synthesis-view.spec.ts`:
  - Add `closingInProgress` signal to test setup
  - Test that closePosition removes asset from followedAssets (mock the service call)

### Step 4: Validate

- Run all validation commands

## Validation Commands

- `pnpm exec nx reset` — Clear cache
- `pnpm exec nx run-many -t typecheck` — Verify type safety
- `pnpm exec nx run-many -t build` — Build all projects
- `pnpm exec nx run-many -t lint` — Lint all projects
- `pnpm exec nx run dashboard:test` — Run dashboard tests

## Notes

- No backend changes needed — `closePaperPosition` already exists in `SignalService`
- No new packages required
- The Paper Trading page's Close button continues to work independently
