import { Injectable, Logger } from '@nestjs/common';
import { NotifierService } from '../notifier/notifier.service';
import { MemoryService } from '../memory/memory.service';
import { execSync, spawn } from 'child_process';
import { randomUUID } from 'crypto';

const REPO_DIR =
  process.env['REPO_DIR'] || '/Users/adrian/Documents/git/trade-signal';
const MIN_URGENCY = 1.5; // Only investigate if Jev urgency >= 1.5

interface InvestigationRequest {
  checkName: string;
  message: string;
  severity: string;
  jevUrgency: number;
}

@Injectable()
export class InvestigatorService {
  private readonly logger = new Logger(InvestigatorService.name);
  private investigating = false;

  constructor(
    private readonly notifier: NotifierService,
    private readonly memory: MemoryService,
  ) {}

  async investigate(request: InvestigationRequest): Promise<void> {
    if (request.jevUrgency < MIN_URGENCY) {
      this.logger.debug(
        `Skipping investigation: urgency ${request.jevUrgency} < ${MIN_URGENCY}`,
      );
      return;
    }

    if (this.investigating) {
      this.logger.debug('Investigation already in progress — skipping');
      return;
    }

    this.investigating = true;
    const id = randomUUID().slice(0, 8);
    const branch = `fix/agent-${request.checkName}-${id}`;

    try {
      this.logger.log(
        `Starting investigation: ${request.checkName} — ${request.message}`,
      );

      await this.notifier.notify(
        `🔍 Investigating: ${request.checkName}`,
        `Agent is looking into: ${request.message}`,
        'info',
        'ops',
      );

      // Create worktree
      const worktreePath = `/tmp/agent-fix-${id}`;
      this.exec(
        `cd ${REPO_DIR} && git worktree add ${worktreePath} -b ${branch} main`,
      );

      // Build the investigation prompt
      const prompt = this.buildPrompt(request);

      // Run Claude Code headless in the worktree
      const prUrl = await this.runClaude(worktreePath, prompt, branch);

      if (prUrl) {
        await this.notifier.notify(
          `🔧 Fix ready for review`,
          `${request.checkName}: ${request.message}\nPR: ${prUrl}`,
          'info',
          'ops',
        );

        this.memory.recordEvent({
          id: randomUUID(),
          type: 'investigation',
          source: `investigator:${request.checkName}`,
          message: `PR opened: ${prUrl}`,
          severity: 'info',
          jevVerdict: null,
          jevConfidence: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        await this.notifier.notify(
          `⚠️ Investigation inconclusive`,
          `${request.checkName}: Agent could not produce a fix. Manual review needed.`,
          'warning',
          'ops',
        );
      }

      // Clean up worktree
      this.exec(
        `cd ${REPO_DIR} && git worktree remove ${worktreePath} --force 2>/dev/null || true`,
      );
    } catch (err) {
      this.logger.warn(`Investigation failed: ${err}`);
      await this.notifier.notify(
        `❌ Investigation failed`,
        `${request.checkName}: ${err}`,
        'warning',
        'ops',
      );
    } finally {
      this.investigating = false;
    }
  }

  private buildPrompt(request: InvestigationRequest): string {
    return `You are a corrective agent investigating an issue detected by the sysops monitor.

## Issue
- **Check:** ${request.checkName}
- **Error:** ${request.message}
- **Severity:** ${request.severity}

## Instructions
1. Investigate the root cause in the codebase
2. Identify what's causing this error
3. Make the minimal fix required
4. Run the build to verify: \`pnpm exec nx run-many -t build\`
5. Commit the fix with a descriptive message
6. Push the branch and create a PR with \`gh pr create\`

## Rules
- Only fix what's broken. Don't refactor or improve adjacent code.
- If you can't identify the root cause, explain what you found and stop.
- Never modify test infrastructure, CI config, or deployment files.
- The PR title should start with "fix:" and reference the issue.

Report the PR URL when done.`;
  }

  private async runClaude(
    worktreePath: string,
    prompt: string,
    branch: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn('Claude investigation timed out after 5 minutes');
        child.kill();
        resolve(null);
      }, 5 * 60 * 1000);

      const child = spawn(
        'claude',
        ['-p', prompt, '--allowedTools', 'Read,Grep,Glob,Edit,Write,Bash'],
        {
          cwd: worktreePath,
          env: { ...process.env, PATH: process.env['PATH'] },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      let output = '';
      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.on('close', () => {
        clearTimeout(timeout);
        // Extract PR URL from output
        const prMatch = output.match(
          /https:\/\/github\.com\/[^\s]+\/pull\/\d+/,
        );
        if (prMatch) {
          resolve(prMatch[0]);
        } else {
          this.logger.debug(`Claude output (no PR found):\n${output.slice(-500)}`);
          resolve(null);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        this.logger.warn(`Claude spawn failed: ${err}`);
        resolve(null);
      });
    });
  }

  private exec(cmd: string): string {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  }
}
