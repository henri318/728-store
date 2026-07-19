/**
 * Composition Root — central place where all dependencies are wired
 * according to the current environment.
 *
 * Call `initContainer()` once at each process entry point (worker, Next.js
 * server, test setup). After that, retrieve bindings via the typed getters.
 *
 * Architecture:
 *   Entry point  →  initContainer()        (runs once at startup)
 *   Any module   →  container.getXxx()     (retrieves the bound implementation)
 *
 * This keeps environment-specific choices in ONE file. Business logic
 * never knows whether it's talking to Brevo, bcrypt, or a console logger.
 *
 * This file is the ONLY place in the project that imports concrete adapters
 * (Prisma, Brevo, bcrypt, NextAuth). After the hexagonal cleanup lands,
 * imports point at `@/modules/email/*`, `@/modules/auth/*`, `@/modules/users/infrastructure/*`,
 * and `@/shared/infrastructure/*` only.
 *
 * Why static imports are safe here:
 *  - PrismaClient does NOT connect on construction
 *  - bcrypt is a side-effect-free import
 *  - brevo-email-sender.ts uses `import type` only, so statically importing
 *    the class does NOT load `brevo-client.ts` (which throws at load if
 *    BREVO_API_KEY is missing). The SDK is only loaded when send() is called.
 */

import type { EmailSender } from '@/modules/email/domain/email-sender';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import type { OutboxRepository } from '@/shared/kernel/outbox-repository';
import type { PasswordHasher } from '@/modules/users/domain/password-hasher';
import type { RateLimiter } from '@/modules/auth/domain/rate-limiter';
import type { ResetTokenCodec } from '@/shared/contracts/security/reset-token-codec';
import type { SecretsPort } from '@/modules/auth/domain/secrets';
import type { SessionPort } from '@/modules/auth/domain/session';
import type { UserRepository } from '@/modules/users/domain/user-repository';
import { GetUserProfileUseCase } from '@/modules/users/application/use-cases/get-user-profile-use-case';
import type { RoleRepository } from '@/modules/roles/domain/role-repository';
import type { OrderRepository } from '@/modules/orders/domain/order-repository';
import type { ProductRepository } from '@/modules/products/domain/product-repository';
import type { CheckoutGroupLookupPort } from '@/modules/payments/domain/checkout-group-lookup-port';
import type { CheckoutGroupPaymentPort } from '@/modules/payments/domain/checkout-group-payment-port';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { UserLookupPort } from '@/modules/auth/domain/user-lookup';
import type { UsedResetTokenStorePort } from '@/shared/contracts/security/used-reset-token-store-port';
import type { SellerLookupPort } from '@/modules/orders/domain/seller-lookup-port';
import type { CustomerNameLookupPort } from '@/modules/orders/domain/customer-name-lookup-port';
import type { SellerRepository } from '@/modules/sellers/domain/seller-repository';
import type { TransactionRunner } from '@/shared/kernel/transaction-runner';
import type { UserVerificationPort } from '@/modules/auth/domain/ports/user-verification-port';
import type { RoleValidatorPort } from '@/modules/users/domain/ports/role-validator-port';
import type { StoragePort } from '@/modules/uploads/domain/storage-port';
import type { UploadRepository } from '@/modules/uploads/domain/upload-repository';
import type { CartRepository } from '@/modules/cart/domain/cart-repository';
import type { ProductRepository as CartProductRepository } from '@/modules/cart/domain/product-repository';
import type { PaidOrderCountPort } from '@/modules/cart/domain/paid-order-count-port';
import type { CustomizationLookupPort as CartCustomizationLookupPort } from '@/modules/cart/domain/customization-lookup-port';
import type { CustomerCustomizationCreatePort } from '@/modules/cart/domain/customer-customization-create-port';
import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';
import type { SearchHistoryRepository } from '@/modules/search-history/domain/search-history-repository';
import type { EmailUserLookupPort } from '@/modules/email/domain/ports/email-user-lookup-port';
import type { EmailOrderLookupPort } from '@/modules/email/domain/ports/email-order-lookup-port';
import type { CategoryRepository } from '@/modules/products/domain/category-repository';

