# Feature: Add Health Check Endpoint

## Metadata

- **issue_number:** 1
- **adw_id:** 7cc59c0b
- **issue_json:** {"number":1,"title":"Add health check endpoint at GET /api/health","state":"OPEN","labels":[]}

## Feature Description

Add a health check endpoint to the NestJS API at `GET /api/health` that returns the service status, uptime, and timestamp. This is needed for monitoring and for the ADW health check system.

## User Story

As a developer
I want a health check endpoint
So that I can monitor whether the API is running and for how long

## Problem Statement

There is no way to verify the API is healthy beyond hitting an application endpoint. A dedicated health check endpoint provides a standardized way for monitoring tools, load balancers, and the ADW pipeline to verify the API is running.

## Solution Statement

Add a `health` route to the existing `AppController` (or create a dedicated `HealthController`) that returns a JSON response with `status`, `uptime` (in seconds), and `timestamp`. The endpoint requires no authentication and always returns 200 when the server is reachable. Add unit and integration tests for the endpoint.

## Relevant Files

- `apps/api/src/app/app.controller.ts` — Existing root controller; add the `health` route here since it's a simple app-level endpoint.
- `apps/api/src/app/app.service.ts` — Existing root service; add a `getHealth()` method.
- `apps/api/src/app/app.module.ts` — Module wiring (no change expected).
- `apps/api/src/main.ts` — Global prefix `/api` is set here (reference only).
- `apps/api/jest.config.ts` — Jest config (reference only).

### New Files

- `apps/api/src/app/app.controller.spec.ts` — Unit tests for the health endpoint (if not already present).

## Implementation Plan

### Phase 1: Foundation

Add the `getHealth()` method to `AppService` returning `{ status, uptime, timestamp }`.

### Phase 2: Core Implementation

Add the `@Get('health')` route to `AppController` that calls `appService.getHealth()`. Add unit tests for both the service method and the controller route. Add an integration test via supertest.

### Phase 3: Integration

Run full validation suite including format check and typecheck.

## Step by Step Tasks

### 1. Add getHealth method to AppService

- Edit `apps/api/src/app/app.service.ts` to add a `getHealth()` method that returns:
  ```json
  {
    "status": "ok",
    "uptime": <process.uptime() in seconds>,
    "timestamp": "<ISO 8601 string>"
  }
  ```

### 2. Add health route to AppController

- Edit `apps/api/src/app/app.controller.ts` to add:
  ```typescript
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
  ```

### 3. Add unit tests

- Create `apps/api/src/app/app.controller.spec.ts` with tests:
  - `AppService.getHealth()` returns object with status, uptime, timestamp
  - `AppController.getHealth()` calls service and returns the result
  - `status` is `"ok"`, `uptime` is a number >= 0, `timestamp` is a valid ISO string

### 4. Add integration test

- Add a test to `apps/api/src/signals/signals.integration.spec.ts` (or create a new `app.integration.spec.ts`) that tests:
  - `GET /api/health` returns 200
  - Response body has `status`, `uptime`, `timestamp` fields
  - `status` is `"ok"`

### 5. Run full validation suite

- Run every command in `Validation Commands` below, including `format:check` and `typecheck`.

## Testing Strategy

### Unit Tests

- `AppService.getHealth()` returns `{ status: "ok", uptime: number, timestamp: string }`
- `AppController.getHealth()` delegates to service

### Integration Tests

- `GET /api/health` returns 200 with correct JSON shape

### E2E Tests (if UI-affecting)

Not applicable — API-only change, no UI impact.

### Edge Cases

- Uptime should always be >= 0
- Timestamp should be a valid ISO 8601 string

## Acceptance Criteria

- `GET /api/health` returns 200 with `{ status: "ok", uptime: <number>, timestamp: "<ISO string>" }`
- No authentication required
- Unit tests pass for service and controller
- Integration test passes for the endpoint
- All existing tests continue to pass with coverage >= 70%
- `format:check` and `typecheck` pass

## Validation Commands

- `pnpm exec nx run-many -t build --skip-nx-cache` - Build all projects
- `pnpm exec nx run-many -t test --skip-nx-cache` - Run all tests with coverage
- `pnpm exec nx run-many -t lint --skip-nx-cache` - Lint all projects
- `pnpm exec nx run-many -t typecheck --skip-nx-cache` - Typecheck all projects
- `pnpm exec nx format:check --base=origin/main` - Check formatting

## Notes

- This is a simple feature. The existing `AppController` already handles `/api` (root) — adding `/api/health` is one route and one service method.
- `process.uptime()` returns seconds since the Node.js process started — no external dependencies needed.
