#!/bin/bash

# Clear all comments from a GitHub issue
# Usage: ./scripts/clear-issue-comments.sh <issue-number>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <issue-number>"
    exit 1
fi

ISSUE_NUMBER=$1

GITHUB_REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$GITHUB_REPO_URL" ]; then
    echo "Error: Not in a git repository or no 'origin' remote found"
    exit 1
fi

REPO_PATH=$(echo "$GITHUB_REPO_URL" | sed 's|https://github.com/||' | sed 's|.git$||')

if [ -n "$GITHUB_PAT" ]; then
    export GH_TOKEN=$GITHUB_PAT
fi

echo "Fetching comments for issue #$ISSUE_NUMBER in $REPO_PATH..."

COMMENT_IDS=$(gh api "repos/$REPO_PATH/issues/$ISSUE_NUMBER/comments" --jq '.[].id' 2>/dev/null || echo "")

if [ -z "$COMMENT_IDS" ]; then
    echo "No comments found on issue #$ISSUE_NUMBER"
    exit 0
fi

COMMENT_COUNT=$(echo "$COMMENT_IDS" | wc -l | tr -d ' ')
echo "Found $COMMENT_COUNT comment(s) to delete"

read -p "Are you sure you want to delete all $COMMENT_COUNT comment(s)? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

for COMMENT_ID in $COMMENT_IDS; do
    echo "Deleting comment $COMMENT_ID..."
    gh api --method DELETE "repos/$REPO_PATH/issues/comments/$COMMENT_ID" 2>/dev/null || echo "Failed to delete comment $COMMENT_ID"
done

echo "Successfully deleted all comments from issue #$ISSUE_NUMBER"
