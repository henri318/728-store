import { describe, expect, it } from 'vitest';
import { prisma } from '@/shared/infrastructure/prisma';

describe('normalized address migration fixture', () => {
  it('preserves full, partial, and single-field legacy rows while skipping empty rows', async () => {
    await prisma.$executeRawUnsafe(
      'CREATE TEMP TABLE legacy_users (id text, address_street text, address_city text, address_postal_code text, address_country text)',
    );
    await prisma.$executeRawUnsafe(`INSERT INTO legacy_users VALUES
      ('full', 'Mayor', 'Madrid', '28013', 'ES'),
      ('partial', NULL, 'Barcelona', NULL, NULL),
      ('single', NULL, NULL, NULL, 'ES'),
      ('empty', NULL, NULL, NULL, NULL)`);
    await prisma.$executeRawUnsafe(
      'CREATE TEMP TABLE migrated_addresses (id text, street text, city text, postal_code text, country text)',
    );
    await prisma.$executeRawUnsafe(`INSERT INTO migrated_addresses (id, street, city, postal_code, country)
      SELECT id, address_street, address_city, address_postal_code, address_country FROM legacy_users
      WHERE NULLIF(trim(coalesce(address_street, '')), '') IS NOT NULL OR NULLIF(trim(coalesce(address_city, '')), '') IS NOT NULL OR NULLIF(trim(coalesce(address_postal_code, '')), '') IS NOT NULL OR NULLIF(trim(coalesce(address_country, '')), '') IS NOT NULL`);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        street: string | null;
        city: string | null;
        postal_code: string | null;
        country: string | null;
      }>
    >('SELECT * FROM migrated_addresses');
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.id === 'full')).toMatchObject({
      street: 'Mayor',
      city: 'Madrid',
      postal_code: '28013',
      country: 'ES',
    });
    expect(rows.find((row) => row.id === 'partial')).toMatchObject({
      city: 'Barcelona',
    });
    expect(rows.find((row) => row.id === 'single')).toMatchObject({
      country: 'ES',
    });
    expect(rows.some((row) => row.id === 'empty')).toBe(false);
  });
});
