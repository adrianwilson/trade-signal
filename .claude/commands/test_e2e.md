# E2E Test Suite

Execute end-to-end tests against the running Angular dashboard to validate UI features work correctly from a user perspective.

## Variables

issue_number: $1
adw_id: $2
test_screenshots_dir: $3 if provided, otherwise use `screenshots/e2e-issue-{issue_number}-adw-{adw_id}/`

## Prerequisites

- The application must be running before executing E2E tests.
- Reference `.claude/commands/prepare_app.md` to start the Angular dashboard and NestJS API if not already running.
- The Angular dashboard should be accessible at `http://localhost:4200`.
- The NestJS API should be accessible at `http://localhost:3000`.

## Instructions

### 1. Verify Application is Running

- Confirm the dashboard is accessible at `http://localhost:4200`
- Confirm the API is accessible at `http://localhost:3000`
- If not running, execute `.claude/commands/prepare_app.md` first

### 2. Set Up Screenshot Directory

- Create the screenshot directory: `{test_screenshots_dir}`
- Screenshots should be saved during test execution for visual verification
- Naming convention: `{step_number}-{descriptive-name}.png`

### 3. Execute E2E Tests

- Use the Playwright MCP tools to interact with the Angular dashboard
- Navigate to `http://localhost:4200` to start
- Execute test scenarios based on the spec file for this issue
- Take screenshots at key interaction points:
  - Before the action (initial state)
  - After the action (result state)
  - Any error states encountered

### 4. Test Scenarios

- For each UI feature changed:
  - Verify the element renders correctly
  - Verify user interactions work as expected (clicks, inputs, navigation)
  - Verify data displays correctly from the API
  - Verify error states are handled gracefully
  - Verify responsive behavior if applicable

### 5. Capture Results

- Save all screenshots to `{test_screenshots_dir}`
- Record pass/fail status for each test scenario

## Report

Return results as a JSON object:

```json
{
  "issue_number": "string",
  "adw_id": "string",
  "total_tests": number,
  "passed": number,
  "failed": number,
  "screenshots_dir": "string",
  "test_results": [
    {
      "scenario": "string - description of what was tested",
      "passed": boolean,
      "screenshot": "string - path to screenshot",
      "error": "optional string - error details if failed"
    }
  ]
}
```
