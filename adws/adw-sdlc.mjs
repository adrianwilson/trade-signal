#!/usr/bin/env node

/**
 * ADW SDLC - Complete Software Development Life Cycle
 *
 * Usage: node adws/adw-sdlc.mjs <issue-number> [adw-id]
 *
 * Runs: Plan -> Build -> Test -> Review -> Document
 */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { makeAdwId } from './adw-modules/utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-sdlc.mjs <issue-number> [adw-id]');
  console.error('\nRuns the complete SDLC: Plan -> Build -> Test -> Review -> Document');
  process.exit(1);
}

const adwId = process.argv[3] || makeAdwId();
console.log(`ADW SDLC - ID: ${adwId}, Issue: ${issueNumber}`);

const steps = [
  { name: 'PLAN', script: 'adw-plan.mjs' },
  { name: 'BUILD', script: 'adw-build.mjs' },
  { name: 'TEST', script: 'adw-test.mjs' },
  { name: 'REVIEW', script: 'adw-review.mjs' },
  { name: 'DOCUMENT', script: 'adw-document.mjs' },
];

for (const step of steps) {
  console.log(`\n=== ${step.name} PHASE ===`);
  try {
    execFileSync('node', [join(__dirname, step.script), issueNumber, adwId], {
      stdio: 'inherit',
      encoding: 'utf8',
    });
  } catch {
    console.error(`${step.name} phase failed`);
    process.exit(1);
  }
}

console.log(`\nSDLC completed for issue #${issueNumber} (ADW ID: ${adwId})`);
