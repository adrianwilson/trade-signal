#!/bin/bash

# SDLC Pipeline - Local Isolated Execution
#
# Each phase runs as a separate `claude -p` call with its own context window.
# Structured JSON output pipes between steps.
#
# Usage: ./scripts/sdlc.sh <issue-number>

set -e

ISSUE_NUMBER=$1
if [ -z "$ISSUE_NUMBER" ]; then
  echo "Usage: ./scripts/sdlc.sh <issue-number>"
  exit 1
fi

ADW_ID=$(head -c 4 /dev/urandom | xxd -p)
echo "SDLC Pipeline - Issue: #$ISSUE_NUMBER, ADW ID: $ADW_ID"
echo "=================================================="

# Fetch issue data once
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,state,labels)
echo "Issue: $(echo "$ISSUE_JSON" | jq -r '.title')"
echo ""

# Phase 1: Classify
echo "=== Phase 1: Classify ==="
CLASSIFICATION=$(claude -p "/classify_issue $ISSUE_JSON" \
  --dangerously-skip-permissions \
  --output-format json | jq -r '.result')
echo "Classification: $CLASSIFICATION"
echo ""

# Validate classification
if [[ ! "$CLASSIFICATION" =~ ^/(feature|bug|chore|refactor)$ ]]; then
  echo "ERROR: Invalid classification: $CLASSIFICATION"
  exit 1
fi

ISSUE_CLASS=$(echo "$CLASSIFICATION" | tr -d '/')

# Phase 2: Branch
echo "=== Phase 2: Branch ==="
BRANCH_NAME=$(claude -p "/generate_branch_name $ISSUE_CLASS $ADW_ID '$ISSUE_JSON'" \
  --dangerously-skip-permissions \
  --output-format json | jq -r '.result')
echo "Branch: $BRANCH_NAME"
echo ""

# Phase 3: Plan
echo "=== Phase 3: Plan ==="
SPEC_FILE=$(claude -p "$CLASSIFICATION $ISSUE_NUMBER $ADW_ID '$ISSUE_JSON'" \
  --dangerously-skip-permissions \
  --output-format json | jq -r '.result')
echo "Spec: $SPEC_FILE"
echo ""

# Phase 3b: Commit plan
echo "=== Phase 3b: Commit plan ==="
if [ -n "$(git status --porcelain)" ]; then
  claude -p "/commit sdlc_planner $ISSUE_CLASS '$ISSUE_JSON'" \
    --dangerously-skip-permissions \
    --output-format json > /dev/null
  echo "Plan committed"
fi
echo ""

# Phase 4: Implement
echo "=== Phase 4: Implement ==="
claude -p "/implement $SPEC_FILE" \
  --dangerously-skip-permissions \
  --output-format json > /dev/null
echo "Implementation complete"
echo ""

# Phase 4b: Commit implementation
echo "=== Phase 4b: Commit implementation ==="
if [ -n "$(git status --porcelain)" ]; then
  claude -p "/commit sdlc_implementor $ISSUE_CLASS '$ISSUE_JSON'" \
    --dangerously-skip-permissions \
    --output-format json > /dev/null
  echo "Implementation committed"
fi
echo ""

# Phase 5: Test with retry loop
echo "=== Phase 5: Test ==="
TESTS_PASSED=false
for attempt in 1 2 3; do
  echo "Test attempt $attempt/3"
  TEST_RESULT=$(claude -p "/test" \
    --dangerously-skip-permissions \
    --output-format json | jq -r '.result')

  FAILED=$(echo "$TEST_RESULT" | jq '[.[] | select(.passed == false)] | length' 2>/dev/null || echo "0")
  if [ "$FAILED" = "0" ]; then
    echo "All tests passed"
    TESTS_PASSED=true
    break
  fi

  echo "$FAILED test(s) failed"
  if [ "$attempt" -lt 3 ]; then
    echo "Resolving failures..."
    claude -p "/resolve_failed_test $TEST_RESULT" \
      --dangerously-skip-permissions \
      --output-format json > /dev/null
  fi
done
echo ""

# Phase 5b: Commit test fixes
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 5b: Commit test fixes ==="
  claude -p "/commit test_runner $ISSUE_CLASS '$ISSUE_JSON'" \
    --dangerously-skip-permissions \
    --output-format json > /dev/null
  echo "Test fixes committed"
  echo ""
fi

# Phase 6: Review with retry loop
echo "=== Phase 6: Review ==="
REVIEW_PASSED=false
for cycle in 1 2; do
  echo "Review cycle $cycle/2"
  REVIEW_RESULT=$(claude -p "/review $ADW_ID $SPEC_FILE" \
    --dangerously-skip-permissions \
    --output-format json | jq -r '.result')

  SUCCESS=$(echo "$REVIEW_RESULT" | jq '.success' 2>/dev/null || echo "true")
  if [ "$SUCCESS" = "true" ]; then
    echo "Review passed"
    REVIEW_PASSED=true
    break
  fi

  echo "Review found issues"
  if [ "$cycle" -lt 2 ]; then
    BLOCKERS=$(echo "$REVIEW_RESULT" | jq '[.review_issues[] | select(.severity == "blocker")]' 2>/dev/null || echo "[]")
    if [ "$BLOCKERS" != "[]" ]; then
      echo "Patching blockers..."
      PATCH_FILE=$(claude -p "/patch $ADW_ID '$BLOCKERS' $SPEC_FILE" \
        --dangerously-skip-permissions \
        --output-format json | jq -r '.result')
      claude -p "/implement $PATCH_FILE" \
        --dangerously-skip-permissions \
        --output-format json > /dev/null
    fi
  fi
done
echo ""

# Phase 6b: Commit review fixes
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 6b: Commit review fixes ==="
  claude -p "/commit review_agent $ISSUE_CLASS '$ISSUE_JSON'" \
    --dangerously-skip-permissions \
    --output-format json > /dev/null
  echo "Review fixes committed"
  echo ""
fi

# Phase 7: Document
echo "=== Phase 7: Document ==="
DOC_FILE=$(claude -p "/document $ADW_ID $SPEC_FILE" \
  --dangerously-skip-permissions \
  --output-format json | jq -r '.result')
echo "Documentation: $DOC_FILE"
echo ""

# Phase 7b: Commit documentation
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 7b: Commit documentation ==="
  claude -p "/commit documenter $ISSUE_CLASS '$ISSUE_JSON'" \
    --dangerously-skip-permissions \
    --output-format json > /dev/null
  echo "Documentation committed"
  echo ""
fi

# Phase 8: Ship
echo "=== Phase 8: Ship ==="
PR_URL=$(claude -p "/pull_request $BRANCH_NAME '$ISSUE_JSON' $SPEC_FILE $ADW_ID" \
  --dangerously-skip-permissions \
  --output-format json | jq -r '.result')
echo "PR: $PR_URL"
echo ""

# Summary
echo "=================================================="
echo "SDLC Complete"
echo "  Issue:          #$ISSUE_NUMBER"
echo "  Classification: $CLASSIFICATION"
echo "  Branch:         $BRANCH_NAME"
echo "  Spec:           $SPEC_FILE"
echo "  Tests:          $([ "$TESTS_PASSED" = true ] && echo "PASSED" || echo "FAILED")"
echo "  Review:         $([ "$REVIEW_PASSED" = true ] && echo "PASSED" || echo "FAILED")"
echo "  Documentation:  $DOC_FILE"
echo "  PR:             $PR_URL"
echo "  ADW ID:         $ADW_ID"
