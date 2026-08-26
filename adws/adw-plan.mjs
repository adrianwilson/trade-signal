#!/usr/bin/env node

/**
 * ADW Plan - Planning only
 *
 * Usage: node adws/adw-plan.mjs <issue-number> [adw-id]
 *
 * Workflow:
 * 1. Fetch GitHub issue details
 * 2. Classify issue type
 * 3. Create feature branch
 * 4. Generate implementation plan
 * 5. Commit plan
 * 6. Push and create/update PR
 */

import { ADWState } from './adw-modules/state.mjs';
import { createBranch, commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { fetchIssue, makeIssueComment, getRepoUrl, extractRepoPath } from './adw-modules/github.mjs';
import {
  classifyIssue,
  buildPlan,
  getPlanFile,
  generateBranchName,
  createCommit,
  formatIssueMessage,
  ensureAdwId,
  AGENT_PLANNER,
} from './adw-modules/workflow-ops.mjs';
import { setupLogger } from './adw-modules/utils.mjs';

function checkError(result, issueNumber, adwId, agent, prefix, logger) {
  const error = result?.error || (!result?.success && result?.output) || null;
  if (error) {
    logger.error(`${prefix}: ${error}`);
    makeIssueComment(issueNumber, formatIssueMessage(adwId, agent, `\u274C ${prefix}: ${error}`));
    process.exit(1);
  }
}

// Parse args
const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-plan.mjs <issue-number> [adw-id]');
  process.exit(1);
}

const adwId = ensureAdwId(issueNumber, process.argv[3] || null);
const state = ADWState.load(adwId) || new ADWState(adwId);
state.update({ issue_number: issueNumber });

const logger = setupLogger(adwId, 'adw_plan');
logger.info(`ADW Plan starting - ID: ${adwId}, Issue: ${issueNumber}`);

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

let repoPath;
try {
  repoPath = extractRepoPath(getRepoUrl());
} catch (e) {
  logger.error(`Error getting repo URL: ${e.message}`);
  process.exit(1);
}

// Fetch issue
const issue = fetchIssue(issueNumber, repoPath);
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting planning phase'));

// Classify
const classResult = classifyIssue(issue, adwId, logger);
checkError(classResult, issueNumber, adwId, 'ops', 'Error classifying issue', logger);
state.update({ issue_class: classResult.command });
state.save('adw_plan');
logger.info(`Issue classified as: ${classResult.command}`);
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', `\u2705 Classified as: ${classResult.command}`));

// Branch
const branchResult = generateBranchName(issue, classResult.command, adwId, logger);
checkError(branchResult, issueNumber, adwId, 'ops', 'Error generating branch', logger);

const createResult = createBranch(branchResult.branchName);
checkError(createResult, issueNumber, adwId, 'ops', 'Error creating branch', logger);

state.update({ branch_name: branchResult.branchName });
state.save('adw_plan');
logger.info(`Working on branch: ${branchResult.branchName}`);
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', `\u2705 Branch: ${branchResult.branchName}`));

// Plan
logger.info('Building implementation plan');
makeIssueComment(issueNumber, formatIssueMessage(adwId, AGENT_PLANNER, '\u2705 Building plan'));

const planResponse = buildPlan(issue, classResult.command, adwId, logger);
checkError(planResponse, issueNumber, adwId, AGENT_PLANNER, 'Error building plan', logger);
makeIssueComment(issueNumber, formatIssueMessage(adwId, AGENT_PLANNER, '\u2705 Plan created'));

// Find plan file
const planFileResult = getPlanFile(planResponse.output, issueNumber, adwId, logger);
checkError(planFileResult, issueNumber, adwId, 'ops', 'Error finding plan file', logger);

state.update({ plan_file: planFileResult.planFile });
state.save('adw_plan');
logger.info(`Plan file: ${planFileResult.planFile}`);
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', `\u2705 Plan: ${planFileResult.planFile}`));

// Commit plan
const commitResult = createCommit(AGENT_PLANNER, issue, classResult.command, adwId, logger);
checkError(commitResult, issueNumber, adwId, AGENT_PLANNER, 'Error committing plan', logger);

const gitCommit = commitChanges(commitResult.commitMessage);
checkError(gitCommit, issueNumber, adwId, AGENT_PLANNER, 'Error committing', logger);

// Push and PR
finalizeGitOperations(state, logger);

logger.info('Planning phase completed');
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Planning phase completed'));
state.save('adw_plan');

// Output state for piping
state.toStdout();
