import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Prisma reset workflow', () => {
  it('regenerates Prisma Client before seeding after reset', () => {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJsonContents = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContents) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['db:reset']).toBe(
      'prisma migrate reset --force && prisma generate && prisma db seed',
    );
  });
});
