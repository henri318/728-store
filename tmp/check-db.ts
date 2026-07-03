import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- Users ---');
  console.log(users.map((u) => ({ id: u.id, email: u.email, role: u.role })));

  const sellers = await prisma.seller.findMany();
  console.log('--- Sellers ---');
  console.log(
    sellers.map((s) => ({
      id: s.id,
      name: s.name,
      userId: s.userId,
      status: s.status,
      deletedAt: s.deletedAt,
    })),
  );

  const products = await prisma.product.findMany({
    include: {
      translations: {
        where: { locale: 'es' },
      },
    },
  });
  console.log('--- Products ---');
  console.log(
    products.map((p) => ({
      id: p.id,
      sellerId: p.sellerId,
      name: p.translations[0]?.name,
    })),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
