# API Jest Test Runner Configuration

**ADW ID:** 83c495bb
**Date:** 2026-08-28
**Spec:** specs/issue-2-adw-83c495bb-sdlc_planner-configure-api-jest-runner.md

## Summary

The NestJS API project (`apps/api`) shipped two Jest-style spec files but had no Jest configuration and no `test` target, so `npx nx run api:test` did not exist and `npx nx run-many -t test` only exercised the dashboard. This chore installs the Jest toolchain and wires up a cacheable `test` target for the API, closing Phase Z1 (Validation Floor) of `docs/zte-roadmap.md` — the SDLC pipeline can no longer merge API changes without running API tests. Spec file contents were left untouched (infrastructure only).

## What Changed

**API (`apps/api/`)**

- Added `jest.config.ts` — Jest configuration using the Nx preset and a `ts-jest` transform.
- Added `tsconfig.spec.json` — TypeScript config scoped to Jest spec files with Jest globals and CommonJS output.
- Added a `test` target to `package.json` (`nx.targets`) using the `@nx/jest:jest` executor, cacheable.
- Referenced `./tsconfig.spec.json` from `tsconfig.json` (project solution config).
- Excluded `*.spec.ts` / `*.test.ts` from `tsconfig.app.json` so build/typecheck no longer compiles Jest-global code.

**Workspace (root)**

- Added `jest.preset.js` — shared Nx Jest preset re-export referenced by the API's `jest.config.ts`.
- Added dev dependencies: `jest@^30`, `ts-jest@^29`, `@types/jest@^30`, `@nx/jest@^23.1.0`, `jest-environment-node@^30`, `ts-node@^10.9.2`.

**Tooling**

- `scripts/sdlc.sh` — redirected the per-phase cost/turns/duration summary line to stderr so it no longer pollutes the phase result on stdout.

## How It Works

Running `npx nx run api:test` invokes the `@nx/jest:jest` executor declared in `apps/api/package.json`, pointing at `apps/api/jest.config.ts`. That config extends the workspace-root `jest.preset.js` (which re-exports `@nx/jest/preset`), sets `testEnvironment: 'node'` (correct for NestJS — no DOM), and transforms `.ts`/`.js` files with `ts-jest` using `apps/api/tsconfig.spec.json`.

The spec tsconfig overrides the `nodenext` base to `module: commonjs` (what `ts-jest` expects), pulls in `["jest", "node"]` type definitions so `describe`/`it`/`expect` globals resolve, and enables `experimentalDecorators` + `emitDecoratorMetadata` so NestJS classes under test compile correctly. `composite`/`emitDeclarationOnly`/`declarationMap` are disabled to avoid conflicts with the base project-references settings during Jest's own compilation.

Because the app build config (`tsconfig.app.json`) now excludes spec files, the Jest-global code only ever compiles under the spec tsconfig — preventing a build/typecheck regression. The `test` target declares `cache: true` and coverage outputs, so Nx caches results locally; no `nx.json` `targetDefaults` or plugin registration is needed since the executor is invoked directly from the project target.

## How to Use

Run the API test suite:

```
npx nx run api:test
```

All 8 existing spec tests (5 in `signals.service.spec.ts`, 3 in `signals.controller.spec.ts`) run under Jest.

Run every project's tests (now includes both `api` and `dashboard`):

```
npx nx run-many -t test
```

## Configuration

None. No environment variables or manual setup required — dependencies install via `npm install` and the `test` target is defined inline in `apps/api/package.json`.

## Key Files

- `apps/api/jest.config.ts` — API Jest config (Nx preset + `ts-jest` transform + node environment).
- `apps/api/tsconfig.spec.json` — TypeScript config scoped to Jest spec files (CommonJS, Jest types, decorator metadata).
- `apps/api/tsconfig.app.json` — Build/typecheck config; now excludes spec files.
- `apps/api/tsconfig.json` — Project solution config; now references `tsconfig.spec.json`.
- `apps/api/package.json` — Adds the cacheable `test` target using `@nx/jest:jest`.
- `jest.preset.js` — Workspace-root shared Nx Jest preset.
- `package.json` — Adds the Jest toolchain dev dependencies.

## Validation

- `npx nx run api:test` — Runs the API Jest target; all 8 spec tests must pass.
- `npx nx run-many -t test` — Runs tests for both `api` and `dashboard`.
- `npx nx run-many -t build` — Confirms no build regression from the tsconfig changes.
- `npx nx run-many -t lint` — Confirms code quality is unaffected.
