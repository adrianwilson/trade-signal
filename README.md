# trade-signal

Multi-asset trading signal dashboard with AI-powered agents.

## Stack

- **Frontend:** Angular + Angular Material
- **Backend:** NestJS
- **Monorepo:** Nx
- **Language:** TypeScript everywhere

## Architecture

```
apps/
  dashboard/    # Angular signal dashboard
  api/          # NestJS backend with agent orchestration
libs/
  signals/      # Shared types (Signal, AggregatedSignal, AgentLogEntry)
```

Agent-powered signal aggregation across equities, crypto, forex, and options.
AI agents ingest data (manual + API), analyze with reasoning, and surface
buy/sell/hold signals with confidence scores.

### Agent Modules (to build)

| Module | Agentic Pattern | Purpose |
|--------|----------------|---------|
| Market Data Agent | Tool use, API integration | Fetch prices from exchanges/APIs |
| Technical Analysis Agent | Reasoning, chain of thought | RSI, MACD, volume analysis |
| News Sentiment Agent | RAG, web search | Analyze news for sentiment scores |
| Signal Synthesis Agent | Multi-agent orchestration | Aggregate all signals into final verdict |

## Getting Started

```bash
npm install
npx nx serve dashboard    # Angular dev server
npx nx serve api          # NestJS dev server
```

## Development

```bash
npx nx graph              # Visualize project dependencies
npx nx run-many -t build  # Build all projects
npx nx run-many -t test   # Run all tests
```
