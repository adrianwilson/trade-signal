# Feature: Add SQLite Database with TypeORM for Persistent Signal Storage

## Metadata

- **issue_number:** 13
- **adw_id:** ce60b8b4
- **issue_json:** {"number":13,"title":"Add SQLite database with TypeORM for persistent signal storage","state":"OPEN","labels":["enhancement"]}

## Feature Description

Replace the in-memory signal array in `SignalsService` with a SQLite database via TypeORM. Signals will persist across server restarts. The database is seeded with the existing 6 signals on first run.

## User Story

As a developer
I want signals stored in a database
So that data persists across server restarts

## Problem Statement

`SignalsService` stores signals in a plain array. Data is lost on every restart. This blocks any real usage of the app and makes the API unsuitable for development beyond demos.

## Solution Statement

Install `@nestjs/typeorm`, `typeorm`, and `better-sqlite3`. Create a `SignalEntity` that maps to the `Signal` interface. Configure TypeORM with SQLite in `AppModule`. Rewrite `SignalsService` to use a TypeORM repository. Seed the 6 existing signals on first run when the table is empty. Update tests to work with the database (use in-memory SQLite for tests).

## Relevant Files

- `apps/api/src/signals/signals.service.ts` — Rewrite from in-memory array to TypeORM repository
- `apps/api/src/signals/signals.module.ts` — Import `TypeOrmModule.forFeature([SignalEntity])`
- `apps/api/src/signals/signals.controller.ts` — No change expected (delegates to service)
- `apps/api/src/signals/signals.controller.spec.ts` — Update to mock repository-based service
- `apps/api/src/signals/signals.service.spec.ts` — Update to use in-memory SQLite for testing
- `apps/api/src/signals/signals.integration.spec.ts` — Should work as-is (tests HTTP layer)
- `apps/api/src/app/app.module.ts` — Add `TypeOrmModule.forRoot()` with SQLite config
- `apps/api/src/app/app.controller.spec.ts` — May need TypeORM imports in test module
- `apps/api/src/app/app.integration.spec.ts` — May need TypeORM imports in test module
- `libs/signals/src/lib/signals.ts` — Signal interface (reference only, no changes)
- `apps/api/package.json` — Add `typeorm`, `@nestjs/typeorm`, `better-sqlite3` dependencies
- `.gitignore` — Add `*.sqlite` to ignore database files

### New Files

- `apps/api/src/signals/signal.entity.ts` — TypeORM entity class mapping to the Signal interface

## Implementation Plan

### Phase 1: Foundation

Install dependencies. Create the `SignalEntity`. Configure TypeORM in `AppModule` with SQLite.

### Phase 2: Core Implementation

Rewrite `SignalsService` to use TypeORM repository. Make methods async. Seed the database on module init. Update the controller to handle async (NestJS handles Promises automatically in controllers, so no controller changes needed).

### Phase 3: Integration

Update all tests. Run full validation suite including format and typecheck.

## Step by Step Tasks

### 1. Install dependencies

- Run `pnpm add typeorm @nestjs/typeorm better-sqlite3` in the workspace root (these are runtime deps for the API).
- Run `pnpm add -D @types/better-sqlite3` for type definitions.

### 2. Create SignalEntity

