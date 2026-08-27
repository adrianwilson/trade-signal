#!/usr/bin/env node

/**
 * Cron-based ADW trigger -- polls GitHub issues every 20 seconds.
 *
 * Triggers the /sdlc command via Claude Code SDK when:
 * 1. A new issue has no comments
 * 2. The latest comment on an issue is exactly "adw"
 *
 * Usage: node adws/trigger-cron.mjs
 */

import { query } from '@anthropic-ai/claude-code';
import { fetchOpenIssues, fetchIssueComments } from './adw-modules/github.mjs';
import { getProjectRoot } from './adw-modules/utils.mjs';
import { execFileSync } from 'child_process';

const POLL_INTERVAL_MS = 20_000;

let repoPath;
try {
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
  }).trim();
  repoPath = url.replace('https://github.com/', '').replace('.git', '');
} catch {
  console.error('ERROR: No git remote found');
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

async function triggerWorkflow(issueNumber) {
  console.log(`Triggering /sdlc for issue #${issueNumber}`);

  try {
    const messages = [];
    for await (const message of query({
      prompt: `/sdlc ${issueNumber}`,
      abortController: new AbortController(),
      options: {
        maxTurns: 50,
        permissionMode: 'bypassPermissions',
        cwd: getProjectRoot(),
      },
    })) {
      messages.push(message);

      // Log assistant text as it streams
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          }
        }
      }
    }

    const result = messages.findLast((m) => m.type === 'result');
    if (result?.is_error) {
      console.error(`SDLC failed for issue #${issueNumber}: ${result.result}`);
      return false;
    }

    console.log(`\nSDLC completed for issue #${issueNumber}`);
    return true;
  } catch (e) {
    console.error(`Failed to process issue #${issueNumber}: ${e.message}`);
    return false;
  }
}

async function checkCycle() {
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
      if (await triggerWorkflow(num)) processedIssues.add(num);
    }
  } else {
    console.log('No new qualifying issues');
  }

  console.log(`Cycle completed in ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

// Main
console.log(`ADW cron trigger -- repo: ${repoPath}, interval: ${POLL_INTERVAL_MS / 1000}s`);
await checkCycle();

const timer = setInterval(async () => {
  if (shutdownRequested) {
    clearInterval(timer);
    console.log('Shutdown complete');
    process.exit(0);
  }
  await checkCycle();
}, POLL_INTERVAL_MS);
