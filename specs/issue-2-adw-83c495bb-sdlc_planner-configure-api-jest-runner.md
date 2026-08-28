# Chore: Configure Jest test runner for API project

## Metadata
- **issue_number:** 2
- **adw_id:** 83c495bb
- **issue_json:** {"number":2,"title":"Configure Jest test runner for API project","state":"OPEN","labels":["enhancement"]}

## Chore Description
The API project (`apps/api`) ships two Jest-style spec files — `signals.service.spec.ts` (5 tests) and `signals.controller.spec.ts` (3 tests) — but the project has **no Jest configuration and no `test` target**. As a result `npx nx run api:test` does not exist and `npx nx run-many -t test` only exercises the dashboard.

This is Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`: without an API test gate the SDLC pipeline merges API changes without ever running API tests.

**What this chore delivers:**
- Install the Jest toolchain the workspace is currently missing (`jest`, `ts-jest`, `@types/jest`, and an explicit `@nx/jest`).
- A root `jest.preset.js` (the shared Nx Jest preset — none exists today).
- `apps/api/jest.config.ts` using the `@nx/jest` preset with a `ts-jest` transform.
- `apps/api/tsconfig.spec.json` scoped to spec files.
- A `test` target on `apps/api/package.json` using the `@nx/jest:jest` executor.
- Exclude spec files from `apps/api/tsconfig.app.json` (build/typecheck config) so the spec files — which reference Jest globals — only compile under the spec tsconfig.

Constraint from the issue: **do not modify the content of the existing spec files** — infrastructure only.

## Relevant Files
Use these files to resolve the chore:

- `apps/api/package.json` — Holds the project's Nx config (`nx.targets`). The new `test` target is added here. Currently has `build`, `serve`, `prune*`, etc., but no `test`.
- `apps/api/tsconfig.json` — Project solution tsconfig; references `tsconfig.app.json`. Must add a reference to the new `tsconfig.spec.json` (mirrors the dashboard convention).
- `apps/api/tsconfig.app.json` — Build/typecheck tsconfig. Currently `include: ["src/**/*.ts"]`, which sweeps in the `.spec.ts` files. Must exclude specs so build/typecheck never compiles Jest-global code.
- `apps/api/src/signals/signals.service.spec.ts` — Existing 5 tests (`describe`/`it`/`expect` globals). Must pass unchanged.
- `apps/api/src/signals/signals.controller.spec.ts` — Existing 3 tests. Must pass unchanged.
- `apps/dashboard/tsconfig.spec.json` — Reference pattern for a per-project spec tsconfig (dashboard uses Vitest; API will use Jest, but the structure/`references` convention is the model to follow).
- `apps/dashboard/project.json` — Reference for how the dashboard declares its `test` target (`@angular/build:unit-test`); confirms the workspace convention of an explicit `test` target per project.
- `nx.json` — Workspace config. `targetDefaults` currently covers `@angular/build:unit-test` but has no Jest defaults; `test` is not registered as a cacheable Jest target. Confirm the `@nx/jest:jest` executor works without a plugin entry (it does — the executor is invoked directly from the project target).
- `package.json` (root) — Dev dependencies. `@swc/*` is present; `@nx/jest` is only transitively installed and `jest`/`ts-jest`/`@types/jest` are **not** installed. These must be added.
- `README.md` — Confirms `npx nx run-many -t test` is the documented way to run all tests (the acceptance criteria target).

### New Files
- `jest.preset.js` (workspace root) — Shared Nx Jest preset re-export, referenced by every project's `jest.config`.
- `apps/api/jest.config.ts` — API Jest configuration (preset + `ts-jest` transform + node environment).
- `apps/api/tsconfig.spec.json` — TypeScript config scoped to `jest.config.ts` + spec files, with Jest types and CommonJS module output.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Install the missing Jest toolchain
- Add the Jest dev dependencies at the workspace root. Pin to versions compatible with the installed `@nx/jest@23.1.0` (which depends on `jest-config@^30`), i.e. the Jest 30 line.
- Run: `npm install --save-dev jest@^30 ts-jest@^29 @types/jest@^30 @nx/jest@23.1.0 jest-environment-node@^30`
  - `jest` — the runner (currently absent).
  - `ts-jest` — TypeScript transform for the spec files (matches the NestJS convention; `@swc/jest` is an alternative but ts-jest needs no extra swc-jest package).
  - `@types/jest` — provides `describe`/`it`/`expect` global typings so the spec tsconfig type-checks.
  - `@nx/jest` — make the currently-transitive plugin an explicit dependency so the `@nx/jest:jest` executor and preset resolve reliably.
  - `jest-environment-node` — Jest 30 no longer bundles the node environment; make it explicit.
- Verify the versions installed by checking `package.json` `devDependencies` after install.

### 2. Create the workspace-root Jest preset
- Create `jest.preset.js` at the repo root with:
  ```js
  const nxPreset = require('@nx/jest/preset').default;

  module.exports = { ...nxPreset };
  ```
- This is the standard Nx shared preset that per-project `jest.config` files extend.

### 3. Create `apps/api/tsconfig.spec.json`
- Create the spec tsconfig scoped to Jest, mirroring the dashboard's `tsconfig.spec.json` structure but for a Node/Jest (not Vitest/DOM) target. The workspace base uses `module: nodenext`, so override to `commonjs` for Jest and enable decorator metadata (required by NestJS classes under test):
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "../../dist/out-tsc",
      "module": "commonjs",
      "moduleResolution": "node",
      "types": ["jest", "node"],
      "target": "es2021",
      "rootDir": "src",
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true,
      "composite": false,
      "emitDeclarationOnly": false,
      "declarationMap": false
    },
    "include": [
      "jest.config.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/*.d.ts"
    ]
  }
  ```
- Rationale: `types: ["jest", "node"]` resolves the Jest globals; `module: commonjs` is what `ts-jest` expects; `composite/emitDeclarationOnly/declarationMap` overrides prevent conflicts with the base project-references settings during Jest's own compilation.

### 4. Create `apps/api/jest.config.ts`
- Create the API Jest config using the root preset and a `ts-jest` transform pointed at the spec tsconfig:
  ```ts
  export default {
    displayName: 'api',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
      '^.+\\.[tj]s$': [
        'ts-jest',
        { tsconfig: '<rootDir>/tsconfig.spec.json' },
      ],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/apps/api',
  };
  ```
- `testEnvironment: 'node'` is correct for NestJS (no DOM).

### 5. Reference the spec tsconfig from the project solution tsconfig
- Edit `apps/api/tsconfig.json` and add `./tsconfig.spec.json` to the `references` array (mirrors `apps/dashboard/tsconfig.json`):
  ```json
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.spec.json" }
  ]
  ```

### 6. Exclude spec files from the build/typecheck tsconfig
- Edit `apps/api/tsconfig.app.json` so the app build/typecheck config no longer compiles the Jest spec files (they reference Jest globals only available under the spec tsconfig). Change `exclude` from `[]` to:
  ```json
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]
  ```
- This prevents any build/typecheck regression now that the spec files rely on Jest globals.

### 7. Add the `test` target to the API project
- Edit `apps/api/package.json` and add a `test` entry inside `nx.targets` (alongside `build`, `serve`, etc.):
  ```json
  "test": {
    "executor": "@nx/jest:jest",
    "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
    "cache": true,
    "options": {
      "jestConfig": "apps/api/jest.config.ts"
    }
  }
  ```

### 8. Run the API test target
- Run `npx nx run api:test` and confirm all 8 existing tests (5 service + 3 controller) pass with zero failures.
- If a decorator/metadata error appears, confirm `experimentalDecorators` + `emitDecoratorMetadata` are set in `tsconfig.spec.json` (Step 3) and `reflect-metadata` is present (it is, in `apps/api` dependencies).

### 9. Run the full workspace validation
- Execute every command in the `Validation Commands` section and confirm all pass with zero errors and zero regressions.
- Confirm `npx nx run-many -t test` now lists and runs **both** `api` and `dashboard`.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npx nx run api:test` — Runs the new API Jest target; all 8 existing spec tests must pass.
- `npx nx run-many -t test` — Runs tests for **both** `api` and `dashboard` (proves the API is now in the test gate).
- `npx nx run-many -t build` — Build all projects to validate no build regression from the tsconfig changes.
- `npx nx run-many -t lint` — Lint all projects to validate code quality is unaffected.

## Notes
- **Why not Vitest (like the dashboard):** the issue explicitly requires Jest for the API and the spec files are already written in Jest style (`toBeGreaterThanOrEqual`, `toHaveProperty`, plain `describe/it`). Matching the requested runner avoids rewriting spec content, which the acceptance criteria forbid.
- **Why ts-jest and not @swc/jest:** ts-jest is the NestJS default and needs no additional swc-jest wiring; `@swc/core` is present but `@swc/jest` is not. Keeping the transform to one added package (`ts-jest`) is simpler and matches conventional NestJS Jest setups.
- **Jest 30 alignment:** `@nx/jest@23.1.0` pulls `jest-config@^30`, so installing `jest@^30`/`@types/jest@^30` avoids a major-version mismatch. `ts-jest@^29` is the current stable line and is compatible with Jest 30.
- **No `nx.json` changes required:** the `@nx/jest:jest` executor is invoked directly from the project's `test` target with `cache: true` set locally, so no `targetDefaults` entry or plugin registration is needed. (Optionally a `@nx/jest/plugin` entry could infer targets, but explicit target definition matches the existing pattern in this repo where `api` defines its targets inline in `package.json`.)
- **Do not touch spec file contents** — this chore is infrastructure only, per the acceptance criteria.
