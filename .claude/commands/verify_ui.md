# UI Verification

Visually verify the running application using the `/browse` skill to catch rendering issues, broken layouts, missing data, and component usability problems that unit tests can't detect.

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

### 2. Component Inventory

For EVERY route in the application (not just affected ones), build a component inventory:

For each page (`/synthesis`, `/watchlist`, `/portfolio`, `/leaderboard`, `/trust`, `/signals`, `/news`, `/login`):

1. **Navigate** to the page via `/browse`
2. **Inventory all visible components:**
   - List every distinct UI component on the page (tables, cards, forms, chips, buttons, spinners, icons, menus)
   - For each component, record: type, content visible (yes/no), interactive (yes/no)
3. **Verify visibility:**
   - Is every component rendering? (not hidden, not zero-height, not empty)
   - Is text readable? (not clipped, not overflowing, not overlapping)
   - Are images/icons loading? (not broken, not missing)
4. **Verify data loading:**
   - Do tables have rows?
   - Do cards have content?
   - Are loading spinners resolving to content (not stuck)?
   - Are empty states showing appropriate messages (not blank)?
5. **Check console:** `$B console` for JS errors on each page

### 3. Usability Checks

For each interactive component found in the inventory:

1. **Buttons:** Click each button. Does it respond? Does the expected action happen?
2. **Links/Navigation:** Click each nav item. Does it route correctly? Does the active state update?
3. **Forms:** If forms exist, can fields be focused? Can values be entered?
4. **Dialogs/Modals:** If triggered by click, do they open? Do they close?
5. **Tables:** If rows are clickable, do clicks work? Do hover states show?
6. **Dropdowns/Selects:** Do they open? Can options be selected?
7. **Refresh buttons:** Do they trigger data reload?

### 4. State Verification

For each page, verify all UI states:

1. **Loading state:** Does a spinner/skeleton show while data loads?
2. **Loaded state:** Does content replace the loading indicator?
3. **Empty state:** If no data, is there a helpful message (not a blank page)?
4. **Error state:** If API is down, is there a clear error message?
5. **Auth state:** Pages requiring auth show login prompt (not error) when unauthenticated

### 5. Verify New Features

Based on the spec, verify each acceptance criterion that has a UI component:

- Does the new component render?
- Does it show real data (not empty/loading forever)?
- Do user interactions work (click, hover, navigate)?
- Are error states handled (API down, empty data)?

### 6. Check for Regressions

- Verify all pages still load (not just affected ones)
- Verify navigation between all pages works
- Verify no console errors in the browser
- Take screenshots of each page for evidence

## Report

Return results as JSON:

```json
{
  "issue_number": "string",
  "adw_id": "string",
  "pages_tested": number,
  "components_inventoried": number,
  "passed": boolean,
  "component_inventory": [
    {
      "page": "string - route",
      "components": [
        {
          "type": "string - table | card | form | button | chip | icon | menu | dialog",
          "description": "string - what this component shows",
          "visible": boolean,
          "interactive": boolean,
          "data_loaded": boolean,
          "usable": boolean,
          "issue": "optional string - problem found"
        }
      ]
    }
  ],
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
