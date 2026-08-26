#!/usr/bin/env node

/**
 * ADW Build - Implementation only (requires prior plan)
 *
 * Usage: node adws/adw-build.mjs <issue-number> <adw-id>
 *
 * Workflow:
 * 1. Load state from prior plan run
 * 2. Checkout the branch
 * 3. Implement the plan
 * 4. Commit and push
 */

import { execFileSync } from 'child_process';
import { ADWState } from './adw-modules/state.mjs';
import { commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { fetchIssue, makeIssueComment, getRepoUrl, extractRepoPath } from './adw-modules/github.mjs';
import {
  implementPlan,
  createCommit,
  classifyIssue,
  formatIssueMessage,
  AGENT_IMPLEMENTOR,
} from './adw-modules/workflow-ops.mjs';
import { setupLogger } from './adw-modules/utils.mjs';

// Parse args -- adw-id is REQUIRED to locate the plan
if (process.argv.length < 4) {
  console.error('Usage: node adws/adw-build.mjs <issue-number> <adw-id>');
  console.error('\nadw-id is required to locate the plan from adw-plan.mjs');
  process.exit(1);
}

const issueNumber = process.argv[2];
const adwId = process.argv[3];

const logger = setupLogger(adwId, 'adw_build');
logger.info(`ADW Build starting - ID: ${adwId}, Issue: ${issueNumber}`);

// Load state
const state = ADWState.load(adwId);
if (!state) {
  logger.error(`No state found for ADW ID: ${adwId}. Run adw-plan.mjs first.`);
  process.exit(1);
}

if (!state.get('branch_name') || !state.get('plan_file')) {
  logger.error('State missing branch_name or plan_file. Run adw-plan.mjs first.');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

// Checkout the branch
const branchName = state.get('branch_name');
try {
  execFileSync('git', ['checkout', branchName], { encoding: 'utf8' });
} catch (e) {
  logger.error(`Failed to checkout branch ${branchName}: ${e.message}`);
  process.exit(1);
}
logger.info(`Checked out branch: ${branchName}`);

const planFile = state.get('plan_file');
logger.info(`Using plan file: ${planFile}`);

makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting implementation'));

// Implement
makeIssueComment(issueNumber, formatIssueMessage(adwId, AGENT_IMPLEMENTOR, '\u2705 Implementing solution'));
const implResponse = implementPlan(planFile, adwId, logger);

if (!implResponse.success) {
  logger.error(`Implementation failed: ${implResponse.output}`);
  makeIssueComment(issueNumber, formatIssueMessage(adwId, AGENT_IMPLEMENTOR, `\u274C Implementation failed: ${implResponse.output}`));
  process.exit(1);
}

makeIssueComment(issueNumber, formatIssueMessage(adwId, AGENT_IMPLEMENTOR, '\u2705 Solution implemented'));

// Commit
const repoPath = extractRepoPath(getRepoUrl());
const issue = fetchIssue(issueNumber, repoPath);

let issueCommand = state.get('issue_class');
if (!issueCommand) {
  const classResult = classifyIssue(issue, adwId, logger);
  issueCommand = classResult.command || '/feature';
  state.update({ issue_class: issueCommand });
  state.save('adw_build');
}

const commitResult = createCommit(AGENT_IMPLEMENTOR, issue, issueCommand, adwId, logger);
if (commitResult.error) {
  logger.error(`Commit error: ${commitResult.error}`);
  process.exit(1);
}

const gitCommit = commitChanges(commitResult.commitMessage);
if (!gitCommit.success) {
  logger.error(`Git commit error: ${gitCommit.error}`);
  process.exit(1);
}

// Push and PR
finalizeGitOperations(state, logger);

logger.info('Implementation phase completed');
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Implementation phase completed'));
state.save('adw_build');
