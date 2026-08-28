# Chore: Configure Jest test runner for API project

## Description
The API project (`apps/api`) shipped two Jest-style spec files — `signals.service.spec.ts` (5 tests) and `signals.controller.spec.ts` (3 tests) — but had no Jest configuration and no `test` target. `npx nx run api:test` did not exist, and `npx nx run-many -t test` only exercised the dashboard, so the SDLC pipeline could merge API changes without ever running API tests.

This chore adds the Jest infrastructure (toolchain, preset, config, spec tsconfig, and a cacheable `test` target) so the API participates in the workspace test gate. It is Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`. Spec file contents were not modified — this is infrastructure only.

## Design Decisions

- **Jest, not Vitest (the dashboard's runner).** The existing spec files are written in Jest style and the issue explicitly required Jest for the API. Matching the requested runner avoided rewriting spec content, which the acceptance criteria forbade. The workspace now intentionally runs two unit-test runners: Vitest for Angular (`@angular/build:unit-test`), Jest for NestJS.
- **`ts-jest`, not `@swc/jest`.** `ts-jest` is the conventional NestJS transform and needs no extra wiring. Although `@swc/core` is present, `@swc/jest` is not; keeping the transform to a single added package is simpler.
- **Jest 30 line.** `@nx/jest@23.1.0` pulls `jest-config@^30`, so `jest`/`@types/jest` were pinned to `^30` to avoid a major-version mismatch. `ts-jest@^29` is the current stable line and is Jest-30 compatible. `jest-environment-node@^30` is explicit because Jest 30 no longer bundles the node environment.
- **`@nx/jest` promoted to an explicit dev dependency.** It was only transitively installed; making it explicit ensures the `@nx/jest:jest` executor and shared preset resolve reliably.
- **Explicit `test` target in `package.json`, no `nx.json` changes.** The executor is invoked directly from the project target with `cache: true` set locally, matching the repo pattern where `api` declares its targets inline. A `@nx/jest/plugin` inference entry was considered and rejected to keep target definitions explicit and consistent with the existing `build`/`serve`/`prune` targets.
- **Spec files excluded from `tsconfig.app.json`.** The build/typecheck config previously swept in `.spec.ts` via `include: ["src/**/*.ts"]`. Since the specs reference Jest globals only available under the spec tsconfig, they are now excluded (`src/**/*.spec.ts`, `src/**/*.test.ts`) to prevent a build/typecheck regression.
- **Dedicated `tsconfig.spec.json` with CommonJS + decorator metadata.** The workspace base uses `module: nodenext`; Jest/`ts-jest` needs `commonjs`. `experimentalDecorators` + `emitDecoratorMetadata` are required for NestJS classes under test (works with `reflect-metadata`, already an `apps/api` dependency). `composite`/`emitDeclarationOnly`/`declarationMap` are overridden to `false` to avoid conflicts with the base project-references settings during Jest's own compilation. `ignoreDeprecations: "6.0"` was added to silence the TS deprecation warning for these overrides.
- **`@jest-config-loader-options` header in `jest.config.ts`.** Because the base tsconfig targets `nodenext`, the `.ts` Jest config needs explicit loader options (CommonJS, `transpileOnly`, `esModuleInterop`) so Nx/Jest can transpile and load the config file itself. This is separate from the `ts-jest` transform that compiles the spec files.

## Architecture

The feature is pure Nx/Jest configuration wiring — no application code changed.

Data flow when `nx run api:test` executes:
1. Nx invokes the `@nx/jest:jest` executor (declared in `apps/api/package.json` → `nx.targets.test`) with `jestConfig: apps/api/jest.config.ts`.
2. Jest loads `jest.config.ts` (transpiled via the inline `@jest-config-loader-options` header), which extends the workspace-root `jest.preset.js` (a re-export of `@nx/jest/preset`).
3. The `ts-jest` transform compiles `.ts`/`.js` under `apps/api/tsconfig.spec.json` in a `node` test environment.
4. The 8 spec tests run; coverage (when collected) is written to `coverage/apps/api`.

Integration with the rest of the system: the target is cacheable, so it joins `nx run-many -t test` and `nx affected -t test` alongside the dashboard's Vitest target. `apps/api/tsconfig.json` references both `tsconfig.app.json` (build) and `tsconfig.spec.json` (tests), mirroring the dashboard convention and keeping build and test compilation cleanly separated.

## Key Files

- `jest.preset.js` (workspace root) — Shared Nx Jest preset re-export, extended by every project's Jest config.
- `apps/api/jest.config.ts` — API Jest config: `node` environment, `ts-jest` transform against `tsconfig.spec.json`, plus the `@jest-config-loader-options` header for loading the config under `nodenext`.
- `apps/api/tsconfig.spec.json` — TypeScript config scoped to `jest.config.ts` + spec files; CommonJS output, `["jest","node"]` types, decorator metadata enabled.
- `apps/api/tsconfig.json` — Solution tsconfig; now references both `tsconfig.app.json` and `tsconfig.spec.json`.
- `apps/api/tsconfig.app.json` — Build/typecheck config; now excludes `*.spec.ts`/`*.test.ts`.
- `apps/api/package.json` — Declares the cacheable `test` target (`@nx/jest:jest` executor).
- `package.json` (root) — Adds dev deps: `jest@^30`, `ts-jest@^29`, `@types/jest@^30`, `@nx/jest@^23.1.0`, `jest-environment-node@^30`.
- `apps/api/src/signals/*.spec.ts` — The 8 existing tests (unchanged).

## Acceptance Criteria

- `npx nx run api:test` exists and all 8 spec tests (5 service + 3 controller) pass.
- `npx nx run-many -t test` runs **both** `api` and `dashboard`.
- Spec file contents are unchanged from before this chore.
- `npx nx run-many -t build` and `-t lint` pass with no regression from the tsconfig changes.

## Validation Commands

- `npx nx run api:test` — Runs the API Jest target; all 8 spec tests must pass.
- `npx nx run-many -t test` — Runs tests for both `api` and `dashboard`.
- `npx nx run-many -t build` — Confirms no build regression from the tsconfig changes.
- `npx nx run-many -t lint` — Confirms lint is unaffected.

## Notes

- The workspace deliberately runs two unit-test runners (Vitest for Angular, Jest for NestJS). Future API libs adopting Jest should follow this same preset + `tsconfig.spec.json` pattern.
- If a decorator/metadata error ever appears in API tests, confirm `experimentalDecorators` + `emitDecoratorMetadata` remain set in `tsconfig.spec.json` and that `reflect-metadata` is still an `apps/api` dependency.
- No `nx.json` `targetDefaults` entry is required; caching is configured on the target itself.
