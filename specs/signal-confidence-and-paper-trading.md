# Spec: Signal Confidence & Paper Trading

## Overview

Two interconnected feature sets that transform Trade Signal from a signal dashboard into a platform users trust with real decisions.

**Signal Confidence** answers "should I trust the NEXT signal?" — not just "were past signals right?"
**Paper Trading** lets users test that trust with $100K of virtual cash before risking real money.

---

## Part 1: Signal Confidence

### 1.1 Time-Weighted Agent Accuracy

**Problem:** All-time accuracy (22%) doesn't tell you if an agent is hot or cold right now.

**Solution:** Rolling accuracy windows — 7-day, 30-day, and all-time side by side.

#### API Changes

**OutcomesService — add `getRecentAccuracy(days: number)`:**

- Query outcomes where `evaluatedAt` is within the last N days
- Return per-source accuracy for that window
- Expose via `GET /outcomes/leaderboard?window=7` query param

**Data model:** No new entities. Uses existing `OutcomeEntity.evaluatedAt` timestamp.

#### Dashboard Changes

**Leaderboard page — add time window toggle:**

- Three buttons: 7d / 30d / All
- Table updates reactively via Angular signal
- Highlight agents whose recent accuracy diverges significantly from all-time (trending up = green arrow, trending down = red arrow)

**Synthesis cards — add "Agent Hot/Cold" indicator:**

- Each agent contribution shows a small trend arrow based on 7-day vs all-time accuracy
- Hot agent (7d > all-time + 10%) = fire icon
- Cold agent (7d < all-time - 10%) = snowflake icon

---

### 1.2 Signal Conviction Scoring

**Problem:** 4/4 agents agreeing feels like strong consensus, but sometimes it means the move already happened.

**Solution:** A conviction score that combines agent agreement with price momentum.

#### API Changes

**SynthesisService — add conviction calculation:**

```
conviction = agreement_score * recency_factor * counter_momentum_bonus

agreement_score:
  4/4 agree = 1.0
  3/4 agree = 0.75
  2/4 agree = 0.5
  split = 0.25

recency_factor:
  Signal generated < 1h ago = 1.0
  Signal generated 1-4h ago = 0.8
  Signal generated 4-24h ago = 0.5
  Signal generated > 24h ago = 0.3

counter_momentum_bonus:
  Signal direction OPPOSITE to recent price movement = 1.2x
  Signal direction SAME as recent price movement = 0.8x
  (Contrarian signals that go against momentum get a bonus)
```

**New field on AggregatedSignal:** `conviction: number` (0-100)

**New field on AggregatedSignal:** `convictionLabel: 'strong' | 'moderate' | 'weak' | 'late'`

- strong: conviction >= 70, counter-momentum
- moderate: conviction 40-70
- weak: conviction < 40
- late: high agreement but same-direction as recent price move (market already moved)

#### Dashboard Changes

**Synthesis cards — conviction badge:**

- Display conviction score and label next to overall signal
- Color: strong = green, moderate = orange, weak = gray, late = red
- Tooltip: "4/4 agents agree BUY, price down 2% today — strong contrarian signal"

---

### 1.3 Market Regime Detection

**Problem:** RSI works in ranges, MACD works in trends. Using both equally in all conditions dilutes accuracy.

**Solution:** Classify the current market regime per asset and adjust agent weights.

#### API Changes

**New service: `RegimeService`**

**Regime classification using price history:**

```
Inputs: 30-day price history (closes)

1. Calculate ATR (Average True Range) over 14 days — volatility measure
2. Calculate ADX (Average Directional Index) over 14 days — trend strength
3. Classify:
   - ADX > 25 AND trending = "trending"
   - ADX > 25 AND high ATR = "volatile"
   - ADX <= 25 = "ranging"
```

**Regime-adjusted weights:**

| Agent          | Trending | Ranging | Volatile |
| -------------- | -------- | ------- | -------- |
| RSI            | 0.5      | 1.5     | 0.8      |
| MACD           | 1.5      | 0.5     | 0.8      |
| SMA Crossover  | 1.3      | 0.7     | 0.6      |
| Bollinger      | 0.7      | 1.3     | 1.2      |
| News Sentiment | 1.0      | 1.0     | 1.5      |

**New endpoint:** `GET /regime/:asset` — returns current regime and adjusted weights

**SynthesisService update:** Use regime-adjusted weights instead of static weights when regime data is available.

#### Dashboard Changes

**Synthesis cards — regime badge:**

