import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscribeAll: vi.fn(),
}));

vi.mock('@/modules/email/application/email-event-subscribers', () => ({
  EmailEventSubscribers: {
    subscribeAll: mocks.subscribeAll,
  },
}));

vi.mock('@/modules/events/infrastructure/in-memory-event-bus', () => ({
  eventBus: { on: vi.fn(), emit: vi.fn() },
}));

vi.mock('@/modules/auth/infrastructure/process-env-secrets', () => ({
  ProcessEnvSecrets: class {
    getAuthSecret() {
      return new TextEncoder().encode('test-secret');
    }
  },
}));

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: {},
}));

import { container, initContainer } from '@/composition-root/container';

describe('container — email event wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    container.resetEmailEventSubscriptions();
  });

  it('subscribes email handlers once and keeps the binding idempotent', () => {
    initContainer();
    initContainer();

    expect(mocks.subscribeAll).toHaveBeenCalledTimes(1);
  });
});
