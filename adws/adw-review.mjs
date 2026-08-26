#!/usr/bin/env node

/**
 * ADW Review - Reviews implementation against spec
 *
 * Usage: node adws/adw-review.mjs <issue-number> <adw-id> [--skip-resolution]
 *
 * Workflow:
 * 1. Find spec file from state
 * 2. Review implementation against spec
 * 3. If blocker issues found and --skip-resolution not set:
 *    - Create patch plans for issues
 *    - Implement resolutions
 *    - Re-review
 * 4. Commit and push
 */

import { execFileSync } from 'child_process';
import { ADWState } from './adw-modules/state.mjs';
import { commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { makeIssueComment, getRepoUrl, extractRepoPath, fetchIssue } from './adw-modules/github.mjs';
import { executeTemplate } from './adw-modules/agent.mjs';
import {
  createCommit,
  formatIssueMessage,
  ensureAdwId,
  implementPlan,
} from './adw-modules/workflow-ops.mjs';
import { setupLogger, parseJson } from './adw-modules/utils.mjs';

const AGENT_REVIEWER = 'review_agent';
const MAX_REVIEW_CYCLES = 2;

const skipResolution = process.argv.includes('--skip-resolution');
const args = process.argv.filter((a) => !a.startsWith('--'));

const issueNumber = args[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-review.mjs <issue-number> <adw-id> [--skip-resolution]');
  process.exit(1);
}

const adwId = ensureAdwId(issueNumber, args[3] || null);
const state = ADWState.load(adwId) || new ADWState(adwId);
state.update({ issue_number: issueNumber });

const logger = setupLogger(adwId, 'adw_review');
logger.info(`ADW Review starting - ID: ${adwId}, Issue: ${issueNumber}`);

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const specFile = state.get('plan_file');
if (!specFile) {
  logger.error('No spec file in state. Run adw-plan.mjs first.');
  process.exit(1);
}

makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting review phase'));

let reviewPassed = false;

for (let cycle = 1; cycle <= MAX_REVIEW_CYCLES; cycle++) {
  logger.info(`\n=== Review cycle ${cycle}/${MAX_REVIEW_CYCLES} ===`);
  makeIssueComment(
    issueNumber,
    formatIssueMessage(adwId, AGENT_REVIEWER, `\u2705 Reviewing (cycle ${cycle})`),
  );

  // Run review
  const reviewResponse = executeTemplate({
    agentName: AGENT_REVIEWER,
    slashCommand: '/review',
    args: [adwId, specFile, AGENT_REVIEWER],
    adwId,
    model: 'opus',
  });

  if (!reviewResponse.success) {
    logger.error(`Review failed: ${reviewResponse.output}`);
    makeIssueComment(
      issueNumber,
      formatIssueMessage(adwId, AGENT_REVIEWER, `\u274C Review failed: ${reviewResponse.output}`),
    );
    break;
  }

  // Parse review results
  let reviewResult;
  try {
    reviewResult = parseJson(reviewResponse.output);
  } catch (e) {
    logger.error(`Failed to parse review results: ${e.message}`);
    break;
  }

  // Post review summary
  const issueCount = reviewResult.review_issues?.length || 0;
  const blockers = (reviewResult.review_issues || []).filter((i) => i.severity === 'blocker');

  logger.info(`Review: ${reviewResult.success ? 'PASSED' : 'FAILED'}, ${issueCount} issues, ${blockers.length} blockers`);

  const summary = reviewResult.summary || 'No summary';
  makeIssueComment(
    issueNumber,
    formatIssueMessage(
      adwId,
      AGENT_REVIEWER,
      `Review result: ${reviewResult.success ? '\u2705 PASSED' : '\u274C FAILED'}\n${summary}\nIssues: ${issueCount} (${blockers.length} blockers)`,
    ),
  );

  if (reviewResult.success || blockers.length === 0) {
    reviewPassed = true;
    break;
  }

  if (skipResolution) {
    logger.info('Skipping resolution (--skip-resolution flag)');
    break;
  }

  if (cycle === MAX_REVIEW_CYCLES) {
    logger.error('Max review cycles reached with unresolved blockers');
    break;
  }

  // Resolve blockers via patch
  for (const blocker of blockers) {
    logger.info(`Patching blocker: ${blocker.issue}`);
    makeIssueComment(
      issueNumber,
      formatIssueMessage(adwId, 'patch_agent', `\u2705 Patching: ${blocker.issue}`),
    );

    // Create patch plan
    const patchResponse = executeTemplate({
      agentName: 'patch_agent',
      slashCommand: '/patch',
      args: [adwId, blocker.resolution || blocker.issue, specFile],
      adwId,
      model: 'opus',
    });

    if (!patchResponse.success) {
      logger.error(`Patch plan failed: ${patchResponse.output}`);
      continue;
    }

    const patchFile = patchResponse.output.trim();
    if (!patchFile || !patchFile.includes('/')) {
      logger.error(`Invalid patch file path: ${patchFile}`);
      continue;
    }

    // Implement patch
    const implResponse = implementPlan(patchFile, adwId, logger);
    if (!implResponse.success) {
      logger.error(`Patch implementation failed: ${implResponse.output}`);
    } else {
      logger.info(`Patch applied for: ${blocker.issue}`);
    }
  }
}

// Commit review results/fixes
const repoPath = extractRepoPath(getRepoUrl());
const issue = fetchIssue(issueNumber, repoPath);
const issueCommand = state.get('issue_class') || '/feature';

const commitResult = createCommit(AGENT_REVIEWER, issue, issueCommand, adwId, logger);
if (commitResult.commitMessage) {
  const gitCommit = commitChanges(commitResult.commitMessage);
  if (gitCommit.success) {
    logger.info(`Committed review: ${commitResult.commitMessage}`);
  }
}

finalizeGitOperations(state, logger);

const status = reviewPassed ? '\u2705 Review passed' : '\u274C Review completed with issues';
logger.info(status);
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', status));
state.save('adw_review');

process.exit(reviewPassed ? 0 : 1);
