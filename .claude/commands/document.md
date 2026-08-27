# Document Feature

Generate concise markdown documentation for implemented features by analyzing code changes and specifications. This command creates documentation in the `app_docs/` directory based on git diff analysis against the main branch and the original feature specification.

## Variables

adw_id: $1
spec_path: $2 if provided, otherwise leave it blank
documentation_screenshots_dir: $3 if provided, otherwise leave it blank

## Instructions

### 1. Analyze Changes
- Run `git diff origin/main --stat` to see files changed and lines modified
- Run `git diff origin/main --name-only` to get the list of changed files
- For significant changes (>50 lines), run `git diff origin/main <file>` on specific files to understand the implementation details

### 2. Read Specification (if provided)
- If `spec_path` is provided, read the specification file to understand:
  - Original requirements and goals
  - Expected functionality
  - Success criteria
- Use this to frame the documentation around what was requested vs what was built

### 3. Review Screenshots (if provided)
- If `documentation_screenshots_dir` is provided, review the screenshots in that directory
- Use screenshots to document UI changes, new pages, or visual features
- Reference screenshots in the documentation where relevant

### 4. Generate Documentation
- Create a new documentation file in `app_docs/` directory
- Filename format: `feature-{adw_id}-{descriptive-name}.md`
- Follow the Documentation Format below
- Focus on:
  - What was built (based on git diff)
  - How it works (technical implementation)
  - How to use it (user perspective)
  - Any configuration or setup required

### 5. Update Conditional Documentation
- After creating the documentation file, read `.claude/commands/conditional_docs.md`
- Add an entry for the new documentation file with appropriate conditions
- The entry should help future developers know when to read this documentation
- Format the entry as follows:
  ```
  - **<app_docs/filename.md>**: Read when <condition describing when this doc is relevant>
  ```

### 6. Final Output
- When you finish writing the documentation and updating conditional_docs.md, return exclusively the path to the documentation file created and nothing else

## Documentation Format

```md
# <Feature Title>

**ADW ID:** <adw_id>
**Date:** <current date>
**Spec:** <spec_path or "N/A">

## Summary
<2-3 sentence overview of what was built and why>

## What Changed
<List of key changes organized by area (API, Dashboard, Shared)>

## How It Works
<Technical description of the implementation. Name files, functions, data flow.>

## How to Use
<User-facing description. What the user sees, clicks, or experiences.>

## Configuration
<Any environment variables, settings, or setup required. "None" if not applicable.>

## Key Files
<List primary files with one-line descriptions>

## Validation
<Commands to verify the feature works>
```

## Report

Return ONLY the file path to the documentation file created (no other text).
