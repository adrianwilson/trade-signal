# In-Loop Review

Quick checkout and review workflow for validating agent work.

## Variables

branch: $ARGUMENTS

## Instructions

IMPORTANT: If no branch is provided, stop execution and report that a branch argument is required.

Follow these steps to quickly checkout and review work done by agents:

### Step 1: Pull and Checkout Branch

- Run `git fetch origin` to get latest remote changes
- Run `git checkout {branch}` to switch to the target branch

### Step 2: Verify Changes

- Run `git log origin/main..HEAD --oneline` to see commits on this branch
- Run `git diff origin/main --stat` to see files changed

### Step 3: Run Validation

- Run `npx nx run-many -t build` to verify the build
- Run `npx nx run-many -t test` to verify tests pass
- Run `npx nx run-many -t lint` to verify lint

### Step 4: Prepare for Manual Review

- Read and execute: `.claude/commands/prepare_app.md` to start the application
- The application is now running and ready for manual review

## Report

Report:

- Branch name and number of commits
- Files changed summary
- Build/test/lint results
- Application URL for manual inspection
