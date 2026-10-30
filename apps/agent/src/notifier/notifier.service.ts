import { Injectable, Logger } from '@nestjs/common';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🟢',
};

export type NotifyChannel = 'ops' | 'alerts';

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);
  private readonly webhooks: Record<NotifyChannel, string | undefined>;

  constructor() {
    this.webhooks = {
      alerts: process.env['SLACK_WEBHOOK_ALERTS'],
      ops: process.env['SLACK_WEBHOOK_OPS'],
    };
  }

  async notify(
    title: string,
    message: string,
    severity: string = 'critical',
    channel: NotifyChannel = 'ops',
  ): Promise<void> {
    // macOS notification
    try {
      const notifier = await import('node-notifier');
      const notify = notifier.default || notifier;
      notify.notify({
        title: `🔧 ${title}`,
        message,
        sound: true,
        timeout: 10,
      });
    } catch {
      // silent
    }

    // Slack
    const webhookUrl = this.webhooks[channel];
    if (webhookUrl) {
      await this.sendSlack(webhookUrl, title, message, severity);
    }

    this.logger.log(`Notification [${channel}]: ${title} — ${message}`);
  }

  private async sendSlack(
    webhookUrl: string,
    title: string,
    message: string,
    severity: string,
  ): Promise<void> {
    const emoji = SEVERITY_EMOJI[severity] || '⚪';
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${emoji} *${title}*\n${message}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `_Trade Signal Agent • ${new Date().toLocaleString()}_`,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      this.logger.warn(`Slack notification failed: ${err}`);
    }
  }
}
