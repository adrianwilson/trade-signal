# Full SDLC Pipeline (Interactive)

Run the complete Software Development Life Cycle for the given GitHub issue. Each phase runs as a separate focused task.

For **unattended mode** with fully isolated agents, use the GitHub Action: comment "adw" on a GitHub issue.

## Variables

issue_number: $ARGUMENTS

## Instructions

Execute each phase below in order. Each phase is one agent, one purpose. Between phases, capture the structured output and pass it to the next phase. Do not skip phases. If any phase fails, stop and report the failure.

## Phase 1: Classify

- Fetch the GitHub issue: `gh issue view <issue_number> --json number,title,body,state,labels`
- Determine the type: feature, bug, chore, or refactor
- Save the classification and issue JSON for subsequent phases

## Phase 2: Branch

- Create a branch using the classification and issue data
- Format: `<type>-issue-<number>-adw-<id>-<name>`

## Phase 3: Plan

- Based on the classification, run the matching command (`/feature`, `/bug`, `/chore`, or `/refactor`) with the issue number, ADW ID, and issue JSON
- Capture the spec file path from the output
- Commit the plan

## Phase 4: Implement

- Run `/implement` with the spec file path
- This includes closed-loop validation (build, test, lint with auto-fix retries)
- Commit the implementation

## Phase 5: Test

- Run `/test` to execute the full validation suite
- If any tests fail:
  - Run `/resolve_failed_test` with the failure JSON
  - Re-run `/test` to verify
  - Repeat up to 3 times
- Commit any test fixes

## Phase 6: UI Verification

- Run `/prepare_app` to ensure dashboard and API are running
- Run `/verify_ui` with the issue number, ADW ID, and spec file
- This uses the `/browse` gstack skill to visually verify the running application
- If UI issues are found:
  - Fix the rendering/data issues
  - Re-run `/verify_ui` to verify (up to 2 cycles)
- Commit any UI fixes
- Skip this phase if the issue has no UI changes (API-only, chore, etc.)

## Phase 7: UX Review

- Run `/design-review` against the running application
- This uses the `/browse` gstack skill to audit visual quality: spacing, hierarchy, consistency, color, typography, and AI slop patterns
- Focus on pages affected by this issue, but flag regressions on other pages too
- If issues are found:
  - Fix styling/layout/UX issues
  - Re-run `/design-review` to verify (up to 2 cycles)
- Commit any UX fixes
- Skip this phase if the issue has no UI changes (API-only, chore, etc.)

## Phase 8: Review

- Run `/review` with the ADW ID and spec file
- If blocker issues are found:
  - Run `/patch` for each blocker
  - Run `/implement` with the patch plan
  - Re-run `/review` to verify (up to 2 cycles)
- Commit any review fixes

## Phase 9: Document

- Run `/document` with the ADW ID and spec file
- Commit the documentation

## Phase 10: Finalize

- Run `/finalize` with the spec file path to transform the build plan into a living design anchor
- Strips execution details (tasks, phases), keeps design decisions, architecture, acceptance criteria
- Commit the finalized spec

## Phase 11: Ship

- Run `/pull_request` to create a PR linking the spec, issue, and ADW ID

## Report

After all phases complete, summarize:
- Issue number and classification
- Branch name
- Spec file path
- Test results (pass/fail)
- UI verification results (pass/fail/skipped, any findings)
- UX review results (pass/fail/skipped, any findings)
- Review results (pass/fail, any issues)
- Documentation file path
- PR URL
