import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JevService, choice, score, noul } from '../jev/jev.service';
import { MemoryService } from '../memory/memory.service';
import { NotifierService } from '../notifier/notifier.service';
import { randomUUID } from 'crypto';

const API_URL = process.env['AGENT_API_URL'] || 'http://localhost:3000/api';
const MIN_CONFIDENCE = 60;
const MIN_CONVICTION = ['strong', 'moderate'];

interface SynthesisSignal {
  asset: string;
  assetClass: string;
  direction: string;
  confidence: number;
  convictionLabel: string;
  conviction: number;
  timeframe?: string;
  timeframeAlignment?: string;
  contributions: { source: string; direction: string; confidence: number }[];
  lastUpdated: string;
}

@Injectable()
export class SignalWatcherService {
  private readonly logger = new Logger(SignalWatcherService.name);
  private previousDirections = new Map<string, string>();
  private alertedSignals = new Set<string>();

  constructor(
    private readonly jev: JevService,
    private readonly memory: MemoryService,
    private readonly notifier: NotifierService,
  ) {}

  @Cron('30 */5 * * * *')
  async watchSignals(): Promise<void> {
    // Only run during market hours (Mon-Fri, 7am-5pm MT)
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    if (day === 0 || day === 6 || hour < 7 || hour >= 17) return;

    this.logger.debug('Scanning for actionable signals...');

    let signals: SynthesisSignal[];
    try {
      const response = await fetch(`${API_URL}/synthesis`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      signals = (await response.json()) as SynthesisSignal[];
    } catch {
      return; // health watcher handles API failures
    }

    // Rules filter: confidence + conviction threshold
    const candidates = signals.filter(
      (s) =>
        s.direction !== 'HOLD' &&
        s.confidence >= MIN_CONFIDENCE &&
        MIN_CONVICTION.includes(s.convictionLabel),
    );

    if (candidates.length === 0) return;

    this.logger.debug(
      `${candidates.length} candidates pass rules filter`,
    );

    for (const signal of candidates) {
      const key = `${signal.asset}:${signal.direction}`;

      // Skip if already alerted for this signal
      if (this.alertedSignals.has(key)) continue;

      // Detect direction reversal
      const prevDirection = this.previousDirections.get(signal.asset);
      const isReversal =
        prevDirection !== undefined && prevDirection !== signal.direction;

      // Ask Jev
      if (this.jev.isAvailable()) {
        const verdict = await this.askJev(signal, isReversal);
        if (!verdict || verdict.act !== 'yes') {
          this.logger.debug(
            `Jev: skip ${signal.asset} ${signal.direction}`,
          );
          this.previousDirections.set(signal.asset, signal.direction);
          continue;
        }

        await this.raiseSignalAlert(signal, isReversal, verdict);
      } else {
        // No Jev: alert all candidates
        await this.raiseSignalAlert(signal, isReversal, null);
      }

      this.alertedSignals.add(key);
      this.previousDirections.set(signal.asset, signal.direction);
    }

    // Clear alerted signals that are no longer in candidates
    const currentKeys = new Set(
      candidates.map((s) => `${s.asset}:${s.direction}`),
    );
    for (const key of this.alertedSignals) {
      if (!currentKeys.has(key)) this.alertedSignals.delete(key);
    }
  }

  private async askJev(
    signal: SynthesisSignal,
    isReversal: boolean,
  ): Promise<{
    act: string;
    urgency: number;
    reversal: boolean;
  } | null> {
    const sources = signal.contributions
      .map((c) => `${c.source}: ${c.direction} at ${c.confidence}%`)
      .join(', ');

    const state = [
      `Asset: ${signal.asset} (${signal.assetClass})`,
      `Direction: ${signal.direction}`,
      `Confidence: ${signal.confidence}%`,
      `Conviction: ${signal.convictionLabel} (${signal.conviction}/100)`,
      signal.timeframe ? `Timeframe: ${signal.timeframe}` : '',
      signal.timeframeAlignment
        ? `Timeframe alignment: ${signal.timeframeAlignment}`
        : '',
      `Sources: ${sources}`,
      isReversal
        ? `REVERSAL: Previously ${this.previousDirections.get(signal.asset)}, now ${signal.direction}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const answers = await this.jev.decide(state, {
      act: choice('Should the user act on this trading signal?', {
        yes: 'Signal is strong, timely, and worth reviewing',
        no: 'Signal is weak, stale, or not actionable',
      }),
      urgency: score('How time-sensitive is this signal?', [
        'Can review later today',
        'Review within a few hours',
        'Review within the hour',
        'Review soon — momentum is building',
        'Act now — strong confluence',
      ]),
      reversal: noul(
        'Is this a meaningful reversal from the previous signal direction?',
      ),
    });

    if (!answers) return null;

    return {
      act: answers['act']?.choice ?? 'no',
      urgency: answers['urgency']?.score ?? 0,
      reversal: answers['reversal']?.noul ?? false,
    };
  }

  private async raiseSignalAlert(
    signal: SynthesisSignal,
    isReversal: boolean,
    verdict: { act: string; urgency: number; reversal: boolean } | null,
  ): Promise<void> {
    const emoji = signal.direction === 'BUY' ? '📈' : '📉';
    const reversalTag = isReversal || verdict?.reversal ? ' [REVERSAL]' : '';
    const urgencyLabel = verdict
      ? ` [urgency: ${verdict.urgency.toFixed(1)}/5]`
      : '';

    const message = `${signal.asset} ${signal.direction} — ${signal.confidence}% confidence, ${signal.convictionLabel} conviction${reversalTag}${urgencyLabel}`;

    const event = {
      id: randomUUID(),
      type: 'signal',
      source: `signal:${signal.asset}`,
      message,
      severity: 'info' as const,
      jevVerdict: verdict ? JSON.stringify(verdict) : null,
      jevConfidence: null,
      createdAt: new Date().toISOString(),
    };

    this.memory.recordEvent(event);

    await this.notifier.notify(
      `${emoji} Signal: ${signal.asset} ${signal.direction}`,
      message,
      'info',
      'alerts',
    );
  }
}