- Create `apps/api/src/signals/signal.entity.ts`:
  - Define a `SignalEntity` class with `@Entity('signals')` decorator
  - Map fields: `id` (PrimaryColumn, string), `asset`, `assetClass`, `direction`, `confidence` (integer), `source`, `reasoning` (nullable), `timestamp`
  - Do NOT include `metadata` column for now (it's optional and rarely used — can be added later as a JSON column)

### 3. Configure TypeORM in AppModule

- Edit `apps/api/src/app/app.module.ts`:
  - Import `TypeOrmModule.forRoot()` with SQLite configuration:
    - `type: 'better-sqlite3'`
    - `database: 'data/signals.sqlite'` (relative to API working directory)
    - `entities: [SignalEntity]`
    - `synchronize: true` (auto-create tables in dev)
  - Import `SignalEntity` from `../signals/signal.entity`

### 4. Update SignalsModule

- Edit `apps/api/src/signals/signals.module.ts`:
  - Import `TypeOrmModule.forFeature([SignalEntity])`

### 5. Rewrite SignalsService

- Edit `apps/api/src/signals/signals.service.ts`:
  - Inject `Repository<SignalEntity>` via `@InjectRepository(SignalEntity)`
  - Implement `OnModuleInit` to seed the database if empty
  - `findAll()` → `async findAll(): Promise<Signal[]>` using `repository.find()`
  - `findOne(id)` → `async findOne(id): Promise<Signal | null>` using `repository.findOneBy({ id })`
  - `create(input)` → `async create(input): Promise<Signal>` using `repository.save()`
  - Move the 6 seed signals to a `SEED_SIGNALS` constant, insert them in `onModuleInit()` if count is 0

### 6. Update SignalsController

- Edit `apps/api/src/signals/signals.controller.ts`:
  - `findOne()`: change `undefined` check to `null` check (TypeORM returns `null` not `undefined`)
  - Methods already return values that NestJS handles as promises — no `async` keyword needed on controller methods since they just delegate

### 7. Update .gitignore

- Add `data/` and `*.sqlite` to `.gitignore`

### 8. Update unit tests

- Edit `apps/api/src/signals/signals.service.spec.ts`:
  - Set up an in-memory SQLite database with TypeORM for testing:
    ```typescript
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [SignalEntity],
      synchronize: true,
    });
    ```
  - Use `TestingModule` instead of direct instantiation
  - Tests for `findAll`, `findOne`, `create` remain similar but use `await`
- Edit `apps/api/src/signals/signals.controller.spec.ts`:
  - Mock the service or use the in-memory database approach
- Edit `apps/api/src/app/app.controller.spec.ts`:
  - Add TypeORM imports if needed, or mock the database module
- Edit `apps/api/src/app/app.integration.spec.ts`:
  - Configure in-memory SQLite in the test module

### 9. Run full validation suite

- Run every command in `Validation Commands` including `format:check` and `typecheck`.
- IMPORTANT: Verify all CI steps pass locally before considering done.

## Testing Strategy

### Unit Tests

- `SignalsService.findAll()` returns seeded signals from in-memory SQLite
- `SignalsService.findOne(id)` returns correct signal or null
- `SignalsService.create(input)` persists and returns new signal
- `SignalsService.onModuleInit()` seeds database when empty
- `SignalsController` delegates to service correctly

### Integration Tests

- `GET /api/signals` returns 200 with array of signals
- `GET /api/signals/:id` returns 200 with signal or 404
- `POST /api/signals` creates and returns new signal
- `GET /api/health` still works

### E2E Tests

- Existing e2e tests should pass — they test the dashboard rendering signals from the API. The API response shape is unchanged.

### Edge Cases

- Empty database on first run — seed signals should be inserted
- Database file permissions — SQLite needs write access to the data directory
- Concurrent requests — SQLite handles this with WAL mode (default in better-sqlite3)
- Test isolation — each test module uses `:memory:` SQLite, no shared state

## Acceptance Criteria

- TypeORM configured with SQLite in the API
- `SignalEntity` maps to the `Signal` interface from `@org/signals`
- `SignalsService` uses TypeORM repository
- 6 seed signals inserted on first run (empty database)
- All CRUD endpoints work: `GET /api/signals`, `GET /api/signals/:id`, `POST /api/signals`
- All existing tests pass (unit, integration, e2e)
- Coverage >= 70%
- `format:check` and `typecheck` pass

## Validation Commands

- `pnpm exec nx run-many -t build --skip-nx-cache` - Build all projects
- `pnpm exec nx run-many -t test --skip-nx-cache` - Run all tests with coverage
- `pnpm exec nx run-many -t lint --skip-nx-cache` - Lint all projects
- `pnpm exec nx run-many -t typecheck --skip-nx-cache` - Typecheck all projects
- `pnpm exec nx format:check --base=origin/main` - Check formatting
- `pnpm exec nx run dashboard-e2e:e2e --skip-nx-cache` - Run e2e tests

## Notes

- **SQLite over PostgreSQL** — Simpler for dev, no Docker needed. Can migrate to PostgreSQL later by swapping the TypeORM driver.
- **`synchronize: true`** — Auto-creates/updates tables. Fine for dev, should be replaced with migrations for production.
- **`better-sqlite3`** — Synchronous SQLite driver for Node.js, faster than the async `sqlite3` driver. TypeORM supports it natively.
- **No `metadata` column** — The `Signal` interface has an optional `metadata?: Record<string, unknown>` field. Skipping it for now — it's unused in the codebase and would require a JSON column type.
- **Database location** — `data/signals.sqlite` relative to the API working directory. Added to `.gitignore`.
