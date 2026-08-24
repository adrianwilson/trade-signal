#!/usr/bin/env node

/**
 * Cron-based ADW trigger -- polls GitHub issues every 20 seconds.
 *
 * Triggers the ADW pipeline when:
 * 1. A new issue has no comments
 * 2. The latest comment on an issue is exactly "adw"
 *
 * Usage: node adws/trigger-cron.mjs
 */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  getRepoUrl,
  extractRepoPath,
  fetchOpenIssues,
  fetchIssueComments,
} from './github.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLL_INTERVAL_MS = 20_000;

let repoPath;
try {
  repoPath = extractRepoPath(getRepoUrl());
} catch (e) {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
}

const processedIssues = new Set();
const issueLastComment = new Map();
let shutdownRequested = false;

process.on('SIGINT', () => {
  console.log('\nShutdown requested...');
  shutdownRequested = true;
});
process.on('SIGTERM', () => {
  console.log('\nShutdown requested...');
  shutdownRequested = true;
});

function shouldProcessIssue(issueNumber) {
  const comments = fetchIssueComments(repoPath, issueNumber);

  if (!comments.length) {
    console.log(`Issue #${issueNumber} has no comments -- processing`);
    return true;
  }

  const latest = comments[comments.length - 1];
  const body = (latest.body || '').trim().toLowerCase();
  const commentId = latest.id;

  if (issueLastComment.get(issueNumber) === commentId) return false;

  if (body === 'adw') {
    console.log(`Issue #${issueNumber} latest comment is 'adw' -- processing`);
    issueLastComment.set(issueNumber, commentId);
    return true;
  }

  return false;
}

function triggerWorkflow(issueNumber) {
  try {
    const script = join(__dirname, 'adw-plan-build.mjs');
    console.log(`Triggering ADW for issue #${issueNumber}`);
    execFileSync('node', [script, String(issueNumber)], {
      encoding: 'utf8',
      stdio: 'inherit',
    });
    return true;
  } catch (e) {
    console.error(`Failed to process issue #${issueNumber}: ${e.message}`);
    return false;
  }
}

function checkCycle() {
  if (shutdownRequested) return;

  const start = Date.now();
  console.log('Starting issue check cycle');

  const issues = fetchOpenIssues(repoPath);
  if (!issues.length) {
    console.log('No open issues');
    return;
  }

  const qualifying = [];
  for (const issue of issues) {
    if (!issue.number || processedIssues.has(issue.number)) continue;
    if (shouldProcessIssue(issue.number)) qualifying.push(issue.number);
  }

  if (qualifying.length) {
    console.log(`Found ${qualifying.length} qualifying issue(s): ${qualifying}`);
    for (const num of qualifying) {
      if (shutdownRequested) break;
      if (triggerWorkflow(num)) processedIssues.add(num);
    }
  } else {
    console.log('No new qualifying issues');
  }

  console.log(`Cycle completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

// Main
console.log(`ADW cron trigger -- repo: ${repoPath}, interval: ${POLL_INTERVAL_MS / 1000}s`);
checkCycle();

const timer = setInterval(() => {
  if (shutdownRequested) {
    clearInterval(timer);
    console.log('Shutdown complete');
    process.exit(0);
  }
  checkCycle();
}, POLL_INTERVAL_MS);
