# Generate Git Branch Name

Based on the `Instructions` below, take the `Variables` follow the `Run` section to generate a concise Git branch name following the specified format. Then follow the `Report` section to report the results of your work.

## Variables

issue_class: $1
adw_id: $2
issue: $3

## Instructions

- Extract the issue number and title from the issue JSON.
- Generate a branch name in the format: `<issue_class>-issue-<issue_number>-adw-<adw_id>-<concise_name>`
- The `<concise_name>` should be:
  - 3-6 words maximum
  - All lowercase
  - Words separated by hyphens
  - Descriptive of the main task/feature
  - No special characters except hyphens
- Examples:
  - `feat-issue-123-adw-ab12cd34-add-user-auth`
  - `fix-issue-456-adw-ef56gh78-login-validation-error`
  - `chore-issue-789-adw-ij90kl12-update-dependencies`
  - `refactor-issue-101-adw-mn34op56-extract-signal-service`

## Run

Run `git checkout main` to switch to the main branch
Run `git pull` to pull the latest changes from the main branch
Run `git checkout -b <branch_name>` to create and switch to the new branch

## Report

Return ONLY the branch name that was created (no other text).
