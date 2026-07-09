import {
  initContainer,
  getEmailQueueDrainService,
} from '@/composition-root/container';

// Wire dependencies once at startup — NODE_ENV determines which adapters are loaded
initContainer();
const emailQueueDrainService = getEmailQueueDrainService();
const POLL_INTERVAL_MS = 10_000;

async function processEmailQueue(): Promise<void> {
  await emailQueueDrainService.drain({ source: 'worker' });
}

// Poll every 10 seconds
console.log('[EmailWorker] Starting…');
setInterval(
  () =>
    processEmailQueue().catch((err) =>
      console.error('[EmailWorker] Error:', err),
    ),
  POLL_INTERVAL_MS,
);

// Run once immediately
processEmailQueue().catch((err) => console.error('[EmailWorker] Error:', err));
