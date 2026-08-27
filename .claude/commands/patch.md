# Patch Plan

Create a **focused patch plan** to resolve a specific issue based on the `review_change_request`. Follow the `Instructions` to create a concise plan that addresses the issue with minimal, targeted changes.

## Variables

adw_id: $1
review_change_request: $2
spec_path: $3 if provided, otherwise leave it blank
agent_name: $4 if provided, otherwise use 'patch_agent'
issue_screenshots: $5 if provided, otherwise leave it blank

## Instructions

- IMPORTANT: You're creating a patch plan to fix a specific review issue. Keep changes small, focused, and targeted.
- Read the original specification (spec) file at `spec_path` if provided to understand the context and requirements.
- IMPORTANT: Use the `review_change_request` to understand exactly what needs fixing and use it as the basis for your patch plan.
- Read `.claude/commands/conditional_docs.md` to check if your task requires additional documentation.
- If `issue_screenshots` is provided, review the screenshots to understand the visual context of the issue.
- Create the patch plan in `specs/patch/` directory with filename: `patch-adw-{adw_id}-{descriptive-name}.md`
- IMPORTANT: This is a PATCH - keep the scope minimal. Only fix what's described in the `review_change_request` and nothing more.
- Run `git diff --stat`. If changes are available, use them to understand what's been done in the codebase.
- Use your reasoning model: THINK HARD about the most efficient way to implement the solution with minimal code changes.
- Base your validation on the validation steps from `spec_path` if provided. If not provided, use default Nx validation commands.
- Replace every <placeholder> in the `Plan Format` with specific implementation details.
- IMPORTANT: When you finish writing the patch plan, return exclusively the path to the patch plan file created and nothing else.

## Patch Scope

The patch should:
- Address ONLY the `review_change_request` -- nothing else
- Make the minimum number of file changes required
- Not introduce new features, refactors, or unrelated fixes
- Preserve all existing tests and add new ones only if directly related to the fix

## Relevant Files

Focus on the following files:
- `README.md` - Contains the project overview and instructions.
- `apps/api/**` - Contains the NestJS backend API.
- `apps/dashboard/**` - Contains the Angular frontend dashboard.
- `libs/signals/**` - Contains the shared types.

## Plan Format

```md
# Patch: <concise patch title>

## Metadata
adw_id: `{adw_id}`
review_change_request: `{review_change_request}`

## Issue Summary
**Original Spec:** <spec_path or "N/A">
**Issue:** <brief description of the review issue>
**Solution:** <brief description of the solution approach>

## Files to Modify
<list only the files that need changes with one-line descriptions>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<minimal steps to fix the issue. Keep it tight.>

## Validation Commands
- `npx nx run-many -t build` - Build all projects
- `npx nx run-many -t test` - Run all tests
- `npx nx run-many -t lint` - Lint all projects
```

## Report

Return ONLY the file path to the patch plan file created (no other text).
