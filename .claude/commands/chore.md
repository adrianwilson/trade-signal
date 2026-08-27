# Chore Planning

Create a new plan in specs/*.md to resolve the chore using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan, use the `Relevant Files` to focus on the right files.

## Variables

issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

- You're writing a plan to resolve a chore, it should be simple but we need to be thorough and precise so we don't miss anything or waste time with any second round of changes.
- Extract chore details from the `issue_json` variable.
- Create the plan in the `specs/` directory. Filename: `issue-{issue_number}-adw-{adw_id}-sdlc_planner-{descriptive-name}.md`
- Use the plan format below to create the plan.
- Read `.claude/commands/conditional_docs.md` to check if your task requires additional documentation.
- Research the codebase and put together a plan to accomplish the chore.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value. Add as much detail as needed to accomplish the chore.
- Use your reasoning model: THINK HARD about the plan and the steps to accomplish the chore.
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

## Plan Format

```md
# Chore: <chore name>

## Metadata
- **issue_number:** {issue_number}
- **adw_id:** {adw_id}
- **issue_json:** {issue_json}

## Chore Description
<describe the chore in detail>

## Relevant Files
Use these files to resolve the chore:

<find and list the files that are relevant to the chore describe why they are relevant in bullet points. If there are new files that need to be created to accomplish the chore, list them in an h3 'New Files' section.>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. use as many h3 headers as needed to accomplish the chore. Order matters, start with the foundational shared changes required to fix the chore then move on to the specific changes required to fix the chore. Your last step should be running the `Validation Commands` to validate the chore is complete with zero regressions.>

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

<list commands you'll use to validate with 100% confidence the chore is complete with zero regressions. every command must execute without errors so be specific about what you want to run to validate the chore is complete with zero regressions. Don't validate with curl commands.>
- `npx nx run-many -t build` - Build all projects to validate zero regressions
- `npx nx run-many -t test` - Run all tests to validate the chore is complete with zero regressions
- `npx nx run-many -t lint` - Lint all projects to validate code quality

## Notes
<optionally list any additional notes or context that are relevant to the chore that will be helpful to the developer>
```

## Report

Return ONLY the file path to the spec file created (no other text).
