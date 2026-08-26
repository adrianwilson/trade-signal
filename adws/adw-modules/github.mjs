/**
 * GitHub Operations Module - AI Developer Workflow (ADW)
 */

import { execFileSync } from 'child_process';

function getGitHubEnv() {
  const pat = process.env.GITHUB_PAT;
  if (!pat) return undefined;
  return { ...process.env, GH_TOKEN: pat };
}

export function getRepoUrl() {
  try {
    return execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error("No git remote 'origin' found.");
  }
}

export function extractRepoPath(url) {
  return url.replace('https://github.com/', '').replace('.git', '');
}

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

export function makeIssueComment(issueNumber, comment) {
  const repoPath = extractRepoPath(getRepoUrl());
  const env = getGitHubEnv();
  execFileSync(
    'gh',
    ['issue', 'comment', String(issueNumber), '-R', repoPath, '--body', comment],
    { encoding: 'utf8', env },
  );
}

export function fetchOpenIssues(repoPath) {
  const env = getGitHubEnv();
  try {
    const result = execFileSync(
      'gh',
      ['issue', 'list', '--repo', repoPath, '--state', 'open', '--json',
       'number,title,body,labels,createdAt,updatedAt', '--limit', '1000'],
      { encoding: 'utf8', env },
    );
    return JSON.parse(result);
  } catch {
    return [];
  }
}

export function fetchIssueComments(repoPath, issueNumber) {
  const env = getGitHubEnv();
  try {
    const result = execFileSync(
      'gh',
      ['issue', 'view', String(issueNumber), '--repo', repoPath, '--json', 'comments'],
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
