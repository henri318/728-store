import { OutboxService } from '@/shared/infrastructure/outbox-service';
import { container } from '@/composition-root/container';

/**
 * Background worker to process the Transactional Outbox.
 *
 * Lives in `workers/` because it is a process entry point — it gets
 * started from `app/[locale]/layout.tsx`. The actual processing logic
 * is in `OutboxService`, which the worker wires up using ports from
 * the container.
 */
class OutboxWorker {
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private service: OutboxService;

  constructor() {
    this.service = new OutboxService(
      container.getOutboxRepository(),
      container.getEventBus(),
    );
  }

  start(ms: number = 5000) {
    if (this.interval) return;

    console.log('[OutboxWorker] Starting background process...');
    this.interval = setInterval(async () => {
      if (this.isProcessing) return;

      try {
        this.isProcessing = true;
        await this.service.processEvents();
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
