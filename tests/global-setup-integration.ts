/**
 * Global setup — loads .env BEFORE any test file imports.
 *
 * This runs once before ALL integration test files are loaded,
 * ensuring process.env.DATABASE_URL is available when
 * shared/infrastructure/prisma.ts creates its module-level PrismaPg adapter.
 */
import { config } from 'dotenv';
import path from 'path';

export default function setup() {
  config({ path: path.resolve(__dirname, '../.env') });
}
