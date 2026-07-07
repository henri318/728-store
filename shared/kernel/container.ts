/**
 * Composition Root — central place where all dependencies are wired
 * according to the current environment.
 *
 * Call initContainer() once at each process entry point (worker, Next.js
 * server, test setup). After that, retrieve bindings via the typed getters.
 *
 * Architecture:
 *   Entry point  →  initContainer()   (runs once at startup)
 *   Any module   →  getEmailSender()  (retrieves the bound implementation)
 *
 * This keeps environment-specific choices in ONE file. Business logic
 * never knows whether it's talking to Brevo, SendGrid, or a console logger.
 */

import type { EmailSender } from './email-sender';
import { BrevoEmailSender } from './brevo-email-sender';
import { ConsoleEmailSender } from './console-email-sender';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state: Record<string, unknown> = {};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — safe to call multiple times. Each getter lazily initializes
 * its own dependency on first access.
 */
export function initContainer(): void {
  getEmailSender();
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

/**
 * Returns the EmailSender bound for the current environment.
 * Lazily initializes on first call.
 */
export function getEmailSender(): EmailSender {
  if (!state.emailSender) {
    state.emailSender =
      process.env.NODE_ENV === 'production'
        ? new BrevoEmailSender()
        : new ConsoleEmailSender();
  }
  return state.emailSender as EmailSender;
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------
// In tests you can call initContainer() or override individual bindings:
//
//   import { container } from '@/shared/kernel/container';
//   container.setEmailSender(new MockEmailSender());
//
// This keeps test setup explicit without touching NODE_ENV.

export const container = {
  init: initContainer,
  getEmailSender,
  /** Override — useful in tests to inject a mock without touching env vars. */
  setEmailSender(sender: EmailSender): void {
    state.emailSender = sender;
  },
};
