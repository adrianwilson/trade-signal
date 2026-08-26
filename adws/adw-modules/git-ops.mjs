/**
 * Git operations for ADW composable architecture.
 */

import { execFileSync } from 'child_process';
import { getRepoUrl, extractRepoPath, makeIssueComment, fetchIssue } from './github.mjs';

export function getCurrentBranch() {
  return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
}

/**
 * Push current branch to remote.
 * @returns {{ success: boolean, error?: string }}
 */
export function pushBranch(branchName) {
  try {
    execFileSync('git', ['push', '-u', 'origin', branchName], {
      encoding: 'utf8',
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.stderr || e.message };
  }
}

/**
 * Check if PR exists for branch. Returns PR URL or null.
 */
export function checkPrExists(branchName) {
  try {
    const repoPath = extractRepoPath(getRepoUrl());
    const result = execFileSync(
      'gh',
      ['pr', 'list', '--repo', repoPath, '--head', branchName, '--json', 'url'],
      { encoding: 'utf8' },
    );
    const prs = JSON.parse(result);
    return prs.length ? prs[0].url : null;
  } catch {
    return null;
  }
}

/**
 * Create and checkout a new branch.
 * @returns {{ success: boolean, error?: string }}
 */
export function createBranch(branchName) {
  try {
    execFileSync('git', ['checkout', '-b', branchName], { encoding: 'utf8' });
    return { success: true };
  } catch (e) {
    // Branch may already exist
    if (e.stderr?.includes('already exists')) {
      try {
        execFileSync('git', ['checkout', branchName], { encoding: 'utf8' });
        return { success: true };
      } catch (e2) {
        return { success: false, error: e2.stderr || e2.message };
      }
    }
    return { success: false, error: e.stderr || e.message };
  }
}

/**
 * Stage all changes and commit.
 * @returns {{ success: boolean, error?: string }}
 */
export function commitChanges(message) {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
    });
    if (!status.trim()) return { success: true }; // nothing to commit

    execFileSync('git', ['add', '-A'], { encoding: 'utf8' });
    execFileSync('git', ['commit', '-m', message], { encoding: 'utf8' });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.stderr || e.message };
  }
}

/**
 * Find an existing branch for the given issue number.
 */
export function findExistingBranchForIssue(issueNumber, adwId) {
  try {
    const result = execFileSync('git', ['branch', '-a'], { encoding: 'utf8' });
    const branches = result.split('\n').map((b) =>
      b.trim().replace('* ', '').replace('remotes/origin/', ''),
    );

    for (const branch of branches) {
      if (branch.includes(`-issue-${issueNumber}-`) || branch.includes(`/${issueNumber}-`)) {
        if (adwId && branch.includes(adwId)) return branch;
        if (!adwId) return branch;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Standard git finalization: push branch and create/update PR.
 */
export function finalizeGitOperations(state, logger) {
  const branchName = state.get('branch_name') || (() => {
    const current = getCurrentBranch();
    if (current !== 'main') {
      logger.warning(`No branch name in state, using current: ${current}`);
      return current;
    }
    logger.error('No branch name in state and on main, skipping git ops');
    return null;
  })();

  if (!branchName) return;

  const pushResult = pushBranch(branchName);
  if (!pushResult.success) {
    logger.error(`Failed to push branch: ${pushResult.error}`);
    return;
  }
  logger.info(`Pushed branch: ${branchName}`);

  const prUrl = checkPrExists(branchName);
  const issueNumber = state.get('issue_number');
  const adwId = state.get('adw_id');

  if (prUrl) {
    logger.info(`Found existing PR: ${prUrl}`);
    if (issueNumber && adwId) {
      makeIssueComment(issueNumber, `${adwId}_ops: Pull request: ${prUrl}`);
    }
  } else if (issueNumber) {
    try {
      const repoPath = extractRepoPath(getRepoUrl());
      const issue = fetchIssue(issueNumber, repoPath);
      const { createPullRequest } = await import('./workflow-ops.mjs');
      const result = createPullRequest(branchName, issue, state, logger);
      if (result.prUrl) {
        logger.info(`Created PR: ${result.prUrl}`);
        if (adwId) {
          makeIssueComment(issueNumber, `${adwId}_ops: Pull request created: ${result.prUrl}`);
        }
      } else {
        logger.error(`Failed to create PR: ${result.error}`);
      }
    } catch (e) {
      logger.error(`Failed to create PR: ${e.message}`);
    }
  }
}
