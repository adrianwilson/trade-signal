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

### Phase 2: Persistent Storage

Replace in-memory arrays with a real database so signals survive server restarts.

**Issues:**

- Add PostgreSQL (or SQLite for dev) to the API
- Create database schema for signals, agent logs, and assets
- Migrate SignalsService from in-memory array to database
- Add seed/migration scripts
- Update dashboard to handle loading/error states

---

### Phase 3: Live Market Data

Connect to real price feeds so the dashboard shows actual market data.

**Issues:**

- Integrate Alpha Vantage (free tier) or Yahoo Finance API
- Create Market Data Agent service in the API
- Fetch OHLCV data on a schedule (cron job via NestJS)
- Add asset price history model and endpoint
- Display live prices in the dashboard signal table
- Add last-updated timestamps and refresh controls

---

### Phase 4: Technical Analysis Agent

Calculate indicators from price history and generate signals automatically.

**Issues:**

- Implement RSI (Relative Strength Index) calculation
- Implement MACD (Moving Average Convergence Divergence)
- Implement moving averages (SMA, EMA)
- Implement Bollinger Bands
- Create Technical Analysis Agent service that generates signals from indicator thresholds
- Add indicator charts to the dashboard asset detail view
- Store generated signals with source="rsi", source="macd", etc.

---

### Phase 5: News Sentiment Agent

Ingest news headlines and score sentiment per asset.

**Issues:**

- Integrate a news API (NewsAPI, Finnhub, or RSS feeds)
- Create News Sentiment Agent service
- Use LLM (Claude API) to score article sentiment (-1 to +1) per asset
- Generate signals from sentiment shifts (positive surge = BUY signal)
- Add news feed panel to the dashboard
- Display sentiment scores alongside signals
- Store generated signals with source="news-sentiment"

---

### Phase 6: Signal Synthesis Agent

Aggregate signals from all agents into a final verdict with reasoning.

**Issues:**

- Create Signal Synthesis Agent that consumes signals from all other agents
- Implement weighted confidence calculation based on agent agreement
- Generate AggregatedSignal with reasoning chain explaining the verdict
- Surface agent disagreements (Technical says BUY, News says SELL)
- Add synthesis view to dashboard showing agent contributions
- Add confidence breakdown visualization (which agent contributed what)
- Add reasoning chain display for each aggregated signal

---

### Phase 7: User Features

Make the app personal -- watchlists, alerts, portfolio tracking.

**Issues:**

- Add user authentication (JWT or session-based)
- Implement watchlist (save assets to monitor)
- Implement alert system (notify on high-confidence signals via email or push)
- Add portfolio import (CSV upload of positions)
- Add portfolio view showing signals for held assets
- Add manual signal entry form in the dashboard

---

### Phase 8: Trust & Transparency

Prove the signals work. Track accuracy, calibrate confidence, backtest.

**Issues:**

- Track signal outcomes (was the BUY signal right after N days?)
- Calculate historical accuracy per agent and per asset class
- Add confidence calibration chart (does 80% confidence win 80%?)
- Add agent accuracy leaderboard to dashboard
- Implement backtesting: run agents against historical data
- Add "retrospective" view: if you followed all signals, what would your P&L be?

---

### Phase 9: Multi-Asset Expansion

Extend beyond equities to crypto, forex, and options.

**Issues:**

- Add crypto data source (CoinGecko API)
- Add forex data source
- Adapt technical analysis indicators for crypto/forex timeframes
- Add asset class filtering to dashboard
- Add cross-asset correlation signals (BTC moves affect tech stocks)

---

### Phase 10: Real-Time

Move from polling to real-time updates.

**Issues:**

- Add WebSocket support (NestJS gateway)
- Stream signal updates to dashboard in real-time
- Add live price ticker to toolbar
- Add real-time agent activity log (what each agent is doing now)
- Add signal feed with live updates (new signals appear without refresh)

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
