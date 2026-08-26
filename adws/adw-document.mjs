#!/usr/bin/env node

/**
 * ADW Document - Auto-generate documentation from implementation
 *
 * Usage: node adws/adw-document.mjs <issue-number> <adw-id>
 *
 * Workflow:
 * 1. Find spec file from state
 * 2. Run /document to generate docs from git diff + spec
 * 3. Commit documentation
 * 4. Push
 */

import { ADWState } from './adw-modules/state.mjs';
import { commitChanges, finalizeGitOperations } from './adw-modules/git-ops.mjs';
import { makeIssueComment, getRepoUrl, extractRepoPath, fetchIssue } from './adw-modules/github.mjs';
import { executeTemplate } from './adw-modules/agent.mjs';
import { createCommit, formatIssueMessage, ensureAdwId } from './adw-modules/workflow-ops.mjs';
import { setupLogger } from './adw-modules/utils.mjs';

const AGENT_DOCUMENTER = 'documenter';

const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-document.mjs <issue-number> <adw-id>');
  process.exit(1);
}

const adwId = ensureAdwId(issueNumber, process.argv[3] || null);
const state = ADWState.load(adwId) || new ADWState(adwId);
state.update({ issue_number: issueNumber });

const logger = setupLogger(adwId, 'adw_document');
logger.info(`ADW Document starting - ID: ${adwId}, Issue: ${issueNumber}`);

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const specFile = state.get('plan_file') || '';

makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Starting documentation phase'));

// Run /document
const docResponse = executeTemplate({
  agentName: AGENT_DOCUMENTER,
  slashCommand: '/document',
  args: [adwId, specFile].filter(Boolean),
  adwId,
  model: 'sonnet',
});

if (!docResponse.success) {
  logger.error(`Documentation failed: ${docResponse.output}`);
  makeIssueComment(
    issueNumber,
    formatIssueMessage(adwId, AGENT_DOCUMENTER, `\u274C Documentation failed: ${docResponse.output}`),
  );
  process.exit(1);
}

const docFile = docResponse.output.trim();
logger.info(`Documentation created: ${docFile}`);
makeIssueComment(
  issueNumber,
  formatIssueMessage(adwId, AGENT_DOCUMENTER, `\u2705 Documentation created: ${docFile}`),
);

// Commit
const repoPath = extractRepoPath(getRepoUrl());
const issue = fetchIssue(issueNumber, repoPath);
const issueCommand = state.get('issue_class') || '/feature';

const commitResult = createCommit(AGENT_DOCUMENTER, issue, issueCommand, adwId, logger);
if (commitResult.commitMessage) {
  const gitCommit = commitChanges(commitResult.commitMessage);
  if (gitCommit.success) {
    logger.info(`Committed docs: ${commitResult.commitMessage}`);
  }
}

finalizeGitOperations(state, logger);

logger.info('Documentation phase completed');
makeIssueComment(issueNumber, formatIssueMessage(adwId, 'ops', '\u2705 Documentation phase completed'));
state.save('adw_document');
