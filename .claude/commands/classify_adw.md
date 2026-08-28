# ADW Workflow Extraction

Extract ADW workflow information from the text below and return a JSON response.

## Instructions

- Look for ADW workflow commands in the text (e.g., `/adw_plan`, `/adw_test`, `/adw_build`, `/adw_plan_build`, `/adw_plan_build_test`, `/adw_review`, `/adw_document`, `/adw_patch`, `/adw_sdlc`)
- Look for ADW IDs (8-character alphanumeric strings, often after "adw_id:" or "ADW ID:" or similar)
- Return a JSON object with the extracted information
- If no ADW workflow is found, return empty JSON: `{}`

## Valid ADW Commands

- `/adw_plan` - Planning only
- `/adw_build` - Building only (requires adw_id)
- `/adw_test` - Testing only
- `/adw_plan_build` - Plan + Build
- `/adw_plan_build_test` - Plan + Build + Test
- `/adw_plan_build_review` - Plan + Build + Review
- `/adw_plan_build_test_review` - Plan + Build + Test + Review
- `/adw_review` - Review only (requires adw_id)
- `/adw_document` - Documentation only (requires adw_id)
- `/adw_patch` - Patch only (requires adw_id)
- `/adw_sdlc` - Full SDLC workflow
- `/adw_sdlc_zte` - Full SDLC with Zero Touch Execution (auto-merge)
- `/adw_ship` - Ship only (merge PR to main, requires adw_id)

## Response Format

Respond ONLY with a JSON object in this format:
```json
{
  "adw_slash_command": "/adw_plan",
  "adw_id": "abc12345"
}
```

Fields:
- `adw_slash_command`: The ADW command found (include the slash)
- `adw_id`: The 8-character ADW ID if found

If only one field is found, include only that field.
If nothing is found, return: `{}`

## Text to Analyze

$ARGUMENTS
