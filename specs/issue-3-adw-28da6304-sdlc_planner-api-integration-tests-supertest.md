# Feature: API Integration Tests with supertest

## Description

Integration tests that exercise the full HTTP layer of the NestJS API — routing, status codes, content types, the exception-filter pipeline, and JSON serialization — rather than calling controller/service methods directly.

The pre-existing "controller tests" (`signals.controller.spec.ts`) and service tests (`signals.service.spec.ts`) are unit tests: they instantiate classes with `new` and invoke methods, bypassing the NestJS runtime entirely. They cannot catch a broken route path, a missing global prefix, a mis-wired module, a serialization bug, or a `NotFoundException` that fails to map to a `404`.

This suite boots the full `AppModule` over an in-memory HTTP server and drives it with real HTTP requests via [`supertest`](https://github.com/ladjs/supertest), asserting on **both** HTTP status codes and response body shapes against the shared `Signal` type from `@org/signals`. It closes a slice of Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`: the SDLC pipeline now catches routing, middleware, status-code, and serialization regressions the unit tests are structurally blind to.

## Design Decisions

- **Boot the full `AppModule`, not a hand-wired test module.** `Test.createTestingModule({ imports: [AppModule] })` mirrors production wiring exactly, so routes resolve as they do at runtime. Wiring a minimal module by hand would defeat the purpose (it could pass while production routing is broken).
- **Replicate `app.setGlobalPrefix('api')` in `beforeAll`.** The global prefix lives in `main.ts`'s `bootstrap()`, **not** in `AppModule`. Without this call every `/api/*` request 404s — the single biggest gotcha in this feature. CORS (also in `main.ts`) is intentionally omitted: it is irrelevant to same-process supertest requests and does not affect routing.
- **Name the file `*.spec.ts`, not the classic NestJS `*.e2e-spec.ts`.** This lets the existing `api:test` target (from issue #2) discover it with zero new Jest/Nx config — `tsconfig.spec.json` already globs `src/**/*.spec.ts` and Jest's default `testMatch` picks it up. The `.integration.` infix documents intent and distinguishes it from the sibling unit spec. The `*.e2e-spec.ts` convention was rejected because it would require a separate `jest-e2e.json` config and a new target.
- **Centralize shape validation in `expectValidSignal()`.** A single local helper asserts every `Signal` field (types, enum membership, ranges, parseable ISO timestamp), treating `reasoning`/`metadata` as optional. This encodes the "response shape matches `Signal`" acceptance criterion in one place reused across all endpoint tests.
- **Relaxed, order-independent assertions.** `create()` pushes to the shared in-memory array (no database), so the list test asserts `length >= 6` (not `=== 6`) to stay robust regardless of whether the POST test ran first.
- **Default import for supertest** (`import request from 'supertest'`), valid because `esModuleInterop` is on in the base tsconfig.

## Architecture

The suite lives at `apps/api/src/signals/signals.integration.spec.ts` and is additive — the existing 8 unit tests are unchanged.

Lifecycle (`beforeAll` / `afterAll`):

1. `Test.createTestingModule({ imports: [AppModule] }).compile()` builds the full DI graph (`AppModule` → `SignalsModule` → `SignalsController` + `SignalsService`).
2. `moduleRef.createNestApplication()` → `app.setGlobalPrefix('api')` → `await app.init()` starts the app in-memory with production routing.
3. `app.getHttpServer()` yields the HTTP handle that `supertest` drives.
4. `afterAll` calls `app.close()`.

Request flow under test: `supertest` HTTP request → Nest router (with `api` prefix) → `SignalsController` → `SignalsService` (6 seeded in-memory signals, ids `'1'`–`'6'`) → JSON response. The `404` path exercises the exception filter: `SignalsService.findOne` returns `undefined` → controller throws `NotFoundException` → Nest maps it to a `404` JSON body (`{ statusCode: 404, message }`). The `POST` path exercises `SignalsService.create`, which generates a UUID id, forces `source: 'manual'`, maps `input.notes` → `reasoning`, and stamps `timestamp` with `new Date().toISOString()`.

It runs under the existing Jest `test` target with no config change (`tsconfig.app.json` excludes `*.spec.ts`, so builds are unaffected).

## Key Files

- `apps/api/src/signals/signals.integration.spec.ts` — The integration suite: full-app bootstrap, `expectValidSignal` helper, and the four endpoint tests.
- `apps/api/src/main.ts` — Reference for the production bootstrap; source of the `app.setGlobalPrefix('api')` the test must mirror.
- `apps/api/src/app/app.module.ts` — Root module the test boots from to match production wiring.
- `apps/api/src/signals/signals.controller.ts` — Controller under test (`GET /signals`, `GET /signals/:id`, `POST /signals`).
- `apps/api/src/signals/signals.service.ts` — Backing service; seeds 6 signals and defines `create()` behavior the POST test asserts.
- `libs/signals/src/lib/signals.ts` — Defines `Signal` and `ManualSignalInput`, imported via the `@org/signals` alias for shape assertions and the POST payload.
- `package.json` (root) — Declares `supertest` and `@types/supertest` dev dependencies.

## Acceptance Criteria

- `supertest` and `@types/supertest` are dev dependencies in the root `package.json`.
- `apps/api/src/signals/signals.integration.spec.ts` boots the full app via `@nestjs/testing` + `supertest` with `app.setGlobalPrefix('api')` applied.
- Tests cover `GET /api/signals`, `GET /api/signals/:id` (valid `'1'` and unknown id), and `POST /api/signals`.
- Status codes asserted: `200` (GET list), `200` (GET valid id), `404` (GET unknown id), `201` (POST create).
- Every response body is validated against the `Signal` type via `expectValidSignal`; the `404` body is asserted to have `statusCode: 404` and a `message`.
- The POST test asserts the created signal has a generated non-empty string id, `source: 'manual'`, `notes` mapped to `reasoning`, and a parseable ISO `timestamp`.
- Content-Type is asserted as JSON on every successful and error response.
- The suite passes via `npx nx run api:test` alongside the 8 existing unit tests, and `build`/`test`/`lint` across all projects pass with zero regressions.

## Validation Commands

- `npm ls supertest @types/supertest` — Confirm both dev dependencies resolve.
- `npx nx run api:test` — Run the API Jest suite; the integration suite plus 8 unit tests must pass (3 suites total).
- `npx nx run-many -t build` — Confirm no build regression (spec files excluded from `tsconfig.app.json`).
- `npx nx run-many -t test` — Run all tests (api + dashboard).
- `npx nx run-many -t lint` — Lint all projects, including the new test file.

## Notes

- **Global prefix is the #1 pitfall.** `main.ts` sets `app.setGlobalPrefix('api')`; `AppModule` does not. The test must replicate it after `createNestApplication()` and before `app.init()`, or every `/api/*` request 404s. Do not test against `/signals`.
- **In-memory state is shared and non-persistent.** The service mutates an in-process array (no database). Keep list-length assertions relaxed (`>=`) to stay order-independent after the POST test.
- **No validation pipe exists yet.** If `class-validator` + `ValidationPipe` is added later, extend this suite with a `POST /api/signals` "invalid payload → 400" test. Out of scope here.
- **Installed versions:** `supertest@7.2.2`, `@types/supertest@7.2.1`. `@nestjs/testing` (`^11.0.0`) was already present.
