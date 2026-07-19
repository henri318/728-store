import type { PrismaClient } from '@prisma/client';

export type SeedCleanupClient = Pick<
  PrismaClient,
  | 'productTranslation'
  | 'customization'
  | 'searchHistory'
  | 'signupAttempt'
  | 'loginAttempt'
  | 'orderLineItem'
  | 'order'
  | 'checkoutGroup'
  | 'cart'
  | 'outboxEvent'
  | 'emailQueue'
  | 'product'
  | 'category'
  | 'seller'
  | 'user'
  | 'role'
>;

export async function clearExistingData(
  prisma: SeedCleanupClient,
): Promise<void> {
  await prisma.productTranslation.deleteMany();
  await prisma.customization.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.signupAttempt.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkoutGroup.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.emailQueue.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}