import { BrevoEmailSender } from '@/shared/kernel/brevo-email-sender';
import { ConsoleEmailSender } from '@/modules/email/infrastructure/console-email-sender';
import { eventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { PrismaTransactionRunner } from '@/shared/infrastructure/prisma-transaction-runner';
import { PrismaRateLimiter } from '@/modules/auth/infrastructure/prisma-rate-limiter';
import { ProcessEnvSecrets } from '@/modules/auth/infrastructure/process-env-secrets';
import { NextAuthSessionAdapter } from '@/modules/auth/infrastructure/nextauth-session';
import { JwtResetTokenCodec } from '@/modules/auth/infrastructure/jwt-reset-token-codec';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { UserProfileAdapter } from '@/modules/users/infrastructure/user-profile-adapter';
import { PrismaSellerRepository } from '@/modules/sellers/infrastructure/prisma-seller-repository';
import { PrismaRoleRepository } from '@/modules/roles/infrastructure/prisma-role-repository';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { PrismaEmailQueueRepository } from '@/modules/email/infrastructure/prisma-email-queue-repository';
import { PrismaUserLookup } from '@/modules/auth/infrastructure/prisma-user-lookup';
import { MemoryUsedResetTokenStore } from '@/modules/auth/infrastructure/memory-used-reset-token-store';
import { PrismaCheckoutGroupLookup } from '@/modules/payments/infrastructure/prisma-checkout-group-lookup';
import { ConsolePaymentPort } from '@/modules/payments/infrastructure/console-payment-port';
import { SeedRolesUseCase } from '@/modules/roles/application/use-cases/seed-roles-use-case';
import {
  hashPassword,
  verifyPassword,
} from '@/modules/users/infrastructure/bcrypt-password-hasher';
import { UserVerificationAdapter } from '@/modules/users/infrastructure/user-verification-adapter';
import { RoleValidatorAdapter } from '@/modules/roles/infrastructure/role-validator-adapter';
import { R2StorageAdapter } from '@/modules/uploads/infrastructure/r2-storage-adapter';
import { LocalStorageAdapter } from '@/modules/uploads/infrastructure/local-storage-adapter';
import { PrismaUploadRepository } from '@/modules/uploads/infrastructure/prisma-upload-repository';
import { PrismaCartRepository } from '@/modules/cart/infrastructure/prisma-cart-repository';
import { CartProductRepositoryAdapter } from '@/modules/cart/infrastructure/cart-product-repository-adapter';
import { CustomizationLookupAdapter } from '@/modules/cart/infrastructure/customization-lookup-adapter';
import { PrismaPaidOrderCountAdapter } from '@/modules/orders/infrastructure/prisma-paid-order-count-adapter';
import { SellerLookupAdapter } from '@/modules/orders/infrastructure/seller-lookup-adapter';
import { CustomerNameLookupAdapter } from '@/modules/orders/infrastructure/customer-name-lookup-adapter';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import { MarkAsPaidUseCase } from '@/modules/orders/application/mark-as-paid-use-case';
import { TransactionalOrderService } from '@/modules/orders/infrastructure/transactional-order-service';
import { PrismaCustomizationRepository } from '@/modules/customizations/infrastructure/prisma-customization-repository';
import { CartCustomerCustomizationCreator } from '@/modules/customizations/infrastructure/cart-customer-customization-creator';
import { PrismaSearchHistoryRepository } from '@/modules/search-history/infrastructure/prisma-search-history-repository';
import { HandleProductSearchExecuted } from '@/modules/search-history/application/handle-product-search-executed';
import { RecordSearchUseCase } from '@/modules/search-history/application/record-search-use-case';
import { PrismaEmailUserLookup } from '@/modules/email/infrastructure/prisma-email-user-lookup';
import { PrismaEmailOrderLookup } from '@/modules/email/infrastructure/prisma-email-order-lookup';
import { EmailEventSubscribers } from '@/modules/email/application/email-event-subscribers';
import { EmailQueueDrainService } from '@/modules/email/application/email-queue-drain-service';
import { PrismaCategoryRepository } from '@/modules/products/infrastructure/prisma-category-repository';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';
import { GetSellerProductFormUseCase } from '@/modules/products/application/get-seller-product-form-use-case';
import type { SellerOwnershipLookupPort } from '@/modules/products/domain/seller-ownership-lookup-port';
import { SellerOwnershipLookupAdapter } from '@/modules/products/infrastructure/seller-ownership-lookup-adapter';
import { GetCartViewUseCase } from '@/modules/cart/application/get-cart-view-use-case';
import { GetCheckoutViewUseCase } from '@/modules/cart/application/get-checkout-view-use-case';
import { ListCustomerOrdersUseCase } from '@/modules/orders/application/list-customer-orders-use-case';
import { GetCustomerOrderUseCase } from '@/modules/orders/application/get-customer-order-use-case';
import { ListSellerOrdersUseCase } from '@/modules/orders/application/list-seller-orders-use-case';
import { GetSellerOrderUseCase } from '@/modules/orders/application/get-seller-order-use-case';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { GetProductByIdUseCase } from '@/modules/products/application/get-product-by-id-use-case';
import { GetCartProductViewsUseCase } from '@/modules/products/application/get-cart-product-views-use-case';
import { ListSellerProductsUseCase } from '@/modules/sellers/application/use-cases/list-seller-products-use-case';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { GetRecentSearchesUseCase } from '@/modules/search-history/application/get-recent-searches-use-case';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state: Record<string, unknown> = {};

function isLocalUploadStorage(): boolean {
  return process.env.SEED_PRODUCT_ASSET_LOCAL_STORAGE === 'true';
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function ensureSearchHistoryEventSubscriptions(): void {
  if (state.isSearchHistoryEventsSubscribed) return;

  const subscriber = new HandleProductSearchExecuted(
    new RecordSearchUseCase(getSearchHistoryRepository()),
  );
  HandleProductSearchExecuted.subscribe(getEventBus(), subscriber);
  state.isSearchHistoryEventsSubscribed = true;
}

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — calling it again is a no-op because every binding is
 * short-circuited by a null check.
 */

/**
 * Initialize all dependency bindings for the current environment.
 * Idempotent — calling it again is a no-op because each getter is guarded
 * by a null check.
 *
 * Each getter lazily initializes its own dependency so this function simply
 * calls every getter to trigger first-time initialization.
 */
export function initContainer(): void {
  getEmailSender();
  getOutboxRepository();
  getPasswordHasher();
  getRateLimiter();
  getEventBus();
  getSecrets();
  getSession();
  getUserRepository();
  getUserProfileUseCase();
  getRoleRepository();
  getOrderRepository();
  getCheckoutGroupLookup();
  getCheckoutGroupPaymentPort();
  getProductRepository();
  getEmailQueueRepository();
  getUserLookup();
  getEmailUserLookup();
  getEmailOrderLookup();
  getEmailQueueDrainService();
  getUsedResetTokenStore();
  getSellerRepository();
  getSellerLookup();
  getTransactionRunner();
  getUserVerification();
  getRoleValidator();
  getStoragePort();
  getUploadRepository();
  getCartRepository();
  getCartProductRepository();
  getPaidOrderCountPort();
  getCustomizationRepository();
  getCustomizationLookup();
  getCustomerCustomizationCreator();
  getSearchHistoryRepository();
  getCategoryRepository();
  getResetTokenCodec();
  getCustomerNameLookup();

  // --- Cart event subscriptions (idempotent for HMR) ---
  if (!state.isCartEventsSubscribed) {
    const handler = new HandleCartCheckedOut(
      state.orderRepository as OrderRepository,
      state.outboxRepository as OutboxRepository,
      state.transactionRunner as TransactionRunner,
      state.customizationLookup as CartCustomizationLookupPort,
    );
    HandleCartCheckedOut.subscribe(state.eventBus as EventBusPort, handler);
    state.isCartEventsSubscribed = true;
  }

  ensureSearchHistoryEventSubscriptions();

  // --- Email event subscriptions (idempotent for HMR) ---
  if (!state.isEmailEventsSubscribed) {
    EmailEventSubscribers.subscribeAll(state.eventBus as EventBusPort, {
      emailQueueRepository: state.emailQueueRepository as EmailQueueRepository,
      emailUserLookup: state.emailUserLookup as EmailUserLookupPort,
      emailOrderLookup: state.emailOrderLookup as EmailOrderLookupPort,
      emailQueueDrainer: state.emailQueueDrainService as EmailQueueDrainService,
    });
    state.isEmailEventsSubscribed = true;
  }

  // --- Order payment event subscriptions (idempotent for HMR) ---
  if (!state.isOrderPaymentEventsSubscribed) {
    const transactionalService = new TransactionalOrderService(
      state.orderRepository as OrderRepository,
      state.outboxRepository as OutboxRepository,
    );
    const handler = new MarkAsPaidUseCase(
      state.orderRepository as OrderRepository,
      state.outboxRepository as OutboxRepository,
      transactionalService,
    );
    MarkAsPaidUseCase.subscribe(state.eventBus as EventBusPort, handler);
    state.isOrderPaymentEventsSubscribed = true;
  }
}

// ---------------------------------------------------------------------------
// Getters (auto-initialize on first access)
// ---------------------------------------------------------------------------

export function getEmailSender(): EmailSender {
  if (!state.emailSender) {
    state.emailSender =
      process.env.NODE_ENV === 'production'
        ? new BrevoEmailSender()
        : new ConsoleEmailSender();
  }
  return state.emailSender as EmailSender;
}

export function getOutboxRepository(): OutboxRepository {
  state.outboxRepository ??= new PrismaOutboxRepository();
  return state.outboxRepository as OutboxRepository;
}

export function getPasswordHasher(): PasswordHasher {
  if (!state.passwordHasher) {
    state.passwordHasher = {
      hash: hashPassword,
      verify: verifyPassword,
    };
  }
  return state.passwordHasher as PasswordHasher;
}

export function getRateLimiter(): RateLimiter {
  state.rateLimiter ??= new PrismaRateLimiter();
  return state.rateLimiter as RateLimiter;
}

export function getResetTokenCodec(): ResetTokenCodec {
  if (!state.resetTokenCodec) {
    state.resetTokenCodec = new JwtResetTokenCodec(
      getSecrets().getAuthSecret(),
    );
  }
  return state.resetTokenCodec as ResetTokenCodec;
}

export function getEventBus(): EventBusPort {
  state.eventBus ??= eventBus;
  return state.eventBus as EventBusPort;
}

export function getSecrets(): SecretsPort {
  state.secrets ??= new ProcessEnvSecrets();
  return state.secrets as SecretsPort;
}

export function getSession(): SessionPort {
  state.session ??= new NextAuthSessionAdapter();
  return state.session as SessionPort;
}

export function getUserRepository(): UserRepository {
  state.userRepository ??= new PrismaUserRepository();
  return state.userRepository as UserRepository;
}

export function getUserProfileUseCase(): GetUserProfileUseCase {
  state.userProfileUseCase ??= new GetUserProfileUseCase(
    new UserProfileAdapter(getUserRepository()),
  );
  return state.userProfileUseCase as GetUserProfileUseCase;
}

export function getRoleRepository(): RoleRepository {
  if (!state.roleRepository) {
    state.roleRepository = new PrismaRoleRepository();
    const seedRoles = new SeedRolesUseCase(
      state.roleRepository as RoleRepository,
    );
    (async () => {
      try {
        await seedRoles.execute();
      } catch (error) {
        console.error('[container] Role seed failed:', error);
      }
    })();
  }
  return state.roleRepository as RoleRepository;
}

export function getOrderRepository(): OrderRepository {
  state.orderRepository ??= new PrismaOrderRepository();
  return state.orderRepository as OrderRepository;
}

export function getCustomerNameLookup(): CustomerNameLookupPort {
  state.customerNameLookup ??= new CustomerNameLookupAdapter(
    getUserRepository(),
  );
  return state.customerNameLookup as CustomerNameLookupPort;
}

export function getCheckoutGroupLookup(): CheckoutGroupLookupPort {
  state.checkoutGroupLookup ??= new PrismaCheckoutGroupLookup();
  return state.checkoutGroupLookup as CheckoutGroupLookupPort;
}

export function getCheckoutGroupPaymentPort(): CheckoutGroupPaymentPort {
  if (state.checkoutGroupPaymentPort)
    return state.checkoutGroupPaymentPort as CheckoutGroupPaymentPort;

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[Payment] No real PaymentGatewayPort configured. ' +
        'Falling back to ConsolePaymentPort. ' +
        'Set PAYMENT_GATEWAY environment variable or implement a real gateway before deploying.',
    );
  }

  state.checkoutGroupPaymentPort = new ConsolePaymentPort();
  return state.checkoutGroupPaymentPort as CheckoutGroupPaymentPort;
}

