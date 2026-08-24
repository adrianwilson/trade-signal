#!/usr/bin/env node

/**
 * ADW Plan & Build - AI Developer Workflow
 *
 * Usage: node adws/adw-plan-build.mjs <github-issue-number> [adw-id]
 *
 * Workflow:
 * 1. Fetch GitHub issue details
 * 2. Classify issue type (feature/bug/chore/refactor)
 * 3. Create feature branch
 * 4. Plan Agent: generate implementation plan
 * 5. Build Agent: implement the solution
 * 6. Commit and create PR
 */

import { executeTemplate } from './agent.mjs';
import {
  getRepoUrl,
  extractRepoPath,
  fetchIssue,
  makeIssueComment,
} from './github.mjs';
import { makeAdwId, setupLogger } from './utils.mjs';

const AGENT_PLANNER = 'sdlc_planner';
const AGENT_IMPLEMENTOR = 'sdlc_implementor';

function formatMsg(adwId, agent, msg, sessionId) {
  const prefix = sessionId
    ? `${adwId}_${agent}_${sessionId}`
    : `${adwId}_${agent}`;
  return `${prefix}: ${msg}`;
}

function checkError(errorOrResponse, issueNumber, adwId, agent, prefix, logger) {
  let error = null;
  if (errorOrResponse && typeof errorOrResponse === 'object' && 'success' in errorOrResponse) {
    if (!errorOrResponse.success) error = errorOrResponse.output;
  } else {
    error = errorOrResponse;
  }

  if (error) {
    logger.error(`${prefix}: ${error}`);
    makeIssueComment(
      issueNumber,
      formatMsg(adwId, agent, `\u274C ${prefix}: ${error}`),
    );
    process.exit(1);
  }
}

// Parse args
const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-plan-build.mjs <issue-number> [adw-id]');
  process.exit(1);
}
const adwId = process.argv[3] || makeAdwId();
const logger = setupLogger(adwId, 'adw_plan_build');
logger.info(`ADW ID: ${adwId}`);

// Validate env
if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

// Get repo info
let repoPath;
try {
  repoPath = extractRepoPath(getRepoUrl());
} catch (e) {
  logger.error(`Error getting repo URL: ${e.message}`);
  process.exit(1);
}

// Fetch issue
const issue = fetchIssue(issueNumber, repoPath);
logger.debug(`issue: ${JSON.stringify(issue, null, 2)}`);
makeIssueComment(
  issueNumber,
  formatMsg(adwId, 'ops', '\u2705 Starting ADW workflow'),
);

// 1. Classify issue
const classifyResponse = executeTemplate({
  agentName: 'issue_classifier',
  slashCommand: '/classify_issue',
  args: [JSON.stringify(issue)],
  adwId,
  model: 'sonnet',
});
checkError(classifyResponse, issueNumber, adwId, 'ops', 'Error classifying issue', logger);

const issueCommand = classifyResponse.output.trim();
if (issueCommand === '0' || !['/chore', '/bug', '/feature', '/refactor'].includes(issueCommand)) {
  logger.error(`Invalid command: ${issueCommand}`);
  makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u274C Invalid classification: ${issueCommand}`));
  process.exit(1);
}
logger.info(`Issue classified as: ${issueCommand}`);
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u2705 Issue classified as: ${issueCommand}`));

// 2. Create branch
const branchResponse = executeTemplate({
  agentName: 'branch_generator',
  slashCommand: '/generate_branch_name',
  args: [issueCommand.replace('/', ''), JSON.stringify(issue)],
  adwId,
  model: 'sonnet',
});
checkError(branchResponse, issueNumber, adwId, 'ops', 'Error creating branch', logger);

const branchName = branchResponse.output.trim();
logger.info(`Working on branch: ${branchName}`);
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u2705 Working on branch: ${branchName}`));

// 3. Build plan
logger.info('\n=== Building implementation plan ===');
makeIssueComment(issueNumber, formatMsg(adwId, AGENT_PLANNER, '\u2705 Building implementation plan'));

const planResponse = executeTemplate({
  agentName: AGENT_PLANNER,
  slashCommand: issueCommand,
  args: [`${issue.title}: ${issue.body}`],
  adwId,
  model: 'sonnet',
});
checkError(planResponse, issueNumber, adwId, AGENT_PLANNER, 'Error building plan', logger);
makeIssueComment(issueNumber, formatMsg(adwId, AGENT_PLANNER, '\u2705 Implementation plan created'));

// 4. Find plan file
const findResponse = executeTemplate({
  agentName: 'plan_finder',
  slashCommand: '/find_plan_file',
  args: [planResponse.output],
  adwId,
  model: 'sonnet',
});
checkError(findResponse, issueNumber, adwId, 'ops', 'Error finding plan file', logger);

const planFilePath = findResponse.output.trim();
if (!planFilePath || planFilePath === '0' || !planFilePath.includes('/')) {
  logger.error(`Invalid plan file path: ${planFilePath}`);
  makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u274C Plan file not found: ${planFilePath}`));
  process.exit(1);
}
logger.info(`Plan file: ${planFilePath}`);
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u2705 Plan file created: ${planFilePath}`));

// 5. Commit plan
logger.info('\n=== Committing plan ===');
const planCommitResponse = executeTemplate({
  agentName: `${AGENT_PLANNER}_committer`,
  slashCommand: '/commit',
  args: [issueCommand.replace('/', ''), JSON.stringify(issue)],
  adwId,
  model: 'sonnet',
});
checkError(planCommitResponse, issueNumber, adwId, AGENT_PLANNER, 'Error committing plan', logger);

// 6. Implement
logger.info('\n=== Implementing solution ===');
makeIssueComment(issueNumber, formatMsg(adwId, AGENT_IMPLEMENTOR, '\u2705 Implementing solution'));

const implementResponse = executeTemplate({
  agentName: AGENT_IMPLEMENTOR,
  slashCommand: '/implement',
  args: [planFilePath],
  adwId,
  model: 'sonnet',
});
checkError(implementResponse, issueNumber, adwId, AGENT_IMPLEMENTOR, 'Error implementing', logger);
makeIssueComment(issueNumber, formatMsg(adwId, AGENT_IMPLEMENTOR, '\u2705 Solution implemented'));

// 7. Commit implementation
logger.info('\n=== Committing implementation ===');
const implCommitResponse = executeTemplate({
  agentName: `${AGENT_IMPLEMENTOR}_committer`,
  slashCommand: '/commit',
  args: [issueCommand.replace('/', ''), JSON.stringify(issue)],
  adwId,
  model: 'sonnet',
});
checkError(implCommitResponse, issueNumber, adwId, AGENT_IMPLEMENTOR, 'Error committing', logger);

// 8. Create PR
logger.info('\n=== Creating pull request ===');
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', '\u2705 Creating pull request'));

const prResponse = executeTemplate({
  agentName: 'pr_creator',
  slashCommand: '/pull_request',
  args: [branchName, JSON.stringify(issue), planFilePath, adwId],
  adwId,
  model: 'sonnet',
});
checkError(prResponse, issueNumber, adwId, 'ops', 'Error creating PR', logger);

const prUrl = prResponse.output.trim();
logger.info(`Pull request created: ${prUrl}`);
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', `\u2705 Pull request created: ${prUrl}`));
makeIssueComment(issueNumber, formatMsg(adwId, 'ops', '\u2705 ADW workflow completed successfully'));
