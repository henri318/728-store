import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';
import { buildSeedProducts, type SeedProductData } from './seed-data';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BCRYPT_COST = 12;

function getSeedProductLabel(product: SeedProductData) {
  return (
    product.translations.create.find(
      (translation) => translation.locale === 'es',
    )?.name ??
    product.translations.create[0]?.name ??
    'Unnamed product'
  );
}

async function main() {
  console.log('🌱 Seeding dev data...');

  // 1. Clear existing data
  await prisma.productTranslation.deleteMany();
  await prisma.customization.deleteMany();
  await prisma.signupAttempt.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.emailQueue.deleteMany();
  await prisma.product.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 2. Seed roles (ADMIN, SUPPORT, DESIGNER, CUSTOMER)
  const roles: Array<Awaited<ReturnType<typeof prisma.role.upsert>>> = [];
  // Keep role seeding sequential so we never issue overlapping pg queries
  // against the same adapter/client during seed execution.
  for (const role of [
    {
      name: 'ADMIN',
      description: 'System administrator with full access',
    },
    { name: 'SUPPORT', description: 'Customer support agent' },
    {
      name: 'DESIGNER',
      description: 'Product designer with customization access',
    },
    { name: 'CUSTOMER', description: 'Registered customer' },
  ]) {
    roles.push(
      await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      }),
    );
  }
  console.log(`  ✓ Roles seeded: ${roles.map((r) => r.name).join(', ')}`);

  // 2. Create Admin user with ADMIN role
  const adminPasswordHash = await bcrypt.hash('Admin123!', BCRYPT_COST);
  const adminUser = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@728store.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
      preferredLanguage: 'es',
    },
  });
  console.log(
    `  ✓ Admin user created: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`,
  );

  // 3. Create designer user (DESIGNER role, verified email)
  const designerPasswordHash = await bcrypt.hash('Designer123!', BCRYPT_COST);
  const designerUser = await prisma.user.create({
    data: {
      firstName: 'Designer',
      lastName: 'User',
      email: 'designer@test.com',
      passwordHash: designerPasswordHash,
      role: 'DESIGNER',
      emailVerified: new Date(),
      preferredLanguage: 'es',
    },
  });
  console.log(
    `  ✓ Designer user created: ${designerUser.firstName} ${designerUser.lastName} (${designerUser.email})`,
  );

  // 4. Create Seller (the company/store) linked to designer user
  const seller = await prisma.seller.create({
    data: {
      name: '728 Store',
      description:
        'Tienda oficial de 728 Store — productos personalizados de calidad.',
      userId: designerUser.id,
      status: 'active',
    },
  });
  console.log(
    `  ✓ Seller created: ${seller.name} (${seller.id}, linked to user: ${seller.userId})`,
  );

  // 5. Create Products with i18n translations
  const productsData = buildSeedProducts(seller.id);

  for (const p of productsData) {
    const product = await prisma.product.create({ data: p as never });
    console.log(
      `  ✓ Product created: ${getSeedProductLabel(p)} (${product.id}) [customizable: ${p.customizationConfig.previewEnabled ? 'yes' : 'no'}, images: ${p.images.create.length}]`,
    );
  }

  // 6. Create test user (customer role, verified email)
  const passwordHash = await bcrypt.hash('Test123!', BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      passwordHash,
      role: 'CUSTOMER',
      emailVerified: new Date(),
      preferredLanguage: 'es',
    },
  });
  console.log(
    `  ✓ User created: ${user.firstName} ${user.lastName} (${user.email}, role: ${user.role})`,
  );
  console.log(`    → Email: test@test.com`);
  console.log(`    → Password: Test123!`);

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