export function getProductRepository(): ProductRepository {
  state.productRepository ??= new PrismaProductRepository();
  return state.productRepository as ProductRepository;
}

export function getProductListQueryUseCase(): ProductListQueryUseCase {
  ensureSearchHistoryEventSubscriptions();
  state.productListQueryUseCase ??= new ProductListQueryUseCase(
    getProductRepository(),
    getOutboxRepository(),
    getEventBus(),
  );
  return state.productListQueryUseCase as ProductListQueryUseCase;
}

export function getProductByIdUseCase(): GetProductByIdUseCase {
  state.productByIdUseCase ??= new GetProductByIdUseCase(
    getProductRepository(),
  );
  return state.productByIdUseCase as GetProductByIdUseCase;
}

export function getEmailQueueRepository(): EmailQueueRepository {
  state.emailQueueRepository ??= new PrismaEmailQueueRepository();
  return state.emailQueueRepository as EmailQueueRepository;
}

export function getUserLookup(): UserLookupPort {
  state.userLookup ??= new PrismaUserLookup();
  return state.userLookup as UserLookupPort;
}

export function getEmailUserLookup(): EmailUserLookupPort {
  state.emailUserLookup ??= new PrismaEmailUserLookup();
  return state.emailUserLookup as EmailUserLookupPort;
}

