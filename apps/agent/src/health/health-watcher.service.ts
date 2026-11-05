import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JevService, choice, score } from '../jev/jev.service';
import { MemoryService } from '../memory/memory.service';
import { NotifierService } from '../notifier/notifier.service';
import { InvestigatorService } from '../investigator/investigator.service';
import { randomUUID } from 'crypto';

const API_URL = process.env['AGENT_API_URL'] || 'http://localhost:3000/api';

interface CheckResult {
  ok: boolean;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  context?: Record<string, unknown>;
}

@Injectable()
export class HealthWatcherService {
  private readonly logger = new Logger(HealthWatcherService.name);
  private consecutiveFailures = new Map<string, number>();
  private lastSynthesisCount: number | null = null;
  private lastCheckLatency = new Map<string, number>();
  private lastAlertTime = new Map<string, number>();
  private static readonly ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min

  constructor(
    private readonly jev: JevService,
    private readonly memory: MemoryService,
    private readonly notifier: NotifierService,
    private readonly investigator: InvestigatorService,
  ) {}

  @Cron('0 */5 * * * *')
  async runChecks(): Promise<void> {
    this.logger.debug('Running health checks...');

    // Run API health first to detect full sleep/shutdown
    const apiResult = await this.checkApiHealth();
    if (!apiResult.result.ok) {
      // If API is completely down, alert once then suppress repeats
      const failures =
        (this.consecutiveFailures.get('api-health') ?? 0) + 1;
      this.consecutiveFailures.set('api-health', failures);
      if (failures === 2) {
        await this.raiseAlert('api-health', apiResult.result, null);
      }
      // Skip all other checks — everything will fail if API is down
      return;
    }
    this.consecutiveFailures.set('api-health', 0);

    const dismissed = this.memory.getDismissedPatterns();

    const checks = [
      () => this.checkSynthesis(),
      () => this.checkScanner(),
      () => this.checkSynthesisDrop(),
      () => this.checkLatency(),
    ];

    for (const check of checks) {
      const { name, result } = await check();

      if (result.ok) {
        this.consecutiveFailures.set(name, 0);
        continue;
      }

      const failures = (this.consecutiveFailures.get(name) ?? 0) + 1;
      this.consecutiveFailures.set(name, failures);

      if (dismissed.includes(`${name}:${result.severity}`)) {
        this.logger.debug(`Skipping dismissed: ${name}:${result.severity}`);
        continue;
      }

      // Critical + 2 failures = alert immediately (no Jev needed)
      if (result.severity === 'critical' && failures >= 2) {
        await this.raiseAlert(name, result, null);
        continue;
      }

      // Everything else goes through Jev (testbed mode)
      if (this.jev.isAvailable() && failures >= 2) {
        const verdict = await this.askJev(name, result, failures);
        if (verdict?.alert === 'yes') {
          await this.raiseAlert(name, result, verdict);
        } else {
          this.logger.debug(
            `Jev says no alert for ${name} (confidence: ${verdict ? 'received' : 'unavailable'})`,
          );
        }
      } else if (failures >= 3) {
        await this.raiseAlert(name, result, null);
      }
    }
  }

