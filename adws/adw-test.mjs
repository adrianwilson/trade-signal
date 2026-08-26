#!/usr/bin/env node

/**
 * ADW Test - Autonomous testing with retry loops
 *
 * Usage: node adws/adw-test.mjs <issue-number> [adw-id]
 *
 * Workflow:
 * 1. Run the test suite via /test
 * 2. If tests fail, run /resolve_failed_test for each failure
 * 3. Re-run tests to verify fixes
 * 4. Retry up to MAX_RETRY_ATTEMPTS times
 * 5. Commit fixes and push
 */

import { ADWState } from './adw-modules/state.mjs';
import { commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { makeIssueComment, getRepoUrl, extractRepoPath, fetchIssue } from './adw-modules/github.mjs';
import {
  runTests,
  resolveFailedTest,
  createCommit,
  classifyIssue,
  formatIssueMessage,
  ensureAdwId,
  AGENT_TESTER,
} from './adw-modules/workflow-ops.mjs';
import { setupLogger, parseJson } from './adw-modules/utils.mjs';

const MAX_RETRY_ATTEMPTS = 4;

// Parse args
const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-test.mjs <issue-number> [adw-id]');
  process.exit(1);
}

const adwId = ensureAdwId(issueNumber, process.argv[3] || null);
const state = ADWState.load(adwId) || new ADWState(adwId);
state.update({ issue_number: issueNumber });

const logger = setupLogger(adwId, 'adw_test');
logger.info(`ADW Test starting - ID: ${adwId}, Issue: ${issueNumber}`);

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting test phase'));

let allPassed = false;

for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
  logger.info(`\n=== Test attempt ${attempt}/${MAX_RETRY_ATTEMPTS} ===`);
  makeIssueComment(
    issueNumber,
    formatIssueMessage(adwId, AGENT_TESTER, `\u2705 Running tests (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`),
  );

  // Run tests
  const testResponse = runTests(adwId, logger);

  if (!testResponse.success) {
    logger.error(`Test runner failed: ${testResponse.output}`);
    makeIssueComment(
      issueNumber,
      formatIssueMessage(adwId, AGENT_TESTER, `\u274C Test runner failed: ${testResponse.output}`),
    );
    break;
  }

  // Parse results
  let results;
  try {
    results = parseJson(testResponse.output);
  } catch (e) {
    logger.error(`Failed to parse test results: ${e.message}`);
    break;
  }

  if (!Array.isArray(results)) {
    logger.error('Test results not an array');
    break;
  }

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  logger.info(`Results: ${passed.length} passed, ${failed.length} failed`);

  // Post results summary
  const summary = results
    .map((r) => `${r.passed ? '\u2705' : '\u274C'} ${r.test_name}${r.error ? `: ${r.error.slice(0, 100)}` : ''}`)
    .join('\n');
  makeIssueComment(
    issueNumber,
    formatIssueMessage(adwId, AGENT_TESTER, `Test results (attempt ${attempt}):\n${summary}`),
  );

  if (failed.length === 0) {
    allPassed = true;
    break;
  }

  if (attempt === MAX_RETRY_ATTEMPTS) {
    logger.error('Max retry attempts reached');
    break;
  }

  // Resolve each failed test
  for (const failedTest of failed) {
    logger.info(`Resolving: ${failedTest.test_name}`);
    makeIssueComment(
      issueNumber,
      formatIssueMessage(adwId, 'test_resolver', `\u2705 Resolving: ${failedTest.test_name}`),
    );

    const resolveResponse = resolveFailedTest(failedTest, adwId, logger);

    if (!resolveResponse.success) {
      logger.error(`Failed to resolve ${failedTest.test_name}: ${resolveResponse.output}`);
    } else {
      logger.info(`Resolved: ${failedTest.test_name}`);
    }
  }
}

// Post final status
if (allPassed) {
  logger.info('All tests passed');
  makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 All tests passed'));
} else {
  logger.error('Tests failed after all retry attempts');
  makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u274C Tests failed after all retries'));
}

// Commit any fixes
const repoPath = extractRepoPath(getRepoUrl());
const issue = fetchIssue(issueNumber, repoPath);
let issueCommand = state.get('issue_class');
if (!issueCommand) {
  const classResult = classifyIssue(issue, adwId, logger);
  issueCommand = classResult.command || '/feature';
}

const commitResult = createCommit(AGENT_TESTER, issue, issueCommand, adwId, logger);
if (commitResult.commitMessage) {
  const gitCommit = commitChanges(commitResult.commitMessage);
  if (gitCommit.success) {
    logger.info(`Committed test fixes: ${commitResult.commitMessage}`);
  }
}

// Push
finalizeGitOperations(state, logger);

logger.info('Test phase completed');
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Test phase completed'));
state.save('adw_test');

process.exit(allPassed ? 0 : 1);
