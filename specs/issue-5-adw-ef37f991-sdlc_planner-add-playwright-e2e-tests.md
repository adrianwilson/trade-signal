# Feature: Add Playwright E2E Test Infrastructure and Initial Tests

## Metadata
- **issue_number:** 5
- **adw_id:** ef37f991
- **issue_json:** {"number":5,"title":"Add Playwright e2e test infrastructure and initial tests","state":"OPEN","labels":["enhancement"],"body":"Add Playwright to the Nx workspace, create dashboard-e2e project, write initial e2e tests, configure e2e to start both API and dashboard before running, add e2e step to /test command."}

## Feature Description

Unit and integration tests validate code in isolation, but nothing verifies the dashboard actually loads and renders data from the API. E2E tests catch wiring bugs agents are most likely to introduce — broken imports, incorrect routes, missing providers. This feature adds Playwright-based end-to-end tests that verify the full Angular dashboard + NestJS API stack works together: the page loads, the signal table renders, rows appear from the API (6 seed signals), and direction chips show correct color coding (BUY=green, SELL=red, HOLD=orange).

This is the final issue in ZTE Roadmap Phase Z1 (Validation Floor). After this, the pipeline's test gate covers unit tests, integration tests, coverage enforcement, and e2e tests.

## User Story
As a developer
I want e2e tests that verify the full application works end-to-end
So that the pipeline catches integration and wiring bugs before merging

## Problem Statement

The pipeline validates code correctness through unit tests (Jest/Vitest) and integration tests (supertest), but nothing verifies that the Angular dashboard actually boots, connects to the NestJS API, fetches signals, and renders them correctly. Wiring bugs — broken imports, incorrect routes, missing providers, CORS misconfigurations — are invisible to unit/integration tests and can only be caught by launching both apps and interacting with the real UI. Without e2e tests, the test gate has a blind spot: "tests passed" doesn't mean "the app works."

## Solution Statement

Use the `@nx/playwright` plugin to scaffold a `dashboard-e2e` project that:

