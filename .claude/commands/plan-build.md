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

## Phase 6: Track KPIs

- Run `/track_agentic_kpis` with state JSON containing: adw_id, issue_number, issue_class, plan_file, human_interventions, ci_first_pass, review_findings, scope_drift
- Count human_interventions: number of times the human had to step in beyond routine approvals (0 = ZTE-ready)
- Set ci_first_pass: 1 if CI is expected to pass on first push, 0 if a CI fix was needed during the run
- Set review_findings: 0 (no review phase in this pipeline)
- Set scope_drift: 1 if unplanned changes were needed outside the spec, 0 if clean

## Report

Summarize: issue classification, branch, spec file, validation results, PR URL, KPI summary.
