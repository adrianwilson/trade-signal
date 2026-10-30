import { Injectable, Logger } from '@nestjs/common';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🟢',
};

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);
  private readonly slackWebhookUrl: string | undefined;

  constructor() {
    this.slackWebhookUrl = process.env['SLACK_WEBHOOK_URL'];
  }

  async notify(
    title: string,
    message: string,
    severity: string = 'critical',
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
    if (this.slackWebhookUrl) {
      await this.sendSlack(title, message, severity);
    }

    this.logger.log(`Notification: ${title} — ${message}`);
  }

  private async sendSlack(
    title: string,
    message: string,
    severity: string,
  ): Promise<void> {
    const emoji = SEVERITY_EMOJI[severity] || '⚪';
    try {
      await fetch(this.slackWebhookUrl!, {
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
                  text: `_Trade Signal Sysops Agent • ${new Date().toLocaleString()}_`,
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
