import { prisma } from '@/shared/infrastructure/prisma';
import { initContainer, getEmailSender } from '@/shared/kernel/container';

// Wire dependencies once at startup — NODE_ENV determines which adapters are loaded
initContainer();
const emailSender = getEmailSender();

async function processEmailQueue() {
  // Atomically claim PENDING records
  await prisma.emailQueue.updateMany({
    where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
    data: { status: 'PROCESSING' },
  });

  const processing = await prisma.emailQueue.findMany({
    where: { status: 'PROCESSING' },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const email of processing) {
    try {
      await emailSender.send({
        to: email.to,
        subject: email.subject,
        htmlBody: email.htmlBody,
      });

      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      const newRetryCount = email.retryCount + 1;
      if (newRetryCount >= email.maxRetries) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            error: String(error),
            retryCount: newRetryCount,
          },
        });
      } else {
        const backoffSec = Math.pow(2, newRetryCount) * 60; // exponential backoff in seconds
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            retryCount: newRetryCount,
            error: String(error),
            scheduledAt: new Date(Date.now() + backoffSec * 1000),
          },
        });
      }
    }
  }
}

// Poll every 10 seconds
console.log('[EmailWorker] Starting…');
setInterval(() => processEmailQueue().catch(err => console.error('[EmailWorker] Error:', err)), 10_000);

// Run once immediately
processEmailQueue().catch(err => console.error('[EmailWorker] Error:', err));
