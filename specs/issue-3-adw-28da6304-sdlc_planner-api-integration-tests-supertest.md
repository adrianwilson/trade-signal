# Feature: API Integration Tests with supertest

## Metadata
- **issue_number:** 3
- **adw_id:** 28da6304
- **issue_json:** `{"number":3,"state":"OPEN","title":"Add API integration tests with supertest","labels":["enhancement"],"body":"Add integration tests that exercise the full HTTP layer of the NestJS API (status codes, content types, request validation, middleware pipeline). Install supertest + @types/supertest as dev dependencies. Test GET /api/signals (200, array), GET /api/signals/:id (200 valid / 404 invalid), POST /api/signals (201, created signal). Verify response shapes match the Signal type from @org/signals. Part of ZTE Roadmap Phase Z1: Validation Floor (docs/zte-roadmap.md). Depends on issue #2 (Jest configuration for API)."}`

## Feature Description
The API currently has unit tests for `SignalsService` (`signals.service.spec.ts`, 5 tests) and `SignalsController` (`signals.controller.spec.ts`, 3 tests). These call service/controller methods **directly** — they instantiate the classes with `new` and invoke methods, bypassing NestJS's HTTP layer entirely. As a result, nothing verifies:

- HTTP status codes (`200`, `201`, `404`)
- Routing and the global `api` prefix (`/api/signals`)
- Request/response serialization (JSON content type, response body shape)
- The NestJS middleware/exception-filter pipeline (e.g. `NotFoundException` → `404` JSON response)

