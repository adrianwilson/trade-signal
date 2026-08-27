# Plan + Build Pipeline

Classify a GitHub issue, create a spec, and implement it. Follow each phase in order.

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
- This includes closed-loop validation (build, test, lint with auto-fix retries)

## Phase 5: Ship

- Run `/commit` to create a properly formatted commit
- Run `/pull_request` to create a PR

## Report

Summarize: issue classification, branch, spec file, validation results, PR URL.