export function getEmailOrderLookup(): EmailOrderLookupPort {
  state.emailOrderLookup ??= new PrismaEmailOrderLookup();
  return state.emailOrderLookup as EmailOrderLookupPort;
}

export function getEmailQueueDrainService(): EmailQueueDrainService {
  if (!state.emailQueueDrainService) {
    state.emailQueueDrainService = new EmailQueueDrainService(
      getEmailQueueRepository(),
      getEmailSender(),
    );
  }

  return state.emailQueueDrainService as EmailQueueDrainService;
}

export function getUsedResetTokenStore(): UsedResetTokenStorePort {
  state.usedResetTokenStore ??= new MemoryUsedResetTokenStore();
  return state.usedResetTokenStore as UsedResetTokenStorePort;
}

export function getSellerRepository(): SellerRepository {
  state.sellerRepository ??= new PrismaSellerRepository();
  return state.sellerRepository as SellerRepository;
}

export function getSellerUseCase(): GetSellerUseCase {
  state.sellerUseCase ??= new GetSellerUseCase(getSellerRepository());
  return state.sellerUseCase as GetSellerUseCase;
}

export function getListSellersUseCase(): ListSellersUseCase {
  state.listSellersUseCase ??= new ListSellersUseCase(getSellerRepository());
  return state.listSellersUseCase as ListSellersUseCase;
}

