# Application Validation Test Suite

Execute comprehensive validation tests, returning results in a standardized JSON format for automated processing.

## Variables

TEST_COMMAND_TIMEOUT: 5 minutes

## Instructions

- Execute each test in the sequence provided below
- Capture the result (passed/failed) and any error messages
- IMPORTANT: Return ONLY the JSON array with test results
- If a test passes, omit the error field
- If a test fails, include the error message and stop processing further tests
- Execute all tests from the project root directory
- Always run tasks through Nx

## Test Execution Sequence

1. **TypeScript Type Check**
   - Command: `npx nx run-many -t typecheck`
   - test_name: "typecheck"
   - test_purpose: "Validates TypeScript type correctness across all projects"

2. **Build All Projects**
   - Command: `npx nx run-many -t build`
   - test_name: "build"
   - test_purpose: "Validates all projects compile and bundle without errors"

3. **Lint All Projects**
   - Command: `npx nx run-many -t lint`
   - test_name: "lint"
   - test_purpose: "Validates code quality, unused imports, and style violations"

4. **Run All Tests**
   - Command: `npx nx run-many -t test`
   - test_name: "unit_tests"
   - test_purpose: "Validates all unit tests pass across dashboard and API"

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
