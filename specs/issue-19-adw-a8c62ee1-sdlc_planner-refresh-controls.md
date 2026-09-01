# Feature: Add Last-Updated Timestamps and Refresh Controls

## Metadata

- **issue_number:** 19
- **adw_id:** a8c62ee1
- **issue_json:** {"number":19,"title":"Add last-updated timestamps and refresh controls to dashboard","state":"OPEN","labels":["enhancement"]}

## Feature Description

Add a last-updated timestamp and refresh button to the signal table. The timestamp shows when market data was last fetched. The refresh button re-fetches signals and quotes.

## Solution

- Add `lastUpdated` property derived from the most recent `updatedAt` in the quotes response
- Add `refreshing` state for the refresh button loading indicator
- Add `refresh()` method that re-fetches signals and quotes
- Add refresh button (MatIconButton with refresh icon) and timestamp below the table
- Import `MatIconModule` and `MatButtonModule`

## Validation Commands

- `pnpm exec nx run-many -t build test lint typecheck --skip-nx-cache`
- `pnpm exec nx format:check --base=origin/main`
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache`
