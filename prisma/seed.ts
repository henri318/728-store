import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

const BCRYPT_COST = 12

async function main() {
  console.log('🌱 Seeding dev data...')

  // 1. Clear existing data
  await prisma.productTranslation.deleteMany()
  await prisma.productCustomization.deleteMany()
  await prisma.signupAttempt.deleteMany()
  await prisma.loginAttempt.deleteMany()
  await prisma.order.deleteMany()
  await prisma.orderLineItem.deleteMany()
  await prisma.outboxEvent.deleteMany()
  await prisma.emailQueue.deleteMany()
  await prisma.product.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()

  // 2. Seed roles (ADMIN, SUPPORT, DESIGNER, CUSTOMER)
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'System administrator with full access' },
    }),
    prisma.role.upsert({
      where: { name: 'SUPPORT' },
      update: {},
      create: { name: 'SUPPORT', description: 'Customer support agent' },
    }),
    prisma.role.upsert({
      where: { name: 'DESIGNER' },
      update: {},
      create: { name: 'DESIGNER', description: 'Product designer with customization access' },
    }),
    prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER', description: 'Registered customer' },
    }),
  ]);
  console.log(`  ✓ Roles seeded: ${roles.map(r => r.name).join(', ')}`);

  // 2. Create Seller (the company/store)
  const seller = await prisma.seller.create({
    data: { name: '728 Store' },
  })
  console.log(`  ✓ Seller created: ${seller.name} (${seller.id})`)

  // 3. Create Products with i18n translations
  const productsData = [
    {
      basePrice: 25.0,
      sellerId: seller.id,
      translations: {
        create: [
          { locale: 'es', name: 'Camiseta Personalizada', description: 'Diseñá tu propia remera con estilo.' },
          { locale: 'cat', name: 'Samarreta Personalitzada', description: 'Dissenya la teva pròpia samarreta amb estil.' },
        ],
      },
    },
    {
      basePrice: 15.0,
      sellerId: seller.id,
      translations: {
        create: [
          { locale: 'es', name: 'Taza Personalizada', description: 'Café con estilo, personalizá tu taza.' },
          { locale: 'cat', name: 'Tassa Personalitzada', description: 'Cafè amb estil, personalitza la teva tassa.' },
        ],
      },
    },
    {
      basePrice: 45.0,
      sellerId: seller.id,
      translations: {
        create: [
          { locale: 'es', name: 'Sudadera con Capucha', description: 'Cómoda, única y personalizable.' },
          { locale: 'cat', name: 'Dessuadora amb Caputxa', description: 'Còmoda, única i personalitzable.' },
        ],
      },
    },
  ]

  for (const p of productsData) {
    const product = await prisma.product.create({ data: p })
    console.log(`  ✓ Product created: ${(product as any).id}`)
  }

  // 4. Create test user (customer role, verified email)
  const passwordHash = await bcrypt.hash('Test123!', BCRYPT_COST)
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
  })
  console.log(`  ✓ User created: ${user.firstName} ${user.lastName} (${user.email}, role: ${user.role})`)
  console.log(`    → Email: test@test.com`)
  console.log(`    → Password: Test123!`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
