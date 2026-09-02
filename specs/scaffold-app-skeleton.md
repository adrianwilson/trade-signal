# Feature: Scaffold App Skeleton

## Feature Description

Wire up the full-stack skeleton so the Angular dashboard and NestJS API are functional and connected. This includes: installing Angular Material and building a shell layout (toolbar, sidenav), creating a signals table page with routing, building NestJS CRUD endpoints for signals using the shared `@org/signals` types, connecting the frontend to the backend via an Angular `HttpClient` service, and enabling CORS so the two dev servers can communicate. After this feature ships, the app has a working end-to-end loop: the dashboard fetches and displays signals from the API.

## User Story

As a trader
I want to see a dashboard with a table of trading signals fetched from the API
So that I can view buy/sell/hold recommendations across asset classes in one place

## Problem Statement

The repo is scaffolded but empty. The Angular app shows the Nx welcome page, the NestJS API returns "Hello API", the shared types exist but nothing consumes them, and there is no routing, layout, or data flow. Nothing works end-to-end.

## Solution Statement

Build the minimum viable skeleton in three layers: (1) a NestJS `SignalsModule` with an in-memory store and CRUD controller, (2) an Angular Material shell with toolbar + sidenav + signals table page, and (3) an `HttpClient`-based `SignalService` connecting the two. CORS on the API allows the Angular dev server (port 4200) to call the API (port 3000). The shared `@org/signals` types are used on both sides to keep the contract in sync.

## Relevant Files

Use these files to implement the feature:

- `libs/signals/src/lib/signals.ts` -- shared types (`Signal`, `AggregatedSignal`, `ManualSignalInput`, etc.) consumed by both API and dashboard
- `libs/signals/src/index.ts` -- barrel export for the shared lib
- `apps/api/src/main.ts` -- NestJS bootstrap; add CORS config here
- `apps/api/src/app/app.module.ts` -- root module; import the new `SignalsModule`
- `apps/api/src/app/app.controller.ts` -- existing root controller (keep as health check)
- `apps/api/src/app/app.service.ts` -- existing root service (keep as health check)
- `apps/dashboard/src/main.ts` -- Angular bootstrap
- `apps/dashboard/src/app/app.ts` -- root component; replace Nx welcome with Material shell
- `apps/dashboard/src/app/app.config.ts` -- app config; add `provideHttpClient` and `provideAnimationsAsync`
- `apps/dashboard/src/app/app.routes.ts` -- routing; add signal table route
- `apps/dashboard/src/app/app.spec.ts` -- existing test; update to match new shell
- `apps/dashboard/src/styles.scss` -- global styles; add Material theme
- `apps/dashboard/src/index.html` -- add Material font links
- `apps/dashboard/project.json` -- dashboard build/serve/test config
- `package.json` -- root dependencies
- `nx.json` -- Nx workspace config
- `tsconfig.base.json` -- root TS config

### New Files

- `apps/api/src/signals/signals.module.ts` -- NestJS module for signal endpoints
- `apps/api/src/signals/signals.controller.ts` -- REST controller: GET /api/signals, GET /api/signals/:id, POST /api/signals
- `apps/api/src/signals/signals.service.ts` -- in-memory signal store with CRUD operations
- `apps/api/src/signals/signals.controller.spec.ts` -- controller unit tests
- `apps/api/src/signals/signals.service.spec.ts` -- service unit tests
- `apps/dashboard/src/app/layout/layout.ts` -- shell component with Material toolbar + sidenav
- `apps/dashboard/src/app/layout/layout.html` -- shell template
- `apps/dashboard/src/app/layout/layout.scss` -- shell styles
- `apps/dashboard/src/app/signals/signal-table/signal-table.ts` -- signals table page component
- `apps/dashboard/src/app/signals/signal-table/signal-table.html` -- table template
- `apps/dashboard/src/app/signals/signal-table/signal-table.scss` -- table styles
- `apps/dashboard/src/app/signals/signal-table/signal-table.spec.ts` -- table component tests
- `apps/dashboard/src/app/services/signal.service.ts` -- Angular HttpClient service for API calls
- `apps/dashboard/src/app/services/signal.service.spec.ts` -- service tests

## Implementation Plan

### Phase 1: Foundation

Install Angular Material and Angular CDK as dependencies. Configure the Material theme in `styles.scss`, add font links to `index.html`, and register `provideAnimationsAsync` and `provideHttpClient` in `app.config.ts`. Enable CORS in the NestJS `main.ts` bootstrap.

