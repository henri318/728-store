/**
 * EmailQueueEntry — the base shape of a queued outbound email.
 *
 * Production implementation: PrismaEmailQueueRepository (in email/infrastructure).
 * Test implementation:      MemoryEmailQueueRepository (in tests/doubles).
 */
export interface EmailQueueEntry {
  id: string;
  to: string;
  subject: string;
  htmlBody: string;
  template: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