export function getListSellerProductsUseCase(): ListSellerProductsUseCase {
  state.listSellerProductsUseCase ??= new ListSellerProductsUseCase(
    getSellerRepository(),
    getProductListQueryUseCase(),
  );
  return state.listSellerProductsUseCase as ListSellerProductsUseCase;
}

export function getSellerLookup(): SellerLookupPort {
  if (!state.sellerLookup) {
    state.sellerLookup = new SellerLookupAdapter(getSellerRepository());
  }
  return state.sellerLookup as SellerLookupPort;
}

export function getTransactionRunner(): TransactionRunner {
  state.transactionRunner ??= new PrismaTransactionRunner();
  return state.transactionRunner as TransactionRunner;
}

export function getUserVerification(): UserVerificationPort {
  if (!state.userVerification) {
    state.userVerification = new UserVerificationAdapter(getUserRepository());
  }
  return state.userVerification as UserVerificationPort;
}

export function getRoleValidator(): RoleValidatorPort {
  if (!state.roleValidator) {
    state.roleValidator = new RoleValidatorAdapter(getRoleRepository());
  }
  return state.roleValidator as RoleValidatorPort;
}

export function getStoragePort(): StoragePort {
  if (!state.storagePort) {
    state.storagePort = isLocalUploadStorage()
      ? new LocalStorageAdapter()
      : new R2StorageAdapter();
  }
  return state.storagePort as StoragePort;
}