This feature adds **integration tests** that boot the full NestJS application in-memory and drive it over real HTTP using [`supertest`](https://github.com/ladjs/supertest), the standard tool for NestJS HTTP testing. The tests exercise the complete request lifecycle: HTTP request → router → controller → service → response, asserting on status codes and response body shapes against the shared `Signal` type from `@org/signals`.

This closes another slice of Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`: the SDLC pipeline will now catch routing, middleware, and serialization regressions in the API — bugs the current unit tests are structurally blind to.

## User Story
As a developer
I want integration tests that verify the API's HTTP behavior end-to-end
So that the SDLC pipeline catches routing, middleware, status-code, and serialization bugs before they merge

## Problem Statement
The existing "controller tests" are unit tests in disguise — they call `controller.findAll()` / `controller.findOne(id)` / `controller.create(input)` directly on a hand-constructed instance (`new SignalsController(new SignalsService())`). They never start the NestJS runtime, never route an HTTP request, and never assert an HTTP status code or content type. Consequently a broken route path, a missing global prefix, a mis-wired module, a serialization bug, or a mishandled exception (e.g. `NotFoundException` not mapping to `404`) would all pass CI undetected. The API has no test that proves `GET /api/signals` actually returns `200` with a JSON array over the wire.

## Solution Statement
Add a dedicated integration test suite that uses `@nestjs/testing`'s `Test.createTestingModule({ imports: [AppModule] })` to build the **full** application (matching production wiring), applies the same `app.setGlobalPrefix('api')` used in `main.ts`, calls `app.init()`, and issues real HTTP requests via `supertest` against the running Nest HTTP server instance. Each test asserts on the HTTP status code **and** the response body shape (validating it conforms to the `Signal` interface from `@org/signals`). The suite runs under the existing Jest `test` target (added in issue #2) with no changes to Jest/tsconfig config required, since it lives as a `*.spec.ts` file under `apps/api/src/`.

## Relevant Files
Use these files to implement the feature:

- `apps/api/src/app/app.module.ts` — The root module (imports `SignalsModule`). The integration test boots from this module to mirror production wiring, so routes resolve exactly as they do at runtime.
- `apps/api/src/main.ts` — **Critical reference.** Shows that the global prefix `api` and CORS are configured in `bootstrap()`, **not** in `AppModule`. The integration test MUST replicate `app.setGlobalPrefix('api')` after creating the app, otherwise routes are served at `/signals` (not `/api/signals`) and every test 404s. This is the single most important gotcha in this feature.
- `apps/api/src/signals/signals.controller.ts` — The controller under test. Routes: `GET /signals` (findAll), `GET /signals/:id` (findOne, throws `NotFoundException`), `POST /signals` (create). Combined with the global prefix these become `/api/signals`, `/api/signals/:id`, `/api/signals`.
- `apps/api/src/signals/signals.service.ts` — Backing service. Seeds 6 in-memory signals (ids `'1'`–`'6'`); `create()` generates a UUID id, forces `source: 'manual'`, sets `timestamp` to now, and maps `input.notes` → `reasoning`. Tests assert against these known behaviors (e.g. id `'1'` = AAPL exists; unknown id → 404; created signal has `source: 'manual'`).
- `apps/api/src/signals/signals.controller.spec.ts` — Existing unit tests. Reference for style/conventions (describe/it structure, sample `ManualSignalInput`) and to confirm the integration suite is **additive**, not a replacement.
- `apps/api/src/signals/signals.module.ts` — Wires controller + provider; imported transitively via `AppModule`.
- `libs/signals/src/lib/signals.ts` — Defines `Signal`, `ManualSignalInput`, `AssetClass`, `SignalDirection`, `SignalSource`. Response-shape assertions validate against `Signal`; the POST body is typed as `ManualSignalInput`. Import via the `@org/signals` path alias.
- `apps/api/tsconfig.spec.json` — Test tsconfig. Its `include` already globs `src/**/*.spec.ts`, so a new `*.spec.ts` under `src/` is compiled automatically. `types: ["jest", "node"]` restricts *global* auto-included types only — the `supertest` module's own types resolve fine via `@types/supertest` on explicit `import`. No change expected here.
- `apps/api/jest.config.ts` — Jest config (Nx preset, `ts-jest`, `node` env). Default Jest `testMatch` picks up `*.spec.ts`, so the new file runs under `nx run api:test` with no config change.
- `apps/api/package.json` — Declares the `api` project's `test` target. No change expected (the new spec is discovered automatically).
- `package.json` (workspace root) — `supertest` and `@types/supertest` are added here as dev dependencies.

### New Files
- `apps/api/src/signals/signals.integration.spec.ts` — The integration test suite. Named `*.spec.ts` (not `*.e2e-spec.ts`) so it is discovered by the existing `test` target with zero new Jest/Nx configuration. `.integration.` in the name documents intent and distinguishes it from the sibling unit spec.

## Implementation Plan
### Phase 1: Foundation
Install the HTTP testing toolchain. Add `supertest` and `@types/supertest` as workspace dev dependencies via `npm install -D supertest @types/supertest`. `@nestjs/testing` is already installed (confirmed in `apps/api/package.json` and `node_modules`), so no additional Nest testing package is needed. Report the exact installed versions in the `Notes` section after installation.

### Phase 2: Core Implementation
Create `apps/api/src/signals/signals.integration.spec.ts`. Build the full app with `Test.createTestingModule({ imports: [AppModule] }).compile()`, then `moduleRef.createNestApplication()`, `app.setGlobalPrefix('api')` (mirroring `main.ts`), and `await app.init()` in a `beforeAll`. Tear down with `await app.close()` in `afterAll`. Obtain the HTTP handle via `app.getHttpServer()` and drive it with `supertest`. Write the three required endpoint groups (GET list, GET by id valid + invalid, POST create) asserting both status codes and response body shapes against the `Signal` type.

### Phase 3: Integration
Confirm the new suite runs under the existing pipeline commands with zero config changes: `npx nx run api:test` discovers and passes it alongside the 8 existing unit tests, and `npx nx run-many -t build/test/lint` all pass (no build regression, since `tsconfig.app.json` excludes `*.spec.ts`; no lint regression). Verify the new suite does not depend on test-ordering side effects (POST mutates the in-memory array — keep assertions robust to the extra element).

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Install supertest dev dependencies
- Run `npm install -D supertest @types/supertest` from the workspace root.
- Confirm both appear under `devDependencies` in the root `package.json`.
- Confirm `node_modules/supertest` and `node_modules/@types/supertest` exist.
- Note the resolved versions for the `Notes` section.

### 2. Create the integration test file skeleton
- Create `apps/api/src/signals/signals.integration.spec.ts`.
- Add imports: `Test, TestingModule` from `@nestjs/testing`; `INestApplication` from `@nestjs/common`; `import request from 'supertest'` (default import — with `esModuleInterop` enabled in the base tsconfig this is correct); `AppModule` from `../app/app.module`; and `type { Signal, ManualSignalInput } from '@org/signals'`.
- Declare `let app: INestApplication;` at the suite scope.

### 3. Wire up app lifecycle (beforeAll / afterAll)
- In `beforeAll`: `const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();` then `app = moduleRef.createNestApplication();` then **`app.setGlobalPrefix('api');`** (mandatory — mirrors `main.ts`; without it every request 404s) then `await app.init();`.
- In `afterAll`: `await app.close();`.
- Add a small typed helper or reuse `app.getHttpServer()` inline in each `request(...)` call.

### 4. Add a reusable Signal-shape assertion helper
- Write a local helper (e.g. `expectValidSignal(body: unknown)`) that asserts the object has: `id` (string, non-empty), `asset` (string), `assetClass` (one of `'equity' | 'crypto' | 'forex' | 'options'`), `direction` (one of `'BUY' | 'SELL' | 'HOLD'`), `confidence` (number, 0–100), `source` (one of `'manual' | 'rsi' | 'macd' | 'news-sentiment' | 'volume' | 'agent'`), and `timestamp` (string, parseable ISO 8601). Treat `reasoning` and `metadata` as optional. This centralizes the "response shape matches `Signal`" acceptance criterion.

### 5. Test GET /api/signals (list)
- `describe('GET /api/signals')` with a test: `await request(app.getHttpServer()).get('/api/signals')`.
- Assert `.expect(200)`.
- Assert the response is JSON (`Content-Type` matches `/application\/json/`).
- Assert `Array.isArray(res.body)` and `res.body.length >= 6` (seed count).
- Run `expectValidSignal` against `res.body[0]` (and ideally every element).

### 6. Test GET /api/signals/:id (valid + invalid)
- `describe('GET /api/signals/:id')`.
- Valid: `.get('/api/signals/1').expect(200)`; assert `res.body.id === '1'`, `res.body.asset === 'AAPL'`, and `expectValidSignal(res.body)`.
- Invalid: `.get('/api/signals/nonexistent').expect(404)`; assert the error body has `statusCode: 404` and a `message` (NestJS `NotFoundException` default JSON shape).

### 7. Test POST /api/signals (create)
- `describe('POST /api/signals')`.
- Build a `ManualSignalInput` payload, e.g. `{ asset: 'GOOG', assetClass: 'equity', direction: 'SELL', confidence: 65, notes: 'integration test signal' }`.
- `.post('/api/signals').send(payload).expect(201)` (NestJS `@Post()` returns `201` by default).
- Assert JSON content type, `expectValidSignal(res.body)`, `res.body.id` is a defined non-empty string (UUID from `randomUUID()`), `res.body.asset === 'GOOG'`, `res.body.direction === 'SELL'`, `res.body.confidence === 65`, `res.body.source === 'manual'` (service forces this), and `res.body.reasoning === 'integration test signal'` (service maps `notes` → `reasoning`).
- Optionally assert `timestamp` is a valid ISO string.

### 8. Run the API test target
- Run `npx nx run api:test`.
- Confirm the new integration suite passes alongside the 8 existing unit tests (expect the total test count to increase; suite count 2 → 3).

### 9. Format and lint
- Run `npx nx format:write` (or `npx nx format` per repo convention) to keep formatting consistent with the codebase.
- Run `npx nx run api:lint` and resolve any findings in the new file.

### 10. Run full validation (zero regressions)
- Execute every command in the `Validation Commands` section below.
- Confirm all builds, tests, and lints pass across all projects with zero regressions.

## Testing Strategy
### Unit Tests
No new unit tests. The existing `signals.service.spec.ts` (5 tests) and `signals.controller.spec.ts` (3 tests) remain unchanged — this feature is strictly additive at the integration layer.

### Integration Tests
The core of this feature. A single new suite, `apps/api/src/signals/signals.integration.spec.ts`, boots the full `AppModule` over an in-memory HTTP server (via `@nestjs/testing` + `supertest`) with the production global prefix applied. Coverage:

- `GET /api/signals` → `200`, JSON, non-empty array, every element conforms to `Signal`.
- `GET /api/signals/:id` (valid id `'1'`) → `200`, body is the AAPL signal, conforms to `Signal`.
- `GET /api/signals/:id` (unknown id) → `404` with NestJS error body (`statusCode: 404`, `message`).
- `POST /api/signals` → `201`, returns the created signal with a generated UUID id, `source: 'manual'`, `notes` mapped to `reasoning`, and a valid `timestamp`.

Each assertion checks **both** the HTTP status code and the response body shape against the `@org/signals` `Signal` type — satisfying the acceptance criteria that tests verify status codes AND response shapes.

### E2E Tests (if UI-affecting)
Not applicable. This feature is API-only (NestJS backend); it does not touch the Angular dashboard, so no Playwright/Cypress E2E test is added. (Note: the term "integration test" here means full-HTTP-stack API testing, which is the appropriate level for a backend-only change.)

### Edge Cases
- **Global prefix omitted** — the most likely implementation bug. Without `app.setGlobalPrefix('api')`, requests to `/api/signals` return `404`. The list test failing with `404` is the canonical signal of this mistake.
- **Unknown id → 404** — verifies the `NotFoundException` correctly maps to an HTTP `404` through the exception filter, not an unhandled `500`.
- **POST mutation / test isolation** — `create()` pushes to the shared in-memory array. Assert the list length with `>=` (not `===`) and avoid asserting an exact array length after a POST, so tests are robust regardless of execution order within the suite.
- **Content type** — assert JSON `Content-Type` to catch serialization/middleware regressions.
- **Default status codes** — NestJS returns `201` for `@Post()` and `200` for `@Get()` by default; the tests pin these so a future `@HttpCode()` change is caught.

## Acceptance Criteria
- `supertest` and `@types/supertest` are installed as dev dependencies in the root `package.json`.
- A new integration test file exists at `apps/api/src/signals/signals.integration.spec.ts` and boots the full app via `@nestjs/testing` + `supertest` with `app.setGlobalPrefix('api')` applied.
- Integration tests cover `GET /api/signals`, `GET /api/signals/:id` (both valid and invalid id), and `POST /api/signals`.
- Tests assert HTTP status codes: `200` (GET list), `200` (GET valid id), `404` (GET invalid id), `201` (POST create).
- Tests assert response body shapes conform to the `Signal` type from `@org/signals`.
- All tests pass via `npx nx run api:test` (the new suite runs alongside the existing 8 unit tests).
- `npx nx run-many -t build`, `npx nx run-many -t test`, and `npx nx run-many -t lint` all pass with zero regressions.

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm ls supertest @types/supertest` - Confirm both dev dependencies are installed and resolved.
- `npx nx run api:test` - Run the API Jest suite; the new integration suite plus the 8 existing unit tests must all pass.
- `npx nx run-many -t build` - Build all projects to validate zero build regressions (spec files are excluded from `tsconfig.app.json`, so no build impact expected).
- `npx nx run-many -t test` - Run all tests (api + dashboard) to validate the feature works with zero regressions.
- `npx nx run-many -t lint` - Lint all projects to validate code quality of the new test file.

## Notes
- **Global prefix is the #1 pitfall.** `main.ts` sets `app.setGlobalPrefix('api')` at bootstrap, but `AppModule` does not carry it. The integration test must replicate this call after `createNestApplication()` and before `app.init()`, or every `/api/*` request will 404. Do not test against `/signals` — production serves `/api/signals`.
- **CORS is not required in tests.** `main.ts` also calls `enableCors({ origin: 'http://localhost:4200' })`, but CORS is irrelevant to same-process supertest requests, so it can be omitted from the test bootstrap. (Only the global prefix affects routing.)
- **No Jest/Nx config changes needed.** `tsconfig.spec.json` already globs `src/**/*.spec.ts` and Jest's default `testMatch` picks up `*.spec.ts`, so the new file is discovered by the existing `test` target (added in issue #2). This is why the file is named `*.spec.ts` rather than the classic NestJS `*.e2e-spec.ts` (which would require a separate `jest-e2e.json` config and a new target).
- **Default import for supertest.** With `esModuleInterop` on (base tsconfig), use `import request from 'supertest'`. If a lint/TS rule prefers namespace imports, fall back to `import * as request from 'supertest'`.
- **`@nestjs/testing` is already installed** (`^11.0.0`) — no need to add it.
- **In-memory state is shared and non-persistent.** The service seeds 6 signals and mutates an in-process array; there is no database. Keep list-length assertions relaxed (`>=`) to stay order-independent after the POST test.
- **Future consideration:** if request-body validation (e.g. `class-validator` + `ValidationPipe`) is added later, extend this suite with a `POST /api/signals` "invalid payload → 400" test. Out of scope for this issue since no validation pipe currently exists.
- **Dependency install:** run `npm install -D supertest @types/supertest` and record the resolved versions here after installation.
