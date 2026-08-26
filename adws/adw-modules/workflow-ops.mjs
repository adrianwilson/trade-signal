/**
 * Core workflow operations for composable ADW scripts.
 */

import { executeTemplate } from './agent.mjs';
import { ADWState } from './state.mjs';
import { makeAdwId, parseJson } from './utils.mjs';

export const AGENT_PLANNER = 'sdlc_planner';
export const AGENT_IMPLEMENTOR = 'sdlc_implementor';
export const AGENT_TESTER = 'test_runner';

export function formatIssueMessage(adwId, agentName, message, sessionId) {
  const prefix = sessionId
    ? `${adwId}_${agentName}_${sessionId}`
    : `${adwId}_${agentName}`;
  return `${prefix}: ${message}`;
}

/**
 * Classify a GitHub issue into /feature, /bug, /chore, /refactor.
 * @returns {{ command: string|null, error: string|null }}
 */
export function classifyIssue(issue, adwId, logger) {
  const minimalIssue = JSON.stringify({
    number: issue.number,
    title: issue.title,
    body: issue.body,
  });

  const response = executeTemplate({
    agentName: 'issue_classifier',
    slashCommand: '/classify_issue',
    args: [minimalIssue],
    adwId,
    model: 'sonnet',
  });

  if (!response.success) return { command: null, error: response.output };

  const output = response.output.trim();
  const match = output.match(/\/(chore|bug|feature|refactor)/);
  const command = match ? `/${match[1]}` : output;

  if (command === '0') return { command: null, error: `No command selected: ${output}` };
  if (!['/chore', '/bug', '/feature', '/refactor'].includes(command)) {
    return { command: null, error: `Invalid command: ${output}` };
  }

  return { command, error: null };
}

/**
 * Build implementation plan for the issue.
 */
export function buildPlan(issue, command, adwId, logger) {
  return executeTemplate({
    agentName: AGENT_PLANNER,
    slashCommand: command,
    args: [`${issue.number}`, adwId, JSON.stringify(issue)],
    adwId,
    model: 'opus',
  });
}

/**
 * Find the plan file that was just created.
 * @returns {{ planFile: string|null, error: string|null }}
 */
export function getPlanFile(planOutput, issueNumber, adwId, logger) {
  const response = executeTemplate({
    agentName: 'plan_finder',
    slashCommand: '/find_plan_file',
    args: [issueNumber, adwId, planOutput],
    adwId,
    model: 'sonnet',
  });

  if (!response.success) return { planFile: null, error: response.output };

  const filePath = response.output.trim();
  if (filePath && filePath !== '0' && filePath.includes('/')) {
    return { planFile: filePath, error: null };
  }
  return { planFile: null, error: `Invalid plan file path: ${filePath}` };
}

/**
 * Implement the plan using /implement.
 */
export function implementPlan(planFile, adwId, logger) {
  return executeTemplate({
    agentName: AGENT_IMPLEMENTOR,
    slashCommand: '/implement',
    args: [planFile],
    adwId,
    model: 'opus',
  });
}

/**
 * Generate a branch name for the issue.
 * @returns {{ branchName: string|null, error: string|null }}
 */
export function generateBranchName(issue, issueClass, adwId, logger) {
  const issueType = issueClass.replace('/', '');

  const response = executeTemplate({
    agentName: 'branch_generator',
    slashCommand: '/generate_branch_name',
    args: [issueType, JSON.stringify(issue)],
    adwId,
    model: 'sonnet',
  });

  if (!response.success) return { branchName: null, error: response.output };
  return { branchName: response.output.trim(), error: null };
}

/**
 * Create a commit with a formatted message.
 * @returns {{ commitMessage: string|null, error: string|null }}
 */
export function createCommit(agentName, issue, issueClass, adwId, logger) {
  const issueType = issueClass.replace('/', '');

  const response = executeTemplate({
    agentName: `${agentName}_committer`,
    slashCommand: '/commit',
    args: [issueType, JSON.stringify(issue)],
    adwId,
    model: 'sonnet',
  });

  if (!response.success) return { commitMessage: null, error: response.output };
  return { commitMessage: response.output.trim(), error: null };
}

/**
 * Create a pull request for the implemented changes.
 * @returns {{ prUrl: string|null, error: string|null }}
 */
export function createPullRequest(branchName, issue, state, logger) {
  const planFile = state.get('plan_file') || 'No plan file (test run)';
  const adwId = state.get('adw_id');
  const issueJson = typeof issue === 'string' ? issue : JSON.stringify(issue);

  const response = executeTemplate({
    agentName: 'pr_creator',
    slashCommand: '/pull_request',
    args: [branchName, issueJson, planFile, adwId],
    adwId,
    model: 'sonnet',
  });

  if (!response.success) return { prUrl: null, error: response.output };
  return { prUrl: response.output.trim(), error: null };
}

/**
 * Get or create an ADW ID and initialize state.
 */
export function ensureAdwId(issueNumber, adwId, logger) {
  if (adwId) {
    const state = ADWState.load(adwId);
    if (state) {
      if (logger) logger.info(`Found existing ADW state for ID: ${adwId}`);
      return adwId;
    }
    const newState = new ADWState(adwId);
    newState.update({ adw_id: adwId, issue_number: issueNumber });
    newState.save('ensureAdwId');
    return adwId;
  }

  const newAdwId = makeAdwId();
  const newState = new ADWState(newAdwId);
  newState.update({ adw_id: newAdwId, issue_number: issueNumber });
  newState.save('ensureAdwId');
  if (logger) logger.info(`Created new ADW ID: ${newAdwId}`);
  return newAdwId;
}

/**
 * Run the /test command and return results.
 */
export function runTests(adwId, logger) {
  return executeTemplate({
    agentName: AGENT_TESTER,
    slashCommand: '/test',
    args: [],
    adwId,
    model: 'sonnet',
  });
}

/**
 * Resolve a failed test.
 */
export function resolveFailedTest(testResult, adwId, logger) {
  return executeTemplate({
    agentName: 'test_resolver',
    slashCommand: '/resolve_failed_test',
    args: [JSON.stringify(testResult)],
    adwId,
    model: 'opus',
  });
}
