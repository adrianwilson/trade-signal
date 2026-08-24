# AI Developer Workflow (ADW) System

ADW automates software development by integrating GitHub issues with Claude Code CLI to classify issues, generate plans, implement solutions, and create pull requests.

## Quick Start

### 1. Set Environment Variables

```bash
cp .env.sample .env
# Edit .env with your keys
```

### 2. Install Prerequisites

```bash
# GitHub CLI
brew install gh
gh auth login

# Claude Code CLI
# Follow instructions at https://docs.anthropic.com/en/docs/claude-code
```

### 3. Run ADW

```bash
# Process a single issue
node adws/adw-plan-build.mjs 123

# Run continuous monitoring (polls every 20 seconds)
node adws/trigger-cron.mjs

# Run health check
node adws/health-check.mjs
```

## How ADW Works

1. **Issue Classification**: Analyzes GitHub issue and determines type:
   - `/chore` - Maintenance, documentation
   - `/bug` - Bug fixes
   - `/feature` - New features
   - `/refactor` - Code restructuring

2. **Planning**: `sdlc_planner` agent creates implementation plan in `specs/`

3. **Implementation**: `sdlc_implementor` agent executes the plan

4. **Integration**: Creates git commits and pull request with links to plan and issue

## Scripts

| Script | Purpose |
|--------|---------|
| `adw-plan-build.mjs` | Main orchestrator -- full pipeline for one issue |
| `trigger-cron.mjs` | Polls GitHub every 20s for new issues or "adw" comments |
| `health-check.mjs` | Validates env vars, git, gh CLI, Claude CLI |
| `agent.mjs` | Claude Code CLI wrapper |
| `github.mjs` | GitHub operations via gh CLI |
| `utils.mjs` | ADW ID generation, logging |

## Output Structure

```
agents/
  {adw-id}/
    sdlc_planner/
      raw_output.jsonl
      raw_output.json
      prompts/
    sdlc_implementor/
      raw_output.jsonl
      raw_output.json
    adw_plan_build/
      execution.log
```
