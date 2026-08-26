#!/usr/bin/env node

/**
 * ADW Patch - Apply focused patches from GitHub issue comments
 *
 * Usage: node adws/adw-patch.mjs <issue-number> [adw-id]
 *
 * Triggers when a GitHub issue comment contains "adw_patch".
 * Creates a minimal patch plan and implements it.
 */

import { ADWState } from './adw-modules/state.mjs';
import { createBranch, commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { fetchIssue, makeIssueComment, getRepoUrl, extractRepoPath } from './adw-modules/github.mjs';
import { executeTemplate } from './adw-modules/agent.mjs';
import {
  classifyIssue,
  generateBranchName,
  createCommit,
  implementPlan,
  formatIssueMessage,
  ensureAdwId,
} from './adw-modules/workflow-ops.mjs';
import { setupLogger } from './adw-modules/utils.mjs';

const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-patch.mjs <issue-number> [adw-id]');
  process.exit(1);
}

const adwId = ensureAdwId(issueNumber, process.argv[3] || null);
const state = ADWState.load(adwId) || new ADWState(adwId);
state.update({ issue_number: issueNumber });

const logger = setupLogger(adwId, 'adw_patch');
logger.info(`ADW Patch starting - ID: ${adwId}, Issue: ${issueNumber}`);

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const repoPath = extractRepoPath(getRepoUrl());
const issue = fetchIssue(issueNumber, repoPath);

// Find the comment containing "adw_patch"
const comments = issue.comments || [];
const patchComment = [...comments].reverse().find((c) =>
  (c.body || '').toLowerCase().includes('adw_patch'),
);

const patchRequest = patchComment
  ? patchComment.body
  : `${issue.title}: ${issue.body}`;

makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting patch workflow'));

// Classify and branch if needed
if (!state.get('branch_name')) {
  const classResult = classifyIssue(issue, adwId, logger);
  const issueCommand = classResult.command || '/bug';
  state.update({ issue_class: issueCommand });

  const branchResult = generateBranchName(issue, issueCommand, adwId, logger);
  if (branchResult.branchName) {
    createBranch(branchResult.branchName);
    state.update({ branch_name: branchResult.branchName });
    state.save('adw_patch');
  }
}

// Create patch plan
logger.info('Creating patch plan');
const patchResponse = executeTemplate({
  agentName: 'patch_planner',
  slashCommand: '/patch',
  args: [adwId, patchRequest, state.get('plan_file') || ''],
  adwId,
  model: 'opus',
});

if (!patchResponse.success) {
  logger.error(`Patch plan failed: ${patchResponse.output}`);
  makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', `\u274C Patch failed: ${patchResponse.output}`));
  process.exit(1);
}

const patchFile = patchResponse.output.trim();
logger.info(`Patch plan: ${patchFile}`);

// Implement patch
logger.info('Implementing patch');
const implResponse = implementPlan(patchFile, adwId, logger);

if (!implResponse.success) {
  logger.error(`Patch implementation failed: ${implResponse.output}`);
  makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', `\u274C Patch implementation failed`));
  process.exit(1);
}

// Commit and push
const issueCommand = state.get('issue_class') || '/bug';
const commitResult = createCommit('patch_agent', issue, issueCommand, adwId, logger);
if (commitResult.commitMessage) {
  commitChanges(commitResult.commitMessage);
}

finalizeGitOperations(state, logger);

logger.info('Patch completed');
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Patch applied and pushed'));
state.save('adw_patch');
