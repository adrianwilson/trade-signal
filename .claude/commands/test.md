# Application Validation Test Suite

Execute comprehensive validation tests, returning results in a standardized JSON format for automated processing.

## Purpose

Run the full validation test suite to ensure the application builds, compiles, lints, and passes all tests. This command is used by the pipeline to gate deployments and catch regressions early.

## Variables

TEST_COMMAND_TIMEOUT: 5 minutes

## Instructions

- Execute each test in the sequence provided below
- Capture the result (passed/failed) and any error messages
- IMPORTANT: Return ONLY the JSON array with test results
- If a test passes, omit the error field
- IMPORTANT: If a test fails, include the error message and STOP processing further tests. Do not continue to the next test.
- Execute all tests from the project root directory
- Always run tasks through Nx

## Test Execution Sequence

1. **Format Check**
   - Command: `npx nx format:check --all`
   - test_name: "format"
   - test_purpose: "Validates all files match Prettier formatting rules"

2. **TypeScript Type Check**
   - Command: `npx nx run-many -t typecheck`
   - test_name: "typecheck"
   - test_purpose: "Validates TypeScript type correctness across all projects"

3. **Build All Projects**
   - Command: `npx nx run-many -t build`
   - test_name: "build"
   - test_purpose: "Validates all projects compile and bundle without errors"

4. **Lint All Projects**
   - Command: `npx nx run-many -t lint`
   - test_name: "lint"
   - test_purpose: "Validates code quality, unused imports, and style violations"

5. **Run All Tests (with coverage enforcement)**
   - Command: `npx nx run-many -t test`
   - test_name: "unit_tests"
   - test_purpose: "Validates all unit tests pass across dashboard and API"
   - IMPORTANT: Both test targets now collect code coverage and enforce a 70% floor on lines, branches, functions, and statements (API via Jest `coverageThreshold`, dashboard via the `@angular/build:unit-test` `coverageThresholds`). If either project drops below the floor, its test target exits non-zero and this step fails — a below-floor coverage result is a test failure, captured by the existing `unit_tests` entry. No separate command is required; enforcement rides on `npx nx run-many -t test`.

6. **Run E2E Tests**
   - Command: `npx nx run dashboard-e2e:e2e`
   - test_name: "e2e"
   - test_purpose: "Validates the full application works end-to-end — dashboard loads, connects to API, renders signal data correctly"
   - This step starts both API and dashboard via Playwright's webServer config, runs headless Chromium tests, then tears down the servers.

## Report

- IMPORTANT: Return results exclusively as a JSON array
- Sort with failed tests (passed: false) at the top

### Output Structure

```json
[
  {
    "test_name": "string",
    "passed": boolean,
    "execution_command": "string",
    "test_purpose": "string",
    "error": "optional string"
  }
]
```
