import { describe, it, expect } from 'vitest';
import { ProductEvents } from '@/modules/products/domain/product-events';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

describe('ProductEvents', () => {
  it('should define PRODUCT_CREATED event', () => {
    expect(ProductEvents.PRODUCT_CREATED).toBe('product.created');
  });

  it('should define PRODUCT_UPDATED event', () => {
    expect(ProductEvents.PRODUCT_UPDATED).toBe('product.updated');
  });

  it('should define PRODUCT_PUBLISHED event', () => {
    expect(ProductEvents.PRODUCT_PUBLISHED).toBe('product.published');
  });

  it('should define PRODUCT_ARCHIVED event', () => {
    expect(ProductEvents.PRODUCT_ARCHIVED).toBe('product.archived');
  });

  it('should have exactly 4 events', () => {
    const keys = Object.keys(ProductEvents);
    expect(keys).toHaveLength(4);
  });
});

describe('GlobalEvents — product events registered', () => {
  it('should include PRODUCT_CREATED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('PRODUCT_CREATED');
    expect(GlobalEvents.PRODUCT_CREATED).toBe('product.created');
  });

  it('should include PRODUCT_UPDATED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('PRODUCT_UPDATED');
    expect(GlobalEvents.PRODUCT_UPDATED).toBe('product.updated');
  });

  it('should include PRODUCT_PUBLISHED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('PRODUCT_PUBLISHED');
    expect(GlobalEvents.PRODUCT_PUBLISHED).toBe('product.published');
  });

  it('should include PRODUCT_ARCHIVED in GlobalEvents', () => {
    expect(GlobalEvents).toHaveProperty('PRODUCT_ARCHIVED');
    expect(GlobalEvents.PRODUCT_ARCHIVED).toBe('product.archived');
  });

  it('should have product events matching ProductEvents values', () => {
    expect(GlobalEvents.PRODUCT_CREATED).toBe(ProductEvents.PRODUCT_CREATED);
    expect(GlobalEvents.PRODUCT_UPDATED).toBe(ProductEvents.PRODUCT_UPDATED);
    expect(GlobalEvents.PRODUCT_PUBLISHED).toBe(
      ProductEvents.PRODUCT_PUBLISHED,
    );
    expect(GlobalEvents.PRODUCT_ARCHIVED).toBe(ProductEvents.PRODUCT_ARCHIVED);
  });
});
