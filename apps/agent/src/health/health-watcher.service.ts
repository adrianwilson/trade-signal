import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JevService, choice, score } from '../jev/jev.service';
import { MemoryService } from '../memory/memory.service';
import { NotifierService } from '../notifier/notifier.service';
import { randomUUID } from 'crypto';

const API_URL = process.env['AGENT_API_URL'] || 'http://localhost:3000/api';

interface HealthCheck {
  name: string;
  url: string;
  validate: (data: unknown, status: number) => CheckResult;
}

interface CheckResult {
  ok: boolean;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable()
export class HealthWatcherService {
  private readonly logger = new Logger(HealthWatcherService.name);
  private consecutiveFailures = new Map<string, number>();

  constructor(
    private readonly jev: JevService,
    private readonly memory: MemoryService,
    private readonly notifier: NotifierService,
  ) {}

  private readonly checks: HealthCheck[] = [
    {
      name: 'api-health',
      url: `${API_URL}/health`,
      validate: (_data, status) => {
        if (status === 200) return { ok: true, message: 'API healthy', severity: 'info' };
        return { ok: false, message: `API returned ${status}`, severity: 'critical' };
      },
    },
    {
      name: 'synthesis',
      url: `${API_URL}/synthesis`,
      validate: (data, status) => {
        if (status !== 200) return { ok: false, message: `Synthesis endpoint returned ${status}`, severity: 'critical' };
        const arr = data as unknown[];
        if (!Array.isArray(arr) || arr.length === 0)
          return { ok: false, message: 'Synthesis returned 0 assets', severity: 'warning' };
        return { ok: true, message: `Synthesis: ${arr.length} assets`, severity: 'info' };
      },
    },
    {
      name: 'scanner',
      url: `${API_URL}/scanner/opportunities`,
      validate: (data, status) => {
        if (status !== 200) return { ok: false, message: `Scanner returned ${status}`, severity: 'warning' };
        return { ok: true, message: `Scanner: ${(data as unknown[]).length} opportunities`, severity: 'info' };
      },
    },
  ];

  @Cron('0 */5 * * * *')
  async runChecks(): Promise<void> {
    this.logger.debug('Running health checks...');
    const dismissed = this.memory.getDismissedPatterns();

    for (const check of this.checks) {
      const result = await this.executeCheck(check);

      if (result.ok) {
        this.consecutiveFailures.set(check.name, 0);
        continue;
      }

      // Track consecutive failures
      const failures = (this.consecutiveFailures.get(check.name) ?? 0) + 1;
      this.consecutiveFailures.set(check.name, failures);

      // Skip if user has dismissed this pattern
      if (dismissed.includes(`${check.name}:${result.severity}`)) {
        this.logger.debug(`Skipping dismissed pattern: ${check.name}:${result.severity}`);
        continue;
      }

      // Plain rules: obvious failures don't need Jev
      if (result.severity === 'critical' && failures >= 2) {
        await this.raiseAlert(check.name, result, null);
        continue;
      }

      // Ambiguous: ask Jev
      if (this.jev.isAvailable() && failures >= 2) {
        const verdict = await this.askJev(check.name, result, failures);
        if (verdict?.alert === 'yes') {
          await this.raiseAlert(check.name, result, verdict);
        }
      } else if (failures >= 3) {
        // No Jev available, fall back to threshold
        await this.raiseAlert(check.name, result, null);
      }
    }
  }

  private async executeCheck(check: HealthCheck): Promise<CheckResult> {
    try {
      const response = await fetch(check.url, {
        signal: AbortSignal.timeout(10000),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // non-JSON response
      }
      return check.validate(data, response.status);
    } catch (err) {
      return {
        ok: false,
        message: `${check.name} unreachable: ${err}`,
        severity: 'critical',
      };
    }
  }

  private async askJev(
    checkName: string,
    result: CheckResult,
    failures: number,
  ): Promise<{ alert: string; urgency: number } | null> {
    const state = [
      `Service: ${checkName}`,
      `Status: ${result.message}`,
      `Severity: ${result.severity}`,
      `Consecutive failures: ${failures}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');

    const answers = await this.jev.decide(state, {
      alert: choice(
        'Should the user be alerted about this issue?',
        ['yes', 'no'],
      ),
      urgency: score(
        'How urgent is this?',
        '1=can wait hours, 3=check within 30 min, 5=act now',
      ),
    });

    if (!answers) return null;

    return {
      alert: answers['alert']?.value as string,
      urgency: answers['urgency']?.value as number,
    };
  }

  private async raiseAlert(
    checkName: string,
    result: CheckResult,
    jevVerdict: { alert: string; urgency: number } | null,
  ): Promise<void> {
    const event = {
      id: randomUUID(),
      type: result.severity,
      source: checkName,
      message: result.message,
      severity: result.severity,
      jevVerdict: jevVerdict ? JSON.stringify(jevVerdict) : null,
      jevConfidence: null,
      createdAt: new Date().toISOString(),
    };

    this.memory.recordEvent(event);

    const urgencyLabel = jevVerdict
      ? ` [urgency: ${jevVerdict.urgency}/5]`
      : '';
    await this.notifier.notify(
      `${result.severity.toUpperCase()}: ${checkName}`,
      `${result.message}${urgencyLabel}`,
    );
  }
}
