# Refactor Planning

Create a new plan in specs/*.md to execute the refactor using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan, use the `Relevant Files` to focus on the right files.

## Variables

issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

- You're writing a plan to refactor existing code without changing its external behavior.
- Extract refactor details from the `issue_json` variable.
- Create the plan in the `specs/` directory. Filename: `issue-{issue_number}-adw-{adw_id}-sdlc_planner-{descriptive-name}.md`
- Use the `Plan Format` below to create the plan.
- Read `.claude/commands/conditional_docs.md` to check if your task requires additional documentation.
- Research the codebase to understand the current state and identify what needs to change.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value. Add as much detail as needed to execute the refactor safely.
- Use your reasoning model: THINK HARD about the refactor, its impact, and how to preserve existing behavior.
- IMPORTANT: Refactors must not change external behavior. Tests should pass before and after.
- IMPORTANT: Prefer incremental, reversible changes over big-bang rewrites.
- This is an Nx monorepo with Angular (frontend) and NestJS (backend). Both frameworks use decorators heavily -- follow their conventions.
- If you need a new library, use `pnpm add` and be sure to report it in the `Notes` section of the `Plan Format`.
- Always run tasks through Nx (e.g., `npx nx run`, `npx nx run-many`, `npx nx affected`).
- Respect requested files in the `Relevant Files` section.
- Start your research by reading the `README.md` file.

## Relevant Files

Focus on the following files:
- `README.md` - Contains the project overview and instructions.
- `apps/api/**` - Contains the NestJS backend API.
- `apps/dashboard/**` - Contains the Angular frontend dashboard.
- `libs/signals/**` - Contains the shared types (Signal, AggregatedSignal, AgentLogEntry).
- `nx.json` - Nx workspace configuration.
- `package.json` - Root package dependencies.
- `tsconfig.base.json` - Root TypeScript configuration.

## Plan Format

```md
# Refactor: <refactor name>

## Metadata
- **issue_number:** {issue_number}
- **adw_id:** {adw_id}
- **issue_json:** {issue_json}

## Refactor Description
<describe the refactor in detail, including what is being restructured and why>

## Motivation
<explain why this refactor is needed -- what pain point, tech debt, or improvement opportunity it addresses>

## Current State
<describe the current code structure, patterns, or architecture that will change>

## Target State
<describe what the code should look like after the refactor>

## Behavior Preservation
<explicitly list the external behaviors that must remain unchanged after this refactor>

## Relevant Files
Use these files to execute the refactor:

<find and list the files that are relevant to the refactor and describe why they are relevant in bullet points. If there are new files that need to be created, list them in an h3 'New Files' section. If files will be deleted, list them in an h3 'Files to Remove' section.>

## Risk Assessment
<identify what could go wrong with this refactor and how to mitigate each risk>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. use as many h3 headers as needed to execute the refactor. Order matters -- move incrementally, verify tests pass after each step, and never leave the codebase in a broken state between steps. Your last step should be running the `Validation Commands` to validate the refactor is complete with zero regressions.>

## Validation Commands
Execute every command to validate the refactor is complete with zero regressions.

<list commands you'll use to validate with 100% confidence the refactor preserves all existing behavior with zero regressions. every command must execute without errors.>
- `npx nx run-many -t build` - Build all projects to validate zero regressions
- `npx nx run-many -t test` - Run all tests to validate behavior is preserved
- `npx nx run-many -t lint` - Lint all projects to validate code quality

## Notes
<optionally list any additional notes, future considerations, or context that are relevant to the refactor that will be helpful to the developer>
```

## Report

Return ONLY the file path to the spec file created (no other text).
