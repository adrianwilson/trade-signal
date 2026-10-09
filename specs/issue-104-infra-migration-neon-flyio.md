# Chore: Migrate to Neon Postgres + Fly.io Deployment

## Metadata

- **issue_number:** 104
- **adw_id:** N/A (infrastructure)

## Current Architecture

```
Local Machine
├── apps/dashboard/     → Angular dev server (localhost:4200)
├── apps/api/           → NestJS dev server (localhost:3000)
└── data/signals.sqlite → SQLite file database (better-sqlite3)
```

- All services run locally
- SQLite stores all data in a single file
- No deployment pipeline
- No remote access

## Target Architecture

```
Fly.io (single machine)
├── NestJS API           → serves /api/* routes
├── Angular static build → served from /assets, /* via ServeStaticModule
└── connects to:
    └── Neon Postgres (managed, free tier)
        └── DATABASE_URL connection string
```

### Component Breakdown

| Component        | Current                        | Target                              |
| ---------------- | ------------------------------ | ----------------------------------- |
| Database         | SQLite (`data/signals.sqlite`) | Neon Postgres (free tier, 0.5 GB)   |
| API hosting      | Local only                     | Fly.io (single machine, 256 MB RAM) |
| Frontend hosting | Angular dev server             | Static files served by NestJS       |
| DB driver        | `better-sqlite3`               | `pg` (node-postgres)                |
| Config           | Hardcoded                      | `DATABASE_URL` env var              |
| Local dev DB     | SQLite file                    | Postgres (local or Neon dev branch) |
| Test DB          | SQLite `:memory:`              | SQLite `:memory:` (unchanged)       |

### Environment Variables

| Variable       | Description                     | Example                                                                        |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET`   | Auth token secret               | (existing)                                                                     |
| `NODE_ENV`     | Environment flag                | `production`                                                                   |
| `PORT`         | API listen port                 | `3000`                                                                         |

### Database Changes

TypeORM column type mapping from SQLite to Postgres:

| SQLite    | Postgres           | Used in                        |
| --------- | ------------------ | ------------------------------ |
| `text`    | `varchar` / `text` | All string PKs, string columns |
| `real`    | `double precision` | Prices, quantities, P&L        |
| `integer` | `integer`          | Confidence scores              |

TypeORM with `synchronize: true` handles this automatically when the dialect changes. No manual migration needed.

### Deployment Topology

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────┴───────┐
                    │   Fly.io     │
                    │  (1 machine) │
                    │              │
                    │  NestJS API  │
                    │  + Angular   │
                    │  static files│
                    └──────┬───────┘
                           │ TLS (connection string)
                    ┌──────┴───────┐
                    │  Neon Postgres│
                    │  (managed)   │
                    └──────────────┘
```

### New Files

| File            | Purpose                                       |
| --------------- | --------------------------------------------- |
| `Dockerfile`    | Multi-stage build: install deps → build → run |
| `fly.toml`      | Fly.io machine config (region, size, env)     |
| `.dockerignore` | Exclude node_modules, dist, data, .git        |

### Changes to Existing Files

| File                             | Change                                                                  |
| -------------------------------- | ----------------------------------------------------------------------- |
| `apps/api/src/app/app.module.ts` | Postgres by default via `DATABASE_URL`, SQLite only for `NODE_ENV=test` |
| `apps/api/src/main.ts`           | Add `ServeStaticModule` for Angular build in production                 |
| `package.json`                   | Add `pg` dependency, add `start:prod` script                            |
| `README.md`                      | Add Postgres setup, deployment instructions                             |
| `CLAUDE.md`                      | Update architecture section                                             |

### Test Strategy

- Unit/integration tests continue using SQLite `:memory:` — no change
- Manual smoke test against Neon Postgres locally before first deploy
- Verify all CRUD operations, cron jobs, and WebSocket connections work

### Risks

- **R1:** Neon free tier has connection limits (100 concurrent). Cron jobs that hold connections could exhaust the pool. Mitigation: use connection pooling via Neon's pooler endpoint.
- **R2:** SQLite-specific SQL (if any) won't work on Postgres. Mitigation: TypeORM abstracts all queries — no raw SQL in the codebase.
- **R3:** Fly.io single machine means downtime during deploys. Acceptable for a personal trading dashboard.

### Step by Step Tasks

1. Add `pg` dependency: `pnpm add pg`
2. Update `app.module.ts` to use Postgres via `DATABASE_URL` (local + prod), SQLite only for tests
3. Add `ServeStaticModule` to serve Angular static files in production
4. Create `Dockerfile` (multi-stage: deps → build all → production image)
5. Create `.dockerignore`
6. Create `fly.toml`
7. Update `README.md` with new architecture and deployment instructions
8. Update `CLAUDE.md` architecture section
9. Run full validation suite
10. Test locally against Neon Postgres
11. Deploy to Fly.io

### Validation Commands

- `pnpm exec nx reset`
- `pnpm exec nx run-many -t build`
- `pnpm exec nx run-many -t test -- --forceExit`
- `pnpm exec nx run-many -t lint`
- `pnpm exec nx format:check --all`
