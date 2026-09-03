<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Project Overview

- **Stack:** Angular 22 (dashboard) + NestJS 11 (API) + Nx 23 monorepo, TypeScript everywhere
- **Architecture:** `apps/dashboard/` (Angular), `apps/api/` (NestJS), `libs/signals/` (shared types)
- **Shared types:** `Signal`, `AggregatedSignal`, `AgentLogEntry`, `ManualSignalInput` in `libs/signals/`
- **Commands:** `.claude/commands/` contains all workflow templates (feature, bug, chore, refactor, implement, test, review, document, etc.)
- **Pipeline:** Use `/sdlc <issue>` for full lifecycle, or individual commands. For isolated execution: `./scripts/sdlc.sh <issue>`
- **Conditional docs:** Read `.claude/commands/conditional_docs.md` before any task to determine what additional documentation is relevant
- **Package manager:** pnpm (not npm). Use `pnpm exec nx` to run Nx commands, `pnpm add` to install packages.
- **Validation:** Always run tasks through Nx: `pnpm exec nx run-many -t build/test/lint`

# Communication Rules

- Be terse. One fact, one sentence. No flattery, no preamble, no decorative language.
- Most important information last (the user sees it first).
- State each fact once. Don't repeat across responses.
- No analogies. Discuss what's right in front of us.
- Challenge incorrect assumptions directly. Explain why.
- Use reference codes when presenting 3+ items: D1/D2 for decisions, O1/O2 for options, F1/F2 for findings, R1/R2 for risks, Q1/Q2 for questions, A1/A2 for actions.
- Deliver only what was requested at the intended scope. Do not widen into cleanup, refactoring, or adjacent work unless it blocks the task.
- Do not claim completion without evidence (test output, build output, diff stats).
- Match detail level to task complexity. Simple question = simple answer.

## Aliases

- `scr` = Simplify, compress, and repeat your response.
- `eli` = Explain like I'm 18. Simplify language. Shorten response.
- `foc` = Focus on what matters most. What's the true signal? Boil down to the most important thing.
- `ref` = Rewrite with reference points.

# Pre-Push Validation (MANDATORY — NO EXCEPTIONS)

Saving time is NOT a priority. Catching errors before CI is. Run ALL steps below before every `git push`. Do NOT skip steps. Do NOT cherry-pick steps you think are relevant. Run them all, every time.

1. **Format:** `pnpm exec nx format:check --base=HEAD~1` — if it fails, run `pnpm exec nx format:write`, re-stage, and re-commit
2. **Typecheck:** `pnpm exec nx run-many -t typecheck` — catches TS errors that `build` misses
3. **Build:** `pnpm exec nx run-many -t build` — includes bundle budget enforcement
4. **Lint:** `pnpm exec nx run-many -t lint` — 0 errors required (warnings OK)
5. **Tests:** `pnpm exec nx run-many -t test` — includes coverage thresholds

CRITICAL: Run `format:check` AFTER `git add`, not before. The staging step can change formatting state. If format:check fails after staging, run `format:write`, re-add, and amend the commit.

When changing routes or default navigation, also verify e2e tests: `pnpm exec nx run dashboard-e2e:e2e`

# Context Rules

- NEVER commit or push without the user explicitly reviewing and approving the changes first. Always show what will be committed and wait for approval.
