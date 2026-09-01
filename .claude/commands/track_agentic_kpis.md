# Track Agentic KPIs

Update or create the ADW performance tracking tables in `app_docs/agentic_kpis.md`. This command analyzes the current ADW run's metrics and maintains both summary and detailed KPI tables.

## Variables

state_json: $ARGUMENTS
attempts_incrementing_phases: [plan, patch]

## Instructions

### 1. Parse State Data

- Parse the provided state_json to extract:
  - adw_id
  - issue_number
  - issue_class
  - plan_file path
  - human_interventions (number of times the human had to step in beyond routine approvals — e.g., fixing permissions, running interactive commands, course-correcting the agent, resolving environment issues)
  - ci_first_pass (boolean: did CI pass on the first push? 1 = yes, 0 = no)
  - review_findings (number of issues found by /review — critical + informational)
  - scope_drift (boolean: did implementation require unplanned changes outside the spec? 1 = yes, 0 = no. Include a brief note of what drifted.)

### 2. Calculate Metrics

#### Get Current Date/Time

- Run `date` command to get current date/time

#### Calculate Attempts

- Count how many plan and patch phases ran in this pipeline execution
- Each plan or patch is one attempt

#### Calculate Plan Size

- If plan_file exists in state, read the file
- Count total lines using: `wc -l <plan_file>`
- If file doesn't exist, use 0

#### Calculate Diff Statistics

- Run: `git diff origin/main --shortstat`
- Parse output to extract:
  - Files changed
  - Lines added
  - Lines removed
- Format as: "Added/Removed/Files" (e.g., "150/25/8")

### 3. Read Existing File

- Check if `app_docs/agentic_kpis.md` exists
- If it exists, read and parse the existing tables
- If not, create new file with both tables

### 4. Update ADW KPIs Table

- Check if current adw_id already exists in the table
- If exists: update that row with new values
- If not: add a new row with the calculated metrics
- Include the following columns:
  - **Interventions**: human_interventions from state_json. Count of times the human had to do something beyond saying "yes" to proceed — fixing env issues, running interactive commands, course-correcting. 0 = ZTE-ready run.
  - **CI**: ci_first_pass from state_json. Whether CI passed on first push (pass/fail).
  - **Review**: review_findings from state_json. Number of issues found by /review.
  - **Drift**: scope_drift from state_json. Whether unplanned changes were needed (clean/drifted + note).

### 5. Update Agentic KPIs Summary Table

Calculate summary metrics across ALL rows in the ADW KPIs table:

- **Current Streak**: Count consecutive successful ADW runs (attempts = 1) from most recent. Reset to 0 if latest run had attempts > 1.
- **Longest Streak**: Maximum streak ever recorded
- **Total Plan Size**: Sum of all plan sizes
- **Largest Plan Size**: Maximum plan size across all runs
- **Total Diff Size**: Sum of all diff lines (added + removed)
- **Largest Diff Size**: Maximum diff size across all runs
- **Average Presence**: Average number of attempts across all runs. Lower is better (1.0 = perfect, no retries needed).
- **Average Interventions**: Average human interventions per run. Lower is better (0 = fully autonomous, ZTE-ready).
- **ZTE-Ready Runs**: Count of runs with 0 human interventions (runs that could have been fully autonomous).
- **CI First-Pass Rate**: Percentage of runs where CI passed on the first push.
- **Scope Drift Rate**: Percentage of runs that required unplanned changes outside the spec.

### 6. Write Updated File

- Write the updated tables back to `app_docs/agentic_kpis.md`
- Preserve the file format and headers

## Report

Return the path to the updated KPIs file: `app_docs/agentic_kpis.md`
