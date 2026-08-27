# AI Developer Workflow (ADW) System

ADW automates the full software development life cycle by integrating GitHub issues with Claude Code commands to classify issues, generate plans, implement solutions, run tests, review against specs, and generate documentation.

## Architecture

Workflows are defined as `.md` command files in `.claude/commands/`. The `adws/` directory contains only the external trigger (for unattended mode) and shared utilities.

```
.claude/commands/
  sdlc.md                 # Full SDLC: Plan -> Build -> Test -> Review -> Document -> Ship
  plan-build.md            # Plan -> Build -> Ship
  plan-build-test.md       # Plan -> Build -> Test -> Ship
  plan-build-review.md     # Plan -> Build -> Review -> Ship
  plan-build-test-review.md # Plan -> Build -> Test -> Review -> Ship

  # Building blocks (used by pipelines)
  feature.md, bug.md, chore.md, refactor.md   # Spec templates
  implement.md          # Implementation with closed-loop validation
  test.md               # Run Nx test suite, return structured JSON
  resolve_failed_test.md # Auto-fix a failing test
  review.md             # Review implementation against spec
  patch.md              # Focused fix for a review issue
  document.md           # Generate docs from git diff + spec
  classify_issue.md     # Route issues to the right template
  generate_branch_name.md, commit.md, pull_request.md  # Git ops

adws/
  trigger-cron.mjs      # Polls GitHub, kicks off /sdlc via Claude Code SDK
  health-check.mjs      # Validates env vars, git, gh CLI, Claude CLI
  adw-modules/          # Shared utilities for trigger
    agent.mjs            # Claude Code SDK wrapper
    github.mjs           # GitHub ops via gh CLI
    utils.mjs            # ADW ID generation, logging
```

## Quick Start

### Interactive (in Claude Code)

```bash
# Full SDLC from a GitHub issue
/sdlc 42

# Or pick your pipeline
/plan-build 42
/plan-build-test 42
/plan-build-review 42

# Or run steps individually
/feature add dark mode to dashboard
/implement specs/add-dark-mode.md
/test
/review <adw-id> specs/add-dark-mode.md
/document <adw-id> specs/add-dark-mode.md
/finalize specs/add-dark-mode.md
```

### Unattended (AFK mode)

```bash
cp .env.sample .env  # Set ANTHROPIC_API_KEY

# Poll GitHub every 20s, auto-process new issues
node adws/trigger-cron.mjs

# Or create an issue and comment "adw" to trigger
```

### Health Check

```bash
node adws/health-check.mjs
```

## Model Assignment

| Task | Model | Reason |
|------|-------|--------|
| Classify, branch, commit, PR | sonnet | Lightweight routing/formatting |
| Plan generation | opus | Architecture decisions |
| Implementation | opus | Production code quality |
| Test resolution | opus | Root cause analysis |
| Review | opus | Spec compliance judgment |
| Documentation | sonnet | Summarization from diff |
| Test running | sonnet | Command execution |
