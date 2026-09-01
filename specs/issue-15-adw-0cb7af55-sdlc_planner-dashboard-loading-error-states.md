# Feature: Update Dashboard to Handle Loading and Error States

## Metadata

- **issue_number:** 15
- **adw_id:** 0cb7af55
- **issue_json:** {"number":15,"title":"Update dashboard to handle loading and error states","state":"OPEN","labels":["enhancement"]}

## Feature Description

Add loading, error, and empty state handling to the signal table component. Show a spinner while data loads, an error message if the API fails, and an empty state if no signals exist.

## User Story

As a user
I want to see loading and error states in the dashboard
So that I know when data is loading, when something went wrong, or when there's no data

## Problem Statement

The signal table assumes data is always available instantly. With the API now backed by SQLite, there are real async states to handle.

## Solution Statement

Add `loading`, `error`, and computed `isEmpty` state properties to `SignalTableComponent`. Use `@if` control flow in the template to show a `mat-spinner` during loading, an error card on failure, an empty state message when no data, and the table when data is ready. Catch HTTP errors in the subscribe callback.

## Relevant Files

- `apps/dashboard/src/app/signals/signal-table/signal-table.ts` — Add state properties and error handling
- `apps/dashboard/src/app/signals/signal-table/signal-table.html` — Add conditional rendering for loading/error/empty/table
- `apps/dashboard/src/app/signals/signal-table/signal-table.scss` — Add styles for loading/error/empty states
- `apps/dashboard/src/app/signals/signal-table/signal-table.spec.ts` — Add tests for all states

## Implementation Plan

### Phase 1: Add state management to the component

Add `loading = true` and `error = ''` properties. Update `ngOnInit` to set `loading = false` on success, catch errors and set `error` message. Import `MatProgressSpinnerModule` and `MatCardModule`.

### Phase 2: Update template with conditional rendering

Use Angular `@if` blocks: show spinner when loading, error card when error, empty message when no signals, table when data exists.

### Phase 3: Update tests and validate

Add unit tests for loading, error, and empty states. Run full validation suite.

## Step by Step Tasks

### 1. Update SignalTableComponent

- Add `loading = true` and `error = ''` properties
- Update `ngOnInit` to handle loading/error states:
  ```typescript
  ngOnInit(): void {
    this.signalService.getSignals().subscribe({
      next: (data) => {
        this.signals.data = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load signals. Is the API running?';
        this.loading = false;
      },
    });
  }
  ```
- Import `MatProgressSpinnerModule` and `MatCardModule`

### 2. Update template

- Wrap content in `@if` blocks:
  - `@if (loading)` — show `<mat-spinner>`
  - `@else if (error)` — show error message in a `<mat-card>`
  - `@else if (signals.data.length === 0)` — show empty state
  - `@else` — show the existing table

### 3. Add styles

- Add centered spinner, error card, and empty state styles

### 4. Update unit tests

- Add test: shows loading spinner initially (before subscribe resolves)
- Add test: shows error message when service returns error
- Add test: shows empty state when service returns empty array
- Existing tests for table rendering and direction colors should still pass

### 5. Run full validation suite

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`

## Testing Strategy

### Unit Tests

- Loading state: spinner visible before data arrives
- Error state: error message visible when HTTP fails
- Empty state: empty message visible when data is []
- Data state: table renders when data arrives (existing tests)

### E2E Tests

Existing e2e tests should pass — they test the normal data flow.

## Acceptance Criteria

- Loading spinner shown while signals are being fetched
- Error message shown if the API request fails
- Empty state shown if the API returns an empty array
- Signal table renders normally when data arrives
- All existing tests pass, coverage >= 70%
- format:check and typecheck pass

## Validation Commands

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`
