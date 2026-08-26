# AI Developer Workflow (ADW) System

ADW automates software development by integrating GitHub issues with Claude Code CLI to classify issues, generate plans, implement solutions, run tests, and create pull requests.

## Quick Start

```bash
cp .env.sample .env
# Edit .env with your keys

# Full pipeline: plan + build + test
node adws/adw-plan-build-test.mjs 42

# Or run steps independently:
node adws/adw-plan.mjs 42           # Plan only -> outputs adw-id
node adws/adw-build.mjs 42 <adw-id> # Build from existing plan
node adws/adw-test.mjs 42 <adw-id>  # Test with auto-fix retries

# Unattended monitoring
node adws/trigger-cron.mjs

# Health check
node adws/health-check.mjs
```

## Composable Pipeline

The ADW system is built from composable scripts that can run independently or chained:

| Script | What it does | Requires |
|--------|-------------|----------|
| `adw-plan.mjs` | Classify issue, create branch, generate spec, commit | Issue number |
| `adw-build.mjs` | Implement the spec, commit | Issue number + ADW ID |
| `adw-test.mjs` | Run tests, auto-fix failures, retry up to 4x | Issue number |
| `adw-plan-build.mjs` | Plan + Build (legacy monolithic) | Issue number |
| `adw-plan-build-test.mjs` | Plan + Build + Test (full pipeline) | Issue number |

### State Management

State is persisted in `agents/{adw-id}/adw_state.json` between steps:

```json
{
  "adw_id": "a1b2c3d4",
  "issue_number": "42",
  "branch_name": "feat/42-add-dark-mode",
  "plan_file": "specs/add-dark-mode.md",
  "issue_class": "/feature"
}
```

### Model Assignment

| Task | Model | Reason |
|------|-------|--------|
| Classify, branch, commit, PR | sonnet | Lightweight routing/formatting |
| Plan generation | opus | High-stakes architecture decisions |
| Implementation | opus | Production code quality |
| Test resolution | opus | Root cause analysis |
| Test running | sonnet | Command execution |

## Shared Modules (`adw-modules/`)

| Module | Purpose |
|--------|---------|
| `agent.mjs` | Claude Code CLI wrapper |
| `github.mjs` | GitHub operations via gh CLI |
| `git-ops.mjs` | Branch, commit, push, PR operations |
| `workflow-ops.mjs` | Classify, plan, implement, branch generation |
| `state.mjs` | Persistent state with stdin/stdout piping |
| `utils.mjs` | ADW ID generation, logging, JSON parsing |

## Commands

| Command | Purpose |
|---------|---------|
| `/test` | Run full Nx test suite, return structured JSON |
| `/resolve_failed_test` | Autonomously fix a failing test |
| `/classify_adw` | Extract ADW workflow + ID from text |

## Output Structure

```
agents/
  {adw-id}/
    adw_state.json
    sdlc_planner/
      raw_output.jsonl
      prompts/
    sdlc_implementor/
      raw_output.jsonl
    test_runner/
      raw_output.jsonl
    adw_plan/
      execution.log
    adw_build/
      execution.log
    adw_test/
      execution.log
```
