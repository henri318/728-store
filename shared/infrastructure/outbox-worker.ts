import { OutboxService } from './outbox-service';

/**
 * Background worker to process the Transactional Outbox.
 * In production, this could be triggered by an actual CRON job
 * or run as a dedicated sidecar process.
 */
class OutboxWorker {
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(ms: number = 5000) {
    if (this.interval) return;

    console.log('[OutboxWorker] Starting background process...');
    this.interval = setInterval(async () => {
      if (this.isProcessing) return;

      try {
        this.isProcessing = true;
        await OutboxService.processEvents();
      } catch (error) {
        console.error('[OutboxWorker] Loop error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, ms);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Singleton to ensure only one worker runs in the process
export const outboxWorker = new OutboxWorker();
