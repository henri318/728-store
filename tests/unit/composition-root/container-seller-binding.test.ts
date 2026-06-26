import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const sellerRepositoryInstance = {
    save: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    findAllByStatus: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByUserId: vi.fn(),
  };
  return { sellerRepositoryInstance };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: { seller: { create: vi.fn() } },
}));

vi.mock('@/modules/email/infrastructure/brevo-email-sender', () => ({
  BrevoEmailSender: class {},
}));
vi.mock('@/modules/email/infrastructure/console-email-sender', () => ({
  ConsoleEmailSender: class {},
}));
vi.mock('@/modules/events/infrastructure/in-memory-event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('@/shared/infrastructure/prisma-outbox-repository', () => ({
  PrismaOutboxRepository: class {
    saveEvent = vi.fn();
  },
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
vi.mock('@/modules/roles/infrastructure/prisma-role-repository', () => ({
  PrismaRoleRepository: class {
    findAll = vi.fn();
  },
}));
vi.mock('@/modules/orders/infrastructure/prisma-order-repository', () => ({
  PrismaOrderRepository: class {},
}));
vi.mock('@/modules/products/infrastructure/prisma-product-repository', () => ({
  PrismaProductRepository: class {},
}));
vi.mock('@/modules/email/infrastructure/prisma-email-queue-repository', () => ({
  PrismaEmailQueueRepository: class {},
}));
vi.mock('@/modules/auth/infrastructure/prisma-user-lookup', () => ({
  PrismaUserLookup: class {},
}));
vi.mock('@/modules/auth/infrastructure/console-forgot-password-email', () => ({
  ConsoleForgotPasswordEmail: class {},
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

vi.mock('@/modules/uploads/infrastructure/r2-storage-adapter', () => ({
  R2StorageAdapter: class {},
}));
vi.mock('@/modules/uploads/infrastructure/prisma-upload-repository', () => ({
  PrismaUploadRepository: class {},
}));
vi.mock('@/modules/users/infrastructure/user-verification-adapter', () => ({
  UserVerificationAdapter: class {},
}));
vi.mock('@/modules/roles/infrastructure/role-validator-adapter', () => ({
  RoleValidatorAdapter: class {},
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
  HandleCartCheckedOut: class {
    static subscribe = vi.fn();
  },
}));

vi.mock('@/modules/sellers/infrastructure/prisma-seller-repository', () => ({
  PrismaSellerRepository: class {
    save = mocks.sellerRepositoryInstance.save;
    findById = mocks.sellerRepositoryInstance.findById;
    findByName = mocks.sellerRepositoryInstance.findByName;
    findAll = mocks.sellerRepositoryInstance.findAll;
    findAllByStatus = mocks.sellerRepositoryInstance.findAllByStatus;
    update = mocks.sellerRepositoryInstance.update;
    softDelete = mocks.sellerRepositoryInstance.softDelete;
    findByUserId = mocks.sellerRepositoryInstance.findByUserId;
  },
}));

// Import after mocks
import {
  container,
  getSellerRepository,
  initContainer,
} from '@/composition-root/container';

describe('container — SellerRepository binding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset binding to a known state
    container.setSellerRepository(mocks.sellerRepositoryInstance as never);
  });

  it('exposes a getSellerRepository function', () => {
    expect(typeof getSellerRepository).toBe('function');
  });

  it('exposes a setSellerRepository function on the container', () => {
    expect(typeof container.setSellerRepository).toBe('function');
  });

  it('returns the seller repository instance that was set', () => {
    const result = container.getSellerRepository();
    expect(result).toBe(mocks.sellerRepositoryInstance);
  });

  it('allows overriding the seller repository for tests', () => {
    const replacement = { findById: vi.fn() } as never;
    container.setSellerRepository(replacement);
    expect(container.getSellerRepository()).toBe(replacement);
  });

  it('initContainer() is idempotent — does not re-bind seller repo when set', () => {
    // Set a custom repo, then call initContainer — the override should persist
    const customRepo = { findAll: vi.fn() } as never;
    container.setSellerRepository(customRepo);

    initContainer();

    // The container.getSellerRepository should still return our custom one
    // because initContainer only initializes null bindings.
    expect(container.getSellerRepository()).toBe(customRepo);
  });
});