### Phase 2: Core Implementation

**API side:** Create a `SignalsModule` with a `SignalsService` (in-memory array of `Signal` objects seeded with sample data) and a `SignalsController` exposing `GET /api/signals`, `GET /api/signals/:id`, and `POST /api/signals`. Import `@org/signals` types for the data contracts. Register the module in `AppModule`.

**Dashboard side:** Create a `LayoutComponent` with Material `mat-toolbar` and `mat-sidenav-container`. Create a `SignalTableComponent` that displays signals in a `mat-table` with columns for asset, direction, confidence, source, and timestamp. Create a `SignalService` that uses `HttpClient` to call the API. Wire up routing: `/` redirects to `/signals`, `/signals` loads the table inside the layout.

### Phase 3: Integration

Replace the Nx welcome component with the new layout shell in `app.ts`. Update the existing `app.spec.ts` to reflect the new root component. Verify the full loop: `npx nx serve api` starts the API with seed data, `npx nx serve dashboard` starts the frontend, navigating to `http://localhost:4200/signals` shows the table populated from the API.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Install Angular Material

- Run `npm install @angular/material @angular/cdk @angular/animations` at the workspace root
- Verify the packages appear in `package.json` dependencies

### Step 2: Configure Angular Material theme and fonts

- Edit `apps/dashboard/src/styles.scss` to import a Material prebuilt theme (e.g., `@angular/material/prebuilt-themes/azure-blue.css`) and add base body styles (margin: 0, font-family: Roboto)
- Edit `apps/dashboard/src/index.html` to add Google Fonts link for Roboto and Material Icons

### Step 3: Update Angular app config

- Edit `apps/dashboard/src/app/app.config.ts` to add `provideHttpClient()` from `@angular/common/http` and `provideAnimationsAsync()` from `@angular/platform-browser/animations/async`

### Step 4: Enable CORS on the NestJS API

- Edit `apps/api/src/main.ts` to call `app.enableCors({ origin: 'http://localhost:4200' })` before `app.listen()`

### Step 5: Create the NestJS SignalsService

- Create `apps/api/src/signals/signals.service.ts`
- Implement an `@Injectable()` class with an in-memory `Signal[]` array
- Seed it with 5-6 sample signals across different asset classes (equity, crypto, forex)
- Methods: `findAll(): Signal[]`, `findOne(id: string): Signal | undefined`, `create(input: ManualSignalInput): Signal`
- Import types from `@org/signals`

### Step 6: Create the NestJS SignalsController

- Create `apps/api/src/signals/signals.controller.ts`
- `@Controller('signals')` with three endpoints:
  - `@Get()` -> `findAll()` returns all signals
  - `@Get(':id')` -> `findOne(id)` returns one signal or throws `NotFoundException`
  - `@Post()` -> `create(body)` creates a new signal and returns it
- Import types from `@org/signals`

### Step 7: Create the NestJS SignalsModule and register it

- Create `apps/api/src/signals/signals.module.ts` with `SignalsController` and `SignalsService`
- Edit `apps/api/src/app/app.module.ts` to import `SignalsModule`

### Step 8: Write API unit tests

- Create `apps/api/src/signals/signals.service.spec.ts` -- test findAll returns seed data, findOne returns correct signal, create adds a signal
- Create `apps/api/src/signals/signals.controller.spec.ts` -- test controller methods delegate to service, test NotFoundException on missing id

### Step 9: Create the Angular SignalService

- Create `apps/dashboard/src/app/services/signal.service.ts`
- `@Injectable({ providedIn: 'root' })` class using `HttpClient`
- Methods: `getSignals(): Observable<Signal[]>`, `getSignal(id: string): Observable<Signal>`, `createSignal(input: ManualSignalInput): Observable<Signal>`
- Base URL: `http://localhost:3000/api`
- Import types from `@org/signals`

### Step 10: Create the Layout component

- Create `apps/dashboard/src/app/layout/layout.ts` -- standalone component importing `MatToolbarModule`, `MatSidenavModule`, `MatListModule`, `RouterModule`
- Create `apps/dashboard/src/app/layout/layout.html` -- toolbar with app title, sidenav with nav links, `<router-outlet>` in the content area
- Create `apps/dashboard/src/app/layout/layout.scss` -- full-height layout, sidenav width

### Step 11: Create the SignalTable component

