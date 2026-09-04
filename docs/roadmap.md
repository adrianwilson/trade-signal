# Trade Signal Roadmap

Multi-asset trading signal dashboard with AI-powered agents. Aggregates data from multiple sources, analyzes with reasoning, and surfaces buy/sell/hold signals with transparent confidence scores.

## Vision

A self-hosted trading signal platform where AI agents analyze market data, technical indicators, and news sentiment independently, then a synthesis agent aggregates their findings into actionable signals with full reasoning transparency. Every signal shows why -- which agents agreed, which disagreed, and what data drove the conclusion.

## Differentiator

Most signal platforms are black boxes. Trade Signal shows the reasoning chain: each agent's analysis is visible, disagreements are surfaced as information, and confidence is calibrated against historical accuracy.

## Phases

### Phase 1: Foundation (COMPLETE)

The app skeleton is built. Angular Material dashboard with signal table, NestJS API with CRUD endpoints, shared types in `libs/signals`.

**Delivered:**

- Angular dashboard with toolbar, sidenav, signal table
- NestJS API with in-memory signal store (6 seed signals)
- Shared types: Signal, AggregatedSignal, AgentLogEntry, ManualSignalInput
- Agentic layer: full SDLC pipeline with 11 phases

---

### Phase 2: Persistent Storage (COMPLETE)

Replace in-memory arrays with a real database so signals survive server restarts.

**Delivered:**

- SQLite database with TypeORM for persistent signal storage (#13)
- Dashboard loading and error states (#15)

---

### Phase 3: Live Market Data (COMPLETE)

Connect to real price feeds so the dashboard shows actual market data.

**Delivered:**

- Yahoo Finance API integration (#17)
- Last-updated timestamps and refresh controls (#19)

---

### Phase 4: Technical Analysis Agent (COMPLETE)

Calculate indicators from price history and generate signals automatically.

**Delivered:**

- RSI and MACD technical analysis (#21)
- SMA/EMA moving averages with crossover signals (#23)
- Bollinger Bands (#25)
- Signal source tagging for indicator attribution (#27)
- Indicator charts in asset detail view (#28)

---

### Phase 5: News Sentiment Agent (COMPLETE)

Ingest news headlines and score sentiment per asset.

**Delivered:**

- News Sentiment Agent with keyword-based scoring (#30)
- News sentiment panel in dashboard (#32)

---

### Phase 6: Signal Synthesis Agent (COMPLETE)

Aggregate signals from all agents into a final verdict with reasoning.

**Delivered:**

- Signal Synthesis Agent with weighted aggregation and reasoning chains (#36)

---

### Phase 7: User Features (COMPLETE)

Make the app personal -- watchlists, alerts, portfolio tracking.

**Delivered:**

- JWT authentication with registration and login (#38)
- Watchlist with auth-protected CRUD and synthesis integration (#40)
- Alert system with bell icon and unread badge (#42)
- Portfolio tracking with CSV import and P&L (#44)

---

### Phase 8: Trust & Transparency (COMPLETE)

Prove the signals work. Track accuracy, calibrate confidence, backtest.

**Delivered:**

- Signal outcome tracking and agent accuracy leaderboard (#46)
- Confidence calibration and backtesting retrospective (#48)
- Time-weighted agent accuracy with rolling windows (#56)
- Conviction scoring with contrarian detection (#58)
- Paper trading engine with virtual portfolio and signal following (#60)
- Follow Signal button on synthesis cards (#62)

---

### Phase 9: Multi-Asset Expansion (COMPLETE)

Extend beyond equities to crypto, forex, and options.

**Delivered:**

- CoinGecko crypto data source and asset class filtering (#50)

---

### Phase 10: Real-Time (COMPLETE)

Move from polling to real-time updates.

**Delivered:**

- WebSocket gateway for real-time signal updates and live price ticker (#52)

## Issue Creation Guide

Each bullet under "Issues" maps to a GitHub issue. Create them using the issue templates:

```bash
# Example: create a Phase 2 issue
gh issue create --template feature.yml \
  --title "Add PostgreSQL database for persistent signal storage" \
  --body "..."
```

Then process via the pipeline:

```bash
# Local isolated
./scripts/sdlc.sh <issue-number>

# Or unattended
# Comment "adw" on the issue
```

## Metrics

Track pipeline performance in `app_docs/agentic_kpis.md`. Each phase should show:

- Decreasing attempts (pipeline gets better at your codebase)
- Increasing plan size (features get more complex)
- Stable or increasing streak (consistent quality)
