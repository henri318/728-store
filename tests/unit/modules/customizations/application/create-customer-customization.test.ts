import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateCustomerCustomization } from '@/modules/customizations/application/create-customer-customization';
import type { CustomizationRepository } from '@/modules/customizations/domain/customization-repository';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';

describe('CreateCustomerCustomization', () => {
  let repo: CustomizationRepository;
  let capability: ProductCapabilityPort;
  let useCase: CreateCustomerCustomization;

  beforeEach(() => {
    repo = {
      save: vi.fn(async (entity) => entity),
      findById: vi.fn(),
      findByIds: vi.fn(),
      findByProductId: vi.fn(),
      findBySellerId: vi.fn(),
      delete: vi.fn(),
      isReferencedByOrders: vi.fn(),
    };

    capability = {
      async getConfig() {
        return ProductCustomizationConfig.default();
      },
    };

    useCase = new CreateCustomerCustomization(repo, capability);
  });

  it('creates a description-only customization', async () => {
    const result = await useCase.execute(
      {
        productId: 'p-1',
        text: 'Personal note',
      },
      'user-1',
    );

    expect(result.productId).toBe('p-1');
    expect(result.text).toBe('Personal note');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a photo upload when the product only allows text', async () => {
    capability = {
      async getConfig() {
        return ProductCustomizationConfig.fromJson({
          mode: 'text',
          previewEnabled: true,
          previewTemplateUrl: 'https://cdn.example.com/base.png',
        });
      },
    };
    useCase = new CreateCustomerCustomization(repo, capability);

    await expect(
      useCase.execute(
        {
          productId: 'p-1',
          text: 'Hello',
          imageUrl: 'https://cdn.example.com/photo.png',
        },
        'user-1',
      ),
    ).rejects.toThrow();
  });
});
