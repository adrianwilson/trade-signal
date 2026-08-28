# Feature: Add Coverage Thresholds to Test Configuration

## Metadata

- **issue_number:** 4
- **adw_id:** b9896634
- **issue_json:** `{"number":4,"title":"Add coverage thresholds to test configuration","state":"OPEN","labels":["enhancement"],"body":"Tests pass but there's no coverage enforcement. An agent could delete half the tests and the pipeline would still report success. Add Jest coverage configuration to the API, coverage configuration to the dashboard, set 70% thresholds (lines, branches, functions, statements), update the /test command with a coverage check step, and ensure coverage is reported and enforced for both projects. Part of ZTE Roadmap Phase Z1: Validation Floor (docs/zte-roadmap.md). Depends on issue #2 (Jest configuration for API)."}`

## Feature Description

Both projects in the monorepo run their test suites (`api` via Jest, `dashboard` via the Angular `@angular/build:unit-test` Vitest runner), but neither collects or enforces code coverage. As a result the test gate is weak: an agent (or a human) could delete half the tests, or ship a large block of untested code, and `npx nx run-many -t test` would still report success. The pipeline treats "tests pass" as a proxy for "the code is exercised," but nothing enforces that proxy.

This feature adds **coverage collection and threshold enforcement to both projects** at a floor of **70% for lines, branches, functions, and statements**. When coverage for either project drops below the floor, the test target fails — which fails the SDLC pipeline's test gate. The `/test` command is updated so coverage enforcement is an explicit, visible step in the validation sequence.

The value: the test gate becomes _meaningful_. Coverage can no longer silently regress; every change that removes tests or adds untested code is caught before merge.

## User Story

As a developer
I want coverage thresholds enforced by the pipeline
So that test coverage cannot silently regress

## Problem Statement

The `api:test` (Jest) and `dashboard:test` (Angular Vitest builder) targets execute tests but never collect coverage and never enforce a minimum. Two concrete failure modes are currently invisible to the pipeline:

1. **Test deletion** — removing tests keeps the suite green (fewer assertions, still "passing").
2. **Untested code growth** — adding production code with no accompanying tests keeps the suite green.

Because the pipeline's test gate (`.claude/commands/test.md` → `npx nx run-many -t test`) equates "exit code 0" with "validated," both failure modes pass the gate. There is no floor below which the build is considered inadequately tested. This is the open item in Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`.

## Solution Statement

Enable coverage collection on both test targets and enforce a shared 70% floor, using each runner's native threshold mechanism (no new tooling beyond what is already installed):

- **API (Jest):** Add a `coverageThreshold.global` block (70/70/70/70) and a scoped `collectCoverageFrom` to `apps/api/jest.config.ts`, and enable coverage on the target by setting `codeCoverage: true` in the `@nx/jest:jest` executor options in `apps/api/package.json`. Jest enforces the threshold automatically when coverage is collected and exits non-zero if the floor is not met.
- **Dashboard (Angular `@angular/build:unit-test`):** Add `coverage: true`, `coverageThresholds` (70/70/70/70), and scoping (`coverageInclude`/`coverageExclude`) to the `test` target options in `apps/dashboard/project.json`. The builder exits with an error when thresholds are not met.
- **Scoping:** Exclude non-meaningful files from the denominator — bootstrap (`main.ts`), Nest/Angular wiring (`*.module.ts`, `app.config.ts`, `app.routes.ts`), and spec files — so the 70% floor measures real logic (services, controllers, components) rather than untestable framework glue. Measure baseline coverage first; if either project cannot reach 70% after sensible scoping, add the minimum unit tests required to clear the floor.
- **Command:** Update `.claude/commands/test.md` so the test step explicitly documents that coverage thresholds are enforced (the enforcement rides on the existing `npx nx run-many -t test` invocation because coverage is now on by default in both targets), keeping the command's JSON report contract unchanged.

