#!/usr/bin/env node

/**
 * Health Check Script for ADW System
 *
 * Usage: node adws/health-check.mjs [issue_number]
 *
 * Validates: environment variables, git repo, GitHub CLI, Claude Code CLI.
 */

import { execFileSync } from 'child_process';
import { getRepoUrl, extractRepoPath, makeIssueComment } from './github.mjs';

function checkEnvVars() {
  const missing = [];
  const optional = [];

  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.GITHUB_PAT) optional.push('GITHUB_PAT (optional)');

  return {
    success: missing.length === 0,
    error: missing.length ? 'Missing required environment variables' : null,
    details: {
      missingRequired: missing,
      missingOptional: optional,
      claudeCodePath: process.env.CLAUDE_CODE_PATH || 'claude',
    },
  };
}

function checkGitRepo() {
  try {
    const url = getRepoUrl();
    const path = extractRepoPath(url);
    return { success: true, details: { repoUrl: url, repoPath: path } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function checkGitHubCli() {
  try {
    execFileSync('gh', ['--version'], { encoding: 'utf8' });
    const env = process.env.GITHUB_PAT
      ? { ...process.env, GH_TOKEN: process.env.GITHUB_PAT }
      : undefined;
    execFileSync('gh', ['auth', 'status'], { encoding: 'utf8', env });
    return { success: true, details: { installed: true, authenticated: true } };
  } catch {
    return {
      success: false,
      error: 'GitHub CLI not installed or not authenticated',
      details: { installed: false },
    };
  }
}

function checkClaudeCode() {
  const claudePath = process.env.CLAUDE_CODE_PATH || 'claude';
  try {
    execFileSync(claudePath, ['--version'], { encoding: 'utf8' });
    return { success: true, details: { path: claudePath } };
  } catch {
    return {
      success: false,
      error: `Claude Code CLI not found at '${claudePath}'`,
    };
  }
}

function checkNodeNx() {
  try {
    const nodeVersion = execFileSync('node', ['--version'], {
      encoding: 'utf8',
    }).trim();
    execFileSync('npx', ['nx', '--version'], { encoding: 'utf8' });
    return { success: true, details: { nodeVersion } };
  } catch {
    return { success: false, error: 'Node.js or Nx not available' };
  }
}

function runHealthCheck() {
  const checks = {
    environment: checkEnvVars(),
    git_repository: checkGitRepo(),
    github_cli: checkGitHubCli(),
    claude_code: checkClaudeCode(),
    node_nx: checkNodeNx(),
  };

  const success = Object.values(checks).every((c) => c.success);
  const errors = Object.values(checks)
    .filter((c) => c.error)
    .map((c) => c.error);

  return { success, timestamp: new Date().toISOString(), checks, errors };
}

// Main
const result = runHealthCheck();
const status = result.success ? 'HEALTHY' : 'UNHEALTHY';
const icon = result.success ? '\u2705' : '\u274C';

console.log(`${icon} Overall Status: ${status}`);
console.log(`Timestamp: ${result.timestamp}\n`);
console.log('Check Results:');
console.log('-'.repeat(50));

for (const [name, check] of Object.entries(result.checks)) {
  const s = check.success ? '\u2705' : '\u274C';
  console.log(`\n${s} ${name.replace(/_/g, ' ')}:`);
  if (check.details) {
    for (const [k, v] of Object.entries(check.details)) {
      if (v !== null && v !== undefined) console.log(`   ${k}: ${v}`);
    }
  }
  if (check.error) console.log(`   Error: ${check.error}`);
}

if (result.errors.length) {
  console.log('\nErrors:');
  result.errors.forEach((e) => console.log(`   - ${e}`));
}

// Post to issue if number provided
const issueNumber = process.argv[2];
if (issueNumber) {
  const comment = `${icon} Health check: ${status}`;
  try {
    makeIssueComment(issueNumber, comment);
    console.log(`\nPosted health check to issue #${issueNumber}`);
  } catch (e) {
    console.error(`Failed to post comment: ${e.message}`);
  }
}

process.exit(result.success ? 0 : 1);
