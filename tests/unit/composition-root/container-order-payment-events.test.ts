import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscribe: vi.fn(),
}));

vi.mock('@/modules/orders/application/mark-as-paid-use-case', () => ({
  MarkAsPaidUseCase: class {
    static readonly subscribe = mocks.subscribe;
    constructor() {}
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

describe('container — order payment event wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    container.resetOrderPaymentEventSubscriptions();
  });

  it('subscribes MarkAsPaidUseCase once and keeps the binding idempotent', () => {
    initContainer();
    initContainer();

    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  });
});
