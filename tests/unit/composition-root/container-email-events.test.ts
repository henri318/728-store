import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subscribeAll: vi.fn(),
}));

vi.mock('@/modules/email/application/email-event-subscribers', () => ({
  EmailEventSubscribers: {
    subscribeAll: mocks.subscribeAll,
  },
}));

vi.mock('@/modules/email/infrastructure/prisma-email-queue-repository', () => ({
  PrismaEmailQueueRepository: class {},
}));
vi.mock('@/modules/email/infrastructure/prisma-email-user-lookup', () => ({
  PrismaEmailUserLookup: class {},
}));
vi.mock('@/modules/email/infrastructure/prisma-email-order-lookup', () => ({
  PrismaEmailOrderLookup: class {},
}));
vi.mock('@/modules/events/infrastructure/in-memory-event-bus', () => ({
  eventBus: { on: vi.fn(), emit: vi.fn() },
}));
vi.mock('@/shared/kernel/brevo-email-sender', () => ({
  BrevoEmailSender: class {},
}));
vi.mock('@/modules/email/infrastructure/console-email-sender', () => ({
  ConsoleEmailSender: class {},
}));
vi.mock('@/shared/infrastructure/prisma-outbox-repository', () => ({
  PrismaOutboxRepository: class {},
}));
vi.mock('@/shared/infrastructure/prisma-transaction-runner', () => ({
  PrismaTransactionRunner: class {},
}));
vi.mock('@/modules/auth/infrastructure/prisma-rate-limiter', () => ({
  PrismaRateLimiter: class {},
}));
vi.mock('@/modules/auth/infrastructure/process-env-secrets', () => ({
  ProcessEnvSecrets: class {
    getAuthSecret = () => 'test-secret';
  },
}));
vi.mock('@/modules/auth/infrastructure/nextauth-session', () => ({
  NextAuthSessionAdapter: class {},
}));
vi.mock('@/modules/auth/infrastructure/jwt-reset-token-codec', () => ({
  JwtResetTokenCodec: class {},
}));
vi.mock('@/modules/users/infrastructure/prisma-user-repository', () => ({
  PrismaUserRepository: class {},
}));
vi.mock('@/modules/sellers/infrastructure/prisma-seller-repository', () => ({
  PrismaSellerRepository: class {},
}));
vi.mock('@/modules/roles/infrastructure/prisma-role-repository', () => ({
  PrismaRoleRepository: class {},
}));
vi.mock('@/modules/orders/infrastructure/prisma-order-repository', () => ({
  PrismaOrderRepository: class {},
}));
vi.mock('@/modules/products/infrastructure/prisma-product-repository', () => ({
  PrismaProductRepository: class {},
}));
vi.mock('@/modules/auth/infrastructure/prisma-user-lookup', () => ({
  PrismaUserLookup: class {},
}));
vi.mock('@/modules/auth/infrastructure/memory-used-reset-token-store', () => ({
  MemoryUsedResetTokenStore: class {},
}));
vi.mock('@/modules/roles/application/use-cases/seed-roles-use-case', () => ({
  SeedRolesUseCase: class {
    execute = vi.fn().mockResolvedValue(undefined);
  },
}));
vi.mock('@/modules/users/infrastructure/bcrypt-password-hasher', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('@/modules/users/infrastructure/user-verification-adapter', () => ({
  UserVerificationAdapter: class {},
}));
vi.mock('@/modules/roles/infrastructure/role-validator-adapter', () => ({
  RoleValidatorAdapter: class {},
}));
vi.mock('@/modules/uploads/infrastructure/r2-storage-adapter', () => ({
  R2StorageAdapter: class {},
}));
vi.mock('@/modules/uploads/infrastructure/local-storage-adapter', () => ({
  LocalStorageAdapter: class {},
}));
vi.mock('@/modules/uploads/infrastructure/prisma-upload-repository', () => ({
  PrismaUploadRepository: class {},
}));
vi.mock('@/modules/cart/infrastructure/prisma-cart-repository', () => ({
  PrismaCartRepository: class {},
}));
vi.mock(
  '@/modules/cart/infrastructure/cart-product-repository-adapter',
  () => ({
    CartProductRepositoryAdapter: class {},
  }),
);
vi.mock(
  '@/modules/orders/infrastructure/prisma-paid-order-count-adapter',
  () => ({
    PrismaPaidOrderCountAdapter: class {},
  }),
);
vi.mock('@/modules/orders/application/handle-cart-checked-out', () => ({
  HandleCartCheckedOut: Object.assign(function HandleCartCheckedOut() {}, {
    subscribe: vi.fn(),
  }),
}));
vi.mock(
  '@/modules/search-history/infrastructure/prisma-search-history-repository',
  () => ({
    PrismaSearchHistoryRepository: class {},
  }),
);
vi.mock(
  '@/modules/search-history/application/handle-product-search-executed',
  () => ({
    HandleProductSearchExecuted: Object.assign(
      function HandleProductSearchExecuted() {},
      {
        subscribe: vi.fn(),
      },
    ),
  }),
);
vi.mock('@/modules/search-history/application/record-search-use-case', () => ({
  RecordSearchUseCase: class {},
}));
vi.mock('@/modules/orders/infrastructure/seller-lookup-adapter', () => ({
  SellerLookupAdapter: class {},
}));
vi.mock('@/modules/cart/infrastructure/customization-lookup-adapter', () => ({
  CustomizationLookupAdapter: class {},
}));
vi.mock(
  '@/modules/customizations/infrastructure/prisma-customization-repository',
  () => ({
    PrismaCustomizationRepository: class {},
  }),
);

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
