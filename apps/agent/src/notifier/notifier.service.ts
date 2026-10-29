import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  async notify(title: string, message: string): Promise<void> {
    try {
      // Dynamic import for node-notifier (ESM/CJS compat)
      const notifier = await import('node-notifier');
      const notify = notifier.default || notifier;
      notify.notify({
        title: `🔧 ${title}`,
        message,
        sound: true,
        timeout: 10,
      });
      this.logger.log(`Notification: ${title} — ${message}`);
    } catch (err) {
      this.logger.warn(`Notification failed: ${err}`);
      // Fallback: just log
      this.logger.log(`[ALERT] ${title}: ${message}`);
    }
  }
}
