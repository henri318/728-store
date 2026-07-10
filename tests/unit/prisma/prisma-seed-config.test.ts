import type { Prisma } from '@prisma/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Prisma seed and shared adapter wiring', () => {
  const sharedPrismaPath = path.join(
    process.cwd(),
    'shared/infrastructure/prisma.ts',
  );
  const seedPath = path.join(process.cwd(), 'prisma/seed.ts');

  it('uses the object-form PrismaPg constructor everywhere', () => {
    const sharedPrisma = readFileSync(sharedPrismaPath, 'utf8');
    const seed = readFileSync(seedPath, 'utf8');

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
    const seed = readFileSync(seedPath, 'utf8');

    expect(seed).not.toContain('Promise.all(');
    expect(seed).toContain('for (const role of [');
    expect(seed).toContain('for (const [index, p] of productsData.entries())');
  });

  it('gives the Mochila seed image an explicit purpose and non-SVG mime type', () => {
    const seed = readFileSync(seedPath, 'utf8');

    expect(seed).toMatch(
      /Mochila de Algodón Orgánico[\s\S]*purpose:\s*'CUSTOMIZABLE_BASE'[\s\S]*mimeType:\s*'image\/(?:jpeg|png|webp)'/,
    );
    expect(seed).not.toContain('customizable-hoodie.svg');
    expect(seed).not.toContain('image/svg+xml');
  });

  it('keeps the Mochila seed image compatible with Prisma nested create typing', () => {
    const mochilaImage = {
      url: '/img/products/example.webp',
      alt: 'Mochila de Algodón Orgánico',
      position: 0,
      purpose: 'CUSTOMIZABLE_BASE',
      mimeType: 'image/webp',
    } satisfies Prisma.ProductImageUncheckedCreateWithoutProductInput;

    expect(mochilaImage.purpose).toBe('CUSTOMIZABLE_BASE');
    expect(mochilaImage.mimeType).toBe('image/webp');
  });
});
