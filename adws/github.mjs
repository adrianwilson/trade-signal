/**
 * GitHub Operations Module - AI Developer Workflow (ADW)
 *
 * Issue fetching, comment posting, status management via gh CLI.
 */

import { execFileSync } from 'child_process';

function getGitHubEnv() {
  const pat = process.env.GITHUB_PAT;
  if (!pat) return undefined; // inherit parent env
  return { ...process.env, GH_TOKEN: pat };
}

/**
 * Get GitHub repository URL from git remote.
 */
export function getRepoUrl() {
  try {
    return execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error(
      "No git remote 'origin' found. Ensure you're in a git repo with a remote.",
    );
  }
}

/**
 * Extract owner/repo from GitHub URL.
 */
export function extractRepoPath(url) {
  return url.replace('https://github.com/', '').replace('.git', '');
}

/**
 * Fetch a GitHub issue by number.
 */
export function fetchIssue(issueNumber, repoPath) {
  const fields =
    'number,title,body,state,author,assignees,labels,milestone,comments,createdAt,updatedAt,closedAt,url';
  const env = getGitHubEnv();
  const result = execFileSync(
    'gh',
    ['issue', 'view', String(issueNumber), '-R', repoPath, '--json', fields],
    { encoding: 'utf8', env },
  );
  return JSON.parse(result);
}

/**
 * Post a comment to a GitHub issue.
 */
export function makeIssueComment(issueNumber, comment) {
  const repoPath = extractRepoPath(getRepoUrl());
  const env = getGitHubEnv();
  execFileSync(
    'gh',
    [
      'issue',
      'comment',
      String(issueNumber),
      '-R',
      repoPath,
      '--body',
      comment,
    ],
    { encoding: 'utf8', env },
  );
}

/**
 * Mark issue as in-progress (add label + assign to self).
 */
export function markIssueInProgress(issueNumber) {
  const repoPath = extractRepoPath(getRepoUrl());
  const env = getGitHubEnv();

  try {
    execFileSync(
      'gh',
      [
        'issue',
        'edit',
        String(issueNumber),
        '-R',
        repoPath,
        '--add-label',
        'in_progress',
      ],
      { encoding: 'utf8', env },
    );
  } catch {
    // label may not exist
  }

  try {
    execFileSync(
      'gh',
      [
        'issue',
        'edit',
        String(issueNumber),
        '-R',
        repoPath,
        '--add-assignee',
        '@me',
      ],
      { encoding: 'utf8', env },
    );
  } catch {
    // assignment may fail
  }
}

/**
 * Fetch all open issues from the repo.
 */
export function fetchOpenIssues(repoPath) {
  const env = getGitHubEnv();
  try {
    const result = execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--repo',
        repoPath,
        '--state',
        'open',
        '--json',
        'number,title,body,labels,createdAt,updatedAt',
        '--limit',
        '1000',
      ],
      { encoding: 'utf8', env },
    );
    return JSON.parse(result);
  } catch {
    return [];
  }
}

/**
 * Fetch all comments for a specific issue.
 */
export function fetchIssueComments(repoPath, issueNumber) {
  const env = getGitHubEnv();
  try {
    const result = execFileSync(
      'gh',
      [
        'issue',
        'view',
        String(issueNumber),
        '--repo',
        repoPath,
        '--json',
        'comments',
      ],
      { encoding: 'utf8', env },
    );
    const data = JSON.parse(result);
    const comments = data.comments || [];
    comments.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    return comments;
  } catch {
    return [];
  }
}
