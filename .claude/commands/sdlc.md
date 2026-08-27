# Full SDLC Pipeline

Run the complete Software Development Life Cycle for the given GitHub issue. Follow each phase in order. Do not skip phases. If any phase fails, stop and report the failure.

## Variables

issue_number: $ARGUMENTS

## Phase 1: Classify

- Fetch the GitHub issue using `gh issue view <issue_number> --json number,title,body,state,labels`
- Run `/classify_issue` with the issue body to determine the type (feature, bug, chore, refactor)
- Report the classification before proceeding

## Phase 2: Branch

- Run `/generate_branch_name` with the classification and issue data
- Confirm the branch was created and checked out

## Phase 3: Plan

- Based on the classification, run the matching command:
  - `/feature` for features
  - `/bug` for bugs
  - `/chore` for chores
  - `/refactor` for refactors
- Pass the issue title and body as the argument
- Confirm the spec file was created in `specs/`

## Phase 4: Implement

- Run `/implement` with the path to the spec file created in Phase 3
- This includes the closed-loop validation (build, test, lint with auto-fix retries)

## Phase 5: Test

- Run `/test` to execute the full validation suite
- If any tests fail, run `/resolve_failed_test` for each failure
- Re-run `/test` to verify fixes
- Repeat up to 3 times

## Phase 6: Review

- Run `/review` with the spec file to verify implementation matches requirements
- If blocker issues are found:
  - Run `/patch` for each blocker
  - Run `/implement` with the patch plan
  - Re-run `/review` to verify

## Phase 7: Document

- Run `/document` to generate feature documentation from the git diff and spec

## Phase 8: Ship

- Run `/commit` to create a properly formatted commit
- Run `/pull_request` to create a PR linking the spec and issue

## Report

After all phases complete, summarize:
- Issue number and classification
- Branch name
- Spec file path
- Test results (pass/fail)
- Review results (pass/fail, any issues)
- Documentation file path
- PR URL
