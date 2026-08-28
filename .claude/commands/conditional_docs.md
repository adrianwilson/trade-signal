# Conditional Documentation Guide

This prompt helps you determine what documentation you should read based on the specific changes you need to make in the codebase. Review the conditions below and read the relevant documentation before proceeding with your task.

## Instructions

- Review the task you've been asked to perform
- Check each documentation path in the Conditional Documentation section
- For each path, evaluate if any of the listed conditions apply to your task
  - IMPORTANT: Only read the documentation if any one of the conditions match your task
- IMPORTANT: You don't want to excessively read documentation. Only read the documentation if it's relevant to your task.

## Conditional Documentation

- README.md
  - Conditions:
    - When operating on anything under apps/api
    - When operating on anything under apps/dashboard
    - When first understanding the project structure
    - When you want to learn the commands to start or stop the server or client

- libs/signals/src/lib/signals.ts
  - Conditions:
    - When working with Signal, AggregatedSignal, or AgentLogEntry types
    - When adding new signal sources or asset classes
    - When modifying data contracts between API and dashboard

- .claude/commands/classify_adw.md
  - Conditions:
    - When adding or removing ADW pipeline commands

- .github/workflows/adw.yml
  - Conditions:
    - When modifying the ADW pipeline or trigger configuration

- app_docs/feature-83c495bb-api-jest-test-runner.md
  - Conditions:
    - When running, configuring, or debugging tests for apps/api
    - When modifying Jest config, tsconfig.spec.json, or the API test target
    - When adding a test target or test runner to another Nx project
