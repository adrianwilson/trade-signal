# Agentic KPIs

Performance metrics for the AI Developer Workflow (ADW) system.

## Agentic KPIs

Summary metrics across all ADW runs.

| Metric                | Value       | Last Updated            |
| --------------------- | ----------- | ----------------------- |
| Current Streak        | 11          | 2026-09-01 15:00:00 MDT |
| Longest Streak        | 11          | 2026-09-01 15:00:00 MDT |
| Total Plan Size       | 1280 lines  | 2026-09-01 15:00:00 MDT |
| Largest Plan Size     | 199 lines   | 2026-09-01 15:00:00 MDT |
| Total Diff Size       | 70914 lines | 2026-09-01 15:00:00 MDT |
| Largest Diff Size     | 40879 lines | 2026-09-01 15:00:00 MDT |
| Average Presence      | 1.0         | 2026-09-01 15:00:00 MDT |
| Average Interventions | 0.67        | 2026-09-01 15:00:00 MDT |
| ZTE-Ready Runs        | 7/9 (78%)   | 2026-09-01 15:00:00 MDT |
| CI First-Pass Rate    | 88% (7/8)   | 2026-09-01 15:00:00 MDT |
| Scope Drift Rate      | 22% (2/9)   | 2026-09-01 15:00:00 MDT |
| Average Prompts       | 3.8         | 2026-09-01 15:00:00 MDT |

## ADW KPIs

Detailed metrics for individual ADW workflow runs.

| Date       | ADW ID   | Issue | Class    | Attempts | Plan | Diff (Add/Rem/Files) | Interventions | CI   | Review | Drift                           | Prompts |
| ---------- | -------- | ----- | -------- | -------- | ---- | -------------------- | ------------- | ---- | ------ | ------------------------------- | ------- |
| 2026-08-28 | 83c495bb | 2     | /chore   | 1        | 60   | 11300/8745/13        | ?             | ?    | ?      | ?                               | ?       |
| 2026-08-28 | 28da6304 | 3     | /feature | 1        | 68   | 432/0/6              | ?             | ?    | ?      | ?                               | ?       |
| 2026-08-31 | b9896634 | 4     | /feature | 1        | 199  | 396/50/9             | 0             | pass | 0      | clean                           | 2       |
| 2026-08-31 | ef37f991 | 5     | /feature | 1        | 183  | 2558/4210/18         | 1             | fail | 0      | drifted: MatTableDataSource fix | 4       |
| 2026-09-01 | da6a721a | 10    | /chore   | 1        | 178  | 16037/24842/16       | 5             | fail | 0      | drifted: Nx version alignment   | 15      |
| 2026-09-01 | 7cc59c0b | 1     | /feature | 1        | 100  | 246/0/5              | 0             | pass | 0      | clean                           | 2       |
| 2026-09-01 | ce60b8b4 | 13    | /feature | 1        | 154  | 674/140/14           | 0             | pass | 0      | clean                           | 2       |
| 2026-09-01 | 0cb7af55 | 15    | /feature | 1        | 80   | 224/20/5             | 0             | pass | 0      | clean                           | 3       |
| 2026-09-01 | 8dc41f47 | 17    | /feature | 1        | 189  | 945/5/16             | 0             | fail | 0      | clean                           | 3       |
| 2026-09-01 | a8c62ee1 | 19    | /feature | 1        | 23   | 121/4/6              | 0             | pass | 0      | clean                           | 1       |
| 2026-09-01 | c3970936 | 21    | /feature | 1        | 46   | 544/0/10             | 0             | pass | 0      | clean                           | 1       |

### Intervention Log (Issue #5)

1. CI failed on first push (lockfile mismatch) — user had to regenerate lockfile with Node 24

### Intervention Log (Issue #10)

1. User had to `rm -rf node_modules` (permission denied for agent)
2. User had to run `pnpm approve-builds` interactively (agent can't do interactive prompts)
3. User had to `rm -rf node_modules` again after corrupted state
4. User had to run clean install combo interactively
5. User had to pin Node 24 as Volta default (agent couldn't change shell's Node version)
