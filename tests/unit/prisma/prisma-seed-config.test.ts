import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Prisma seed and shared adapter wiring', () => {
  const sharedPrismaPath = join(
    process.cwd(),
    'shared/infrastructure/prisma.ts',
  );
  const seedPath = join(process.cwd(), 'prisma/seed.ts');

  it('uses the object-form PrismaPg constructor everywhere', () => {
    const sharedPrisma = readFileSync(sharedPrismaPath, 'utf-8');
    const seed = readFileSync(seedPath, 'utf-8');

    expect(sharedPrisma).toContain(
      'new PrismaPg({ connectionString: process.env.DATABASE_URL })',
    );
    expect(seed).toContain(
      'new PrismaPg({ connectionString: process.env.DATABASE_URL })',
    );
    expect(sharedPrisma).not.toContain(
      'new PrismaPg(process.env.DATABASE_URL)',
    );
    expect(seed).not.toContain('new PrismaPg(process.env.DATABASE_URL)');
  });

  it('keeps seed writes sequential to avoid overlapping pg queries', () => {
    const seed = readFileSync(seedPath, 'utf-8');

    expect(seed).not.toContain('Promise.all(');
    expect(seed).toContain('for (const role of [');
    expect(seed).toContain('for (const p of productsData)');
  });
});
