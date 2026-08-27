#!/bin/bash

# SDLC Pipeline - Local Isolated Execution
#
# Each phase runs as a separate `claude -p` call with its own context window.
# Structured JSON output pipes between steps.
# All agent input/output is logged to agents/{adw-id}/ for traceability.
#
# Usage: ./scripts/sdlc.sh <issue-number>

set -e

ISSUE_NUMBER=$1
if [ -z "$ISSUE_NUMBER" ]; then
  echo "Usage: ./scripts/sdlc.sh <issue-number>"
  exit 1
fi

ADW_ID=$(head -c 4 /dev/urandom | xxd -p)
AGENTS_DIR="agents/$ADW_ID"
mkdir -p "$AGENTS_DIR"

echo "SDLC Pipeline - Issue: #$ISSUE_NUMBER, ADW ID: $ADW_ID"
echo "Logs: $AGENTS_DIR/"
echo "=================================================="

# Save initial state
echo "{\"adw_id\":\"$ADW_ID\",\"issue_number\":\"$ISSUE_NUMBER\",\"started\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
  > "$AGENTS_DIR/state.json"

# Helper: run a phase, log full input/output, extract result
run_phase() {
  local phase_name=$1
  local agent_name=$2
  local prompt=$3
  local phase_dir="$AGENTS_DIR/$agent_name"
  mkdir -p "$phase_dir"

  # Log the prompt (input to this agent)
  echo "$prompt" > "$phase_dir/input.txt"

  # Run claude and capture full JSON output
  local full_output
  full_output=$(claude -p "$prompt" \
    --dangerously-skip-permissions \
    --output-format json 2>"$phase_dir/stderr.log")

  # Save full response (what the agent produced)
  echo "$full_output" > "$phase_dir/output.json"

  # Extract the result text
  local result
  result=$(echo "$full_output" | jq -r '.result')
  echo "$result" > "$phase_dir/result.txt"

  # Log metadata
  local cost duration num_turns
  cost=$(echo "$full_output" | jq -r '.total_cost_usd // "unknown"')
  duration=$(echo "$full_output" | jq -r '.duration_ms // "unknown"')
  num_turns=$(echo "$full_output" | jq -r '.num_turns // "unknown"')
  echo "{\"phase\":\"$phase_name\",\"agent\":\"$agent_name\",\"cost_usd\":$cost,\"duration_ms\":$duration,\"num_turns\":$num_turns,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    > "$phase_dir/meta.json"

  echo "$phase_name: cost=\$$cost, turns=$num_turns, duration=${duration}ms"

  # Return the result via stdout
  echo "$result"
}

# Fetch issue data once
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,state,labels)
echo "$ISSUE_JSON" > "$AGENTS_DIR/issue.json"
echo "Issue: $(echo "$ISSUE_JSON" | jq -r '.title')"
echo ""

# Phase 1: Classify
echo "=== Phase 1: Classify ==="
CLASSIFICATION=$(run_phase "classify" "issue_classifier" "/classify_issue $ISSUE_JSON")
echo "Classification: $CLASSIFICATION"
echo ""

# Validate classification
if [[ ! "$CLASSIFICATION" =~ ^/(feature|bug|chore|refactor)$ ]]; then
  echo "ERROR: Invalid classification: $CLASSIFICATION"
  exit 1
fi

ISSUE_CLASS=$(echo "$CLASSIFICATION" | tr -d '/')

# Update state
echo "{\"adw_id\":\"$ADW_ID\",\"issue_number\":\"$ISSUE_NUMBER\",\"issue_class\":\"$CLASSIFICATION\"}" \
  > "$AGENTS_DIR/state.json"

# Phase 2: Branch
echo "=== Phase 2: Branch ==="
BRANCH_NAME=$(run_phase "branch" "branch_generator" "/generate_branch_name $ISSUE_CLASS $ADW_ID '$ISSUE_JSON'")
echo "Branch: $BRANCH_NAME"
echo ""

# Update state
echo "{\"adw_id\":\"$ADW_ID\",\"issue_number\":\"$ISSUE_NUMBER\",\"issue_class\":\"$CLASSIFICATION\",\"branch_name\":\"$BRANCH_NAME\"}" \
  > "$AGENTS_DIR/state.json"

# Phase 3: Plan
echo "=== Phase 3: Plan ==="
SPEC_FILE=$(run_phase "plan" "sdlc_planner" "$CLASSIFICATION $ISSUE_NUMBER $ADW_ID '$ISSUE_JSON'")
echo "Spec: $SPEC_FILE"
echo ""

