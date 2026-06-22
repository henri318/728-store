import pg from 'pg';

/**
 * Create a fresh pg Pool for integration test cleanup.
 *
 * Uses the same DATABASE_URL as the app (Docker PostgreSQL on port 5433).
 * Each test suite calls `cleanupDb()` in `afterAll` to truncate tables
 * in FK-safe order, preventing data leakage between suites.
 */
function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

/**
 * Truncate all tables in FK-safe order.
 *
 * Called in `afterAll` hooks to ensure a clean state between test suites.
 * Uses raw pg to avoid Prisma adapter issues with $executeRawUnsafe.
 */
export async function cleanupDb(): Promise<void> {
  const pool = createPool();

  try {
    const tables = [
      'OrderLineItem',
      'Order',
      'ProductCustomization',
      'ProductTranslation',
      'Product',
      'Seller',
      'OutboxEvent',
      'EmailQueue',
      'LoginAttempt',
      'SignupAttempt',
      'User',
      'Role',
    ];

    for (const table of tables) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  } finally {
    await pool.end();
  }
}