  // --- Check: API health ---
  private async checkApiHealth(): Promise<{
    name: string;
    result: CheckResult;
  }> {
    const name = 'api-health';
    const start = Date.now();
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      this.lastCheckLatency.set(name, Date.now() - start);
      if (response.status === 200) {
        return { name, result: { ok: true, message: 'API healthy', severity: 'info' } };
      }
      return {
        name,
        result: { ok: false, message: `API returned ${response.status}`, severity: 'critical' },
      };
    } catch (err) {
      return {
        name,
        result: { ok: false, message: `API unreachable: ${err}`, severity: 'critical' },
      };
    }
  }

  // --- Check: Synthesis returns results ---
  private async checkSynthesis(): Promise<{
    name: string;
    result: CheckResult;
  }> {
    const name = 'synthesis';
    const start = Date.now();
    try {
      const response = await fetch(`${API_URL}/synthesis`, {
        signal: AbortSignal.timeout(10000),
      });
      this.lastCheckLatency.set(name, Date.now() - start);
      if (response.status !== 200) {
        return {
          name,
          result: {
            ok: false,
            message: `Synthesis returned ${response.status}`,
            severity: 'critical',
          },
        };
      }
      const data = (await response.json()) as unknown[];
      const count = Array.isArray(data) ? data.length : 0;

      // Track count for drop detection
      this.lastSynthesisCount = count;

      if (count === 0) {
        return {
          name,
          result: { ok: false, message: 'Synthesis returned 0 assets', severity: 'warning' },
        };
      }
      return {
        name,
        result: { ok: true, message: `Synthesis: ${count} assets`, severity: 'info' },
      };
    } catch (err) {
      return {
        name,
        result: { ok: false, message: `Synthesis unreachable: ${err}`, severity: 'critical' },
      };
    }
  }

  // --- Check: Scanner returns results ---
  private async checkScanner(): Promise<{
    name: string;
    result: CheckResult;
  }> {
    const name = 'scanner';
    const start = Date.now();
    try {
      const response = await fetch(`${API_URL}/scanner/opportunities`, {
        signal: AbortSignal.timeout(10000),
      });
      this.lastCheckLatency.set(name, Date.now() - start);
      if (response.status !== 200) {
        return {
          name,
          result: {
            ok: false,
            message: `Scanner returned ${response.status}`,
            severity: 'warning',
          },
        };
      }
      const data = (await response.json()) as unknown[];
      return {
        name,
        result: {
          ok: true,
          message: `Scanner: ${data.length} opportunities`,
          severity: 'info',
        },
      };
    } catch (err) {
      return {
        name,
        result: { ok: false, message: `Scanner unreachable: ${err}`, severity: 'critical' },
      };
    }
  }

  // --- Check: Synthesis count dropped >50% ---
  private async checkSynthesisDrop(): Promise<{
    name: string;
    result: CheckResult;
  }> {
    const name = 'synthesis-drop';

    // Need at least one previous reading
    if (this.lastSynthesisCount === null) {
      return { name, result: { ok: true, message: 'No baseline yet', severity: 'info' } };
    }

    try {
      const response = await fetch(`${API_URL}/synthesis`, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.status !== 200) {
        return { name, result: { ok: true, message: 'Skipped (API error)', severity: 'info' } };
      }
      const data = (await response.json()) as unknown[];
      const current = Array.isArray(data) ? data.length : 0;
      const previous = this.lastSynthesisCount;

      if (previous > 10 && current < previous * 0.5) {
        return {
          name,
          result: {
            ok: false,
            message: `Synthesis dropped ${Math.round(((previous - current) / previous) * 100)}%: ${previous} → ${current} assets`,
            severity: 'warning',
            context: { previous, current },
          },
        };
      }

      return {
        name,
        result: { ok: true, message: `Synthesis stable: ${current} assets`, severity: 'info' },
      };
    } catch {
      return { name, result: { ok: true, message: 'Skipped (fetch error)', severity: 'info' } };
    }
  }

  // --- Check: Response latency ---
  private async checkLatency(): Promise<{
    name: string;
    result: CheckResult;
  }> {
    const name = 'latency';
    const THRESHOLD_MS = 5000;

    const slow: string[] = [];
    for (const [endpoint, ms] of this.lastCheckLatency) {
      if (ms > THRESHOLD_MS) {
        slow.push(`${endpoint}: ${ms}ms`);
      }
    }

    if (slow.length === 0) {
      const latencies = Array.from(this.lastCheckLatency.entries())
        .map(([k, v]) => `${k}: ${v}ms`)
        .join(', ');
      return {
        name,
        result: {
          ok: true,
          message: `All endpoints fast (${latencies || 'no data'})`,
          severity: 'info',
        },
      };
    }

    return {
      name,
      result: {
        ok: false,
        message: `Slow responses: ${slow.join(', ')}`,
        severity: 'warning',
        context: { slow, threshold: THRESHOLD_MS },
      },
    };
  }

  // --- Jev triage ---
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
      result.context ? `Context: ${JSON.stringify(result.context)}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const answers = await this.jev.decide(state, {
      alert: choice('Should the user be alerted about this issue?', {
        yes: 'The issue is real and needs attention',
        no: 'This is transient or expected behavior',
      }),
      urgency: score('How urgent is this issue?', [
        'Can wait hours',
        'Check within an hour',
        'Check within 30 minutes',
        'Check within 10 minutes',
        'Act immediately',
      ]),
    });

    if (!answers) return null;

    return {
      alert: answers['alert']?.choice ?? 'no',
      urgency: answers['urgency']?.score ?? 0,
    };
  }

  // --- Alert ---
  private async raiseAlert(
    checkName: string,
    result: CheckResult,
    jevVerdict: { alert: string; urgency: number } | null,
  ): Promise<void> {
    // Cooldown: don't re-alert for same check within 30 min
    const lastAlert = this.lastAlertTime.get(checkName) ?? 0;
    if (Date.now() - lastAlert < HealthWatcherService.ALERT_COOLDOWN_MS) {
      this.logger.debug(`Cooldown: suppressing repeat alert for ${checkName}`);
      return;
    }
    this.lastAlertTime.set(checkName, Date.now());

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
      result.severity,
      'ops',
    );

    // Trigger investigation for code-fixable issues (not infra/sleep)
    if (
      jevVerdict &&
      jevVerdict.urgency >= 2 &&
      result.severity === 'warning'
    ) {
      this.investigator
        .investigate({
          checkName,
          message: result.message,
          severity: result.severity,
          jevUrgency: jevVerdict.urgency,
        })
        .catch((err) =>
          this.logger.warn(`Investigation trigger failed: ${err}`),
        );
    }
  }
}
