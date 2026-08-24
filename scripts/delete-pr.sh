#!/bin/bash

# Delete a pull request and optionally its branch
# Usage: ./scripts/delete-pr.sh <pr-number> [--delete-branch]

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <pr-number> [--delete-branch]"
    exit 1
fi

PR_NUMBER=$1
DELETE_BRANCH=false
[ "$2" = "--delete-branch" ] && DELETE_BRANCH=true

GITHUB_REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$GITHUB_REPO_URL" ]; then
    echo "Error: Not in a git repository or no 'origin' remote found"
    exit 1
fi

REPO_PATH=$(echo "$GITHUB_REPO_URL" | sed 's|https://github.com/||' | sed 's|.git$||')

if [ -n "$GITHUB_PAT" ]; then
    export GH_TOKEN=$GITHUB_PAT
fi

echo "Fetching PR #$PR_NUMBER details..."

PR_INFO=$(gh pr view "$PR_NUMBER" -R "$REPO_PATH" --json number,title,state,headRefName 2>/dev/null || echo "")

if [ -z "$PR_INFO" ]; then
    echo "Error: PR #$PR_NUMBER not found in $REPO_PATH"
    exit 1
fi

PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_STATE=$(echo "$PR_INFO" | jq -r '.state')
PR_BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName')

echo "PR #$PR_NUMBER: $PR_TITLE"
echo "State: $PR_STATE"
echo "Branch: $PR_BRANCH"
echo

if [ "$DELETE_BRANCH" = true ]; then
    echo "This will close PR #$PR_NUMBER and DELETE branch '$PR_BRANCH'"
else
    echo "This will close PR #$PR_NUMBER (branch will be kept)"
fi

read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

if [ "$PR_STATE" = "OPEN" ]; then
    echo "Closing PR #$PR_NUMBER..."
    gh pr close "$PR_NUMBER" -R "$REPO_PATH"
else
    echo "PR is already closed"
fi

if [ "$DELETE_BRANCH" = true ]; then
    echo "Deleting branch '$PR_BRANCH'..."
    git push origin --delete "$PR_BRANCH" 2>/dev/null || echo "Note: Could not delete remote branch"

    if git show-ref --verify --quiet "refs/heads/$PR_BRANCH"; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" = "$PR_BRANCH" ]; then
            git checkout main
        fi
        git branch -D "$PR_BRANCH" 2>/dev/null || echo "Note: Could not delete local branch"
    fi

    echo "Successfully closed PR #$PR_NUMBER and deleted branch '$PR_BRANCH'"
else
    echo "Successfully closed PR #$PR_NUMBER (branch kept: '$PR_BRANCH')"
fi
