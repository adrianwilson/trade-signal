# Health Check

Run a comprehensive health check of the development environment. Validate each item below and report results.

## Checks

1. **Git Repository**
   - Run `git remote get-url origin` to verify the remote is configured
   - Report the repo URL

2. **GitHub CLI**
   - Run `gh --version` to verify gh is installed
   - Run `gh auth status` to verify authentication
   - Report installed version and auth status

3. **Node.js and Nx**
   - Run `node --version` to verify Node.js
   - Run `npx nx --version` to verify Nx
   - Report versions

4. **Project Build**
   - Run `npx nx run-many -t build` to verify the project builds
   - Report pass/fail

5. **Project Tests**
   - Run `npx nx run-many -t test` to verify tests pass
   - Report pass/fail with counts

## Report

Summarize results as a table:

| Check      | Status    | Details              |
| ---------- | --------- | -------------------- |
| Git Remote | pass/fail | repo URL             |
| GitHub CLI | pass/fail | version, auth status |
| Node.js    | pass/fail | version              |
| Nx         | pass/fail | version              |
| Build      | pass/fail | errors if any        |
| Tests      | pass/fail | pass/fail counts     |

End with overall status: HEALTHY or UNHEALTHY.
