import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { container, initContainer } from '@/composition-root/container';

describe('container — SellerRepository binding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    container.setSellerRepository(mocks.sellerRepositoryInstance as never);
  });

  it('initContainer() is idempotent — does not re-bind seller repo when set', () => {
    const customRepo = { findAll: vi.fn() } as never;
    container.setSellerRepository(customRepo);

    initContainer();

    expect(container.getSellerRepository()).toBe(customRepo);
  });
});

describe('container — StoragePort binding', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    container.setStoragePort(null as never);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses LocalStorageAdapter when SEED_PRODUCT_ASSET_LOCAL_STORAGE is true', () => {
    process.env.SEED_PRODUCT_ASSET_LOCAL_STORAGE = 'true';

    initContainer();

    expect(container.getStoragePort().constructor.name).toBe(
      'LocalStorageAdapter',
    );
  });

  it('uses R2StorageAdapter by default', () => {
    delete process.env.SEED_PRODUCT_ASSET_LOCAL_STORAGE;

    initContainer();

    expect(container.getStoragePort().constructor.name).toBe(
      'R2StorageAdapter',
    );
  });
});