- Display current regime per asset: "📈 Trending" / "↔️ Ranging" / "⚡ Volatile"
- Show which agents are weighted higher/lower in this regime
- Tooltip: "AAPL is trending — MACD and SMA weighted higher, RSI weighted lower"

---

## Part 2: Paper Trading

### 2.1 Core Paper Trading Engine

**Concept:** Virtual portfolio with $100,000 starting cash. Users "follow" signals to execute paper trades. All trades track which signal triggered them.

#### Data Model

**New entity: `PaperAccount`**

| Field           | Type   | Description                             |
| --------------- | ------ | --------------------------------------- |
| id              | string | UUID                                    |
| userId          | string | FK to User                              |
| name            | string | Account name (default: "Paper Account") |
| startingBalance | number | Initial cash (100,000)                  |
| cashBalance     | number | Current available cash                  |
| createdAt       | string | ISO timestamp                           |

**New entity: `PaperTrade`**

| Field        | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| id           | string | UUID                               |
| accountId    | string | FK to PaperAccount                 |
| asset        | string | Ticker symbol                      |
| assetClass   | string | equity/crypto/forex                |
| side         | string | 'buy' or 'sell'                    |
| quantity     | number | Number of shares/units             |
| entryPrice   | number | Price at execution                 |
| exitPrice    | number | null                               | Price at close (null if open)              |
| status       | string | 'open' or 'closed'                 |
| signalId     | string | null                               | FK to the signal that triggered this trade |
| signalSource | string | null                               | Which agent triggered it                   |
| confidence   | number | Signal confidence at time of trade |
| reasoning    | string | null                               | Signal reasoning chain                     |
| enteredAt    | string | ISO timestamp                      |
| exitedAt     | string | null                               | ISO timestamp                              |
| pnl          | number | null                               | Realized P&L (null if open)                |
| pnlPercent   | number | null                               | Realized P&L %                             |

**New entity: `PaperPosition`**

| Field                | Type   | Description            |
| -------------------- | ------ | ---------------------- |
| id                   | string | UUID                   |
| accountId            | string | FK to PaperAccount     |
| asset                | string | Ticker symbol          |
| assetClass           | string | equity/crypto/forex    |
| quantity             | number | Current position size  |
| avgEntryPrice        | number | Weighted average entry |
| currentPrice         | number | null                   | Latest market price |
| unrealizedPnl        | number | null                   | Open P&L            |
| unrealizedPnlPercent | number | null                   | Open P&L %          |

#### API — PaperTradingModule

**Endpoints (all JWT-protected):**

| Method | Path                              | Description                        |
| ------ | --------------------------------- | ---------------------------------- |
| POST   | /paper/accounts                   | Create paper account (auto $100K)  |
| GET    | /paper/accounts                   | Get user's paper accounts          |
| GET    | /paper/accounts/:id               | Get account with positions and P&L |
| POST   | /paper/accounts/:id/follow-signal | One-click follow a signal          |
| POST   | /paper/accounts/:id/trade         | Manual paper trade                 |
| POST   | /paper/accounts/:id/close/:asset  | Close a position                   |
| GET    | /paper/accounts/:id/trades        | Trade history                      |
| GET    | /paper/accounts/:id/performance   | Performance metrics                |

**Follow Signal logic:**

```
Input: signalId, accountId

1. Look up the signal (direction, confidence, asset, reasoning)
2. Look up current price via MarketDataService
3. Calculate position size based on confidence:
   - confidence >= 80: 10% of cash balance
   - confidence 60-79: 5% of cash balance
   - confidence 40-59: 2% of cash balance
   - confidence < 40: 1% of cash balance
4. Calculate quantity = positionSize / currentPrice
5. If direction = BUY:
   - Create PaperTrade (side: 'buy')
   - Create or update PaperPosition (add to quantity, recalc avg price)
   - Deduct from cashBalance
6. If direction = SELL:
   - If existing long position: close it (create closing trade, calculate P&L)
   - If no position: create short trade (simplified: just track the entry)
   - Add proceeds to cashBalance
7. Record signalId, signalSource, confidence, reasoning on the trade
```

**Performance metrics:**

