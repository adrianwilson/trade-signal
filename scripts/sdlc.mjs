#!/usr/bin/env node

/**
 * SDLC Pipeline - Local Isolated Execution
 *
 * Each phase runs as a separate `claude -p` call with its own context window.
 * Structured JSON output pipes between steps.
 * All agent input/output is logged to agents/{adw-id}/ for traceability.
 *
 * Usage: node scripts/sdlc.mjs <issue-number> [--zte]
 *
 * Flags:
 *   --zte  Zero Touch Execution: auto-merge PR if all phases pass
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

// --- Args ---

const args = process.argv.slice(2);
const zte = args.includes('--zte');
const issueNumber = args.find((a) => a !== '--zte');

if (!issueNumber) {
  console.error('Usage: node scripts/sdlc.mjs <issue-number> [--zte]');
  process.exit(1);
}

const adwId = randomBytes(4).toString('hex');
const agentsDir = join('agents', adwId);
mkdirSync(agentsDir, { recursive: true });

// --- Helpers ---

function log(msg) {
  console.log(msg);
}

function heading(title) {
  log(`\n=== ${title} ===`);
}

function exec(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

function hasUncommittedChanges() {
  return exec('git status --porcelain').length > 0;
}

function saveState(state) {
  writeFileSync(join(agentsDir, 'state.json'), JSON.stringify(state, null, 2));
}

function runPhase(phaseName, agentName, prompt) {
  const phaseDir = join(agentsDir, agentName);
  mkdirSync(phaseDir, { recursive: true });

  writeFileSync(join(phaseDir, 'input.txt'), prompt);

  let fullOutput;
  try {
    fullOutput = execSync(
      `claude -p ${JSON.stringify(prompt)} --dangerously-skip-permissions --output-format json`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
  } catch (err) {
    writeFileSync(join(phaseDir, 'stderr.log'), err.stderr || '');
    throw new Error(`Phase "${phaseName}" failed: ${err.message}`);
  }

  writeFileSync(join(phaseDir, 'output.json'), fullOutput);

  const parsed = JSON.parse(fullOutput);
  const result = parsed.result ?? '';
  writeFileSync(join(phaseDir, 'result.txt'), result);

  const meta = {
    phase: phaseName,
    agent: agentName,
    cost_usd: parsed.total_cost_usd ?? 'unknown',
    duration_ms: parsed.duration_ms ?? 'unknown',
    num_turns: parsed.num_turns ?? 'unknown',
    timestamp: new Date().toISOString(),
  };
  writeFileSync(join(phaseDir, 'meta.json'), JSON.stringify(meta, null, 2));

  log(
    `${phaseName}: cost=$${meta.cost_usd}, turns=${meta.num_turns}, duration=${meta.duration_ms}ms`,
  );

  return result;
}

function commitPhase(phaseName, agentName, issueClass, issueJson) {
  if (hasUncommittedChanges()) {
    heading(`${phaseName}: Commit`);
    runPhase(
      phaseName,
      agentName,
      `/commit ${agentName.replace('_committer', '')} ${issueClass} '${issueJson}'`,
    );
    log(`${phaseName} committed`);
  }
}

// --- Pipeline ---

log(`SDLC Pipeline - Issue: #${issueNumber}, ADW ID: ${adwId}`);
log(`Logs: ${agentsDir}/`);
log('==================================================');

saveState({
  adw_id: adwId,
  issue_number: issueNumber,
  started: new Date().toISOString(),
});

// Fetch issue
const issueJson = exec(
  `gh issue view ${issueNumber} --json number,title,body,state,labels`,
);
writeFileSync(join(agentsDir, 'issue.json'), issueJson);

const issueTitle = JSON.parse(issueJson).title;
log(`Issue: ${issueTitle}\n`);

// Phase 1: Classify
heading('Phase 1: Classify');
const classification = runPhase(
  'classify',
  'issue_classifier',
  `/classify_issue ${issueJson}`,
);
log(`Classification: ${classification}\n`);

const validClasses = ['/feature', '/bug', '/chore', '/refactor'];
if (!validClasses.includes(classification)) {
  console.error(`ERROR: Invalid classification: ${classification}`);
  process.exit(1);
}

const issueClass = classification.replace('/', '');
saveState({
  adw_id: adwId,
  issue_number: issueNumber,
  issue_class: classification,
});

// Phase 2: Branch
heading('Phase 2: Branch');
const branchName = runPhase(
  'branch',
  'branch_generator',
  `/generate_branch_name ${issueClass} ${adwId} '${issueJson}'`,
);
log(`Branch: ${branchName}\n`);

saveState({
  adw_id: adwId,
  issue_number: issueNumber,
  issue_class: classification,
  branch_name: branchName,
});

// Phase 3: Plan
heading('Phase 3: Plan');
const specFile = runPhase(
  'plan',
  'sdlc_planner',
  `${classification} ${issueNumber} ${adwId} '${issueJson}'`,
);
log(`Spec: ${specFile}\n`);

saveState({
  adw_id: adwId,
  issue_number: issueNumber,
  issue_class: classification,
  branch_name: branchName,
  plan_file: specFile,
});

// Phase 3b: Commit plan
commitPhase('commit_plan', 'sdlc_planner_committer', issueClass, issueJson);

// Phase 4: Implement
heading('Phase 4: Implement');
runPhase('implement', 'sdlc_implementor', `/implement ${specFile}`);
log('Implementation complete\n');

// Phase 4b: Commit implementation
commitPhase('commit_impl', 'sdlc_implementor_committer', issueClass, issueJson);

// Phase 5: Test with retry loop
heading('Phase 5: Test');
let testsPassed = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  log(`Test attempt ${attempt}/3`);
  const testResult = runPhase(
    `test_attempt_${attempt}`,
    `test_runner_${attempt}`,
    '/test',
  );

  let failedCount = 1; // default to failed if parse fails
  try {
    const jsonMatch = testResult.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : testResult);
    failedCount = parsed.filter((t) => !t.passed).length;
  } catch {
    // If we can't parse the result, assume failure
  }

  if (failedCount === 0) {
    log('All tests passed');
    testsPassed = true;
    break;
  }

  log(`${failedCount} test(s) failed`);
  if (attempt < 3) {
    log('Resolving failures...');
    runPhase(
      `resolve_attempt_${attempt}`,
      `test_resolver_${attempt}`,
      `/resolve_failed_test ${testResult}`,
    );
  }
}

// Phase 5b: Commit test fixes
commitPhase('commit_test', 'test_runner_committer', issueClass, issueJson);

// Phase 6: Review with retry loop
heading('Phase 6: Review');
let reviewPassed = false;
for (let cycle = 1; cycle <= 2; cycle++) {
  log(`Review cycle ${cycle}/2`);
  const reviewResult = runPhase(
    `review_cycle_${cycle}`,
    `review_agent_${cycle}`,
    `/review ${adwId} ${specFile}`,
  );

  let success = false; // default to failed if parse fails
  try {
    const jsonMatch = reviewResult.match(/\{[\s\S]*\}/);
    success = JSON.parse(jsonMatch ? jsonMatch[0] : reviewResult).success;
  } catch {
    // If we can't parse the result, assume failure
  }

  if (success) {
    log('Review passed');
    reviewPassed = true;
    break;
  }

  log('Review found issues');
  if (cycle < 2) {
    try {
      const parsed = JSON.parse(reviewResult);
      const blockers = (parsed.review_issues || []).filter(
        (i) => i.severity === 'blocker',
      );
      if (blockers.length > 0) {
        log('Patching blockers...');
        const patchFile = runPhase(
          `patch_cycle_${cycle}`,
          `patch_agent_${cycle}`,
          `/patch ${adwId} '${JSON.stringify(blockers)}' ${specFile}`,
        );
        runPhase(
          `patch_impl_${cycle}`,
          `patch_implementor_${cycle}`,
          `/implement ${patchFile}`,
        );
      }
    } catch {
      // Review output wasn't valid JSON, skip patching
    }
  }
}

// Phase 6b: Commit review fixes
commitPhase('commit_review', 'review_agent_committer', issueClass, issueJson);

// Phase 7: Document
heading('Phase 7: Document');
const docFile = runPhase(
  'document',
  'documenter',
  `/document ${adwId} ${specFile}`,
);
log(`Documentation: ${docFile}\n`);

// Phase 7b: Commit documentation
commitPhase('commit_docs', 'documenter_committer', issueClass, issueJson);

// Phase 8: Finalize spec
heading('Phase 8: Finalize');
runPhase('finalize', 'spec_finalizer', `/finalize ${specFile}`);
log(`Spec finalized: ${specFile}\n`);

// Phase 8b: Commit finalized spec
commitPhase(
  'commit_finalize',
  'spec_finalizer_committer',
  issueClass,
  issueJson,
);

// Phase 9: Ship
heading('Phase 9: Ship');
const prUrl = runPhase(
  'ship',
  'pr_creator',
  `/pull_request ${branchName} '${issueJson}' ${specFile} ${adwId}`,
);
log(`PR: ${prUrl}\n`);

// Phase 10: Track KPIs
heading('Phase 10: Track KPIs');
const stateForKpis = JSON.stringify({
  adw_id: adwId,
  issue_number: issueNumber,
  issue_class: classification,
  plan_file: specFile,
});
runPhase('track_kpis', 'kpi_tracker', `/track_agentic_kpis ${stateForKpis}`);
log('KPIs updated: app_docs/agentic_kpis.md\n');

// Commit KPI update
commitPhase('commit_kpis', 'kpi_committer', issueClass, issueJson);

// Phase 11: Zero Touch Execution
let merged = false;
if (zte) {
  heading('Phase 11: ZTE (Auto-Merge)');
  if (testsPassed && reviewPassed) {
    log('All checks passed. Merging to main...');
    exec('git checkout main');
    exec('git pull origin main');
    exec(`git merge ${branchName} --no-edit`);
    exec('git push origin main');
    merged = true;
    log(`Merged ${branchName} to main`);
  } else {
    log('SKIPPED: Tests or review did not pass. PR created but not merged.');
  }
}

// Final state
saveState({
  adw_id: adwId,
  issue_number: issueNumber,
  issue_class: classification,
  branch_name: branchName,
  plan_file: specFile,
  tests_passed: testsPassed,
  review_passed: reviewPassed,
  doc_file: docFile,
  pr_url: prUrl,
  merged,
  zte,
  completed: new Date().toISOString(),
});

// Summary
log('==================================================');
log('SDLC Complete');
log(`  Issue:          #${issueNumber}`);
log(`  Classification: ${classification}`);
log(`  Branch:         ${branchName}`);
log(`  Spec:           ${specFile}`);
log(`  Tests:          ${testsPassed ? 'PASSED' : 'FAILED'}`);
log(`  Review:         ${reviewPassed ? 'PASSED' : 'FAILED'}`);
log(`  Documentation:  ${docFile}`);
log(`  PR:             ${prUrl}`);
log(`  Merged:         ${merged ? 'YES' : 'NO'}`);
log(`  ADW ID:         ${adwId}`);
log(`  Logs:           ${agentsDir}/`);