export function getUploadRepository(): UploadRepository {
  state.uploadRepository ??= new PrismaUploadRepository();
  return state.uploadRepository as UploadRepository;
}

export function getCartRepository(): CartRepository {
  state.cartRepository ??= new PrismaCartRepository();
  return state.cartRepository as CartRepository;
}

export function getCartViewUseCase(): GetCartViewUseCase {
  state.cartViewUseCase ??= new GetCartViewUseCase(
    getCartRepository(),
    getCartProductRepository(),
    getCustomizationLookup(),
  );
  return state.cartViewUseCase as GetCartViewUseCase;
}

export function getCheckoutViewUseCase(): GetCheckoutViewUseCase {
  state.checkoutViewUseCase ??= new GetCheckoutViewUseCase(
    getCartViewUseCase(),
    getPaidOrderCountPort(),
  );
  return state.checkoutViewUseCase as GetCheckoutViewUseCase;
}

export function getCartProductRepository(): CartProductRepository {
  if (!state.cartProductRepository) {
    state.cartProductRepository = new CartProductRepositoryAdapter(
      new GetCartProductViewsUseCase(getProductRepository()),
    );
  }
  return state.cartProductRepository as CartProductRepository;
}

export function getPaidOrderCountPort(): PaidOrderCountPort {
  if (!state.paidOrderCountPort) {
    state.paidOrderCountPort = new PrismaPaidOrderCountAdapter(
      getOrderRepository(),
    );
  }
  return state.paidOrderCountPort as PaidOrderCountPort;
}

export function getCustomizationRepository(): CustomizationRepository {
  state.customizationRepository ??= new PrismaCustomizationRepository();
  return state.customizationRepository as CustomizationRepository;
}

export function getCustomizationLookup(): CartCustomizationLookupPort {
  if (!state.customizationLookup) {
    state.customizationLookup = new CustomizationLookupAdapter(
      getCustomizationRepository(),
    );
  }
  return state.customizationLookup as CartCustomizationLookupPort;
}

export function getCustomerCustomizationCreator(): CustomerCustomizationCreatePort {
  if (!state.customerCustomizationCreator) {
    const productCapability: ProductCapabilityPort = {
      async getConfig(productId) {
        const product = await getProductRepository().findById(productId, 'es');
        return product?.customizationConfig ?? null;
      },
    };
    state.customerCustomizationCreator = new CartCustomerCustomizationCreator(
      getCustomizationRepository(),
      productCapability,
    );
  }
  return state.customerCustomizationCreator as CustomerCustomizationCreatePort;
}

export function getSearchHistoryRepository(): SearchHistoryRepository {
  state.searchHistoryRepository ??= new PrismaSearchHistoryRepository();
  return state.searchHistoryRepository as SearchHistoryRepository;
}

export function getRecentSearchesUseCase(): GetRecentSearchesUseCase {
  state.recentSearchesUseCase ??= new GetRecentSearchesUseCase(
    getSearchHistoryRepository(),
  );
  return state.recentSearchesUseCase as GetRecentSearchesUseCase;
}

export function getCategoryRepository(): CategoryRepository {
  state.categoryRepository ??= new PrismaCategoryRepository();
  return state.categoryRepository as CategoryRepository;
}

export function getListCategoriesUseCase(): ListCategoriesUseCase {
  state.listCategoriesUseCase ??= new ListCategoriesUseCase(
    getCategoryRepository(),
  );
  return state.listCategoriesUseCase as ListCategoriesUseCase;
}

function getSellerOwnershipLookup(): SellerOwnershipLookupPort {
  state.sellerOwnershipLookup ??= new SellerOwnershipLookupAdapter(
    getSellerRepository(),
  );
  return state.sellerOwnershipLookup as SellerOwnershipLookupPort;
}

export function getSellerProductFormUseCase(): GetSellerProductFormUseCase {
  state.sellerProductFormUseCase ??= new GetSellerProductFormUseCase(
    getProductRepository(),
    getListCategoriesUseCase(),
    getSellerOwnershipLookup(),
  );
  return state.sellerProductFormUseCase as GetSellerProductFormUseCase;
}

export function getListCustomerOrdersUseCase(): ListCustomerOrdersUseCase {
  state.listCustomerOrdersUseCase ??= new ListCustomerOrdersUseCase(
    getOrderRepository(),
  );
  return state.listCustomerOrdersUseCase as ListCustomerOrdersUseCase;
}