- Create `apps/dashboard/src/app/signals/signal-table/signal-table.ts` -- standalone component importing `MatTableModule`, `MatChipsModule`, `DatePipe`
- Inject `SignalService`, fetch signals on init, assign to `MatTableDataSource`
- Columns: asset, assetClass, direction, confidence, source, timestamp
- Create `apps/dashboard/src/app/signals/signal-table/signal-table.html` -- Material table with column definitions, color-coded direction chips (BUY=green, SELL=red, HOLD=amber)
- Create `apps/dashboard/src/app/signals/signal-table/signal-table.scss` -- table styling

### Step 12: Wire up routing

- Edit `apps/dashboard/src/app/app.routes.ts`:
  - `''` path redirects to `/signals`
  - `''` path with `LayoutComponent` as parent, children: `{ path: 'signals', component: SignalTableComponent }`

### Step 13: Update root App component

- Edit `apps/dashboard/src/app/app.ts` to remove `NxWelcome` import, keep only `RouterModule`
- Delete `apps/dashboard/src/app/nx-welcome.ts` (no longer needed)
- Update template to just `<router-outlet />`

### Step 14: Write dashboard unit tests

- Create `apps/dashboard/src/app/services/signal.service.spec.ts` -- test HTTP calls with `HttpClientTestingModule`
- Create `apps/dashboard/src/app/signals/signal-table/signal-table.spec.ts` -- test component renders table with mock data
- Update `apps/dashboard/src/app/app.spec.ts` -- remove NxWelcome references, test that App renders router-outlet

### Step 15: Validate

- Run all validation commands listed below
- Verify zero build errors, zero test failures, zero lint errors

## Testing Strategy

### Unit Tests

- **SignalsService (API):** findAll returns seeded signals, findOne by valid/invalid ID, create generates ID and timestamp
- **SignalsController (API):** delegates to service, throws NotFoundException for missing ID
- **SignalService (Dashboard):** HTTP GET/POST calls hit correct URLs with `HttpClientTestingModule`
- **SignalTableComponent:** renders table rows from mock signal data, displays correct columns
- **App component:** renders a router-outlet

### Integration Tests

- Manual verification: run both `npx nx serve api` and `npx nx serve dashboard`, navigate to `http://localhost:4200/signals`, confirm the table shows seed data from the API

### Edge Cases

- API returns empty signals array -- table should show empty state or no rows
- Signal ID not found -- API returns 404
- POST with missing fields -- NestJS validation (future enhancement, not in this scaffold)
- CORS preflight on POST -- verify OPTIONS request succeeds
- Dashboard loaded before API is ready -- HttpClient error handling (future enhancement)

## Acceptance Criteria

- `npx nx serve dashboard` starts the Angular app on port 4200 with a Material toolbar, sidenav, and signals table page
- `npx nx serve api` starts the NestJS API on port 3000 with CORS enabled
- `GET http://localhost:3000/api/signals` returns a JSON array of seeded Signal objects matching the `@org/signals` type
- `GET http://localhost:3000/api/signals/:id` returns a single signal or 404
- `POST http://localhost:3000/api/signals` creates and returns a new signal
- Navigating to `http://localhost:4200/signals` shows a Material table populated with signals from the API
- All signals display: asset name, asset class, direction (color-coded), confidence score, source, and timestamp
- Shared types from `libs/signals` are used in both the API and dashboard (no duplicate type definitions)
- `npx nx run-many -t build` succeeds with zero errors
- `npx nx run-many -t test` succeeds with zero failures
- `npx nx run-many -t lint` succeeds with zero errors

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `npx nx run-many -t build` - Build all projects (dashboard, api, signals) to validate zero compilation errors
- `npx nx run-many -t test` - Run all unit tests across the workspace to validate zero regressions
- `npx nx run-many -t lint` - Lint all projects to validate code quality and consistency

## Notes

- **In-memory store:** The API uses a plain array for signal storage. This is intentional for the scaffold -- a real database will be added later.
- **No validation pipes:** NestJS request validation (class-validator, DTOs) is deferred to a follow-up. The POST endpoint accepts raw JSON for now.
- **Hardcoded API URL:** The dashboard `SignalService` uses `http://localhost:3000/api` directly. A proxy config or environment variable system should be added later.
- **Angular Material version:** Angular Material 22.x matches Angular 22.x already in the workspace. No version conflicts expected.
- **Nx test runner:** Dashboard uses `@angular/build:unit-test` (vitest-angular). API doesn't have a test target configured yet -- tests may need to be run directly with vitest or a test target added to `apps/api/package.json`.
- **New npm packages:** `@angular/material`, `@angular/cdk`, `@angular/animations` will be added via `npm install`.
