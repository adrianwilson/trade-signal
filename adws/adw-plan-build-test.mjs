#!/usr/bin/env node

/**
 * ADW Plan + Build + Test - Full autonomous pipeline
 *
 * Usage: node adws/adw-plan-build-test.mjs <issue-number> [adw-id]
 *
 * Runs the complete pipeline:
 * 1. Plan (classify, branch, spec)
 * 2. Build (implement the spec)
 * 3. Test (run tests, auto-fix failures)
 * 4. Push and create PR
 */

import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { makeAdwId } from './adw-modules/utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const issueNumber = process.argv[2];
if (!issueNumber) {
  console.error('Usage: node adws/adw-plan-build-test.mjs <issue-number> [adw-id]');
  process.exit(1);
}

const adwId = process.argv[3] || makeAdwId();
console.log(`ADW Plan+Build+Test - ID: ${adwId}, Issue: ${issueNumber}`);

// Step 1: Plan
console.log('\n=== PHASE 1: PLAN ===');
try {
  execFileSync('node', [join(__dirname, 'adw-plan.mjs'), issueNumber, adwId], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
} catch (e) {
  console.error('Plan phase failed');
  process.exit(1);
}

// Step 2: Build
console.log('\n=== PHASE 2: BUILD ===');
try {
  execFileSync('node', [join(__dirname, 'adw-build.mjs'), issueNumber, adwId], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
} catch (e) {
  console.error('Build phase failed');
  process.exit(1);
}

// Step 3: Test
console.log('\n=== PHASE 3: TEST ===');
try {
  execFileSync('node', [join(__dirname, 'adw-test.mjs'), issueNumber, adwId], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
} catch (e) {
  console.error('Test phase failed (some tests may have failed)');
  process.exit(1);
}

console.log(`\nADW Plan+Build+Test completed for issue #${issueNumber} (ADW ID: ${adwId})`);
