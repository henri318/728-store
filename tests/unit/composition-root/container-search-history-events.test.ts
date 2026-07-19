import { describe, expect, it } from 'vitest';
import { container } from '@/composition-root/container';
import { EventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryProductRepository } from '@/tests/doubles/memory-product-repository';
import { MemorySearchHistoryRepository } from '@/tests/doubles/memory-search-history-repository';

describe('container search-history events', () => {
  it('persists a public search before the product query returns', async () => {
    const searchHistory = new MemorySearchHistoryRepository();

    container.setEventBus(new EventBus());
    container.setSearchHistoryRepository(searchHistory);
    container.setProductRepository(new MemoryProductRepository());
    container.setOutboxRepository(new MemoryOutboxRepository());

    await container.getProductListQueryUseCase().execute({
      audience: 'public',
      q: 'ceramic',
      lang: 'es',
      userId: 'user-1',
    });

    expect(searchHistory.all()).toEqual([
      expect.objectContaining({
        userId: 'user-1',
        term: 'ceramic',
        locale: 'es',
      }),
    ]);
  });
});
