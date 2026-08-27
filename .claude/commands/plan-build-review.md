# Plan + Build + Review Pipeline

Classify a GitHub issue, create a spec, implement it, and review against the spec. Follow each phase in order.

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

## Phase 5: Review

- Run `/review` with the spec file to verify implementation matches requirements
- If blocker issues are found:
  - Run `/patch` for each blocker
  - Run `/implement` with the patch plan
  - Re-run `/review` to verify

## Phase 6: Ship

- Run `/commit` to create a properly formatted commit
- Run `/pull_request` to create a PR

## Report

Summarize: issue classification, branch, spec file, review results, PR URL.
