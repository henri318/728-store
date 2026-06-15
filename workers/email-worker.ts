import { initContainer, getEmailSender, getEmailQueueRepository } from '@/composition-root/container';

// Wire dependencies once at startup — NODE_ENV determines which adapters are loaded
initContainer();
const emailSender = getEmailSender();
const queue = getEmailQueueRepository();

const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 10_000;

async function processEmailQueue(): Promise<void> {
  // Atomically claim up to BATCH_SIZE PENDING records whose scheduledAt has passed
  const claimed = await queue.claimPending(new Date(), BATCH_SIZE);

  for (const email of claimed) {
    try {
      await emailSender.send({
        to: email.to,
        subject: email.subject,
        htmlBody: email.htmlBody,
      });

      await queue.markSent(email.id, new Date());
    } catch (error) {
      const newRetryCount = email.retryCount + 1;
      if (newRetryCount >= email.maxRetries) {
        await queue.markFailed(email.id, String(error), newRetryCount);
      } else {
        const backoffSec = Math.pow(2, newRetryCount) * 60; // exponential backoff in seconds
        await queue.reschedule(
          email.id,
          newRetryCount,
          new Date(Date.now() + backoffSec * 1000),
          String(error),
        );
      }
    }
  }
}

// Poll every 10 seconds
console.log('[EmailWorker] Starting…');
setInterval(
  () => processEmailQueue().catch((err) => console.error('[EmailWorker] Error:', err)),
  POLL_INTERVAL_MS,
);

// Run once immediately
processEmailQueue().catch((err) => console.error('[EmailWorker] Error:', err));
