# Chore: Migrate from npm to pnpm

## Metadata

- **issue_number:** 10
- **adw_id:** da6a721a
- **issue_json:** {"number":10,"title":"Migrate from npm to pnpm","state":"OPEN","labels":["enhancement"]}

## Chore Description

Replace npm with pnpm as the package manager for the Nx monorepo. pnpm is faster, enforces strict dependency isolation (no phantom dependencies), and is the recommended package manager for Nx. The npm lockfile mismatch between local and CI environments (which broke PR #9) is a symptom of npm's weaker lockfile guarantees — pnpm's lockfile is deterministic across Node versions.

## User Story

As a developer
I want pnpm as the package manager
So that installs are faster, dependencies are strict, and the tooling matches Nx best practices

## Problem Statement

npm's lockfile format varies between major npm versions (v6 → lockfile v1, v10 → v3, v11 → v3). When local and CI run different npm versions, `npm ci` rejects the lockfile. pnpm's lockfile is stable across versions and pnpm enforces strict dependency resolution — no phantom dependencies from hoisting.

## Solution Statement

1. Install pnpm via Volta, pin the version in `package.json`.
2. Generate `pnpm-lock.yaml` from existing `package.json`, remove `package-lock.json`.
3. Remove `workspaces` field from root `package.json` (pnpm uses `pnpm-workspace.yaml`).
4. Update CI workflow to use `pnpm/action-setup` and `pnpm install --frozen-lockfile`.
5. Update ADW workflow similarly.
6. Update all `package.json` scripts from `npx` to `pnpm exec`.
7. Update `.claude/commands/` files that reference `npm install` or `npx`.
8. Update `README.md` and `CLAUDE.md`.

## Relevant Files

- `package.json` — Root package config; scripts use `npx`, has `workspaces` field, needs `packageManager` field.
- `package-lock.json` — To be deleted.
- `.github/workflows/ci.yml` — CI pipeline; uses `npm ci` and `cache: 'npm'`.
- `.github/workflows/adw.yml` — ADW pipeline; uses `npm ci` and `npm install -g`.
- `README.md` — Developer docs; references `npm install` and `npx nx`.
- `CLAUDE.md` — Agent instructions; references npm commands.
- `.claude/commands/install.md` — References `npm install`.
- `.claude/commands/prepare_app.md` — References `npm install` and `npx`.
- `.claude/commands/feature.md` — References `npm install`.
- `.claude/commands/bug.md` — References `npm install`.
- `.claude/commands/refactor.md` — References `npm install`.
- `scripts/sdlc.mjs` — Local SDLC pipeline script.
- `nx.json` — Workspace config (no change expected).
- `apps/api/package.json` — API project package.json (workspace package).
- `apps/dashboard-e2e/package.json` — E2E project package.json (workspace package).

### New Files

- `pnpm-workspace.yaml` — Defines workspace packages for pnpm.

## Implementation Plan

### Phase 1: Foundation

Install pnpm via Volta, pin its version, create `pnpm-workspace.yaml`, generate `pnpm-lock.yaml`, and remove `package-lock.json`. Verify `pnpm install` works.

### Phase 2: Core Implementation

Update CI and ADW workflows to use pnpm. Update all `package.json` scripts. Update `.claude/commands/` files. Update README.md and CLAUDE.md.

### Phase 3: Integration

Run full validation suite with pnpm to confirm zero regressions.

## Step by Step Tasks

### 1. Install pnpm and pin via Volta

- Run `volta install pnpm` to install pnpm.
- Run `volta pin pnpm` to pin the version in `package.json`.
- Verify `pnpm --version` works.

### 2. Create pnpm-workspace.yaml

- Create `pnpm-workspace.yaml` at the repo root with the workspace packages matching the current `workspaces` field in `package.json`:
  ```yaml
  packages:
    - 'packages/*'
    - 'apps/*'
    - 'libs/*'
  ```

### 3. Update package.json

- Remove the `workspaces` field (pnpm uses `pnpm-workspace.yaml` instead).
- Add `"packageManager": "pnpm@<version>"` field (use the installed pnpm version).
- Update scripts to use `pnpm` instead of `npx`:
  - `"start"` → replace `npx nx` with `pnpm exec nx`
  - `"start:dashboard"` → replace `npx nx` with `pnpm exec nx`
  - `"start:api"` → replace `npx nx` with `pnpm exec nx`
  - `"build"` → replace `npx nx` with `pnpm exec nx`
  - `"test"` → replace `npx nx` with `pnpm exec nx`
  - `"lint"` → replace `npx nx` with `pnpm exec nx`

### 4. Generate pnpm-lock.yaml and remove package-lock.json

- Run `pnpm install` to generate `pnpm-lock.yaml`.
- Delete `package-lock.json`.
- Verify `pnpm install --frozen-lockfile` works (simulates CI behavior).

### 5. Update CI workflow

- Edit `.github/workflows/ci.yml`:
  - Add `pnpm/action-setup@v4` step before `actions/setup-node`.
  - Change `cache: 'npm'` to `cache: 'pnpm'` in `actions/setup-node`.
  - Replace `npm ci` with `pnpm install --frozen-lockfile`.
  - Replace `npx nx` with `pnpm exec nx` in all run steps.

### 6. Update ADW workflow

- Edit `.github/workflows/adw.yml`:
  - Add `pnpm/action-setup@v4` step before `actions/setup-node`.
  - Change `cache: 'npm'` to `cache: 'pnpm'` in `actions/setup-node`.
  - Replace `npm ci` with `pnpm install --frozen-lockfile`.
  - Replace `npm install -g @anthropic-ai/claude-code` with `pnpm add -g @anthropic-ai/claude-code` (or keep npm for global install since claude-code is a CLI tool, not a workspace dependency).

### 7. Update .claude/commands files

- Edit `.claude/commands/install.md`: replace `npm install` with `pnpm install`.
- Edit `.claude/commands/prepare_app.md`: replace `npm install` with `pnpm install`, replace `npx` with `pnpm exec`.
- Edit `.claude/commands/feature.md`: replace `npm install` with `pnpm add` or `pnpm install`.
- Edit `.claude/commands/bug.md`: replace `npm install` with `pnpm add` or `pnpm install`.
- Edit `.claude/commands/refactor.md`: replace `npm install` with `pnpm add` or `pnpm install`.

### 8. Update README.md

- Replace `npm install` with `pnpm install`.
- Replace `npx nx` with `pnpm exec nx` (or just `pnpm nx` since pnpm resolves workspace bins).

### 9. Update CLAUDE.md

- Update the package manager guidance: replace npm references with pnpm.
- Update command examples: `pnpm exec nx run-many -t build/test/lint`.

### 10. Run the full validation suite

- Run every command in `Validation Commands` below and confirm all pass with zero regressions.

## Testing Strategy

### Unit Tests

No new tests. Existing tests must pass unchanged — this is a tooling change only.

### Integration Tests

No new tests. Existing API integration tests must pass.

### E2E Tests

Existing Playwright e2e tests must pass via `pnpm exec nx run dashboard-e2e:e2e`.

### Edge Cases

- **Phantom dependencies** — pnpm's strict mode may surface imports that relied on npm's hoisting. If any project fails to build/run, the missing dependency must be explicitly added to the correct `package.json`.
- **Global installs in CI** — `npm install -g` for claude-code in the ADW workflow. pnpm global installs work differently; may need to keep `npm` for this one global install or use `npx` directly.
- **Workspace protocol** — pnpm uses `workspace:*` protocol for inter-workspace deps. Existing `package.json` files in apps/libs may need updating if they reference workspace packages.

## Acceptance Criteria

- `pnpm-lock.yaml` exists, `package-lock.json` is deleted.
- `pnpm install` and `pnpm install --frozen-lockfile` both succeed.
- `pnpm exec nx run-many -t build,test,lint` passes with zero regressions.
- `pnpm exec nx run dashboard-e2e:e2e` passes.
- CI workflow (`.github/workflows/ci.yml`) uses pnpm.
- ADW workflow (`.github/workflows/adw.yml`) uses pnpm.
- No `npm install` or `npm ci` references remain in workflows, scripts, or docs.
- Volta pins both node and pnpm versions in `package.json`.

## Validation Commands

- `pnpm exec nx run-many -t build --skip-nx-cache` - Build all projects
- `pnpm exec nx run-many -t test --skip-nx-cache` - Run all tests with coverage
- `pnpm exec nx run-many -t lint --skip-nx-cache` - Lint all projects
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache` - Run e2e tests

## Notes

- **pnpm + Nx** — Nx has first-class pnpm support. The `@nx/js` plugin detects pnpm automatically.
- **Volta** — Volta already manages Node for this project. Adding pnpm to Volta ensures all contributors use the same pnpm version.
- **Global CLI installs** — The ADW workflow installs `@anthropic-ai/claude-code` globally. This is a CI-only tool, not a workspace dependency. Use `npm install -g` or `npx` for this — pnpm global installs have a different PATH setup that may not work in CI runners.
- **No code changes** — This chore changes only tooling config, workflows, and docs. No application code is modified.
