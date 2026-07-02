import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile();
}

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const BCRYPT_COST = 12;

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
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'System administrator with full access',
      },
    }),
    prisma.role.upsert({
      where: { name: 'SUPPORT' },
      update: {},
      create: { name: 'SUPPORT', description: 'Customer support agent' },
    }),
    prisma.role.upsert({
      where: { name: 'DESIGNER' },
      update: {},
      create: {
        name: 'DESIGNER',
        description: 'Product designer with customization access',
      },
    }),
    prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER', description: 'Registered customer' },
    }),
  ]);
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

  // 5. Seed Tags
  const tagData = [
    { name: 'Handmade', slug: 'handmade' },
    { name: 'Eco-Friendly', slug: 'eco-friendly' },
    { name: 'Limited Edition', slug: 'limited-edition' },
    { name: 'Personalizable', slug: 'personalizable' },
    { name: 'Regalo', slug: 'regalo' },
    { name: 'Hogar', slug: 'hogar' },
    { name: 'Accesorio', slug: 'accesorio' },
    { name: 'Oficina', slug: 'oficina' },
    { name: 'Cocina', slug: 'cocina' },
    { name: 'Decoración', slug: 'decoracion' },
    { name: 'Premium', slug: 'premium' },
    { name: 'Básico', slug: 'basico' },
  ];
  const tags = await Promise.all(
    tagData.map((t) =>
      prisma.tag.upsert({
        where: { slug: t.slug },
        update: {},
        create: { name: t.name, slug: t.slug },
      }),
    ),
  );
  console.log(`  ✓ Tags seeded: ${tags.map((t) => t.name).join(', ')}`);

  // 6. Create 25 Products with i18n translations
  const productsData = [
    {
      basePrice: 25.0,
      sellerId: seller.id,
      tags: ['personalizable', 'basico'],
      translations: {
        es: {
          name: 'Camiseta Personalizada',
          description: 'Diseñá tu propia remera con estilo. Algodón orgánico.',
        },
        cat: {
          name: 'Samarreta Personalitzada',
          description:
            'Dissenya la teva pròpia samarreta amb estil. Cotó orgànic.',
        },
      },
    },
    {
      basePrice: 15.0,
      sellerId: seller.id,
      tags: ['cocina', 'personalizable', 'regalo'],
      translations: {
        es: {
          name: 'Taza Personalizada',
          description: 'Café con estilo, personalizá tu taza favorita.',
        },
        cat: {
          name: 'Tassa Personalitzada',
          description: 'Cafè amb estil, personalitza la teva tassa favorita.',
        },
      },
    },
    {
      basePrice: 45.0,
      sellerId: seller.id,
      tags: ['personalizable', 'basico'],
      translations: {
        es: {
          name: 'Sudadera con Capucha',
          description: 'Cómoda, única y personalizable para tu día a día.',
        },
        cat: {
          name: 'Dessuadora amb Caputxa',
          description: 'Còmoda, única i personalitzable per al teu dia a dia.',
        },
      },
    },
    {
      basePrice: 12.0,
      sellerId: seller.id,
      tags: ['cocina', 'hogar'],
      translations: {
        es: {
          name: 'Set de Posavasos de Corcho',
          description: 'Protegé tus mesas con estilo natural.',
        },
        cat: {
          name: 'Joc de Posagots de Suro',
          description: 'Protegeix les teves taules amb estil natural.',
        },
      },
    },
    {
      basePrice: 35.0,
      sellerId: seller.id,
      tags: ['hogar', 'decoracion', 'premium'],
      translations: {
        es: {
          name: 'Lámpara de Mesa Artesanal',
          description:
            'Iluminación cálida hecha a mano con materiales reciclados.',
        },
        cat: {
          name: 'Làmpada de Taula Artesanal',
          description: 'Il·luminació càlida feta a mà amb materials reciclats.',
        },
      },
    },
    {
      basePrice: 8.0,
      sellerId: seller.id,
      tags: ['oficina', 'accesorio'],
      translations: {
        es: {
          name: 'Marcalibros de Cuero',
          description: 'Marcalibros artesanal de cuero genuino.',
        },
        cat: {
          name: 'Marcapàgines de Cuir',
          description: 'Marcapàgines artesanal de cuir genuí.',
        },
      },
    },
    {
      basePrice: 55.0,
      sellerId: seller.id,
      tags: ['premium', 'hogar', 'limited-edition'],
      translations: {
        es: {
          name: 'Manta Tejida a Mano',
          description: 'Manta de lana merino tejida por artesanos locales.',
        },
        cat: {
          name: 'Manta Teixida a Mà',
          description: 'Manta de llana merino teixida per artesans locals.',
        },
      },
    },
    {
      basePrice: 18.0,
      sellerId: seller.id,
      tags: ['cocina', 'eco-friendly', 'hogar'],
      translations: {
        es: {
          name: 'Bol de Cerámica Hecho a Mano',
          description: 'Bol artesanal perfecto para ensaladas o decoración.',
        },
        cat: {
          name: 'Bol de Ceràmica Fet a Mà',
          description: 'Bol artesanal perfecte per a amanides o decoració.',
        },
      },
    },
    {
      basePrice: 22.0,
      sellerId: seller.id,
      tags: ['accesorio', 'handmade', 'regalo'],
      translations: {
        es: {
          name: 'Cartera de Cuero Artesanal',
          description: 'Cartera minimalista hecha a mano con cuero vegetal.',
        },
        cat: {
          name: 'Cartera de Cuir Artesanal',
          description: 'Cartera minimalista feta a mà amb cuir vegetal.',
        },
      },
    },
    {
      basePrice: 30.0,
      sellerId: seller.id,
      tags: ['hogar', 'decoracion', 'eco-friendly'],
      translations: {
        es: {
          name: 'Maceta Colgante Macramé',
          description: 'Maceta artesanal de macramé para tus plantas.',
        },
        cat: {
          name: 'Test Penjant Macramé',
          description: 'Test artesanal de macramé per a les teves plantes.',
        },
      },
    },
    {
      basePrice: 9.0,
      sellerId: seller.id,
      tags: ['oficina', 'accesorio', 'basico'],
      translations: {
        es: {
          name: 'Cuaderno de Tapa Dura',
          description:
            'Cuaderno con tapa dura y papel reciclado de 200 páginas.',
        },
        cat: {
          name: 'Quadern de Tapa Dura',
          description: 'Quadern amb tapa dura i paper reciclat de 200 pàgines.',
        },
      },
    },
    {
      basePrice: 40.0,
      sellerId: seller.id,
      tags: ['handmade', 'eco-friendly', 'limited-edition'],
      translations: {
        es: {
          name: 'Jabones Artesanales Set x3',
          description:
            'Set de jabones naturales con aromas cítricos y lavanda.',
        },
        cat: {
          name: 'Sabons Artesanals Set x3',
          description: 'Set de sabons naturals amb aromes cítrics i lavanda.',
        },
      },
    },
    {
      basePrice: 20.0,
      sellerId: seller.id,
      tags: ['cocina', 'basico', 'hogar'],
      translations: {
        es: {
          name: 'Tabla de Cortar de Bambú',
          description: 'Tabla ecológica de bambú con ranura para jugos.',
        },
        cat: {
          name: 'Taula de Tallar de Bambú',
          description: 'Taula ecològica de bambú amb ranura per a sucs.',
        },
      },
    },
    {
      basePrice: 65.0,
      sellerId: seller.id,
      tags: ['premium', 'hogar', 'handmade'],
      translations: {
        es: {
          name: 'Edredón Patchwork Artesanal',
          description: 'Edredón único hecho con retales de tela seleccionados.',
        },
        cat: {
          name: 'Edredó Patchwork Artesanal',
          description: 'Edredó únic fet amb retalls de tela seleccionats.',
        },
      },
    },
    {
      basePrice: 14.0,
      sellerId: seller.id,
      tags: ['oficina', 'accesorio', 'regalo'],
      translations: {
        es: {
          name: 'Portalápices de Cerámica',
          description: 'Portalápices esmaltado a mano con diseño geométrico.',
        },
        cat: {
          name: 'Portallapis de Ceràmica',
          description: 'Portallapis esmaltat a mà amb disseny geomètric.',
        },
      },
    },
    {
      basePrice: 28.0,
      sellerId: seller.id,
      tags: ['accesorio', 'handmade', 'eco-friendly'],
      translations: {
        es: {
          name: 'Bolsa de Tela Reutilizable',
          description:
            'Bolsa plegable de algodón orgánico con estampado único.',
        },
        cat: {
          name: 'Bossa de Tela Reutilitzable',
          description: 'Bossa plegable de cotó orgànic amb estampat únic.',
        },
      },
    },
    {
      basePrice: 48.0,
      sellerId: seller.id,
      tags: ['personalizable', 'premium', 'limited-edition'],
      translations: {
        es: {
          name: 'Chaqueta Vaquera Bordada',
          description: 'Chaqueta denim con bordados personalizados a mano.',
        },
        cat: {
          name: 'Jaqueta Vaquera Brodada',
          description: 'Jaqueta denim amb brodats personalitzats a mà.',
        },
      },
    },
    {
      basePrice: 11.0,
      sellerId: seller.id,
      tags: ['cocina', 'hogar', 'basico'],
      translations: {
        es: {
          name: 'Paño de Cocina Ecológico',
          description: 'Set de 3 paños de lino con diseños geométricos.',
        },
        cat: {
          name: 'Draps de Cuina Ecològics',
          description: 'Set de 3 draps de lli amb dissenys geomètrics.',
        },
      },
    },
    {
      basePrice: 32.0,
      sellerId: seller.id,
      tags: ['hogar', 'decoracion', 'handmade'],
      translations: {
        es: {
          name: 'Espejo Ovalado de Madera',
          description: 'Espejo con marco de madera reciclada tallado a mano.',
        },
        cat: {
          name: 'Mirall Ovalat de Fusta',
          description: 'Mirall amb marc de fusta reciclada tallat a mà.',
        },
      },
    },
    {
      basePrice: 6.0,
      sellerId: seller.id,
      tags: ['accesorio', 'basico', 'eco-friendly'],
      translations: {
        es: {
          name: 'Lapicero de Cartón Reciclado',
          description: 'Lapicero ecológico con compartimentos.',
        },
        cat: {
          name: 'Llapissera de Cartró Reciclat',
          description: 'Llapissera ecològica amb compartiments.',
        },
      },
    },
    {
      basePrice: 38.0,
      sellerId: seller.id,
      tags: ['cocina', 'premium', 'regalo'],
      translations: {
        es: {
          name: 'Jarra de Cerámica Esmaltada',
          description: 'Jarra artesanal con esmalte turquesa, capacidad 1.5L.',
        },
        cat: {
          name: 'Gerro de Ceràmica Esmaltada',
          description: 'Gerro artesanal amb esmalt turquesa, capacitat 1.5L.',
        },
      },
    },
    {
      basePrice: 16.0,
      sellerId: seller.id,
      tags: ['oficina', 'accesorio', 'personalizable'],
      translations: {
        es: {
          name: 'Sello Personalizado de Madera',
          description: 'Sello de madera con tu diseño o texto grabado.',
        },
        cat: {
          name: 'Segell Personalitzat de Fusta',
          description: 'Segell de fusta amb el teu disseny o text gravat.',
        },
      },
    },
    {
      basePrice: 50.0,
      sellerId: seller.id,
      tags: ['handmade', 'premium', 'limited-edition'],
      translations: {
        es: {
          name: 'Cesta de Mimbre Tejida',
          description: 'Cesta artesanal de mimbre natural con asa de cuero.',
        },
        cat: {
          name: 'Cistell de Vimetera Teixit',
          description:
            'Cistell artesanal de vimetera natural amb nansa de cuir.',
        },
      },
    },
    {
      basePrice: 7.5,
      sellerId: seller.id,
      tags: ['hogar', 'decoracion', 'basico'],
      translations: {
        es: {
          name: 'Velas Aromáticas Set x4',
          description: 'Velas de cera natural con aromas a vainilla y canela.',
        },
        cat: {
          name: 'Espelmes Aromàtiques Set x4',
          description:
            'Espelmes de cera natural amb aromes a vainilla i canyella.',
        },
      },
    },
    {
      basePrice: 42.0,
      sellerId: seller.id,
      tags: ['accesorio', 'handmade', 'eco-friendly'],
      translations: {
        es: {
          name: 'Mochila de Algodón Orgánico',
          description:
            'Mochila ligera y resistente hecha con algodón orgánico teñido natural.',
        },
        cat: {
          name: 'Motxilla de Cotó Orgànic',
          description:
            'Motxilla lleugera i resistent feta amb cotó orgànic tenyit natural.',
        },
      },
    },
  ];

  for (const p of productsData) {
    const { tags: tagSlugs, translations, ...productFields } = p;
    const product = await prisma.product.create({
      data: {
        ...productFields,
        translations: {
          create: [
            {
              locale: 'es',
              name: translations.es.name,
              description: translations.es.description,
            },
            {
              locale: 'cat',
              name: translations.cat.name,
              description: translations.cat.description,
            },
          ],
        },
        tags: {
          connect: tagSlugs.map((s) => {
            const tag = tags.find((t) => t.slug === s);
            if (!tag) throw new Error(`Tag not found: ${s}`);
            return { id: tag.id };
          }),
        },
      },
    });
    console.log(`  ✓ Product created: ${product.id} — ${translations.es.name}`);
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
