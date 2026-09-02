# UI Verification

Visually verify the running application using the `/browse` skill to catch rendering issues, broken layouts, and missing data that unit tests can't detect.

## Variables

issue_number: $1
adw_id: $2
spec_file: $3

## Prerequisites

- The application must be running (dashboard on :4200, API on :3000)
- If not running, execute `/prepare_app` first

## Instructions

### 1. Read the Spec

- Read the spec file to understand what UI changes were made
- Identify which routes/pages were affected
- Determine what should be visible to the user

### 2. Browse the Application

Use the `/browse` gstack skill to navigate the running application:

- Start at `http://localhost:4200`
- Navigate to each affected route
- For each page:
  - Verify the page loads without blank/empty states
  - Verify data renders (tables populated, cards showing content, charts visible)
  - Verify navigation links work
  - Verify interactive elements respond (buttons, clicks, dialogs)
  - Take screenshots for evidence

### 3. Verify New Features

Based on the spec, verify each acceptance criterion that has a UI component:

- Does the new component render?
- Does it show real data (not empty/loading forever)?
- Do user interactions work (click, hover, navigate)?
- Are error states handled (API down, empty data)?

### 4. Check for Regressions

- Verify the signal table still loads at `/signals`
- Verify existing navigation still works
- Verify no console errors in the browser

## Report

Return results as JSON:

```json
{
  "issue_number": "string",
  "adw_id": "string",
  "pages_tested": number,
  "passed": boolean,
  "findings": [
    {
      "page": "string - URL or route tested",
      "status": "pass | fail",
      "description": "string - what was verified",
      "screenshot": "optional string - path to screenshot",
      "error": "optional string - issue found"
    }
  ]
}
```
