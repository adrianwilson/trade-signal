# Implement the following plan

Follow the `Instructions` to implement the `Plan`, then `Validate` the work, then `Report` the completed work.

## Instructions

- Read the plan, think hard about the plan and implement the plan.
- Follow all step-by-step tasks in order.
- After implementation, execute the `Validation Loop` below.
- Do not skip the validation loop. Your work is useless unless it's tested.

## Plan

$ARGUMENTS

## Validation Loop

After implementing all steps, close the loop:

1. **Run the plan's Validation Commands** (found at the bottom of every spec).
   - If the plan has no Validation Commands section, run these defaults:
     - `npx nx run-many -t build`
     - `npx nx run-many -t test`
     - `npx nx run-many -t lint`

2. **If all commands pass:** proceed to the Report section.

3. **If any command fails:**
   - Read the error output carefully.
   - Identify the root cause.
   - Make the minimal fix required.
   - Re-run ONLY the failing command to verify the fix.
   - Then re-run ALL validation commands to check for regressions.
   - Repeat until all commands pass or you've attempted 3 fix cycles.

4. **If still failing after 3 fix cycles:** Report the remaining failures in the Report section with the error output. Do not silently skip failures.

## Report

- Summarize the work you've just done in a concise bullet point list.
- Report validation results: which commands passed, which failed (if any).
- Report the files and total lines changed with `git diff --stat`
