# Review

Follow the `Instructions` below to **review work done against a specification file** (specs/*.md) to ensure implemented features match requirements. If there are issues, report them. If not, report success.

## Variables

adw_id: $1
spec_file: $2
agent_name: $3 if provided, otherwise use 'review_agent'
review_image_dir: $4 if provided, otherwise leave it blank

## Instructions

- Check current git branch using `git branch` to understand context
- Run `git diff origin/main` to see all changes made in current branch
- Read the spec file to understand requirements
- If `review_image_dir` is provided:
  - Review any screenshots in that directory to understand current UI state
  - If the app needs to be running to take screenshots, reference `.claude/commands/prepare_app.md` for setup instructions
  - Compare screenshots against spec requirements for visual accuracy
- IMPORTANT: Review the implementation against the spec:
  - Do the code changes fulfill the acceptance criteria?
  - Are the validation commands passing?
  - Are there missing edge cases or error handling?
  - Does the implementation match the solution statement?
- Run the spec's validation commands to verify the implementation works
- IMPORTANT: Issue Severity Guidelines
  - Think hard about the impact of the issue on the feature and the user
  - `skippable` - non-blocker for release but still a problem
  - `tech_debt` - non-blocker but will create technical debt
  - `blocker` - must be addressed before release, harms user experience or breaks functionality
- IMPORTANT: Return ONLY the JSON output based on the `Report` section below
  - Do not include any additional text, explanations, or markdown formatting
  - We'll immediately run JSON.parse() on the output, so make sure it's valid JSON
- Use your reasoning model: THINK HARD as you work through the review process. Focus on critical functionality and user experience. Don't report issues if they are not critical.

## Report

- IMPORTANT: Return results exclusively as a JSON object based on the `Output Structure` section below
- `success` should be `true` if there are NO BLOCKING issues
- `success` should be `false` ONLY if there are BLOCKING issues
- `review_issues` can contain issues of any severity

### Output Structure

```json
{
  "success": boolean,
  "spec_file": "string",
  "branch": "string",
  "review_summary": "string - 2-3 sentence summary of the review",
  "review_issue_number": "string - the GitHub issue number associated with this review",
  "adw_id": "string - the ADW ID for this review",
  "review_issues": [
    {
      "issue": "string - description of the issue",
      "severity": "skippable | tech_debt | blocker",
      "file": "string - file path where the issue exists",
      "resolution": "string - suggested fix"
    }
  ],
  "validation_results": {
    "build": "passed | failed",
    "test": "passed | failed",
    "lint": "passed | failed"
  }
}
```
