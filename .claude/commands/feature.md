# Feature Planning

Create a new plan in specs/*.md to implement the feature using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan, use the `Relevant Files` to focus on the right files.

## Variables

issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

- You're writing a plan to implement a net new feature that will add value to the application.
- Extract feature details from the `issue_json` variable.
- Create the plan in the `specs/` directory. Filename: `issue-{issue_number}-adw-{adw_id}-sdlc_planner-{descriptive-name}.md`
- Use the `Plan Format` below to create the plan.
- Read `.claude/commands/conditional_docs.md` to check if your task requires additional documentation.
- Research the codebase to understand existing patterns, architecture, and conventions before planning the feature.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value. Add as much detail as needed to implement the feature successfully.
- Use your reasoning model: THINK HARD about the feature requirements, design, and implementation approach.
- Follow existing patterns and conventions in the codebase. Don't reinvent the wheel.
- This is an Nx monorepo with Angular (frontend) and NestJS (backend). Both frameworks use decorators heavily -- follow their conventions.
- If you need a new library, use `pnpm add` and be sure to report it in the `Notes` section of the `Plan Format`.
- Always run tasks through Nx (e.g., `npx nx run`, `npx nx run-many`, `npx nx affected`).
- Respect requested files in the `Relevant Files` section.
- Start your research by reading the `README.md` file.
- If this feature affects the UI (Angular dashboard), include an E2E test creation task. Reference `.claude/commands/test_e2e.md` for the E2E testing approach.

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
# Feature: <feature name>

## Metadata

- **issue_number:** {issue_number}
- **adw_id:** {adw_id}
- **issue_json:** {issue_json}

## Feature Description

<describe the feature in detail, including its purpose and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<clearly define the specific problem or opportunity this feature addresses>

## Solution Statement

<describe the proposed solution approach and how it solves the problem>

## Relevant Files

Use these files to implement the feature:

<find and list the files that are relevant to the feature describe why they are relevant in bullet points. If there are new files that need to be created to implement the feature, list them in an h3 'New Files' section.>

## Implementation Plan

### Phase 1: Foundation

<describe the foundational work needed before implementing the main feature>

### Phase 2: Core Implementation

<describe the main implementation work for the feature>

### Phase 3: Integration

<describe how the feature will integrate with existing functionality>

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. use as many h3 headers as needed to implement the feature. Order matters, start with the foundational shared changes required then move on to the specific implementation. Include creating tests throughout the implementation process. If this feature affects the UI, include an E2E test creation task referencing test_e2e.md. Your last step should be running the `Validation Commands` to validate the feature works correctly with zero regressions.>

## Testing Strategy

### Unit Tests

<describe unit tests needed for the feature>

### Integration Tests

<describe integration tests needed for the feature>

### E2E Tests (if UI-affecting)

<describe E2E tests needed if the feature changes the Angular dashboard UI>

### Edge Cases

<list edge cases that need to be tested>

## Acceptance Criteria

<list specific, measurable criteria that must be met for the feature to be considered complete>

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

<list commands you'll use to validate with 100% confidence the feature is implemented correctly with zero regressions. every command must execute without errors so be specific about what you want to run to validate the feature works as expected. Include commands to test the feature end-to-end.>

- `npx nx run-many -t build` - Build all projects to validate zero regressions
- `npx nx run-many -t test` - Run all tests to validate the feature works with zero regressions
- `npx nx run-many -t lint` - Lint all projects to validate code quality

## Notes

<optionally list any additional notes, future considerations, or context that are relevant to the feature that will be helpful to the developer>
```

## Report

Return ONLY the file path to the spec file created (no other text).
