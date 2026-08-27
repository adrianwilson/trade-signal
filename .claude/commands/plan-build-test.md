# Plan + Build + Test Pipeline

Classify a GitHub issue, create a spec, implement it, and run tests with auto-fix. Follow each phase in order.

## Variables

issue_number: $ARGUMENTS

## Phase 1: Classify

- Fetch the GitHub issue using `gh issue view <issue_number> --json number,title,body,state,labels`
- Run `/classify_issue` with the issue body to determine the type

## Phase 2: Branch

- Run `/generate_branch_name` with the classification and issue data

## Phase 3: Plan

- Run the matching command (`/feature`, `/bug`, `/chore`, or `/refactor`) with the issue title and body
- Confirm the spec file was created in `specs/`

## Phase 4: Implement

- Run `/implement` with the spec file path

## Phase 5: Test

- Run `/test` to execute the full validation suite
- If any tests fail, run `/resolve_failed_test` for each failure
- Re-run `/test` to verify fixes
- Repeat up to 3 times

## Phase 6: Ship

- Run `/commit` to create a properly formatted commit
- Run `/pull_request` to create a PR

## Report

Summarize: issue classification, branch, spec file, test results, PR URL.