```
GET /paper/accounts/:id/performance

Returns:
{
  totalValue: number,         // cash + positions at market price
  totalReturn: number,        // % change from starting balance
  totalReturnDollar: number,  // $ change from starting balance
  winRate: number,            // % of closed trades that were profitable
  avgWin: number,             // average winning trade %
  avgLoss: number,            // average losing trade %
  profitFactor: number,       // total wins / total losses
  totalTrades: number,
  openPositions: number,
  bestTrade: { asset, pnlPercent },
  worstTrade: { asset, pnlPercent },
  bySource: {                 // performance broken down by signal source
    rsi: { trades, winRate, avgReturn },
    macd: { trades, winRate, avgReturn },
    ...
  },
  benchmark: {
    sp500Return: number,      // S&P 500 return over same period
    btcReturn: number,        // BTC return over same period
    buyAndHoldReturn: number, // if you just bought and held your first assets
  },
  equityCurve: [              // daily snapshots for charting
    { date, totalValue, cashBalance, positionsValue }
  ]
}
```

#### Dashboard — Paper Trading Pages

**New route: `/paper`**

**Paper Trading Dashboard:**

- Account summary card: total value, return %, cash available
- Equity curve chart (Chart.js line chart)
- Open positions table with live P&L
- "Follow Signal" buttons on synthesis cards (new)

**Trade History page (`/paper/history`):**

- All trades table: asset, side, entry price, exit price, P&L, signal source, date
- Filter by: asset, side (buy/sell), status (open/closed), signal source
- Each trade shows the reasoning chain that triggered it

**Performance page (`/paper/performance`):**

- Win rate, profit factor, average win/loss
- Performance by signal source (which agents make the most paper money?)
- Benchmark comparison: your returns vs S&P 500 vs BTC vs buy-and-hold
- This is the ultimate confidence builder: "Following RSI signals in paper trading returned 12% vs S&P's 8%"

**Synthesis cards — "Follow" button:**

- Each synthesis card gets a "Follow Signal" button (only when logged in + paper account exists)
- Click opens a confirmation: "Buy 15 shares of AAPL at $325 ($4,875) based on BUY signal at 75% confidence?"
- After following, the button changes to "Following ✓" with the position size

---

## Part 3: Integration — The Trust Loop

The three confidence features feed into paper trading:

1. **Time-weighted accuracy** helps users decide WHICH signals to follow
2. **Conviction scoring** helps users decide WHEN to follow (strong vs late)
3. **Market regime** helps users understand WHY agents are weighted differently
4. **Paper trading** lets users ACT on that understanding risk-free
5. **Performance by source** in paper trading PROVES which signals actually make money

The feedback loop: See signal → Check conviction → Check regime → Follow in paper → Track result → Build trust → Eventually trade for real.

---

## Implementation Order

| Phase | Feature                   | Depends On                | Effort                    |
| ----- | ------------------------- | ------------------------- | ------------------------- |
| 1     | Time-weighted accuracy    | Existing outcomes         | Small — query filter      |
| 2     | Conviction scoring        | Existing synthesis        | Medium — new calculation  |
| 3     | Paper trading engine      | Auth, market data         | Large — new module        |
| 4     | Paper trading dashboard   | Paper engine              | Medium — new pages        |
| 5     | Market regime detection   | Market data, indicators   | Medium — new service      |
| 6     | Follow signal integration | Paper trading + synthesis | Small — button + API call |
| 7     | Performance benchmarking  | Paper trading             | Medium — S&P/BTC data     |

**Recommended sequence:** 1 → 2 → 3 → 4 → 6 → 5 → 7

Start with the quick wins (time-weighted accuracy, conviction) that make the existing UI smarter, then build the paper trading engine, then tie them together.

---

## Acceptance Criteria

### Signal Confidence

- [ ] Leaderboard shows 7d / 30d / all-time accuracy toggle
- [ ] Synthesis cards show agent hot/cold indicators
- [ ] Conviction score displayed on each synthesis card (strong/moderate/weak/late)
- [ ] Contrarian signals highlighted when direction opposes recent price movement
- [ ] Market regime detected per asset (trending/ranging/volatile)
- [ ] Agent weights adjusted based on current regime
- [ ] Regime badge displayed on synthesis cards

### Paper Trading

- [ ] Create paper account with $100K starting balance
- [ ] One-click "Follow Signal" from synthesis cards
- [ ] Position sizing based on signal confidence
- [ ] Open positions table with live unrealized P&L
- [ ] Close positions and calculate realized P&L
- [ ] Trade history with signal attribution (which agent, what reasoning)
- [ ] Performance dashboard: win rate, profit factor, equity curve
- [ ] Performance breakdown by signal source
- [ ] Benchmark comparison vs S&P 500
- [ ] Trade journal showing reasoning chain for each trade