Coverage output for both projects lands under `coverage/apps/<project>` (already the API's configured `coverageDirectory`), so Nx caching and any future reporting can consume it.

## Relevant Files

Use these files to implement the feature:

- `apps/api/jest.config.ts` — API Jest config. **Add** `coverageThreshold.global` (70/70/70/70), `collectCoverageFrom`, and `coverageReporters`. `coverageDirectory` is already set to `../../coverage/apps/api`.
- `apps/api/package.json` — Declares the API `test` target using `@nx/jest:jest`. **Add** `"codeCoverage": true` (and, if desired, `"ci": true`) to the target `options` so coverage is always collected and the Jest threshold is enforced on every `nx run api:test`. `outputs` already points at `{workspaceRoot}/coverage/{projectRoot}`.
- `apps/dashboard/project.json` — Dashboard project config. **Modify** the `test` target (`@angular/build:unit-test` executor) to add `coverage: true`, `coverageThresholds` (70/70/70/70), `coverageInclude`, `coverageExclude`, and `coverageReporters`. Also add an `outputs` entry so the coverage dir is cached.
- `apps/dashboard/tsconfig.spec.json` — Dashboard spec tsconfig (referenced to confirm spec globbing; no change expected).
- `apps/api/tsconfig.spec.json` — API spec tsconfig (reference only; specs already scoped here).
- `.claude/commands/test.md` — Pipeline validation command. **Update** the "Run All Tests" step to state that coverage thresholds (70% floor) are enforced as part of the test target, and add an explicit coverage note/step. Keep the JSON output contract identical.
- `nx.json` — Workspace config; `targetDefaults` reference for the `@angular/build:unit-test` and jest targets. Reference only unless a shared `outputs`/`inputs` default is preferred over per-project `outputs`.
- `docs/zte-roadmap.md` — Phase Z1 (Validation Floor) tracking; reference to confirm this closes the coverage-enforcement item.
- `app_docs/feature-83c495bb-api-jest-test-runner.md` — Documents the existing API Jest setup (preset, tsconfig.spec, target wiring) this feature builds on.
- `app_docs/feature-28da6304-api-integration-tests.md` — Documents the API integration suite that contributes to API coverage.

### New Files

- `apps/api/src/app/app.service.spec.ts` — **Only if needed** to reach the API 70% floor. `app.service.ts` and `app.controller.ts` are currently uncovered; a small unit test for `AppService.getData()` (and/or `AppController`) may be required. Create only if the baseline coverage run shows the API below 70% after scoping.
- `apps/dashboard/src/app/layout/layout.spec.ts` — **Only if needed** to reach the dashboard 70% floor. `layout.ts` is currently uncovered; add a minimal component-creation spec if baseline coverage is below 70% after scoping.

## Implementation Plan

### Phase 1: Foundation

Establish the baseline. Run each project's tests with coverage collection _without_ thresholds first, to see the real numbers per file. This determines (a) which files must be excluded as untestable framework glue and (b) whether any additional tests are needed to clear 70%. Decide the shared scoping rules (exclude `main.ts`, `*.module.ts`, `app.config.ts`, `app.routes.ts`, and specs) and confirm both runners' coverage output locations.

### Phase 2: Core Implementation

Wire coverage + thresholds into both test targets:

- API: `coverageThreshold`, `collectCoverageFrom`, and reporters in `jest.config.ts`; enable `codeCoverage` on the target in `package.json`.
- Dashboard: `coverage`, `coverageThresholds`, include/exclude globs, and reporters on the `test` target in `project.json`; add `outputs` for caching.
  Then add the minimum tests required (if any) so both projects pass at 70%.

### Phase 3: Integration

Update `.claude/commands/test.md` so the enforcement is explicit in the pipeline's validation sequence. Verify the full gate: `npx nx run-many -t test` now collects coverage and fails if either project is under 70%. Confirm zero regressions across build/lint/typecheck and that Nx caching still functions with the new coverage outputs. Update `docs/zte-roadmap.md` to mark the Validation Floor coverage item complete.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Read context and confirm the current setup

- Read `README.md`, `app_docs/feature-83c495bb-api-jest-test-runner.md`, and `app_docs/feature-28da6304-api-integration-tests.md`.
- Read `.claude/commands/conditional_docs.md` and confirm the two API-test docs above are the relevant conditional docs (they are).
- Confirm `apps/api/jest.config.ts`, `apps/api/package.json` (`nx.targets.test`), and `apps/dashboard/project.json` (`targets.test`) match the descriptions in Relevant Files.

### 2. Measure the API coverage baseline

- Run `npx nx run api:test --codeCoverage --skip-nx-cache` and record per-file line/branch/function/statement coverage.
- Identify untestable framework files to exclude: `apps/api/src/main.ts` (bootstrap), `apps/api/src/**/*.module.ts` (DI wiring). Note whether `app.controller.ts` / `app.service.ts` are uncovered (they currently have no specs).

### 3. Configure API Jest coverage + thresholds

- Edit `apps/api/jest.config.ts` to add:
  - `collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts', '!src/**/*.module.ts']` (adjust to the scoping decided in step 2).
  - `coverageReporters: ['text', 'text-summary', 'html', 'lcov']`.
  - `coverageThreshold: { global: { lines: 70, branches: 70, functions: 70, statements: 70 } }`.
  - Keep the existing `coverageDirectory: '../../coverage/apps/api'`.
- Edit `apps/api/package.json` → `nx.targets.test.options` to add `"codeCoverage": true` (and `"ci": true` for deterministic non-interactive runs). Leave `outputs` as-is (`{workspaceRoot}/coverage/{projectRoot}`).

### 4. Bring the API to the 70% floor (only if step 2 showed it below)

- If `app.service.ts` / `app.controller.ts` are dragging coverage below 70%, create `apps/api/src/app/app.service.spec.ts` (and/or an `app.controller.spec.ts`) with minimal unit tests following the existing `signals.service.spec.ts` / `signals.controller.spec.ts` patterns.
- Re-run `npx nx run api:test --skip-nx-cache` and confirm it passes with coverage ≥ 70% on all four metrics.

### 5. Measure the dashboard coverage baseline

- Run `npx nx run dashboard:test --coverage --skip-nx-cache` and record per-file coverage.
- Identify untestable files to exclude: `src/main.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, and any pure DI/module files. Note whether `layout.ts` is uncovered.

### 6. Configure dashboard coverage + thresholds

- Edit `apps/dashboard/project.json` → `targets.test.options` to add:
  - `"coverage": true`.
  - `"coverageThresholds": { "lines": 70, "branches": 70, "functions": 70, "statements": 70 }`.
  - `"coverageInclude": ["src/**/*.ts"]`.
  - `"coverageExclude": ["src/**/*.spec.ts", "src/main.ts", "src/test-setup.ts", "src/app/app.config.ts", "src/app/app.routes.ts"]` (adjust to the scoping decided in step 5).
  - `"coverageReporters": ["text", "text-summary", "html"]`.
  - Keep `"watch": false`.
- Add an `"outputs": ["{workspaceRoot}/coverage/apps/dashboard"]` entry to the `test` target so coverage output is cached by Nx. Confirm the builder writes coverage under that path (adjust the path to match the builder's actual output location observed in step 5).

### 7. Bring the dashboard to the 70% floor (only if step 5 showed it below)

- If `layout.ts` (or another component) drags coverage below 70%, create a minimal spec (e.g. `apps/dashboard/src/app/layout/layout.spec.ts`) following the existing `app.spec.ts` / `signal-table.spec.ts` patterns (standalone component, `TestBed`, `createComponent`, assert truthy).
- Re-run `npx nx run dashboard:test --skip-nx-cache` and confirm it passes with coverage ≥ 70% on all four metrics.

### 8. Verify threshold enforcement actually fails the build

- Temporarily comment out or `.skip` a test in each project (or lower one threshold to 100 locally) and confirm the corresponding `nx run <project>:test` **fails** with a coverage/threshold error. Then restore the tests/thresholds. This proves the gate is real, not cosmetic.

### 9. Update the `/test` pipeline command

- Edit `.claude/commands/test.md`, step "4. Run All Tests": note that `npx nx run-many -t test` now collects coverage and enforces the 70% floor (lines/branches/functions/statements) for both projects, and that a below-floor result fails this step. Optionally add a dedicated `test_name: "coverage"` note clarifying enforcement is built into the test target.
- Do **not** change the JSON output contract in the `Report` section — the existing `unit_tests` entry already captures a coverage failure (the test target exits non-zero).

### 10. Update roadmap tracking

- Edit `docs/zte-roadmap.md` Phase Z1 (Validation Floor) to mark the coverage-threshold item complete (reference issue #4).

### 11. Run the full validation suite (zero regressions)

- Run every command in `Validation Commands` below and confirm all pass with coverage reported and enforced for both projects.

## Testing Strategy

### Unit Tests

- The feature is primarily configuration, but its correctness is proven by the test suites themselves running under coverage. Existing suites (`signals.service.spec.ts`, `signals.controller.spec.ts`, `signals.integration.spec.ts`, `app.spec.ts`, `signal.service.spec.ts`, `signal-table.spec.ts`) must continue to pass with coverage collection enabled.
- If baseline coverage is below 70%, add the minimum new unit tests (`app.service.spec.ts` / `app.controller.spec.ts` for API, `layout.spec.ts` for dashboard) needed to clear the floor. New tests follow the existing standalone-component / Nest `TestingModule` patterns already in the repo.

### Integration Tests

- No new integration tests are required; the existing API `signals.integration.spec.ts` continues to contribute to API coverage and must remain green under coverage collection.

### E2E Tests (if UI-affecting)

- Not applicable. This feature changes test-runner configuration only; it does not alter the dashboard's runtime UI, components, routes, or behavior. No new E2E test is required per `.claude/commands/test_e2e.md` (no user-facing UI change).

### Edge Cases

- **Bootstrap files skew coverage:** `main.ts` (both projects) has no tests by design — must be excluded so it doesn't drag the denominator below 70%.
- **DI/config-only files:** `*.module.ts`, `app.config.ts`, `app.routes.ts` are framework wiring with little branch logic — excluded from the coverage set.
- **Threshold not actually enforced:** Jest only enforces `coverageThreshold` when coverage is collected — verify `codeCoverage: true` is set, otherwise the threshold is silently ignored. Step 8 explicitly proves enforcement.
- **Nx cache masking failures:** Coverage runs must be validated with `--skip-nx-cache` at least once so a cached "pass" doesn't hide a real coverage regression.
- **Coverage output path mismatch:** The dashboard builder's actual coverage output dir must match the `outputs` glob or Nx caching will not track it — confirm the path from the baseline run.
- **`perFile` vs global:** Thresholds are global (aggregate), not per-file, so a single well-tested file cannot be required to carry an untested one beyond the aggregate floor. Do not set `perFile: true` unless intentionally stricter.

## Acceptance Criteria

- Jest coverage is configured for the `api` project with a 70% threshold on lines, branches, functions, and statements, enforced on `npx nx run api:test`.
- Dashboard test coverage is configured with a 70% threshold on lines, branches, functions, and statements, enforced on `npx nx run dashboard:test`.
- `npx nx run api:test` fails if API coverage drops below 70%; `npx nx run dashboard:test` fails if dashboard coverage drops below 70% (verified in step 8).
- `npx nx run-many -t test` reports coverage for **both** projects and enforces the 70% floor on both.
- The `.claude/commands/test.md` command is updated to document the coverage-enforcement step; its JSON output contract is unchanged.
- `npx nx run-many -t build`, `npx nx run-many -t lint`, and `npx nx run-many -t typecheck` all pass with zero regressions.
- `docs/zte-roadmap.md` Phase Z1 reflects that coverage enforcement is complete.

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `npx nx run api:test --skip-nx-cache` - Runs the API Jest suite with coverage; must pass and report ≥70% on all four metrics.
- `npx nx run dashboard:test --skip-nx-cache` - Runs the dashboard suite with coverage; must pass and report ≥70% on all four metrics.
- `npx nx run-many -t test --skip-nx-cache` - Runs both projects' tests with coverage enforcement; both must pass at the 70% floor.
- `npx nx run-many -t build` - Build all projects to validate zero regressions.
- `npx nx run-many -t typecheck` - Typecheck all projects to validate zero regressions.
- `npx nx run-many -t lint` - Lint all projects (including any new spec files) to validate code quality.

## Notes

- **No new dependencies.** Jest (`jest`, `ts-jest`, `@nx/jest`) and the Angular Vitest runner (`vitest`, `jsdom`, `@angular/build`) are already installed; both support coverage and thresholds natively. If the dashboard's Vitest coverage requires the `@vitest/coverage-v8` (or `-istanbul`) provider and it is missing, install it as a root dev dependency with `npm install -D @vitest/coverage-v8` and report it here — confirm during the step 5 baseline run.
- **Two different runners, one policy.** The API uses Jest (`@nx/jest:jest`, `coverageThreshold.global`); the dashboard uses the Angular `@angular/build:unit-test` builder (Vitest under the hood, `coverageThresholds` object). The option names differ (`codeCoverage` vs `coverage`; `coverageThreshold.global` vs `coverageThresholds`) — do not mix them up.
- **Scoping is the crux.** The 70% number is only meaningful if the coverage set excludes untestable bootstrap/wiring files. The exact exclude list should be finalized from the baseline runs (steps 2 and 5), not guessed — the lists in steps 3 and 6 are the expected starting point.
- **Future consideration:** thresholds can be ratcheted upward over time (e.g. 70 → 80) once suites mature, and `perFile: true` can be enabled to prevent hot-spot undertesting. Out of scope for this issue.
- **Roadmap alignment:** Closes the coverage-enforcement slice of Phase Z1 (Validation Floor) in `docs/zte-roadmap.md`; builds directly on issue #2 (API Jest runner) and issue #3 (API integration tests).
