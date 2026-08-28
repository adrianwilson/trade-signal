# API Integration Tests with supertest

**ADW ID:** 28da6304
**Date:** 2026-08-28
**Spec:** specs/issue-3-adw-28da6304-sdlc_planner-api-integration-tests-supertest.md

## Summary
Adds a full-HTTP-stack integration test suite for the NestJS API that boots the complete `AppModule` in-memory and drives it over real HTTP with `supertest`. Unlike the existing unit tests (which call controller/service methods directly), these tests exercise routing, the global `api` prefix, status codes, JSON serialization, and the exception-filter pipeline — regressions the unit tests were structurally blind to. Closes a slice of Phase Z1 (Validation Floor) of `docs/zte-roadmap.md`.

## What Changed
- **API:** New integration test suite at `apps/api/src/signals/signals.integration.spec.ts` (134 lines) covering `GET /api/signals`, `GET /api/signals/:id` (valid + invalid), and `POST /api/signals`. Named `*.spec.ts` so it runs under the existing `api:test` target with no Jest/Nx config changes.
- **Shared (root deps):** Added `supertest@^7.2.2` and `@types/supertest@^7.2.1` as workspace dev dependencies in `package.json` (and `package-lock.json`).
- **No production code changed.** The feature is strictly additive — the 8 existing unit tests remain untouched.

## How It Works
The suite uses `@nestjs/testing`'s `Test.createTestingModule({ imports: [AppModule] }).compile()` to build the *full* application, matching production wiring. It then:

1. Creates the Nest app with `moduleRef.createNestApplication()`.
2. Calls `app.setGlobalPrefix('api')` — mirroring `apps/api/src/main.ts`. **This is the critical step:** the prefix lives in `bootstrap()`, not in `AppModule`, so without replicating it every `/api/*` request would 404.
3. Calls `await app.init()` in `beforeAll`, and `await app.close()` in `afterAll`.
4. Drives the running server via `request(app.getHttpServer())` (default-imported `supertest`).

A local helper, `expectValidSignal(body)`, centralizes the "response shape conforms to `Signal`" acceptance criterion. It validates `id` (non-empty string), `asset` (string), `assetClass`/`direction`/`source` (against the union types from `@org/signals`), `confidence` (number 0–100), and `timestamp` (parseable ISO string), treating `reasoning`/`metadata` as optional.

Each test asserts **both** the HTTP status code and the JSON `Content-Type`, plus body-shape specifics:
- **GET list** → `200`, array of length `>= 6` (seed count, relaxed to stay order-independent after the POST test), every element valid.
- **GET valid id `1`** → `200`, body is the AAPL signal.
- **GET unknown id** → `404` with NestJS error body (`statusCode: 404`, defined `message`), confirming `NotFoundException` maps correctly through the exception filter.
- **POST create** → `201`, returns the created signal with a generated UUID `id`, `source` forced to `'manual'`, and `notes` mapped to `reasoning`.

## How to Use
This is developer-facing tooling — there is no UI. Run the suite via the API test target:

```
npx nx run api:test
```

The new integration suite runs automatically alongside the existing unit tests. To catch HTTP-layer regressions (routing, prefix, status codes, serialization, exception mapping), keep this suite green in CI.

## Configuration
None. No Jest, tsconfig, or Nx target changes are required — `tsconfig.spec.json` already globs `src/**/*.spec.ts` and Jest's default `testMatch` discovers the file. CORS is intentionally omitted from the test bootstrap (irrelevant to same-process supertest requests); only the global prefix affects routing.

## Key Files
- `apps/api/src/signals/signals.integration.spec.ts` — The integration test suite (new).
- `apps/api/src/main.ts` — Reference for the `app.setGlobalPrefix('api')` call the suite must replicate.
- `apps/api/src/app/app.module.ts` — Root module the suite boots from.
- `libs/signals/src/lib/signals.ts` — Source of the `Signal` / `ManualSignalInput` types validated by assertions.
- `package.json` — Adds `supertest` + `@types/supertest` dev dependencies.

## Validation
```
npm ls supertest @types/supertest    # confirm dev deps resolve
npx nx run api:test                  # new suite + 8 existing unit tests pass
npx nx run-many -t build             # zero build regressions (specs excluded from tsconfig.app.json)
npx nx run-many -t test              # all tests (api + dashboard) pass
npx nx run-many -t lint              # lint the new test file
```