export function getCustomerOrderUseCase(): GetCustomerOrderUseCase {
  state.customerOrderUseCase ??= new GetCustomerOrderUseCase(
    getOrderRepository(),
  );
  return state.customerOrderUseCase as GetCustomerOrderUseCase;
}

export function getListSellerOrdersUseCase(): ListSellerOrdersUseCase {
  state.listSellerOrdersUseCase ??= new ListSellerOrdersUseCase(
    getSellerLookup(),
    getOrderRepository(),
  );
  return state.listSellerOrdersUseCase as ListSellerOrdersUseCase;
}

export function getSellerOrderUseCase(): GetSellerOrderUseCase {
  state.sellerOrderUseCase ??= new GetSellerOrderUseCase(
    getSellerLookup(),
    getOrderRepository(),
    getCustomerNameLookup(),
  );
  return state.sellerOrderUseCase as GetSellerOrderUseCase;
}

function resetCartViewUseCases(): void {
  state.cartViewUseCase = undefined;
  state.checkoutViewUseCase = undefined;
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------
// In tests you can call `initContainer()` or override individual bindings:
//
//   import { container } from '@/composition-root/container';
//   container.setUserRepository(new MemoryUserRepository());
//
// This keeps test setup explicit without touching NODE_ENV.

export const container = {
  init: initContainer,
  getEmailSender,
  getOutboxRepository,
  getPasswordHasher,
  getRateLimiter,
  getResetTokenCodec,
  getEventBus,
  getSecrets,
  getSession,
  getUserRepository,
  getUserProfileUseCase,
  getRoleRepository,
  getOrderRepository,
  getCheckoutGroupLookup,
  getCustomerNameLookup,
  getCheckoutGroupPaymentPort,
  getProductRepository,
  getProductListQueryUseCase,
  getProductByIdUseCase,
  getEmailQueueRepository,
  getUserLookup,
  getEmailUserLookup,
  getEmailOrderLookup,
  getEmailQueueDrainService,
  getUsedResetTokenStore,
  getSellerRepository,
  getSellerUseCase,
  getListSellersUseCase,
  getListSellerProductsUseCase,
  getSellerLookup,
  getTransactionRunner,
  getUserVerification,
  getRoleValidator,
  getStoragePort,
  getUploadRepository,
  getCartRepository,
  getCartProductRepository,
  getCartViewUseCase,
  getCheckoutViewUseCase,
  getPaidOrderCountPort,
  getCustomizationLookup,
  getCustomerCustomizationCreator,
  getCustomizationRepository,
  getSearchHistoryRepository,
  getRecentSearchesUseCase,
  getCategoryRepository,
  getListCategoriesUseCase,
  getSellerProductFormUseCase,
  getListCustomerOrdersUseCase,
  getCustomerOrderUseCase,
  getListSellerOrdersUseCase,
  getSellerOrderUseCase,
  setEmailSender(sender: EmailSender): void {
    state.emailSender = sender;
  },
  setOutboxRepository(repo: OutboxRepository): void {
    state.outboxRepository = repo;
    state.productListQueryUseCase = undefined;
  },
  setPasswordHasher(hasher: PasswordHasher): void {
    state.passwordHasher = hasher;
  },
  setRateLimiter(limiter: RateLimiter): void {
    state.rateLimiter = limiter;
  },
  setResetTokenCodec(codec: ResetTokenCodec): void {
    state.resetTokenCodec = codec;
  },
  setEventBus(bus: EventBusPort): void {
    state.eventBus = bus;
    state.productListQueryUseCase = undefined;
    state.isSearchHistoryEventsSubscribed = false;
  },
  setSecrets(secrets: SecretsPort): void {
    state.secrets = secrets;
  },
  setSession(session: SessionPort): void {
    state.session = session;
  },
  setUserRepository(repo: UserRepository): void {
    state.userRepository = repo;
    state.userProfileUseCase = undefined;
    state.customerNameLookup = undefined;
    state.sellerOrderUseCase = undefined;
  },
  setRoleRepository(repo: RoleRepository): void {
    state.roleRepository = repo;
  },
  setOrderRepository(repo: OrderRepository): void {
    state.orderRepository = repo;
    state.paidOrderCountPort = undefined;
    state.listCustomerOrdersUseCase = undefined;
    state.customerOrderUseCase = undefined;
    state.listSellerOrdersUseCase = undefined;
    state.sellerOrderUseCase = undefined;
    resetCartViewUseCases();
  },
  setCheckoutGroupLookup(port: CheckoutGroupLookupPort): void {
    state.checkoutGroupLookup = port;
  },
  setCheckoutGroupPaymentPort(port: CheckoutGroupPaymentPort): void {
    state.checkoutGroupPaymentPort = port;
  },
  setProductRepository(repo: ProductRepository): void {
    state.productRepository = repo;
    state.productListQueryUseCase = undefined;
    state.productByIdUseCase = undefined;
    state.cartProductRepository = undefined;
    state.listSellerProductsUseCase = undefined;
    state.sellerProductFormUseCase = undefined;
    resetCartViewUseCases();
  },
  setEmailQueueRepository(repo: EmailQueueRepository): void {
    state.emailQueueRepository = repo;
  },
  setEmailQueueDrainService(service: EmailQueueDrainService): void {
    state.emailQueueDrainService = service;
  },
  setUserLookup(port: UserLookupPort): void {
    state.userLookup = port;
  },
  setUsedResetTokenStore(store: UsedResetTokenStorePort): void {
    state.usedResetTokenStore = store;
  },
  setSellerRepository(repo: SellerRepository): void {
    state.sellerRepository = repo;
    state.sellerLookup = undefined;
    state.sellerOwnershipLookup = undefined;
    state.sellerUseCase = undefined;
    state.listSellersUseCase = undefined;
    state.listSellerProductsUseCase = undefined;
    state.sellerProductFormUseCase = undefined;
    state.listSellerOrdersUseCase = undefined;
    state.sellerOrderUseCase = undefined;
  },
  setSellerLookup(port: SellerLookupPort): void {
    state.sellerLookup = port;
    state.listSellerOrdersUseCase = undefined;
    state.sellerOrderUseCase = undefined;
  },
  setTransactionRunner(runner: TransactionRunner): void {
    state.transactionRunner = runner;
  },
  setUserVerification(port: UserVerificationPort): void {
    state.userVerification = port;
  },
  setRoleValidator(port: RoleValidatorPort): void {
    state.roleValidator = port;
  },
  setStoragePort(port: StoragePort): void {
    state.storagePort = port;
  },
  setUploadRepository(repo: UploadRepository): void {
    state.uploadRepository = repo;
  },
  setCartRepository(repo: CartRepository): void {
    state.cartRepository = repo;
    resetCartViewUseCases();
  },
  setCartProductRepository(repo: CartProductRepository): void {
    state.cartProductRepository = repo;
    resetCartViewUseCases();
  },
  setPaidOrderCountPort(port: PaidOrderCountPort): void {
    state.paidOrderCountPort = port;
    state.checkoutViewUseCase = undefined;
  },
  setCustomizationLookup(port: CartCustomizationLookupPort): void {
    state.customizationLookup = port;
    resetCartViewUseCases();
  },
  setCustomizationRepository(repo: CustomizationRepository): void {
    state.customizationRepository = repo;
    state.customizationLookup = undefined;
    state.customerCustomizationCreator = undefined;
    resetCartViewUseCases();
  },
  setSearchHistoryRepository(repo: SearchHistoryRepository): void {
    state.searchHistoryRepository = repo;
    state.recentSearchesUseCase = undefined;
    state.isSearchHistoryEventsSubscribed = false;
  },
  setCategoryRepository(repo: CategoryRepository): void {
    state.categoryRepository = repo;
    state.listCategoriesUseCase = undefined;
    state.sellerProductFormUseCase = undefined;
  },
  resetSearchHistoryEventSubscriptions(): void {
    state.isSearchHistoryEventsSubscribed = false;
  },
  resetCartEventSubscriptions(): void {
    state.isCartEventsSubscribed = false;
  },
  resetEmailEventSubscriptions(): void {
    state.isEmailEventsSubscribed = false;
  },
  resetOrderPaymentEventSubscriptions(): void {
    state.isOrderPaymentEventsSubscribed = false;
  },
};