# Update state
echo "{\"adw_id\":\"$ADW_ID\",\"issue_number\":\"$ISSUE_NUMBER\",\"issue_class\":\"$CLASSIFICATION\",\"branch_name\":\"$BRANCH_NAME\",\"plan_file\":\"$SPEC_FILE\"}" \
  > "$AGENTS_DIR/state.json"

# Phase 3b: Commit plan
echo "=== Phase 3b: Commit plan ==="
if [ -n "$(git status --porcelain)" ]; then
  run_phase "commit_plan" "sdlc_planner_committer" "/commit sdlc_planner $ISSUE_CLASS '$ISSUE_JSON'" > /dev/null
  echo "Plan committed"
fi
echo ""

# Phase 4: Implement
echo "=== Phase 4: Implement ==="
run_phase "implement" "sdlc_implementor" "/implement $SPEC_FILE" > /dev/null
echo "Implementation complete"
echo ""

# Phase 4b: Commit implementation
echo "=== Phase 4b: Commit implementation ==="
if [ -n "$(git status --porcelain)" ]; then
  run_phase "commit_impl" "sdlc_implementor_committer" "/commit sdlc_implementor $ISSUE_CLASS '$ISSUE_JSON'" > /dev/null
  echo "Implementation committed"
fi
echo ""

# Phase 5: Test with retry loop
echo "=== Phase 5: Test ==="
TESTS_PASSED=false
for attempt in 1 2 3; do
  echo "Test attempt $attempt/3"
  TEST_RESULT=$(run_phase "test_attempt_$attempt" "test_runner_$attempt" "/test")

  FAILED=$(echo "$TEST_RESULT" | jq '[.[] | select(.passed == false)] | length' 2>/dev/null || echo "0")
  if [ "$FAILED" = "0" ]; then
    echo "All tests passed"
    TESTS_PASSED=true
    break
  fi

  echo "$FAILED test(s) failed"
  if [ "$attempt" -lt 3 ]; then
    echo "Resolving failures..."
    run_phase "resolve_attempt_$attempt" "test_resolver_$attempt" "/resolve_failed_test $TEST_RESULT" > /dev/null
  fi
done
echo ""

# Phase 5b: Commit test fixes
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 5b: Commit test fixes ==="
  run_phase "commit_test" "test_runner_committer" "/commit test_runner $ISSUE_CLASS '$ISSUE_JSON'" > /dev/null
  echo "Test fixes committed"
  echo ""
fi

# Phase 6: Review with retry loop
echo "=== Phase 6: Review ==="
REVIEW_PASSED=false
for cycle in 1 2; do
  echo "Review cycle $cycle/2"
  REVIEW_RESULT=$(run_phase "review_cycle_$cycle" "review_agent_$cycle" "/review $ADW_ID $SPEC_FILE")

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
      PATCH_FILE=$(run_phase "patch_cycle_$cycle" "patch_agent_$cycle" "/patch $ADW_ID '$BLOCKERS' $SPEC_FILE")
      run_phase "patch_impl_$cycle" "patch_implementor_$cycle" "/implement $PATCH_FILE" > /dev/null
    fi
  fi
done
echo ""

# Phase 6b: Commit review fixes
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 6b: Commit review fixes ==="
  run_phase "commit_review" "review_agent_committer" "/commit review_agent $ISSUE_CLASS '$ISSUE_JSON'" > /dev/null
  echo "Review fixes committed"
  echo ""
fi

# Phase 7: Document
echo "=== Phase 7: Document ==="
DOC_FILE=$(run_phase "document" "documenter" "/document $ADW_ID $SPEC_FILE")
echo "Documentation: $DOC_FILE"
echo ""

# Phase 7b: Commit documentation
if [ -n "$(git status --porcelain)" ]; then
  echo "=== Phase 7b: Commit documentation ==="
  run_phase "commit_docs" "documenter_committer" "/commit documenter $ISSUE_CLASS '$ISSUE_JSON'" > /dev/null
  echo "Documentation committed"
  echo ""
fi

# Phase 8: Ship
echo "=== Phase 8: Ship ==="
PR_URL=$(run_phase "ship" "pr_creator" "/pull_request $BRANCH_NAME '$ISSUE_JSON' $SPEC_FILE $ADW_ID")
echo "PR: $PR_URL"
echo ""

# Final state
cat > "$AGENTS_DIR/state.json" << EOF
{
  "adw_id": "$ADW_ID",
  "issue_number": "$ISSUE_NUMBER",
  "issue_class": "$CLASSIFICATION",
  "branch_name": "$BRANCH_NAME",
  "plan_file": "$SPEC_FILE",
  "tests_passed": $TESTS_PASSED,
  "review_passed": $REVIEW_PASSED,
  "doc_file": "$DOC_FILE",
  "pr_url": "$PR_URL",
  "completed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

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
echo "  Logs:           $AGENTS_DIR/"