1. Installs `@nx/playwright` and runs the Nx Playwright configuration generator to set up the project at `apps/dashboard-e2e/`.
2. Configures Playwright to start both the NestJS API (port 3000) and Angular dashboard (port 4200) via `webServer` before tests run, so e2e tests are self-contained.
3. Writes initial e2e test specs that verify: page loads with correct title, signal table heading renders, table displays rows from the API (at least 5 seed signals exist), and direction column chips show correct color coding (BUY=#4caf50, SELL=#f44336, HOLD=#ff9800).
4. Updates the `/test` command (`.claude/commands/test.md`) to include an e2e step.
5. Updates the ZTE roadmap to mark the e2e item complete.

## Relevant Files
Use these files to implement the feature:

- `nx.json` — Workspace config; will gain `@nx/playwright` plugin registration after generator runs.
- `package.json` — Root dependencies; `@nx/playwright` and `@playwright/test` will be added as devDependencies.
- `tsconfig.base.json` — Root TS config; may need path mapping if the e2e project references shared types.
- `apps/dashboard/project.json` — Dashboard project config; the `serve` target is what the Playwright `webServer` will launch for the dashboard.
- `apps/api/package.json` — API project config; the `serve` target is what the Playwright `webServer` will launch for the API.
- `apps/dashboard/src/app/signals/signal-table/signal-table.ts` — Signal table component; e2e tests assert against its rendered output (table rows, direction chip colors).
- `apps/dashboard/src/app/signals/signal-table/signal-table.html` — Signal table template; e2e selectors target `mat-chip`, `mat-row`, table heading.
- `apps/api/src/signals/signals.service.ts` — Seed signal data (6 signals); e2e tests assert at least 5 rows render.
- `.claude/commands/test.md` — Pipeline test command; will add an e2e step.
- `docs/zte-roadmap.md` — ZTE roadmap; will mark e2e item complete in Phase Z1.

### New Files

- `apps/dashboard-e2e/project.json` — Nx project config for the e2e project (created by generator, may need manual adjustment for `webServer` config).
- `apps/dashboard-e2e/playwright.config.ts` — Playwright configuration with `webServer` entries for API and dashboard, headless mode, base URL.
- `apps/dashboard-e2e/src/dashboard.spec.ts` — Initial e2e test file with test cases for page load, table rendering, row count, and direction color coding.
- `apps/dashboard-e2e/tsconfig.json` — TypeScript config for the e2e project (created by generator).
- `apps/dashboard-e2e/.eslintrc.json` or `apps/dashboard-e2e/eslint.config.mjs` — Lint config (created by generator).

## Implementation Plan
### Phase 1: Foundation

Install `@nx/playwright` and run the Nx Playwright generator to scaffold the `dashboard-e2e` project. This creates the project structure, config files, and Nx target wiring. Install Playwright browsers (chromium at minimum) for headless testing.

### Phase 2: Core Implementation

Configure `playwright.config.ts` with two `webServer` entries (API on port 3000, dashboard on port 4200) so tests are self-contained. Write the initial e2e test spec (`dashboard.spec.ts`) covering: page loads, signal table heading renders, table has at least 5 data rows, and direction chips have correct background colors for BUY/SELL/HOLD.

### Phase 3: Integration

Update `.claude/commands/test.md` to add an e2e test step. Update `docs/zte-roadmap.md` to mark the e2e item complete. Run the full validation suite to confirm zero regressions and that e2e tests pass in headless mode.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Install @nx/playwright and scaffold the e2e project

- Run `npm install -D @nx/playwright` to add the Playwright plugin.
- Run `npx nx g @nx/playwright:configuration --project=dashboard-e2e --directory=apps/dashboard-e2e --webServerCommand="npx nx serve dashboard" --webServerAddress="http://localhost:4200"` to scaffold the project. If the generator requires a project to already exist, create a minimal project first or use the appropriate generator flags.
- If the generator doesn't exist or fails, manually create the project structure:
  - `apps/dashboard-e2e/project.json` with an `e2e` target using `@nx/playwright:playwright`.
  - `apps/dashboard-e2e/tsconfig.json` extending the root config.
  - `apps/dashboard-e2e/playwright.config.ts` with base configuration.
- Run `npx playwright install chromium` to install the Chromium browser for headless testing.

### 2. Configure Playwright with dual webServer

- Edit `apps/dashboard-e2e/playwright.config.ts` to configure:
  - `baseURL: 'http://localhost:4200'`
  - `webServer` array with two entries:
    - API: `command: 'npx nx serve api'`, `url: 'http://localhost:3000/api/signals'`, `reuseExistingServer: !process.env['CI']`
    - Dashboard: `command: 'npx nx serve dashboard'`, `url: 'http://localhost:4200'`, `reuseExistingServer: !process.env['CI']`
  - `use.headless: true` for CI-friendly execution.
  - `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]` — Chromium only for speed.
  - `reporter: [['list'], ['html', { open: 'never' }]]`
  - `outputDir: 'test-results'`
- Ensure the `e2e` target in `apps/dashboard-e2e/project.json` points to the correct playwright config and has appropriate `outputs` for caching.

### 3. Write the initial e2e test spec

- Create `apps/dashboard-e2e/src/dashboard.spec.ts` with the following test cases:
  - **Test 1: Dashboard loads** — Navigate to `/`, assert page title or heading is present.
  - **Test 2: Signal table heading renders** — Assert `h2` with text "Trading Signals" is visible.
  - **Test 3: Signal table displays rows** — Assert `mat-row` elements exist, count >= 5 (API has 6 seed signals).
  - **Test 4: Direction column shows correct colors** — Find `mat-chip` elements within direction cells, assert:
    - BUY chips have `background-color` of `rgb(76, 175, 80)` (#4caf50)
    - SELL chips have `background-color` of `rgb(244, 67, 54)` (#f44336)
    - HOLD chips have `background-color` of `rgb(255, 152, 0)` (#ff9800)
- Use Playwright best practices: `test.describe` blocks, `expect` assertions, `page.waitForSelector` for async data loading.

### 4. Verify e2e tests pass

- Run `npx nx run dashboard-e2e:e2e --skip-nx-cache` and confirm all tests pass in headless mode.
- If tests fail, debug and fix — common issues: selector mismatches, timing (need `waitForSelector`), webServer startup timing.

### 5. Update the /test pipeline command

- Edit `.claude/commands/test.md` to add a step 5:
  - **Run E2E Tests**
  - Command: `npx nx run dashboard-e2e:e2e`
  - test_name: "e2e"
  - test_purpose: "Validates the full application works end-to-end — dashboard loads, connects to API, renders signal data correctly"
  - Note: This step starts both API and dashboard via Playwright's webServer config, runs headless Chromium tests, then tears down the servers.

### 6. Update ZTE roadmap

- Edit `docs/zte-roadmap.md` Phase Z1 to mark the e2e item complete:
  - `[x] Add e2e tests (Playwright) — dashboard loads, signal table renders, direction colors correct — closed by issue #5`
  - Update the wiring item to note e2e is now also wired into `/test`.

### 7. Run the full validation suite

- Run every command in `Validation Commands` below and confirm all pass with zero regressions.

## Testing Strategy
### Unit Tests

No new unit tests are required. This feature adds e2e tests, not unit-testable logic. Existing unit tests must continue to pass with coverage enforcement.

### Integration Tests

No new integration tests. The existing API integration tests (`signals.integration.spec.ts`) continue to pass.

### E2E Tests (if UI-affecting)

This feature IS the e2e test infrastructure. The tests themselves are:

1. **Dashboard loads** — Verifies the Angular app boots and serves a page at localhost:4200.
2. **Signal table heading renders** — Verifies the `SignalTableComponent` renders its "Trading Signals" heading.
3. **Signal table displays rows** — Verifies the table fetches data from the API and renders >= 5 rows (API has 6 seed signals).
4. **Direction colors are correct** — Verifies `mat-chip` elements in the direction column have the correct background colors: BUY=#4caf50 (green), SELL=#f44336 (red), HOLD=#ff9800 (orange).

### Edge Cases

- **API not starting in time** — Playwright's `webServer.timeout` must be long enough for the NestJS API to compile and boot (default 60s should suffice, increase to 120s if needed).
- **Dashboard not starting in time** — Angular dev server can be slow on first compile; set adequate timeout.
- **Async data loading** — Signal table fetches data via HTTP on `ngOnInit`; tests must wait for rows to appear (use `waitForSelector` or Playwright auto-waiting on locators).
- **CI environment** — Tests must run headless with `reuseExistingServer: false` in CI so servers are always fresh.
- **Port conflicts** — If port 3000 or 4200 is already in use, `webServer` will fail. `reuseExistingServer: !process.env['CI']` handles local dev (reuses running servers) vs CI (always starts fresh).
- **Color assertion format** — Browser computed styles return `rgb(r, g, b)` format, not hex. Assertions must use RGB values.

## Acceptance Criteria

- Playwright is installed and configured in the Nx workspace via `@nx/playwright`.
- `apps/dashboard-e2e/` project exists with `playwright.config.ts`, test specs, and Nx `e2e` target.
- `npx nx run dashboard-e2e:e2e` starts both API (port 3000) and dashboard (port 4200) automatically, runs all tests in headless Chromium, and exits cleanly.
- Tests verify: page loads, "Trading Signals" heading renders, table displays >= 5 rows, direction chips show correct colors (BUY=green, SELL=red, HOLD=orange).
- `.claude/commands/test.md` includes an e2e test step (`npx nx run dashboard-e2e:e2e`).
- `docs/zte-roadmap.md` Phase Z1 marks the e2e item complete (issue #5).
- `npx nx run-many -t build`, `npx nx run-many -t test`, and `npx nx run-many -t lint` all pass with zero regressions.
- All e2e tests pass in headless mode.

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npx nx run dashboard-e2e:e2e --skip-nx-cache` - Run e2e tests; must start both servers and pass all test cases in headless mode
- `npx nx run-many -t build` - Build all projects to validate zero regressions
- `npx nx run-many -t test` - Run all unit/integration tests to validate zero regressions (with coverage enforcement)
- `npx nx run-many -t lint` - Lint all projects (including the new e2e project) to validate code quality

## Notes

- **New dependencies:** `@nx/playwright` (Nx plugin) and `@playwright/test` (Playwright itself). The Nx generator should handle installing `@playwright/test` as a peer dependency. Chromium browser binary installed via `npx playwright install chromium`.
- **Two webServers:** Playwright supports an array of `webServer` configs. The API must start first (dashboard depends on it for data), so order matters in the array. API is checked via `http://localhost:3000/api/signals` (a real endpoint that returns data), dashboard via `http://localhost:4200`.
- **Selector strategy:** Use Angular Material's rendered DOM structure — `mat-row` for table rows, `mat-chip` for direction chips. These are stable selectors since they come from the Material component library. Avoid brittle CSS class selectors.
- **Color values:** The `directionColor()` method in `signal-table.ts` returns hex values (#4caf50, #f44336, #ff9800) which are applied as inline `background-color` styles on `mat-chip`. Browser computed styles return RGB format, so assertions use: `rgb(76, 175, 80)`, `rgb(244, 67, 54)`, `rgb(255, 152, 0)`.
- **CI considerations:** The GitHub Actions CI pipeline runs on `ubuntu-latest`. Playwright's Chromium works on Ubuntu out of the box. The `webServer` config with `reuseExistingServer: !process.env['CI']` ensures servers are always started fresh in CI.
- **Future considerations:** Additional e2e tests for CRUD operations (create signal, delete signal) can be added in future issues. The infrastructure this issue creates is the foundation for all future e2e testing.
