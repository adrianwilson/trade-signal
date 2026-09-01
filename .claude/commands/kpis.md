# Agentic KPIs Dashboard

Display the current agentic KPI report with live-calculated summary metrics.

## Instructions

### 1. Read the KPI data

- Read `app_docs/agentic_kpis.md`
- If the file doesn't exist, report "No KPI data yet. Run a pipeline (`/plan-build-review`, `/sdlc`, etc.) to generate KPIs."

### 2. Recalculate summary metrics

Recalculate all summary metrics from the ADW KPIs table (don't trust the cached values):

- **Current Streak**: Consecutive runs with attempts = 1, counting from the most recent
- **Longest Streak**: Maximum streak ever
- **Total Plan Size**: Sum of all plan sizes
- **Largest Plan Size**: Max plan size
- **Total Diff Size**: Sum of all (added + removed) across runs
- **Largest Diff Size**: Max (added + removed) for a single run
- **Average Presence**: Mean attempts across all runs
- **Average Interventions**: Mean human interventions across runs (exclude `?` entries)
- **ZTE-Ready Runs**: Count of runs with 0 interventions / total runs with data
- **CI First-Pass Rate**: Count of `pass` / total runs with CI data
- **Scope Drift Rate**: Count of `drifted` / total runs with drift data

### 3. Display the report

Output the report in this format:

```
## Agentic KPIs Dashboard

### Summary
| Metric               | Value   |
| -------------------- | ------- |
| Current Streak       | ...     |
| Longest Streak       | ...     |
| Average Presence     | ...     |
| Average Interventions| ...     |
| ZTE-Ready Runs       | .../... |
| CI First-Pass Rate   | ...%    |
| Scope Drift Rate     | ...%    |
| Total Runs           | ...     |

### Run History
<the ADW KPIs detail table>

### Intervention Logs
<any intervention log sections>

### ZTE Readiness
<1-2 sentence assessment: based on the metrics, how close is this project to ZTE? What's the biggest blocker?>
```

## Report

Display the formatted dashboard directly — do not write to a file.
